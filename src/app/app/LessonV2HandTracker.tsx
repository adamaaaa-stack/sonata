"use client";
/**
 * HandTrackerOverlay — auto-starting camera + hand-tracking overlay with
 * optional phone-companion mode for a better camera angle.
 *
 * Local mode: uses the iPad's built-in front camera. Auto-starts on mount.
 *
 * Phone mode: tap the 📱 button. We open a WebRTC consumer session, show
 * a QR code pointing at /cam/[sessionId], and the student scans it with
 * their phone. Phone /cam page captures its own camera and streams to us
 * via Supabase-Realtime-signaled WebRTC. The remote stream is plumbed
 * into the same MediaPipe Hands pipeline as the local camera.
 *
 * Either source emits onFingerPress() events.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { HandFrame, FingerPressEvent } from "@/lib/music/handTracker";
import type { PeerSession } from "@/lib/cam/peerSession";

interface HandTrackerOverlayProps {
  /** Fires when a fingertip presses down. */
  onFingerPress?: (e: FingerPressEvent) => void;
  /** Optional: forwarded through to the tracker. */
  pressThreshold?: number;
}

type CamMode = "local" | "phone";

/** Local copy so tapping the 📱 button doesn't depend on the lazy-loaded
 *  cam module just to generate an id. Same shape as PeerSession's helper. */
