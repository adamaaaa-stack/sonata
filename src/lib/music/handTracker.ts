"use client";
/**
 * HandTracker — real-time finger / hand landmark detection via MediaPipe
 * Hands (the open-source hand-pose model from Google). Used to give
 * fingering feedback while the student plays. Specifically:
 *
 *   - 21 landmarks per hand × up to 2 hands = full finger geometry
 *   - 30+ fps on phone via TF.js WebGL backend
 *   - Apache 2.0, runs entirely client-side
 *
 * The class exposes the same start/stop surface as the mic detectors so
 * lesson code can treat all the input streams the same way:
 *
 *   - start() — request camera, load the model, begin emitting onFrame()
 *   - stop()  — tear down the camera and stop callbacks
 *   - onFrame(landmarks) — fires every camera frame with [hand][joint] = {x,y,z}
 *   - onFingerPress(finger) — fires once per detected finger-press event
 *
 * Both handedness ("Left"/"Right" — note: MediaPipe reports the hand from
 * the camera's POV, so it's flipped vs the user) and per-finger states
 * are tracked. Finger-press events are detected by watching fingertip Y
 * coordinates: a tip moving DOWN past a learned baseline = a press.
 */

// MediaPipe landmarks index: thumb tip = 4, index tip = 8, middle = 12,
// ring = 16, pinky = 20. We map these to "finger 1..5" in piano notation.
export const FINGERTIP_INDICES = [4, 8, 12, 16, 20] as const;
export const FINGER_NUMBERS = [1, 2, 3, 4, 5] as const; // MIDI fingering 1..5

export interface HandLandmark {
  x: number; // normalised 0..1 across video width
  y: number; // normalised 0..1 across video height
  z?: number; // depth, optional
}

export interface HandFrame {
  /** Raw landmark arrays per detected hand (length 21 each). */
  hands: { handedness: "Left" | "Right"; landmarks: HandLandmark[] }[];
  /** Frame width in CSS pixels — lets the overlay match the source video. */
  width: number;
  height: number;
}

export interface FingerPressEvent {
  /** Camera-side hand label. MediaPipe reports the LEFT hand of the user as
      "Right" (camera's POV), so we flip when reporting back. */
  hand: "left" | "right";
  /** 1 = thumb, 5 = pinky. */
  finger: 1 | 2 | 3 | 4 | 5;
  /** Normalised 0..1 X coordinate of the fingertip at press time. */
  x: number;
  y: number;
}

export interface HandTrackerOptions {
  /** Fires every frame with current hand landmarks. */
  onFrame?: (frame: HandFrame) => void;
  /** Fires once per finger-press detection (downward fingertip motion). */
  onFingerPress?: (e: FingerPressEvent) => void;
  /** Fires on permission / model errors. */
  onError?: (err: Error) => void;
  /** Fires on lifecycle status changes. */
  onStatus?: (s: "loading" | "ready" | "stopped" | "error") => void;
  /** Min downward velocity (Y pixels / frame) to count as a press. */
  pressThreshold?: number;
  /**
   * If provided, use this MediaStream instead of asking for the local
   * camera. Used by the phone-companion mode where the iPad receives a
   * stream over WebRTC and feeds it into the tracker.
   */
  externalStream?: MediaStream;
}

const PRESS_THRESHOLD_DEFAULT = 0.012; // normalised units / frame
const PRESS_COOLDOWN_MS = 200; // per-finger debounce

type HandPoseDetection = typeof import("@tensorflow-models/hand-pose-detection");
type HandDetector = Awaited<ReturnType<HandPoseDetection["createDetector"]>>;

export class HandTracker {
  private opts: HandTrackerOptions;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private detector: HandDetector | null = null;
  private rafId: number | null = null;

  // Per-finger state for press detection
  private prevTipY: Record<string, number> = {};
  private lastPressAt: Record<string, number> = {};

  constructor(opts: HandTrackerOptions) {
    this.opts = opts;
  }

  get running(): boolean {
    return this.video != null;
  }

