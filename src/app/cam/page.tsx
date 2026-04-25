"use client";
/**
 * Phone camera companion page (URL: /cam?id=<sessionId>).
 *
 * The student's iPad shows a QR code that points here. The phone scans
 * it, lands here, and we:
 *
 *   1. Ask for camera permission
 *   2. Capture a back-facing camera stream (or whatever's available)
 *   3. Open a WebRTC peer connection to the iPad via Supabase Realtime
 *      signalling on channel `cam:<sessionId>`
 *   4. Push the camera tracks to the iPad
 *
 * Single static path (?id=...) so the route works under Capacitor's
 * static export — dynamic [id] segments need generateStaticParams which
 * can't enumerate runtime-random sessions.
 */
import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PeerSession } from "@/lib/cam/peerSession";

function CamCompanionInner() {
  const params = useSearchParams();
  const sessionId = params?.get("id") || null;
  const [status, setStatus] = useState<string>("starting…");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<PeerSession | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session id in URL — scan the QR from your iPad.");
      return;
    }
    let cancelled = false;
    (async () => {
      let stream: MediaStream;
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: "user" },
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 },
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
          });
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Camera access denied. Allow camera in your browser settings and reload."
        );
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (videoRef.current) videoRef.current.srcObject = stream;

      const session = new PeerSession({
        sessionId,
        role: "publisher",
        localStream: stream,
        onStatus: (s) => {
          if (s === "connecting") setStatus("connecting…");
          else if (s === "waiting") setStatus("waiting for iPad…");
          else if (s === "connected") setStatus("● connected");
          else if (s === "failed") setStatus("connection failed — reload");
          else if (s === "closed") setStatus("disconnected");
        },
        onError: (err) => setError(err.message),
      });
      sessionRef.current = session;
      try {
        await session.start();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [sessionId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          aspectRatio: "4/3",
          borderRadius: 16,
          overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.2)",
          marginBottom: 16,
          background: "#000",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          fontWeight: 700,
          color: status.startsWith("●") ? "#22c55e" : "#94a3b8",
          marginBottom: 6,
        }}
      >
        {status.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, color: "#cbd5e1", textAlign: "center" }}>
        Mount your phone above the keyboard. Camera should see your hands.
      </div>
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "rgba(220,38,38,0.15)",
            border: "1px solid #dc2626",
            borderRadius: 10,
            fontSize: 12,
            color: "#fca5a5",
            maxWidth: 360,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default function CamCompanionPage() {
  // useSearchParams() must live inside a Suspense boundary in App Router
  // so prerendering can stream — wrap.
  return (
    <Suspense fallback={null}>
      <CamCompanionInner />
    </Suspense>
  );
}