function generateSimpleId(): string {
  const chars = "23456789abcdefghjkmnpqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function HandTrackerOverlay({
  onFingerPress,
  pressThreshold,
}: HandTrackerOverlayProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [frame, setFrame] = useState<HandFrame | null>(null);
  const [mode, setMode] = useState<CamMode>(() => {
    if (typeof window === "undefined") return "local";
    return (window.localStorage.getItem("sonata.cam.mode") as CamMode) || "local";
  });
  const [phoneStream, setPhoneStream] = useState<MediaStream | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const trackerRef = useRef<{
    stop: () => void;
    getVideo: () => HTMLVideoElement | null;
  } | null>(null);
  const peerRef = useRef<PeerSession | null>(null);
  const videoSlotRef = useRef<HTMLDivElement | null>(null);

  const startTracker = useCallback(
    async (externalStream: MediaStream | null) => {
      try {
        if (trackerRef.current) {
          trackerRef.current.stop();
          trackerRef.current = null;
        }
        if (videoSlotRef.current) videoSlotRef.current.innerHTML = "";
        setStatus("loading model…");
        const mod = await import("@/lib/music/handTracker");
        const tracker = new mod.HandTracker({
          onFrame: (f) => setFrame(f),
          onFingerPress: (e) => onFingerPress?.(e),
          onError: (err) => {
            setError(err.message || "Camera access failed");
            setActive(false);
            setStatus(null);
          },
          onStatus: (s) => {
            if (s === "loading") setStatus("loading model…");
            else if (s === "ready") setStatus(null);
            else if (s === "error") setStatus(null);
          },
          pressThreshold,
          externalStream: externalStream || undefined,
        });
        trackerRef.current = tracker;
        if (!externalStream) setStatus("asking for camera permission…");
        await tracker.start();
        setActive(true);
        setStatus(null);
        const video = tracker.getVideo();
        if (video && videoSlotRef.current) {
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "cover";
          video.style.display = "block";
          // Mirror local front-facing camera; not the phone's rear camera
          // which is already pointed at the keyboard correctly.
          video.style.transform = externalStream ? "" : "scaleX(-1)";
          videoSlotRef.current.appendChild(video);
        }
      } catch {
        // Errors surfaced via onError.
      }
    },
    [onFingerPress, pressThreshold]
  );

  useEffect(() => {
    if (mode === "phone" && !phoneStream) return;
    void startTracker(mode === "phone" ? phoneStream : null);
    return () => {
      trackerRef.current?.stop();
      trackerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phoneStream]);

  async function startPhoneSession() {
    setError(null);
    // Generate the session id and OPEN THE MODAL FIRST so the user
    // immediately sees something happen on tap. Loading the WebRTC code
    // and signalling channel can take a beat — without immediate UI
    // feedback the button felt broken on slow networks.
    const sessionId = generateSimpleId();
    setPendingSessionId(sessionId);
    setShowQr(true);
    setStatus("loading…");
    let camMod: typeof import("@/lib/cam/peerSession");
    try {
      camMod = await import("@/lib/cam/peerSession");
    } catch (e) {
      setError(
        e instanceof Error
          ? `Couldn't load phone-cam module: ${e.message}`
          : "Couldn't load phone-cam module"
      );
      setStatus(null);
      return;
    }
    setStatus("waiting for phone…");
    const peer = new camMod.PeerSession({
      sessionId,
      role: "consumer",
      onRemoteStream: (s) => {
        setPhoneStream(s);
        setStatus(null);
      },
      onStatus: (s) => {
        if (s === "connecting") setStatus("connecting…");
        else if (s === "waiting") setStatus("waiting for phone…");
        else if (s === "connected") setStatus(null);
        else if (s === "failed") setError("connection failed — reload");
        else if (s === "closed") setStatus(null);
      },
      onError: (err) => setError(err.message),
    });
    peerRef.current = peer;
    setMode("phone");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sonata.cam.mode", "phone");
    }
    try {
      await peer.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function endPhoneSession() {
    peerRef.current?.stop();
    peerRef.current = null;
    setPhoneStream(null);
    setShowQr(false);
    setMode("local");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sonata.cam.mode", "local");
    }
  }

  useEffect(() => {
    return () => {
      peerRef.current?.stop();
      peerRef.current = null;
    };
  }, []);

  if (collapsed) {
    return (
      <>
        <div
          style={{
            position: "fixed",
            bottom: 80,
            right: 12,
            display: "flex",
            gap: 8,
            zIndex: 60,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (mode === "phone") {
                setShowQr(true);
              } else {
                void startPhoneSession();
              }
            }}
            style={{
              width: 44,
              height: 44,
              padding: 0,
              borderRadius: 999,
              border: "2px solid #1f2937",
              background:
                mode === "phone" ? "rgba(22,163,74,0.85)" : "rgba(255,255,255,0.95)",
              color: mode === "phone" ? "#fff" : "#1f2937",
              fontSize: 22,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
              boxShadow: "0 3px 0 #1f2937",
              WebkitTapHighlightColor: "transparent",
            }}
            title="Use phone as camera"
            aria-label="Use phone as camera"
          >
            📱
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "2px solid #1f2937",
              background: active ? "rgba(22,163,74,0.15)" : "rgba(0,0,0,0.05)",
              color: active ? "#16a34a" : "#6b7280",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.1em",
              cursor: "pointer",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ✋ {active ? "TRACKING" : status ? status.toUpperCase() : "OFF"}
            {mode === "phone" ? " · 📱" : ""}
          </button>
        </div>
        {showQr && pendingSessionId && (
          <QrPanel
            sessionId={pendingSessionId}
            connected={!!phoneStream}
            onClose={() => setShowQr(false)}
            onEnd={endPhoneSession}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 80,
          right: 12,
          width: 200,
          aspectRatio: "4/3",
          borderRadius: 12,
          overflow: "hidden",
          border: `2px solid ${active ? "#16a34a" : "#1f2937"}`,
          background: "#0a0a0a",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          zIndex: 50,
        }}
      >
        <div ref={videoSlotRef} style={{ position: "absolute", inset: 0 }} />

        {frame && (
          <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              transform: mode === "phone" ? "" : "scaleX(-1)",
              pointerEvents: "none",
            }}
          >
            {frame.hands.map((hand, hi) => (
              <g key={hi}>
                {hand.landmarks.map((lm, li) => {
                  const isTip = [4, 8, 12, 16, 20].includes(li);
                  return (
                    <circle
                      key={li}
                      cx={lm.x}
                      cy={lm.y}
                      r={isTip ? 0.018 : 0.008}
                      fill={hand.handedness === "Left" ? "#22c55e" : "#60a5fa"}
                      fillOpacity={isTip ? 0.9 : 0.55}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        )}

        {/* In-tile status pill only (no buttons here — see ControlBar below). */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            padding: "2px 8px",
            borderRadius: 999,
            background: active
              ? "rgba(22,163,74,0.85)"
              : status
              ? "rgba(212,168,83,0.85)"
              : error
              ? "rgba(220,38,38,0.85)"
              : "rgba(0,0,0,0.5)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.1em",
            display: "flex",
            alignItems: "center",
            gap: 4,
            pointerEvents: "none",
          }}
        >
          <span>
            {status
              ? status.toUpperCase()
              : active
              ? "● HANDS"
              : error
              ? "⚠ NO CAM"
              : "…"}
          </span>
          {mode === "phone" && (
            <span title="Phone-camera mode" style={{ opacity: 0.85 }}>
              📱
            </span>
          )}
        </div>
        {error && (
          <div
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              right: 6,
              padding: "4px 8px",
              borderRadius: 6,
              background: "rgba(220,38,38,0.9)",
              color: "#fff",
              fontSize: 10,
              lineHeight: 1.3,
              pointerEvents: "none",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Standalone control bar — lives beside the preview tile, not inside
          it, so the video element inside the tile can't intercept taps.
          Higher z-index than the tile, with explicit touch-action. */}
      <div
        style={{
          position: "fixed",
          bottom: 80,
          right: 224, // tile width (200) + tile right offset (12) + gap (12)
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 60,
          pointerEvents: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (mode === "phone") {
              setShowQr(true);
            } else {
              void startPhoneSession();
            }
          }}
          style={{
            width: 44,
            height: 44,
            padding: 0,
            borderRadius: 999,
            border: "2px solid #1f2937",
            background:
              mode === "phone" ? "rgba(22,163,74,0.85)" : "rgba(255,255,255,0.95)",
            color: mode === "phone" ? "#fff" : "#1f2937",
            fontSize: 22,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
            boxShadow: "0 3px 0 #1f2937",
            WebkitTapHighlightColor: "transparent",
          }}
          title={
            mode === "phone"
              ? "Phone-camera connected — tap to show QR"
              : "Use phone as camera"
          }
          aria-label="Use phone as camera"
        >
          📱
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            width: 44,
            height: 44,
            padding: 0,
            borderRadius: 999,
            border: "2px solid #1f2937",
            background: "rgba(255,255,255,0.95)",
            color: "#1f2937",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
            boxShadow: "0 3px 0 #1f2937",
            WebkitTapHighlightColor: "transparent",
          }}
          title="Hide / show camera preview"
          aria-label="Hide camera preview"
        >
          ⤢
        </button>
      </div>

      {showQr && pendingSessionId && (
        <QrPanel
          sessionId={pendingSessionId}
          connected={!!phoneStream}
          onClose={() => setShowQr(false)}
          onEnd={endPhoneSession}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// QrPanel — modal with a QR code pointing at /cam/<sessionId>, instructions,
// and an "End phone session" button once connected.
// ---------------------------------------------------------------------------
function QrPanel({
  sessionId,
  connected,
  onClose,
  onEnd,
}: {
  sessionId: string;
  connected: boolean;
  onClose: () => void;
  onEnd: () => void;
}) {
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  // Phone always loads the WEB origin (learnwithsonata.com), never the
  // Capacitor `capacitor://localhost` origin which only the iPad knows.
  // Hardcode the production host so QR codes generated inside the iOS
  // bundle still produce a phone-scannable URL.
  const WEB_ORIGIN = "https://learnwithsonata.com";
  const url = `${WEB_ORIGIN}/cam/?id=${sessionId}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QR = (await import("qrcode")).default;
        const svg = await QR.toString(url, {
          type: "svg",
          margin: 1,
          color: { dark: "#1f2937", light: "#fff8ee" },
          width: 200,
        });
        if (!cancelled) setQrSvg(svg);
      } catch {
        // fall through
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,15,15,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--cream, #fff8ee)",
          border: "3px solid var(--ink, #1f2937)",
          borderRadius: 18,
          padding: 22,
          maxWidth: 360,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            fontWeight: 900,
            color: "var(--ink3, #6b7280)",
          }}
        >
          PHONE CAMERA
        </div>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 18,
            fontWeight: 800,
            color: "var(--ink, #1f2937)",
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          {connected ? "Phone connected ✓" : "Scan with your phone"}
        </div>
        {!connected && (
          <>
            <div
              style={{
                width: 200,
                height: 200,
                background: "var(--parchment, #faf6ef)",
                borderRadius: 12,
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              dangerouslySetInnerHTML={qrSvg ? { __html: qrSvg } : undefined}
            >
              {!qrSvg && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--ink3, #6b7280)",
                  }}
                >
                  generating QR…
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 12,
                color: "var(--ink2, #4b5563)",
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              Open the camera on your phone and scan the QR.
              <br />
              Mount the phone above your keyboard for best tracking.
            </div>
            <code
              style={{
                fontSize: 10,
                color: "var(--ink3, #6b7280)",
                wordBreak: "break-all",
                textAlign: "center",
              }}
            >
              {url}
            </code>
          </>
        )}
        {connected && (
          <div
            style={{
              fontSize: 12,
              color: "var(--ink2, #4b5563)",
              textAlign: "center",
              lineHeight: 1.4,
              maxWidth: 280,
            }}
          >
            Phone camera is now feeding the lesson. Mount it above the keys
            and aim at your hands. The preview tile shows what we see.
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 4,
          }}
        >
          {connected && (
            <button
              type="button"
              onClick={onEnd}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "2px solid var(--ink, #1f2937)",
                background: "#fecaca",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              End phone session
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "2px solid var(--ink, #1f2937)",
              background: "var(--berry, #d4a853)",
              fontWeight: 900,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {connected ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