  async start(): Promise<void> {
    if (this.video) return;
    this.opts.onStatus?.("loading");

    // 1. Lazy-load TF.js WebGL backend + the detector so we don't pay
    //    the cost on lessons where vision isn't enabled. The mic side
    //    already brought TF.js core into the bundle for Basic Pitch.
    let detectorMod: HandPoseDetection;
    try {
      const [tfMod, webglMod, hpdMod] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("@tensorflow/tfjs-backend-webgl"),
        import("@tensorflow-models/hand-pose-detection"),
      ]);
      // Note: the webgl import registers the backend as a side effect.
      // Both `tfMod` and `webglMod` have to be imported even if not used.
      void webglMod;
      await tfMod.setBackend("webgl").catch(() => undefined);
      await tfMod.ready();
      detectorMod = hpdMod;
    } catch (e) {
      this.opts.onError?.(e instanceof Error ? e : new Error(String(e)));
      this.opts.onStatus?.("error");
      throw e;
    }

    // 2. Get a video stream — either the externally-provided one (phone
    // companion mode) or our own getUserMedia. Local fallback prefers
    // the FRONT-facing camera because the typical iPad-on-music-stand
    // setup has the front lens angled down at the hands.
    if (this.opts.externalStream) {
      this.stream = this.opts.externalStream;
    } else {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
      } catch {
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
          });
        } catch (e) {
          this.opts.onError?.(e instanceof Error ? e : new Error(String(e)));
          this.opts.onStatus?.("error");
          throw e;
        }
      }
    }

    this.video = document.createElement("video");
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play().catch(() => undefined);

    // 3. Build detector. MediaPipe Hands via TF.js — small model (~10MB),
    //    runs at 30+ fps with WebGL on a phone.
    try {
      this.detector = await detectorMod.createDetector(
        detectorMod.SupportedModels.MediaPipeHands,
        {
          runtime: "tfjs",
          maxHands: 2,
          modelType: "lite", // "full" is more accurate but ~2x heavier
        }
      );
    } catch (e) {
      this.opts.onError?.(e instanceof Error ? e : new Error(String(e)));
      this.opts.onStatus?.("error");
      throw e;
    }

    this.prevTipY = {};
    this.lastPressAt = {};

    this.opts.onStatus?.("ready");
    this.loop();
  }

  stop(): void {
    if (this.rafId != null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // Only stop tracks we own. The phone-companion path passes us a
    // MediaStream owned by the PeerSession; tearing it down here would
    // kill the WebRTC connection on tab transitions.
    if (this.stream && !this.opts.externalStream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
    this.stream = null;
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video = null;
    }
    this.detector?.dispose?.();
    this.detector = null;
    this.opts.onStatus?.("stopped");
  }

  /** Underlying video element so an overlay component can mirror it. */
  getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  private async loop(): Promise<void> {
    const tick = async () => {
      if (!this.video || !this.detector) return;
      try {
        const hands = await this.detector.estimateHands(this.video, {
          flipHorizontal: false,
        });
        const w = this.video.videoWidth || 640;
        const h = this.video.videoHeight || 480;

        const frame: HandFrame = {
          width: w,
          height: h,
          hands: hands.map((hand) => ({
            handedness: (hand.handedness as "Left" | "Right") || "Right",
            landmarks: (hand.keypoints || []).map((k) => {
              const kx = typeof k.x === "number" ? k.x : 0;
              const ky = typeof k.y === "number" ? k.y : 0;
              return {
                x: kx / w,
                y: ky / h,
                z: (k as { z?: number }).z,
              };
            }),
          })),
        };
        this.opts.onFrame?.(frame);

        // Press detection — fingertip Y delta exceeds threshold AND last
        // press for that finger was > cooldown ago.
        const now = performance.now();
        const threshold = this.opts.pressThreshold ?? PRESS_THRESHOLD_DEFAULT;
        for (const hand of frame.hands) {
          const userHand: "left" | "right" =
            hand.handedness === "Left" ? "right" : "left"; // mirror MediaPipe
          for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
            const tip = hand.landmarks[FINGERTIP_INDICES[i]];
            if (!tip) continue;
            const key = `${userHand}-${i}`;
            const prev = this.prevTipY[key];
            this.prevTipY[key] = tip.y;
            if (prev == null) continue;
            const dy = tip.y - prev; // positive = moved down (image y grows down)
            if (dy < threshold) continue;
            const last = this.lastPressAt[key] ?? 0;
            if (now - last < PRESS_COOLDOWN_MS) continue;
            this.lastPressAt[key] = now;
            this.opts.onFingerPress?.({
              hand: userHand,
              finger: FINGER_NUMBERS[i],
              x: tip.x,
              y: tip.y,
            });
          }
        }
      } catch {
        // Detector errors are common (transient WebGL hiccups, dropped
        // frames). We just skip and try again next frame instead of
        // tearing down the loop.
      }
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }
}
