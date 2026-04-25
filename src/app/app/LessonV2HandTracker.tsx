"use client";
/**
 * HandTrackerOverlay — auto-starting camera + hand-tracking overlay.
 *
 * Renders a small video preview of the student's hands in the corner of
 * the lesson page with finger landmark dots drawn on top. Fires
 * onFingerPress() events when a fingertip moves downward (a press).
 *
 * Auto-starts on mount the same way the mic does — no Listen button,
 * no Start tracking button. The first time, iOS/browsers will show a
 * camera permission prompt; once granted, every subsequent page on the
 * same origin starts silently.
 *
 * The user can collapse the preview to a tiny pill if they don't want
 * to see the camera feed. The tracking keeps running even when collapsed.
 */
import React, { useEffect, useRef, useState } from "react";
import type { HandFrame, FingerPressEvent } from "@/lib/music/handTracker";

interface HandTrackerOverlayProps {
  /** Fires when a fingertip presses down. */
  onFingerPress?: (e: FingerPressEvent) => void;
  /** Optional: forwarded through to the tracker. */
  pressThreshold?: number;
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
  const trackerRef = useRef<{ stop: () => void; getVideo: () => HTMLVideoElement | null } | null>(null);
  const videoSlotRef = useRef<HTMLDivElement | null>(null);

  // Auto-start on mount. Lazy-load the tracker module so non-vision
  // lessons (and the very large TF.js+MediaPipe deps) never load it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("loading model…");
        const mod = await import("@/lib/music/handTracker");
        if (cancelled) return;
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
        });
        trackerRef.current = tracker;
        setStatus("asking for camera permission…");
        await tracker.start();
        if (cancelled) {
          tracker.stop();
          return;
        }
        setActive(true);
        setStatus(null);
        // Mount the video element produced by the tracker into the slot
        const video = tracker.getVideo();
        if (video && videoSlotRef.current) {
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "cover";
          video.style.display = "block";
          video.style.transform = "scaleX(-1)"; // mirror so it feels natural
          videoSlotRef.current.appendChild(video);
        }
      } catch {
        // Errors already surfaced via onError.
      }
    })();
    return () => {
      cancelled = true;
      trackerRef.current?.stop();
      trackerRef.current = null;
    };
    // We deliberately omit onFingerPress/pressThreshold — re-creating the
    // detector on every prop change would tear down the camera stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        style={{
          position: "fixed",
          bottom: 80,
          right: 12,
          padding: "6px 12px",
          borderRadius: 999,
          border: "2px solid #1f2937",
          background: active ? "rgba(22,163,74,0.15)" : "rgba(0,0,0,0.05)",
          color: active ? "#16a34a" : "#6b7280",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.1em",
          cursor: "pointer",
          zIndex: 50,
        }}
      >
        ✋ {active ? "TRACKING" : status ? status.toUpperCase() : "OFF"}
      </button>
    );
  }

  return (
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
      <div
        ref={videoSlotRef}
        style={{ position: "absolute", inset: 0 }}
      />
      {/* Landmark dots overlay */}
      {frame && (
        <svg
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            transform: "scaleX(-1)", // match the mirrored video
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
                    fill={
                      hand.handedness === "Left"
                        ? "#22c55e"
                        : "#60a5fa"
                    }
                    fillOpacity={isTip ? 0.9 : 0.55}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      )}
      {/* Status / collapse pill */}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          right: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
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
          }}
        >
          {status
            ? status.toUpperCase()
            : active
            ? "● HANDS"
            : error
            ? "⚠ NO CAM"
            : "…"}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            border: "none",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
          }}
          title="Hide preview (tracking keeps running)"
        >
          ⤢
        </button>
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
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
