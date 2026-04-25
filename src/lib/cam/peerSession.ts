"use client";
/**
 * WebRTC peer session for phone-as-camera mode.
 *
 * Two roles:
 *   - publisher: captures the device camera and pushes a MediaStream to
 *     the consumer over RTCPeerConnection. Used by the /cam/[id] page
 *     opened on the student's phone.
 *   - consumer: receives the remote MediaStream and emits it via
 *     onRemoteStream(). Used by the iPad lesson screen, plumbed into
 *     HandTracker.
 *
 * Signalling uses Supabase Realtime broadcast channels — no extra infra,
 * piggybacks on the auth/db setup already in the app. Channel name is
 * `cam:<sessionId>`. Both peers join, exchange offer/answer/ICE, and
 * stay subscribed for the lifetime of the session.
 */
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

const RTC_CONFIG: RTCConfiguration = {
  // Public STUN servers. NAT-traversal: most home networks work with these
  // alone. If the user's network is hostile we'd need a TURN relay, which
  // costs money — punt for now.
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

type Role = "publisher" | "consumer";

type SignalMessage =
  | { type: "offer"; sdp: string; from: Role }
  | { type: "answer"; sdp: string; from: Role }
  | { type: "ice"; candidate: RTCIceCandidateInit; from: Role }
  | { type: "hello"; from: Role };

interface PeerSessionOpts {
  sessionId: string;
  role: Role;
  /** Phone-side: the local stream to publish. */
  localStream?: MediaStream;
  /** iPad-side: receives the remote stream when the phone connects. */
  onRemoteStream?: (stream: MediaStream) => void;
  onStatus?: (s: "connecting" | "waiting" | "connected" | "failed" | "closed") => void;
  onError?: (err: Error) => void;
}

export class PeerSession {
  private opts: PeerSessionOpts;
  private channel: RealtimeChannel | null = null;
  private pc: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private peerSeen = false;

  constructor(opts: PeerSessionOpts) {
    this.opts = opts;
  }

  async start(): Promise<void> {
    this.opts.onStatus?.("connecting");
    this.pc = new RTCPeerConnection(RTC_CONFIG);

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        void this.send({ type: "ice", candidate: e.candidate.toJSON(), from: this.opts.role });
      }
    };
    this.pc.ontrack = (e) => {
      // Group all incoming tracks into a single remote stream.
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.opts.onRemoteStream?.(this.remoteStream);
      }
      this.remoteStream.addTrack(e.track);
    };
    this.pc.onconnectionstatechange = () => {
      const st = this.pc?.connectionState;
      if (st === "connected") this.opts.onStatus?.("connected");
      else if (st === "failed") this.opts.onStatus?.("failed");
      else if (st === "closed") this.opts.onStatus?.("closed");
    };

    // Publisher attaches its tracks to the connection.
    if (this.opts.role === "publisher" && this.opts.localStream) {
      for (const t of this.opts.localStream.getTracks()) {
        this.pc.addTrack(t, this.opts.localStream);
      }
    }

    // Wire up signalling channel.
    this.channel = supabase.channel(`cam:${this.opts.sessionId}`, {
      config: { broadcast: { self: false } },
    });
    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      void this.handleSignal(payload as SignalMessage);
    });
    await this.channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      this.opts.onStatus?.("waiting");
      // Announce presence so the other peer can begin negotiation.
      // Race fix: Supabase broadcasts don't replay, so if peer A subscribes
      // first and sends hello before peer B is ready, B never hears it.
      // We retry hello every 1.5s until either we've seen the peer OR
      // negotiation has progressed past the offer stage. Stops after 30s
      // to avoid spamming the channel forever.
      void this.send({ type: "hello", from: this.opts.role });
      this.helloRetryTimer = window.setInterval(() => {
        if (this.peerSeen || !this.channel) {
          if (this.helloRetryTimer != null) {
            clearInterval(this.helloRetryTimer);
            this.helloRetryTimer = null;
          }
          return;
        }
        void this.send({ type: "hello", from: this.opts.role });
      }, 1500);
      window.setTimeout(() => {
        if (this.helloRetryTimer != null) {
          clearInterval(this.helloRetryTimer);
          this.helloRetryTimer = null;
        }
      }, 30000);
    });
  }

  private helloRetryTimer: number | null = null;

  private async send(m: SignalMessage): Promise<void> {
    if (!this.channel) return;
    await this.channel.send({ type: "broadcast", event: "signal", payload: m });
  }

  private async handleSignal(m: SignalMessage): Promise<void> {
    if (!this.pc) return;
    if (m.from === this.opts.role) return; // own message echoed
    try {
      if (m.type === "hello") {
        if (this.peerSeen) return;
        this.peerSeen = true;
        // Publisher creates the offer. Consumer waits for it.
        if (this.opts.role === "publisher") {
          const offer = await this.pc.createOffer();
          await this.pc.setLocalDescription(offer);
          await this.send({ type: "offer", sdp: offer.sdp || "", from: this.opts.role });
        }
      } else if (m.type === "offer") {
        await this.pc.setRemoteDescription({ type: "offer", sdp: m.sdp });
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await this.send({ type: "answer", sdp: answer.sdp || "", from: this.opts.role });
      } else if (m.type === "answer") {
        await this.pc.setRemoteDescription({ type: "answer", sdp: m.sdp });
      } else if (m.type === "ice") {
        try {
          await this.pc.addIceCandidate(m.candidate);
        } catch {
          // ICE candidates can arrive before remote description; safe to drop.
        }
      }
    } catch (e) {
      this.opts.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  }

  stop(): void {
    if (this.helloRetryTimer != null) {
      clearInterval(this.helloRetryTimer);
      this.helloRetryTimer = null;
    }
    if (this.pc) {
      this.pc.getSenders().forEach((s) => s.track?.stop());
      this.pc.close();
      this.pc = null;
    }
    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.remoteStream = null;
    this.opts.onStatus?.("closed");
  }
}

/** Generate a short URL-safe session id. */
export function generateSessionId(): string {
  const chars = "23456789abcdefghjkmnpqrstuvwxyz"; // no easily-confused chars
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
