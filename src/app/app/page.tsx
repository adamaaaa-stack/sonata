"use client";

import React, { useEffect, useReducer, useRef, useCallback, useState, Component } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// ERROR BOUNDARY
// ============================================================
interface ErrorBoundaryState { hasError: boolean; error: Error | null }
class ErrorBoundary extends Component<{ children: React.ReactNode; fallback?: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 40, textAlign: 'center', color: '#A8A29E', fontFamily: 'var(--sans)' }}>
          <div style={{ fontSize: 20, marginBottom: 8, color: '#F87171' }}>Something went wrong</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>{this.state.error?.message}</div>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ padding: '10px 24px', background: '#C8A96E', color: '#0C0A09', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>
      <div style={{
        width: 36, height: 36,
        border: '4px solid var(--parchment)',
        borderTopColor: 'var(--berry)',
        borderRadius: '50%',
        animation: 'sn-spin 0.8s linear infinite',
        margin: '0 auto 12px',
      }} />
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink2)', fontWeight: 600 }}>
        {text || 'Loading…'}
      </div>
    </div>
  );
}

const BOOT_TIPS = [
  'Middle C sits right between the staves.',
  'Steps go to the next line or space — skips leap over one.',
  'Every Good Boy Deserves Fudge — treble clef lines, bottom to top.',
  'All Cows Eat Grass — bass clef spaces, bottom to top.',
  'FACE spells the treble spaces from bottom to top.',
  'Every note you name makes Cleffy smile.',
];

function BootScreen() {
  const [tipIdx, setTipIdx] = React.useState(() => Math.floor(Math.random() * BOOT_TIPS.length));
  const [fade, setFade] = React.useState(true);
  React.useEffect(() => {
    const iv = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setTipIdx(i => (i + 1) % BOOT_TIPS.length);
        setFade(true);
      }, 220);
    }, 2600);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <StaffBG opacity={0.28} />
      <FloatingNotes count={8} />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 420 }}>
        {/* Cleffy — breathing */}
        <div style={{ animation: 'sn-breathe 2.4s ease-in-out infinite', transformOrigin: 'center bottom' }}>
          <Cleffy size={160} mood="thinking" />
        </div>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--ink)', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 28, border: '3px solid var(--ink)', boxShadow: '0 4px 0 var(--gold-deep)' }}>𝄞</span>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 44, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>Sonata</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 6 }}>Learn music, beautifully</div>

        {/* Chunky spinner card */}
        <div style={{ marginTop: 28, background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: '18px 26px', boxShadow: '0 5px 0 var(--ink)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 28, height: 28,
            border: '4px solid var(--parchment)',
            borderTopColor: 'var(--berry)',
            borderRadius: '50%',
            animation: 'sn-spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink)', fontWeight: 600 }}>
            Tuning up your progress…
          </div>
        </div>

        {/* Rotating tip */}
        <div style={{
          marginTop: 18,
          minHeight: 44,
          maxWidth: 340,
          padding: '10px 16px',
          background: 'transparent',
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--ink2)',
          lineHeight: 1.5,
          opacity: fade ? 1 : 0,
          transform: fade ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 220ms ease, transform 220ms ease',
        }}>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--berry)', fontStyle: 'normal', fontFamily: 'var(--sans)', marginRight: 8 }}>♪ Tip</span>
          {BOOT_TIPS[tipIdx]}
        </div>
      </div>
      <Candle x={16} y="calc(50% - 60px)" size={20} />
      <Candle x="calc(100% - 38px)" y="calc(50% - 60px)" size={20} />
    </div>
  );
}

import {
  NOTES, midiToNote, isBlack,
  makeABC,
  generateWeightedQuestion,
  genRhythmDrill,
  getPool, rnd, ri,
  playCorrectSound, playWrongSound, playNote, playPianoKey,
  playScoreNotes, stopScorePlayback, loadPianoSamples, isPianoReady,
  fireConfetti, playCelebrationChord, flashElement, spawnFloatNote,
  startAmbiance, stopAmbiance,
  type ScoreNote,
  speak, stopSpeaking, togglePause, toggleSlow, replaySpeak, getTTSSpeed, setTTSStateCallback, unlockAudio,
  getIntervalAccuracy, updateIntervalAccuracy, getWeakestIntervals, recordPractice, getPracticeDates, localDateKey,
  getStoredLessons, setStoredLessons, getStoredDrills, setStoredDrills, isOnboarded, setOnboarded, getPlacementResult, setPlacementResult,
  lessons, CATALOG, getCatalogUrl, getRecommendedDifficulty, findLessonCatalogIndex,
} from "@/lib/music";
import type { Question, DrillConfig, RhythmPattern, CatalogEntry, Lesson } from "@/lib/music";
import { checkAuth, signOut, loadProgress, saveDrillSession, saveLessonComplete, loadLicense } from "@/lib/supabaseData";
import { Cleffy } from "./Cleffy";
// LessonV2Screen is no longer rendered at the top level —
// MySongsScreen (the upload-piece flow) is unplugged from navigation;
// the file remains in the repo for future reference but is no longer
// imported here. The 250 hand-authored lessons are the primary path
// again — see LessonsListScreen / LessonScreen below.
import { lessonsV2, findLessonV2 } from "@/lib/music/lessonsV2";
import { LessonV2Screen } from "./LessonV2";
import { CurriculumMap } from "./CurriculumMap";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ChunkyButton, Sticker, StaffBG, FloatingNotes, StreakFlame, DotRow, Candle, ChunkyCard, type ChunkyColor } from "./design";
import type { User } from "@supabase/supabase-js";
import { isNative, navigate } from "@/lib/platform";
import { hLight, hSelect, hSuccess, hError, hWarning } from "@/lib/haptics";
import "./sonata.css";

// ============================================================
// STATE
// ============================================================
type Screen = 'loading'|'onboarding'|'placement'|'menu'|'config'|'drill'|'results'|'lessons'|'lesson'|'library'|'progress'|'sightReading'|'rhythm'|'paywall';

interface AppState {
  screen: Screen;
  user: User | null;
  // Drill
  drillConfig: DrillConfig | null;
  questions: Question[];
  currentQ: number;
  score: number;
  streak: number;
  bestStreak: number;
  timedOut: number;
  results: (Question & { correct: boolean; timedOut?: boolean })[];
  timeLeft: number;
  // Lessons
  currentLesson: number;
  lessonStep: number;
  lessonPhase: 'concepts'|'quiz'|'piece'|'complete';
  lessonsCompleted: number[];
  returnToLesson: boolean;
  drillHistory: { timestamp: number; score: number; total: number }[];
  // Library
  libFilter: string;
  libSearch: string;
  currentScoreIndex: number;
  // MIDI
  midiConnected: boolean;
  // License (Gumroad)
  hasLicense: boolean;
  drillsUsed: number;
}

type Action =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'SET_USER'; user: User | null }
  | { type: 'LOAD_PROGRESS'; lessonsCompleted: number[]; drillCount: number }
  | { type: 'START_DRILL'; config: DrillConfig; questions: Question[] }
  | { type: 'ANSWER'; picked: string; correct: string }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'END_DRILL' }
  | { type: 'TIMER_TICK' }
  | { type: 'START_LESSON'; id: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'START_QUIZ' }
  | { type: 'START_PIECE' }
  | { type: 'COMPLETE_LESSON' }
  | { type: 'LIB_FILTER'; filter: string }
  | { type: 'LIB_SEARCH'; query: string }
  | { type: 'OPEN_SCORE'; index: number }
  | { type: 'SET_MIDI'; connected: boolean }
  | { type: 'UPDATE_FIELD'; field: string; value: unknown };

const initialState: AppState = {
  screen: 'loading', user: null,
  drillConfig: null, questions: [], currentQ: 0, score: 0, streak: 0, bestStreak: 0, timedOut: 0, results: [], timeLeft: 0,
  currentLesson: 0, lessonStep: 0, lessonPhase: 'concepts', lessonsCompleted: getStoredLessons(), returnToLesson: false,
  drillHistory: getStoredDrills(),
  libFilter: 'all', libSearch: '', currentScoreIndex: -1,
  midiConnected: false,
  hasLicense: false,
  drillsUsed: 0,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN': return { ...state, screen: action.screen };
    case 'SET_USER': return { ...state, user: action.user };
    case 'LOAD_PROGRESS': {
      // Keep local drillHistory (timestamped entries). Server only stores
      // drill_count as a number, which is useless for mission/streak logic.
      // If the server count is larger than local, pad with stub entries so
      // totals display correctly without breaking filter/map operations.
      let drillHistory = state.drillHistory;
      if (action.drillCount > drillHistory.length) {
        const pad = action.drillCount - drillHistory.length;
        const stubs = Array.from({ length: pad }, () => ({ timestamp: 0, score: 0, total: 0 }));
        drillHistory = [...stubs, ...drillHistory];
      }
      return { ...state, lessonsCompleted: action.lessonsCompleted, drillHistory };
    }
    case 'START_DRILL': {
      // 1 free drill, then locked until license
      if (!state.hasLicense && state.drillsUsed >= 1) return { ...state, screen: 'paywall' };
      return { ...state, screen: 'drill', drillConfig: action.config, questions: action.questions, currentQ: 0, score: 0, streak: 0, bestStreak: 0, timedOut: 0, results: [], timeLeft: action.config.timer ? action.config.timer * 10 : 0, drillsUsed: state.drillsUsed + 1 };
    }
    case 'ANSWER': {
      const ok = action.picked === action.correct;
      const q = state.questions[state.currentQ];
      return { ...state,
        score: ok ? state.score + 1 : state.score,
        streak: ok ? state.streak + 1 : 0,
        bestStreak: ok ? Math.max(state.bestStreak, state.streak + 1) : state.bestStreak,
        results: [...state.results, { ...q, correct: ok }],
      };
    }
    case 'TIMEOUT': {
      const q = state.questions[state.currentQ];
      return { ...state, timedOut: state.timedOut + 1, streak: 0, results: [...state.results, { ...q, correct: false, timedOut: true }] };
    }
    case 'NEXT_QUESTION': return { ...state, currentQ: state.currentQ + 1, timeLeft: state.drillConfig?.timer ? state.drillConfig.timer * 10 : 0 };
    case 'END_DRILL': return { ...state, screen: 'results' };
    case 'TIMER_TICK': return { ...state, timeLeft: state.timeLeft - 1 };
    case 'START_LESSON': {
      // Lessons 1-3 free, rest locked until license
      if (!state.hasLicense && action.id > 3) return { ...state, screen: 'paywall' };
      return { ...state, screen: 'lesson', currentLesson: action.id, lessonStep: 0, lessonPhase: 'concepts' };
    }
    case 'NEXT_STEP': return { ...state, lessonStep: state.lessonStep + 1 };
    case 'PREV_STEP': return { ...state, lessonStep: state.lessonStep - 1 };
    case 'START_QUIZ': return { ...state, lessonPhase: 'quiz' };
    case 'START_PIECE': {
      // If lesson has quiz questions, go to quiz first; otherwise straight to piece
      const currentLesson = lessons.find(l => l.id === state.currentLesson);
      const hasQuiz = currentLesson?.quiz && currentLesson.quiz.length > 0;
      return { ...state, lessonPhase: hasQuiz ? 'quiz' : 'piece' };
    }
    case 'COMPLETE_LESSON': {
      const completed = state.lessonsCompleted.includes(state.currentLesson)
        ? state.lessonsCompleted
        : [...state.lessonsCompleted, state.currentLesson];
      setStoredLessons(completed);
      return { ...state, lessonPhase: 'complete', lessonsCompleted: completed };
    }
    case 'LIB_FILTER': return { ...state, libFilter: action.filter };
    case 'LIB_SEARCH': return { ...state, libSearch: action.query };
    case 'OPEN_SCORE': return { ...state, currentScoreIndex: action.index };
    case 'SET_MIDI': return { ...state, midiConnected: action.connected };
    case 'UPDATE_FIELD': return { ...state, [action.field]: action.value };
    default: return state;
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SonataApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, setTtsState] = useState<'playing'|'paused'|'stopped'>('stopped');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const osmdInstanceRef = useRef<any>(null);
  const [onboardSlide, setOnboardSlide] = useState(0);

  // ---- Init: auth + progress ----
  useEffect(() => {
    setTTSStateCallback(setTtsState);
    // Load piano samples in background (non-blocking)
    loadPianoSamples().catch(() => {});

    // Native bootstrap — status bar, splash, app lifecycle
    if (isNative()) {
      document.documentElement.classList.add('native');
      (async () => {
        try {
          const [statusBarMod, splashMod, appMod] = await Promise.all([
            import('@capacitor/status-bar').catch(() => null),
            import('@capacitor/splash-screen').catch(() => null),
            import('@capacitor/app').catch(() => null),
          ]);
          if (statusBarMod) {
            await statusBarMod.StatusBar.setStyle({ style: statusBarMod.Style.Dark }).catch(() => {});
            await statusBarMod.StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
          }
          if (splashMod) {
            await splashMod.SplashScreen.hide().catch(() => {});
          }
          if (appMod) {
            appMod.App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
              if (!isActive) stopSpeaking();
            }).catch(() => {});
          }
        } catch { /* no-op */ }
      })();
    }

    (async () => {
      const user = await checkAuth();
      if (!user) { navigate('/login/', router); return; }
      dispatch({ type: 'SET_USER', user });

      const progress = await loadProgress(user.id);
      if (progress) {
        dispatch({ type: 'LOAD_PROGRESS', lessonsCompleted: progress.lessonsCompleted, drillCount: progress.drillCount });
        // Sync DB progress to localStorage so it persists offline
        if (progress.lessonsCompleted.length > 0) {
          setStoredLessons(progress.lessonsCompleted);
          // If user has DB progress, they've already onboarded — skip placement/onboarding
          setOnboarded();
        }
        if (Object.keys(progress.intervalAccuracy).length > 0) {
          localStorage.setItem('sonata_interval_acc', JSON.stringify(progress.intervalAccuracy));
        }
        if (progress.practiceDates.length > 0) {
          // Merge with any local dates so offline practice survives login
          const local: string[] = JSON.parse(localStorage.getItem('sonata_practice_dates') || '[]');
          const merged = Array.from(new Set([...local, ...progress.practiceDates]));
          localStorage.setItem('sonata_practice_dates', JSON.stringify(merged));
        }
      }

      // License check (Gumroad — web) or StoreKit (native)
      // Check localStorage first — instant, no network roundtrip.
      // This flag is set when the user activates on /account/ or the in-app paywall.
      try {
        if (!isNative() && localStorage.getItem('sonata_web_license') === 'true') {
          dispatch({ type: 'UPDATE_FIELD', field: 'hasLicense', value: true });
        }
      } catch {}
      // Then verify with Supabase (authoritative, handles cross-device)
      const license = await loadLicense(user.id);
      if (license) {
        dispatch({ type: 'UPDATE_FIELD', field: 'hasLicense', value: true });
        try { localStorage.setItem('sonata_web_license', 'true'); } catch {}
      }
      if (isNative()) {
        try {
          const subs = await import('@/lib/subscriptions');
          await subs.initPurchases();
          if (await subs.hasActiveSubscription()) {
            dispatch({ type: 'UPDATE_FIELD', field: 'hasLicense', value: true });
          }
        } catch { /* no-op */ }
      }

      // MIDI init
      if (navigator.requestMIDIAccess) {
        try {
          const access = await navigator.requestMIDIAccess();
          let connected = false;
          for (const input of Array.from(access.inputs.values())) {
            input.onmidimessage = (msg) => {
              const [status, note, velocity] = Array.from(msg.data || []);
              if (status >= 144 && status <= 159 && velocity > 0) {
                const noteName = NOTES[note % 12] + (Math.floor(note / 12) - 1);
                // MIDI note callback will be set per-screen
                if ((window as unknown as { _onMidiNote?: (n: string, m: number) => void })._onMidiNote) {
                  (window as unknown as { _onMidiNote: (n: string, m: number) => void })._onMidiNote(noteName, note);
                }
              }
            };
            connected = true;
          }
          dispatch({ type: 'SET_MIDI', connected });
        } catch { /* MIDI not available */ }
      }

      // Determine starting screen
      const hasDBProgress = progress && progress.lessonsCompleted.length > 0;
      const hasLocalProgress = isOnboarded();

      if (hasDBProgress || hasLocalProgress) {
        // Returning user — go to menu
        dispatch({ type: 'SET_SCREEN', screen: 'menu' });
      } else if (getPlacementResult() !== null) {
        // Took placement quiz but hasn't finished onboarding
        dispatch({ type: 'SET_SCREEN', screen: 'onboarding' });
      } else {
        // Brand new user — placement quiz
        dispatch({ type: 'SET_SCREEN', screen: 'placement' });
      }
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- ABCJS rendering ----
  const renderNotation = useCallback((abc: string, container: HTMLDivElement | null, width: number = 520, scale: number = 1.8) => {
    if (!container || !abc) return;
    import('abcjs').then((ABCJS) => {
      ABCJS.default.renderAbc(container, abc, {
        staffwidth: width, paddingtop: 0, paddingbottom: 0,
        add_classes: true, scale
      });
    });
  }, []);

  // ---- Timer for drills ----
  useEffect(() => {
    if (state.screen !== 'drill' || !state.drillConfig?.timer) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      dispatch({ type: 'TIMER_TICK' });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.screen, state.currentQ, state.drillConfig?.timer]);

  // Handle timer reaching zero
  useEffect(() => {
    if (state.screen === 'drill' && state.drillConfig?.timer && state.timeLeft <= 0 && state.currentQ < state.questions.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      hWarning();
      dispatch({ type: 'TIMEOUT' });
      setTimeout(() => advanceQuestion(), 1200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timeLeft]);

  // ---- TTS auto-play on lesson step change ----
  useEffect(() => {
    if (state.screen === 'lesson' && state.lessonPhase === 'concepts') {
      // V2 lessons have their own narration via the bottom audio element —
      // skip v1's TTS engine entirely so we don't get two voices at once.
      if (findLessonV2(state.currentLesson)) {
        stopSpeaking();
        return;
      }
      const lesson = lessons.find(l => l.id === state.currentLesson);
      if (lesson && lesson.steps[state.lessonStep]) {
        const audioFile = `/audio/L${state.currentLesson}-S${state.lessonStep + 1}.mp3`;
        speak(lesson.steps[state.lessonStep].text, audioFile);
      }
    }
    return () => stopSpeaking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.screen, state.lessonPhase, state.lessonStep, state.currentLesson]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (state.screen === 'lesson' && state.lessonPhase === 'concepts') {
        const lesson = lessons.find(l => l.id === state.currentLesson);
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          if (lesson && state.lessonStep < lesson.steps.length - 1) { stopSpeaking(); dispatch({ type: 'NEXT_STEP' }); }
          else if (lesson && state.lessonStep === lesson.steps.length - 1) { stopSpeaking(); dispatch({ type: 'START_QUIZ' }); }
        }
        if (e.key === 'ArrowLeft' && state.lessonStep > 0) { e.preventDefault(); stopSpeaking(); dispatch({ type: 'PREV_STEP' }); }
        if (e.key === 'p') togglePause();
      }
      if (state.screen === 'drill') {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          const btns = document.querySelectorAll<HTMLButtonElement>('.ans-btn:not(:disabled)');
          if (btns[num - 1]) btns[num - 1].click();
        }
      }
      if (e.key === 'Escape') {
        if (state.screen === 'drill') handleEndDrill();
        else if (state.screen !== 'menu' && state.screen !== 'loading') dispatch({ type: 'SET_SCREEN', screen: 'menu' });
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.screen, state.lessonPhase, state.lessonStep, state.currentLesson]);

  // ---- Drill helpers ----
  function handleAnswer(picked: string, correct: string) {
    if (timerRef.current) clearInterval(timerRef.current);
    const ok = picked === correct;
    dispatch({ type: 'ANSWER', picked, correct });
    if (ok) { playCorrectSound(); hSuccess(); } else { playWrongSound(); hError(); }
    // Visual feedback — flash the app container
    const appEl = document.querySelector('.sonata-app') as HTMLElement | null;
    flashElement(appEl, ok ? 'correct' : 'wrong');
    // Track interval accuracy
    const q = state.questions[state.currentQ];
    if (q.intervalInfo) updateIntervalAccuracy(q.intervalInfo.name + ' ' + q.intervalInfo.direction, ok);
    setTimeout(() => advanceQuestion(), ok ? 600 : 1200);
  }

  function advanceQuestion() {
    if (state.currentQ + 1 >= state.questions.length) {
      handleEndDrill();
    } else {
      dispatch({ type: 'NEXT_QUESTION' });
    }
  }

  function handleEndDrill() {
    if (timerRef.current) clearInterval(timerRef.current);
    const history = [...state.drillHistory, { timestamp: Date.now(), score: state.score, total: state.results.length }];
    setStoredDrills(history);
    recordPractice(state.user?.id);
    dispatch({ type: 'UPDATE_FIELD', field: 'drillHistory', value: history });

    if (state.user) saveDrillSession(state.user.id, state.results, 0);

    if (state.returnToLesson) {
      const lesson = lessons.find(l => l.id === state.currentLesson);
      const total = state.results.length;
      const correct = state.results.filter(r => r.correct).length;
      const accuracy = total ? correct / total : 0;
      if (accuracy >= (lesson?.advance || 0.80)) {
        hSuccess();
        dispatch({ type: 'COMPLETE_LESSON' });
        if (state.user) saveLessonComplete(state.user.id, state.currentLesson, accuracy);
      } else {
        dispatch({ type: 'END_DRILL' });
      }
      dispatch({ type: 'UPDATE_FIELD', field: 'returnToLesson', value: false });
    } else {
      dispatch({ type: 'END_DRILL' });
    }
  }

  function startDrill(config: DrillConfig) {
    const questions: Question[] = [];
    for (let i = 0; i < config.count; i++) questions.push(generateWeightedQuestion(config));
    dispatch({ type: 'START_DRILL', config, questions });
  }

  // ---- OSMD score loading (unused since the catalog browser was removed —
  //      kept so legacy LibraryScreen / LessonScreen still compile). ----
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function loadScore(url: string, container: HTMLDivElement) {
    try {
      // Clear any existing children (e.g. the React-rendered "Loading
      // score…" spinner) before OSMD takes over the container — OSMD
      // doesn't remove pre-existing DOM, so the spinner would otherwise
      // stay on top of the rendered score.
      container.innerHTML = '';
      const osmd = await import('opensheetmusicdisplay');
      const instance = new osmd.OpenSheetMusicDisplay(container, {
        backend: 'svg', drawTitle: false, drawSubtitle: false, drawComposer: false,
        drawCredits: false, drawPartNames: true, drawPartAbbreviations: false,
        drawingParameters: 'compact', autoResize: true, drawMetronomeMarks: false,
      });
      await instance.load(url);
      // Patch TempoExpressions crash
      try { for (const m of instance.Sheet.SourceMeasures) { if (m.TempoExpressions) m.TempoExpressions.length = 0; } } catch {}
      instance.render();
      // No more invert filter — notation defaults to black, which is
      // readable on the cream/parchment v2 background. The previous
      // invert was a holdover from the dark-themed v1 UI.
      container.querySelectorAll('svg').forEach(svg => {
        svg.style.background = 'transparent';
      });
      osmdInstanceRef.current = instance;
    } catch (e) {
      container.innerHTML = `<div style="color:var(--red);text-align:center;padding:40px">Failed to load score.<br><span style="font-size:12px;color:var(--text3)">${(e as Error).message || ''}</span></div>`;
    }
  }

  // ---- Play score via Web Audio ----
  function extractScoreNotes(): ScoreNote[] {
    const inst = osmdInstanceRef.current;
    if (!inst || !inst.Sheet) return [];
    const notes: ScoreNote[] = [];
    const beatDur = 0.6; // base beat duration (seconds) at reference tempo 100
    let currentTime = 0;
    try {
      for (const measure of inst.Sheet.SourceMeasures) {
        // VerticalSourceStaffEntryContainers are "moments in time" — each
        // contains one staff entry per staff (treble + bass for a grand staff).
        // Time must advance ONCE per moment, not once per staff entry, or
        // grand-staff pieces play at half speed.
        for (const vContainer of measure.VerticalSourceStaffEntryContainers) {
          let shortestHere = Infinity;
          for (const staffEntry of vContainer.StaffEntries) {
            if (!staffEntry) continue;
            for (const voiceEntry of staffEntry.VoiceEntries) {
              for (const note of voiceEntry.Notes) {
                const dur = note.Length.RealValue * 4 * beatDur;
                // Rests contribute to timing but produce no audio
                if (!note.isRest()) {
                  const midi = note.halfTone + 12;
                  notes.push({ midi, time: currentTime, duration: Math.min(dur, 4) });
                }
                // Include rests in shortest calculation — a rest's duration
                // still governs how much time passes before the next moment.
                if (dur > 0 && dur < shortestHere) shortestHere = dur;
              }
            }
          }
          currentTime += shortestHere === Infinity ? beatDur : shortestHere;
        }
      }
    } catch { /* Some scores have unusual structures */ }
    return notes;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function playScore(tempo: number = 100) {
    const notes = extractScoreNotes();
    if (notes.length === 0) return;
    await playScoreNotes(notes, tempo);
  }

  // ============================================================
  // RENDER
  // ============================================================
  if (state.screen === 'loading') {
    return <BootScreen />;
  }

  return (
    <ErrorBoundary>
      <div style={s.page} className="sonata-page">
        <div style={s.app} className="sonata-app">
          <div key={state.screen} className="sonata-page-enter">
            {state.screen === 'placement' && <PlacementScreen dispatch={dispatch} renderNotation={renderNotation} />}
            {state.screen === 'onboarding' && <OnboardingScreen slide={onboardSlide} setSlide={setOnboardSlide} dispatch={dispatch} renderNotation={renderNotation} />}
            {state.screen === 'menu' && <MenuScreen state={state} dispatch={dispatch} />}
            {state.screen === 'config' && <ConfigScreen dispatch={dispatch} startDrill={startDrill} />}
            {state.screen === 'drill' && <DrillScreen state={state} handleAnswer={handleAnswer} handleEndDrill={handleEndDrill} renderNotation={renderNotation} />}
            {state.screen === 'results' && <ResultsScreen state={state} dispatch={dispatch} />}
            {state.screen === 'lessons' && (
              <CurriculumMap
                completed={state.lessonsCompleted}
                onSelect={(id) => { unlockAudio(); dispatch({ type: 'START_LESSON', id }); }}
                onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
              />
            )}
            {state.screen === 'lesson' && (() => {
              // Route to the rich LessonV2 player for any of the 250
              // hand-authored lessons. Falls through to the legacy v1
              // LessonScreen only if the id isn't in the v2 corpus —
              // shouldn't happen in normal flow now that LessonsListScreen
              // iterates lessonsV2.
              const v2 = findLessonV2(state.currentLesson);
              if (v2) {
                return (
                  <LessonV2Screen
                    lesson={v2}
                    onExit={() => dispatch({ type: 'SET_SCREEN', screen: 'lessons' })}
                    onComplete={() => {
                      if (!state.lessonsCompleted.includes(v2.id)) {
                        dispatch({ type: 'COMPLETE_LESSON' });
                        // Persist to Supabase + the local practice-day
                        // streak. Same calls the legacy player makes so
                        // progress shows up everywhere it should.
                        if (state.user) {
                          saveLessonComplete(state.user.id, v2.id, 1.0);
                        }
                        recordPractice(state.user?.id);
                      }
                      dispatch({ type: 'SET_SCREEN', screen: 'lessons' });
                    }}
                  />
                );
              }
              return <LessonScreen state={state} dispatch={dispatch} renderNotation={renderNotation} loadScore={loadScore} playScore={playScore} />;
            })()}
            {state.screen === 'library' && <LibraryScreen state={state} dispatch={dispatch} loadScore={loadScore} playScore={playScore} />}
            {state.screen === 'progress' && <ProgressScreen state={state} dispatch={dispatch} />}
            {state.screen === 'sightReading' && <SightReadingScreen dispatch={dispatch} renderNotation={renderNotation} userId={state.user?.id} />}
            {state.screen === 'rhythm' && <RhythmScreen dispatch={dispatch} userId={state.user?.id} />}
            {state.screen === 'paywall' && <PaywallScreen dispatch={dispatch} userId={state.user?.id || ''} />}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function SonataLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={{ flexShrink: 0, display: 'block' }} aria-hidden="true">
      <rect width="512" height="512" rx="110" fill="#C8A96E" />
      <text x="256" y="360" textAnchor="middle" fontFamily="Georgia, 'Instrument Serif', serif" fontSize="340" fill="#0C0A09" fontStyle="italic" fontWeight="400">S</text>
    </svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  const isBrand = title === 'Sonata';
  return (
    <div style={s.header} className="sonata-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <SonataLogo size={isBrand ? 30 : 24} />
        {isBrand
          ? <h1 style={s.headerTitle}>Sonata</h1>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--gold)', lineHeight: 1 }}>Sonata</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
            </div>
          )
        }
      </div>
      {right && <div style={s.headerStats}>{right}</div>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BackLink({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" style={s.backLink} onClick={onClick}>
      {label || '← Back'}
    </button>
  );
}

function PianoKeyboard({ startMidi = 48, endMidi = 84, highlights = {}, fingers = {}, onClick, showNames = true }: {
  startMidi?: number; endMidi?: number; highlights?: Record<number, string>; fingers?: Record<number, number>;
  onClick?: (midi: number) => void; showNames?: boolean;
}) {
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const touchedRef = useRef(false); // Track if touch event fired to suppress click
  const containerRef = useRef<HTMLDivElement>(null);

  function handlePress(m: number) {
    hLight();
    playPianoKey(m);
    onClick?.(m);
    setPressed(p => { const n = new Set(p); n.add(m); return n; });
    setTimeout(() => setPressed(p => { const n = new Set(p); n.delete(m); return n; }), 200);
    // Spawn a floating note glyph above the keyboard for visual feedback
    const glyphs = ['♪', '♫', '♬'];
    spawnFloatNote(containerRef.current, glyphs[m % 3]);
  }

  function onTouch(m: number, e: React.TouchEvent) {
    e.preventDefault();
    touchedRef.current = true;
    handlePress(m);
  }

  function onClickKey(m: number) {
    // Skip if this was already handled by touch
    if (touchedRef.current) { touchedRef.current = false; return; }
    handlePress(m);
  }

  // Build white keys with relative positioning for blacks
  const whiteKeys: number[] = [];
  for (let m = startMidi; m <= endMidi; m++) {
    if (!isBlack(m)) whiteKeys.push(m);
  }

  return (
    <div ref={containerRef} className="sonata-piano-container" style={{
      marginTop: 'auto', padding: '16px 0 8px',
      borderTop: '1px solid rgba(200,169,110,0.1)',
      display: 'flex', justifyContent: 'center',
      overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    } as React.CSSProperties}>
      <div style={{ position: 'relative', display: 'flex' }}>
        {whiteKeys.map((m) => {
          const isC = m % 12 === 0;
          const isActive = pressed.has(m);
          const hl = highlights[m];
          return (
            <div key={m} className="sonata-key-white"
              onClick={() => onClickKey(m)}
              onTouchStart={(e) => onTouch(m, e)}
              style={{
                width: 'var(--key-w)', height: 'var(--key-h)',
                background: isActive
                  ? 'linear-gradient(180deg, #D8D4CC, #C8C4BC)'
                  : 'linear-gradient(180deg, #FAFAF6, #EBE7DF)',
                border: '1px solid #B8B4AC', borderTop: 'none',
                borderRadius: '0 0 6px 6px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                paddingBottom: 6, cursor: 'pointer', position: 'relative', zIndex: 1,
                boxShadow: isActive
                  ? 'inset 0 2px 4px rgba(0,0,0,0.15)'
                  : '0 6px 12px rgba(0,0,0,0.35), inset 0 -3px 0 rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.08s, background 0.08s',
                userSelect: 'none',
              } as React.CSSProperties}>
              {hl && <div style={{
                position: 'absolute', inset: 0, borderRadius: 'inherit',
                background: hl, opacity: 0.35, pointerEvents: 'none',
              }} />}
              {fingers[m] && <div style={{
                position: 'absolute', top: 10, width: 20, height: 20, borderRadius: '50%',
                background: 'var(--ink)', color: 'var(--gold)',
                border: '2px solid var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, pointerEvents: 'none', zIndex: 3,
              }}>{fingers[m]}</div>}
              {showNames && (
                <span style={{
                  fontSize: isC ? 10 : 8, fontWeight: isC ? 600 : 400,
                  color: isC ? '#666' : '#AAA',
                  fontFamily: 'var(--sans)', pointerEvents: 'none',
                  lineHeight: 1,
                }}>
                  {isC ? `C${Math.floor(m / 12) - 1}` : NOTES[m % 12]}
                </span>
              )}
            </div>
          );
        })}
        {/* Black keys — absolutely positioned over the white keys */}
        {whiteKeys.map((m, i) => {
          const nb = m + 1;
          if (nb > endMidi || !isBlack(nb)) return null;
          const isActive = pressed.has(nb);
          const hl = highlights[nb];
          return (
            <div key={nb} className="sonata-key-black"
              onClick={(e) => { e.stopPropagation(); onClickKey(nb); }}
              onTouchStart={(e) => { e.stopPropagation(); onTouch(nb, e); }}
              style={{
                position: 'absolute',
                left: `calc((${i + 1}) * var(--key-w) - var(--bkey-w) / 2)`,
                top: 0, width: 'var(--bkey-w)', height: 'var(--bkey-h)',
                background: isActive
                  ? 'linear-gradient(180deg, #444, #222)'
                  : 'linear-gradient(180deg, #333, #111)',
                border: '1px solid #000', borderTop: 'none',
                borderRadius: '0 0 4px 4px',
                zIndex: 2, cursor: 'pointer',
                boxShadow: isActive
                  ? 'inset 0 1px 3px rgba(0,0,0,0.5)'
                  : '0 4px 8px rgba(0,0,0,0.6), inset 0 -2px 0 rgba(255,255,255,0.05)',
                transition: 'box-shadow 0.08s, background 0.08s',
                userSelect: 'none',
              }}>
              {hl && <div style={{
                position: 'absolute', inset: 0, borderRadius: 'inherit',
                background: hl, opacity: 0.4, pointerEvents: 'none',
              }} />}
              {fingers[nb] && <div style={{
                position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                width: 16, height: 16, borderRadius: '50%',
                background: 'var(--ink)', color: 'var(--gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 600, pointerEvents: 'none', zIndex: 3,
              }}>{fingers[nb]}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NotationDisplay({ abc, width = 350 }: { abc: string; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !abc) return;
    import('abcjs').then((ABCJS) => {
      ABCJS.default.renderAbc(ref.current!, abc, {
        staffwidth: width, paddingtop: 0, paddingbottom: 0,
        add_classes: true, responsive: 'resize'
      });
    });
  }, [abc, width]);
  return <div ref={ref} style={s.notation} className="sonata-notation" />;
}

// ============================================================
// SCREEN: ONBOARDING
// ============================================================
// ============================================================
// PLACEMENT QUIZ — Assess skill level and skip to the right lesson
// ============================================================
const PLACEMENT_QUESTIONS = [
  // ======================= CATEGORY 1 — BASIC NOTE READING (L1-3) =======================
  { q: 'Which note sits on the bottom line of the treble clef?', options: ['D', 'E', 'F', 'G'], correct: 1, abc: 'X:1\nM:4/4\nL:1/4\nK:clef=treble\nE |' },
  { q: 'Which note is in the top space of the treble clef?', options: ['D', 'E', 'F', 'G'], correct: 1, abc: 'X:1\nM:4/4\nL:1/4\nK:clef=treble\ne |' },
  { q: 'Which note is on the middle line of the bass clef?', options: ['B', 'C', 'D', 'G'], correct: 2, abc: 'X:1\nM:4/4\nL:1/4\nK:clef=bass\nD |' },
  { q: 'Middle C is written...', options: ['Only below the treble staff', 'Only above the bass staff', 'One ledger line between the two staves', 'On the top line of the bass staff'], correct: 2, abc: '' },

  // ======================= CATEGORY 2 — INTERVALS, RHYTHM, DYNAMICS (L4-8) =======================
  { q: 'Which interval is a "step"?', options: ['2nd', '3rd', '4th', '5th'], correct: 0, abc: '' },
  { q: 'If both notes sit on staff lines, the interval between them is always...', options: ['A step (2nd)', 'An odd interval (3rd, 5th, 7th)', 'An even interval (2nd, 4th)', 'An octave'], correct: 1, abc: '' },
  { q: 'A dotted half note in 4/4 lasts how many beats?', options: ['2', '2.5', '3', '4'], correct: 2, abc: '' },
  { q: 'Which dynamic is the quietest?', options: ['f (forte)', 'mf (mezzo-forte)', 'p (piano)', 'pp (pianissimo)'], correct: 3, abc: '' },

  // ======================= CATEGORY 3 — ARTICULATION, KEY SIGS, ACCIDENTALS (L9-12) =======================
  { q: 'A staccato dot above a note means...', options: ['Play it quietly', 'Play it short and detached', 'Play it smoothly connected', 'Hold it longer'], correct: 1, abc: '' },
  { q: 'A key signature with one sharp (F#) is the key of...', options: ['C major', 'F major', 'G major', 'D major'], correct: 2, abc: 'X:1\nM:4/4\nL:1/4\nK:G\nG A B d |' },
  { q: 'An accidental (sharp/flat/natural) on a note lasts...', options: ['Just that note', 'Until the end of the bar', 'Until the end of the piece', 'Until the next rest'], correct: 1, abc: '' },
  { q: 'In a grand staff, which hand typically reads the bass clef?', options: ['Right hand', 'Left hand', 'Both hands equally', 'Depends on the piece'], correct: 1, abc: '' },

  // ======================= CATEGORY 4 — COMPOUND TIME, SCALES, CHORDS (L13-17) =======================
  { q: '6/8 time is usually felt as how many pulses per bar?', options: ['Six equal beats', 'Two beats (each a dotted quarter)', 'Three beats', 'Four beats'], correct: 1, abc: '' },
  { q: 'A triplet means...', options: ['Three notes played at the same time', 'Three notes in the time of two', 'Three notes in three beats', 'Three stacked pitches'], correct: 1, abc: '' },
  { q: 'Which pattern is a C major scale?', options: ['C D E F G A B C', 'C D♭ E F G A♭ B C', 'C D E F♯ G A B C', 'C E G B D F A C'], correct: 0, abc: '' },
  { q: 'A "triad" is built from...', options: ['Any three notes', 'Three notes stacked in thirds', 'Three notes stacked in fourths', 'The root, 5th, and 7th'], correct: 1, abc: '' },

  // ======================= CATEGORY 5 — REPEATS, COMPLEX RHYTHM, ADVANCED THEORY (L18-23) =======================
  { q: '"D.C. al Fine" means...', options: ['Slow down and stop', 'Repeat from the beginning to the word "Fine"', 'Skip to the coda', 'Play once more as written'], correct: 1, abc: '' },
  { q: 'Cut time (alla breve, ¢) feels like...', options: ['Half the speed of 4/4', '4/4 but counted in 2 beats per bar', 'Same as 3/4', 'Same as 6/8'], correct: 1, abc: '' },
  { q: 'A dotted-eighth followed by a sixteenth creates what feel?', options: ['Two equal notes', 'A triplet', 'A long-short "dotted" swing pattern', 'A pause then a note'], correct: 2, abc: '' },
  { q: 'A first-inversion C major chord has which note in the bass?', options: ['C', 'E', 'G', 'B'], correct: 1, abc: '' },
];

function PlacementScreen({ dispatch, renderNotation }: { dispatch: React.Dispatch<Action>; renderNotation: (abc: string, el: HTMLDivElement | null, w?: number, scale?: number) => void }) {
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [correctSet, setCorrectSet] = useState<Set<number>>(new Set());
  const [answered, setAnswered] = useState(-1);
  const notRef = useRef<HTMLDivElement>(null);
  const q = PLACEMENT_QUESTIONS[qIndex];

  useEffect(() => {
    if (step === 'quiz' && q?.abc) renderNotation(q.abc, notRef.current, 440, 1.8);
  }, [step, qIndex, q?.abc, renderNotation]);

  // 5 categories of 4 questions each, increasing difficulty (L1-23 coverage):
  //   Cat 0 (Q0-3):   basic note reading           → competency through Lesson 3
  //   Cat 1 (Q4-7):   intervals, rhythm, dynamics  → through Lesson 8
  //   Cat 2 (Q8-11):  articulation, key sigs       → through Lesson 12
  //   Cat 3 (Q12-15): compound time, scales, chords → through Lesson 17
  //   Cat 4 (Q16-19): repeats, complex rhythm, theory → through Lesson 21
  //
  // To advance through a category you need 3/4 correct (allows one slip).
  // You CANNOT skip a category you failed, even with later answers right —
  // this prevents lucky guessing from over-placing you.
  const CAT_SIZE = 4;
  const catScores = [0, 1, 2, 3, 4].map(cat => {
    let n = 0;
    for (let i = 0; i < CAT_SIZE; i++) if (correctSet.has(cat * CAT_SIZE + i)) n++;
    return n;
  });
  const score = correctSet.size;
  const MASTERY = 3; // need 3/4 in a category to advance past it

  const passed = catScores.map(s => s >= MASTERY);
  let startLesson = 1;
  let levelIndex = 0;
  // Must pass each category in sequence — no skipping.
  if (passed[0])                                                   { startLesson = 4;  levelIndex = 1; }
  if (passed[0] && passed[1])                                      { startLesson = 8;  levelIndex = 1; }
  if (passed[0] && passed[1] && passed[2])                         { startLesson = 12; levelIndex = 2; }
  if (passed[0] && passed[1] && passed[2] && passed[3])            { startLesson = 17; levelIndex = 3; }
  if (passed[0] && passed[1] && passed[2] && passed[3] && passed[4]) { startLesson = 21; levelIndex = 3; }

  const levelNames = ['Complete Beginner', 'Knows the Basics', 'Intermediate', 'Advanced'];

  function handleAnswer(idx: number) {
    if (answered >= 0) return;
    setAnswered(idx);
    const correct = idx === q.correct;
    if (correct) setCorrectSet(s => { const n = new Set(s); n.add(qIndex); return n; });
    setTimeout(() => {
      setAnswered(-1);
      if (qIndex < PLACEMENT_QUESTIONS.length - 1) {
        setQIndex(i => i + 1);
      } else {
        setStep('result');
      }
    }, 600);
  }

  const levelStickers: ChunkyColor[] = ['mint', 'sky', 'lilac', 'gold'];
  const levelMood = (levelIndex === 3 ? 'dancing' : levelIndex >= 2 ? 'excited' : 'happy') as 'dancing' | 'excited' | 'happy';

  if (step === 'intro') {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 24px' }}>
        <StaffBG opacity={0.25} />
        <FloatingNotes count={8} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Cleffy size={180} mood="thinking" />
          <Sticker color="gold" rotate={-3} style={{ marginTop: 10, marginBottom: 14 }}>◆ Placement quiz</Sticker>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 7vw, 56px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
            Where should we <span style={{ color: 'var(--berry)' }}>begin?</span>
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink2)', marginTop: 16, lineHeight: 1.55, maxWidth: 400, fontWeight: 500 }}>
            A few quick questions so Sonata can find the right starting point for you.
          </p>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <ChunkyButton color="berry" size="xl" onClick={() => setStep('quiz')} style={{ justifyContent: 'center' }}>Start quiz</ChunkyButton>
            <ChunkyButton color="cream" size="md" onClick={() => { setPlacementResult(1); dispatch({ type: 'SET_SCREEN', screen: 'onboarding' }); }} style={{ justifyContent: 'center' }}>
              I&apos;m a complete beginner
            </ChunkyButton>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'result') {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 24px' }}>
        <StaffBG opacity={0.25} />
        <FloatingNotes count={10} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Cleffy size={180} mood={levelMood} />
          <Sticker color={levelStickers[levelIndex]} rotate={-3} style={{ marginTop: 10, marginBottom: 14 }}>
            ◆ {levelNames[levelIndex]}
          </Sticker>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 7vw, 56px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
            You got <span style={{ color: 'var(--mint-deep)' }}>{score}/{PLACEMENT_QUESTIONS.length}</span>
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink2)', marginTop: 16, lineHeight: 1.55, maxWidth: 400, fontWeight: 500 }}>
            {startLesson === 1
              ? "We'll start from the very beginning — no prior knowledge needed."
              : `We'll start you at Lesson ${startLesson} and mark earlier lessons as complete.`}
          </p>
          <ChunkyButton color="berry" size="xl" onClick={() => {
            setPlacementResult(startLesson);
            dispatch({ type: 'SET_SCREEN', screen: 'onboarding' });
          }} style={{ justifyContent: 'center', marginTop: 28 }}>
            Continue →
          </ChunkyButton>
        </div>
      </div>
    );
  }

  // Quiz step
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', padding: '32px 20px' }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={5} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Sticker color="peach" rotate={-2} style={{ marginBottom: 14 }}>
          Question {qIndex + 1} of {PLACEMENT_QUESTIONS.length}
        </Sticker>
        <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
          {PLACEMENT_QUESTIONS.map((_, i) => (
            <div key={i} style={{ width: i === qIndex ? 22 : 8, height: 8, borderRadius: 999, background: i < qIndex ? 'var(--mint)' : i === qIndex ? 'var(--gold)' : 'var(--parchment)', border: '2px solid var(--ink)', transition: 'all 0.3s var(--bounce)' }} />
          ))}
        </div>

        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, lineHeight: 1.25, letterSpacing: '-0.02em', textWrap: 'balance' as const }}>
          {q.q}
        </h2>

        {q.abc && (
          <div style={{ marginTop: 20, background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: '20px 24px', boxShadow: '0 5px 0 var(--ink)', width: '100%' }}>
            <div ref={notRef} style={{ minHeight: 100 }} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 24 }}>
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct;
            const picked = answered === i;
            const color: ChunkyColor = answered >= 0
              ? isCorrect ? 'mint' : picked ? 'coral' : 'cream'
              : 'cream';
            const dim = answered >= 0 && !isCorrect && !picked;
            return (
              <ChunkyButton
                key={i}
                color={color}
                size="md"
                onClick={() => handleAnswer(i)}
                disabled={answered >= 0}
                style={{
                  width: '100%', justifyContent: 'flex-start',
                  textAlign: 'left', fontFamily: 'var(--sans)',
                  textTransform: 'none', letterSpacing: 0,
                  fontSize: 15, fontWeight: 700,
                  opacity: dim ? 0.4 : 1,
                }}
              >
                {opt}
              </ChunkyButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OnboardingScreen({ slide, setSlide, dispatch, renderNotation }: {
  slide: number; setSlide: (s: number) => void; dispatch: React.Dispatch<Action>;
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number, scale?: number) => void;
}) {
  const slides = [
    { title: 'Read by distance', body: 'Sonata teaches you to read music by distance, not by memorising note names. Steps, skips, and leaps.', abc: 'X:1\nM:4/4\nL:1/4\nK:clef=treble\nC D z E G |' },
    { title: 'The odd/even trick', body: 'Odd intervals (3rd, 5th, 7th) land on the same type — both lines or both spaces. Even intervals cross.', abc: 'X:1\nM:4/4\nL:1/4\nK:clef=treble\nC E z C F |' },
    { title: 'Tap or play', body: 'Answer drills by tapping on screen — or by playing notes on your real piano.', abc: '' },
  ];
  const sl = slides[slide];
  const notRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (sl.abc) renderNotation(sl.abc, notRef.current, 440, 1.8); }, [slide, sl.abc, renderNotation]);

  const accents: ChunkyColor[] = ['gold', 'mint', 'lilac'];
  const accent = accents[slide % accents.length];
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', position: 'relative', overflow: 'hidden', fontFamily: 'var(--sans)', animation: 'sn-pageTurn 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) both' }}>
      <StaffBG opacity={0.32} />
      <FloatingNotes count={12} />

      <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '32px 24px', textAlign: 'center' }}>
        <Sticker color={accent} rotate={-3} style={{ marginBottom: 24 }}>Chapter one · a beginning</Sticker>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Cleffy size={220} mood="waving" />
          <div style={{ position: 'absolute', top: 20, right: -20, background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 18, padding: '10px 14px', fontWeight: 800, fontSize: 13, color: 'var(--ink)', boxShadow: '0 4px 0 var(--ink)', transform: 'rotate(8deg)' }}>
            Hi, I&apos;m Cleffy!
          </div>
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 7vw, 64px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.035em', lineHeight: 0.95, maxWidth: 600 }}>
          {sl.title}<span style={{ color: 'var(--berry)' }}>.</span>
        </h1>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--ink2)', marginTop: 16, maxWidth: 420, lineHeight: 1.55, fontWeight: 500 }}>
          {sl.body}
        </p>

        {sl.abc && (
          <div style={{ marginTop: 20, background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: '20px 24px', boxShadow: '0 6px 0 var(--ink)', minWidth: 280, maxWidth: 460 }}>
            <div ref={notRef} style={{ minHeight: 100 }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, margin: '28px 0 20px' }}>
          {slides.map((_, i) => (
            <div key={i} style={{ width: i === slide ? 32 : 10, height: 10, borderRadius: 999, background: i <= slide ? 'var(--ink)' : 'rgba(42,30,20,0.25)', border: '2px solid var(--ink)', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
          ))}
        </div>

        <ChunkyButton color="berry" size="xl" icon={<span>→</span>} onClick={() => {
          hSelect();
          if (slide < slides.length - 1) setSlide(slide + 1);
          else {
            setOnboarded();
            const startAt = getPlacementResult() || 1;
            if (startAt > 1) {
              const prior = Array.from({ length: startAt - 1 }, (_, i) => i + 1);
              setStoredLessons(prior);
              dispatch({ type: 'LOAD_PROGRESS', lessonsCompleted: prior, drillCount: 0 });
            }
            dispatch({ type: 'SET_SCREEN', screen: 'menu' });
          }
        }}>
          {slide < slides.length - 1 ? 'Continue' : "Let's go"}
        </ChunkyButton>
      </div>

      <Candle x={16} y="calc(100% - 140px)" size={22} />
      <Candle x="calc(100% - 40px)" y="calc(100% - 140px)" size={22} />
    </div>
  );
}

// ============================================================
// SCREEN: MENU
// ============================================================
function getNextLesson(completed: number[]): { id: number; title: string; subtitle: string; piece: string } | null {
  for (const l of lessonsV2) {
    if (!completed.includes(l.id)) {
      return {
        id: l.id,
        title: l.title,
        subtitle: l.subtitle || l.goal || "",
        piece: l.piece?.title || "",
      };
    }
  }
  return null;
}

function getAchievements(state: AppState): { icon: string; label: string; done: boolean }[] {
  const practiceDates = getPracticeDates();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (practiceDates.includes(localDateKey(d))) streak++; else break;
  }
  const weak = getWeakestIntervals(1);
  const bestPct = weak.length > 0 ? 100 - weak[0].pct : 0;
  return [
    { icon: '🎹', label: 'First lesson', done: state.lessonsCompleted.length >= 1 },
    { icon: '🎯', label: 'First drill', done: state.drillHistory.length >= 1 },
    { icon: '🔥', label: '3-day streak', done: streak >= 3 },
    { icon: '⚡', label: '7-day streak', done: streak >= 7 },
    { icon: '📖', label: '10 lessons done', done: state.lessonsCompleted.length >= 10 },
    { icon: '🏆', label: 'All lessons done', done: state.lessonsCompleted.length >= lessons.length },
    { icon: '💯', label: '90%+ accuracy', done: bestPct >= 90 },
    { icon: '🎵', label: '50 drills', done: state.drillHistory.length >= 50 },
  ];
}

// Gamification: level tiers based on lessons + drills completed
const LEVEL_TIERS = [
  { min: 0,  name: 'Curious Ear',   icon: '♪' },
  { min: 3,  name: 'Beginner',      icon: '♩' },
  { min: 8,  name: 'Apprentice',    icon: '♬' },
  { min: 16, name: 'Journeyman',    icon: '𝄞' },
  { min: 28, name: 'Artist',        icon: '𝄢' },
  { min: 45, name: 'Virtuoso',      icon: '✦' },
];
function getLevel(totalXP: number) {
  let tier = LEVEL_TIERS[0];
  let next = LEVEL_TIERS[1];
  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (totalXP >= LEVEL_TIERS[i].min) {
      tier = LEVEL_TIERS[i];
      next = LEVEL_TIERS[i + 1] || LEVEL_TIERS[i];
    }
  }
  const toNext = next.min - tier.min;
  const progress = toNext > 0 ? Math.min(1, (totalXP - tier.min) / toNext) : 1;
  return { tier, next, progress };
}

function getGreeting(name: string, streak: number): string {
  const h = new Date().getHours();
  const timeOfDay = h < 5 ? 'Up late practising' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Night owl';
  const lines = [
    `${timeOfDay}${name ? ', ' + name : ''}! 👋`,
    'Hey, welcome back! 🎵',
    'Ready to make music? 🎹',
    'Let\'s play something today! ✨',
    streak >= 7 ? `🔥 ${streak} days strong!` : '',
    streak >= 3 ? `Look at that ${streak}-day streak! 🌟` : '',
  ].filter(Boolean);
  const idx = Math.floor(Date.now() / (1000 * 60 * 60 * 6)) % lines.length;
  return lines[idx];
}

// Ring progress SVG (used by Daily Mission)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProgressRing({ progress, size = 64, stroke = 5, label }: { progress: number; size?: number; stroke?: number; label?: string }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(200,169,110,0.15)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke="var(--gold)" strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      {label !== undefined && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--gold)', fontWeight: 500, fontFamily: 'var(--sans)' }}>{label}</div>
      )}
    </div>
  );
}

// Staff-line decorative divider — evokes sheet music paper
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StaffDivider() {
  return (
    <div className="sonata-staff-divider" aria-hidden="true">
      <span /><span /><span />
    </div>
  );
}

function MenuScreen({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const router = useRouter();
  const email = state.user?.email || '';

  // Ambient piano — starts if user enabled it, stops when leaving the menu
  useEffect(() => {
    startAmbiance();
    return () => stopAmbiance();
  }, []);

  const name = email ? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lessonPct = Math.round(state.lessonsCompleted.length / lessonsV2.length * 100);
  const nextLesson = getNextLesson(state.lessonsCompleted);
  const achievements = getAchievements(state);
  const earnedAchievements = achievements.filter(a => a.done);

  // Practice dates → streak + today (all in LOCAL time, not UTC)
  const dates = getPracticeDates();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (dates.includes(localDateKey(d))) streak++; else break;
  }
  const practicedToday = dates.includes(localDateKey());

  // Daily mission: 3 mini-tasks
  const totalDrills = state.drillHistory.length;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayDrills = state.drillHistory.filter(d => d && d.timestamp >= todayStart.getTime()).length;
  const missionTasks = [
    { label: 'Practice today', done: practicedToday },
    { label: 'Complete 1 drill', done: todayDrills >= 1 },
    { label: '5-day streak', done: streak >= 5 },
  ];
  const missionDone = missionTasks.filter(t => t.done).length;
  const missionPct = missionDone / missionTasks.length;

  // XP + level
  const totalXP = state.lessonsCompleted.length * 2 + totalDrills;
  const { tier, next, progress: levelProgress } = getLevel(totalXP);

  // Piece of the day — rotates daily, deterministic
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const featuredPiece = CATALOG.length > 0 ? CATALOG[dayIndex % CATALOG.length] : null;
  const featuredIndex = CATALOG.length > 0 ? (dayIndex % CATALOG.length) : 0;

  // Continue-card data — points at the next lesson on the curriculum
  // path. Lesson 1 if the user is brand new.
  const continueCard = nextLesson
    ? {
        label: nextLesson.title,
        sub: `Lesson ${nextLesson.id} of ${lessonsV2.length}`,
        pct: Math.round(
          (state.lessonsCompleted.length / lessonsV2.length) * 100
        ),
      }
    : { label: 'All lessons done', sub: 'Replay any lesson', pct: 100 };

  // Tile data — wires to existing reducer actions
  const tiles: { id: string; label: string; sub: string; color: ChunkyColor; glyph: string; onClick: () => void }[] = [
    { id: 'drill',    label: 'Drill',    sub: 'Note ID · Intervals',  color: 'coral', glyph: '𝄞', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'config' }) },
    { id: 'sight',    label: 'Sight',    sub: 'Read & play',          color: 'mint',  glyph: '𝆕', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'sightReading' }) },
    { id: 'rhythm',   label: 'Rhythm',   sub: 'Tap the pulse',        color: 'lilac', glyph: '♩', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'rhythm' }) },
    { id: 'lessons',  label: 'Lessons',  sub: 'Your journey',           color: 'gold', glyph: '𝄢', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'lessons' }) },
    { id: 'library',  label: 'Library',  sub: 'Browse pieces',           color: 'sky', glyph: '♪', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'library' }) },
    { id: 'progress', label: 'Progress', sub: `${streak}-day streak`, color: 'berry', glyph: '✦', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'progress' }) },
  ];

  // Unused legacy bindings — silence "unused" warnings without removing them
  void missionTasks; void missionDone; void missionPct; void tier; void next; void levelProgress;
  void earnedAchievements; void totalXP; void featuredPiece; void featuredIndex; void achievements;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', paddingBottom: 40 }}>
      <StaffBG opacity={0.28} />
      <FloatingNotes count={10} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--ink)', border: '3px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: 28, fontFamily: 'var(--serif)', boxShadow: '0 4px 0 var(--gold-deep)' }}>𝄞</div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>Sonata</div>
            <div style={{ fontSize: 10, color: 'var(--ink3)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>Learn music, beautifully</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StreakFlame count={streak} />
          <button
            type="button"
            onClick={() => { hSelect(); navigate('/account/', router); }}
            style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--lilac)', border: '3px solid var(--ink)', boxShadow: '0 4px 0 var(--lilac-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--cream)', fontSize: 16, cursor: 'pointer', fontFamily: 'var(--sans)' }}
            aria-label="Account"
          >
            {(name || 'You').charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-end', gap: 20, padding: '28px 32px 0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px' }}>
          <Sticker color="gold" rotate={-3} style={{ marginBottom: 12 }}>
            ◆ Welcome back{name ? `, ${name.split(' ')[0]}` : ''}
          </Sticker>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(48px, 7vw, 72px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.035em', lineHeight: 0.95 }}>
            Hello, <span style={{ color: 'var(--berry)', textDecoration: 'underline wavy', textDecorationColor: 'var(--gold)', textUnderlineOffset: 12, textDecorationThickness: 3 }}>maestro.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink2)', margin: '12px 0 0', maxWidth: 480, lineHeight: 1.5, fontWeight: 500 }}>
            Five minutes of practice a day grows a forest of fluency. Cleffy&apos;s ready when you are.
          </p>
        </div>
        <div style={{ width: 180, height: 220, position: 'relative', marginRight: 12 }}>
          <Cleffy size={150} mood={streak >= 2 ? 'excited' : practicedToday ? 'happy' : 'waving'} />
          <div style={{ position: 'absolute', top: -4, right: -4, padding: '6px 12px', background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 16, fontSize: 12, fontWeight: 800, color: 'var(--ink)', boxShadow: '0 4px 0 var(--ink)', transform: 'rotate(6deg)', whiteSpace: 'nowrap' }}>
            Let&apos;s play! ♪
          </div>
        </div>
      </div>

      {/* Tile grid — 2fr + 1fr + 1fr with continue card spanning */}
      <div style={{ position: 'relative', zIndex: 2, padding: '28px 32px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
        {/* Continue / Lessons — big tile */}
        <ChunkyCard
          color="peach"
          padding={24}
          onClick={() => {
            hSelect();
            unlockAudio();
            if (nextLesson) {
              dispatch({ type: 'START_LESSON', id: nextLesson.id });
            } else {
              dispatch({ type: 'SET_SCREEN', screen: 'lessons' });
            }
          }}
          style={{ gridColumn: 'span 2', minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}
        >
          <div aria-hidden="true" style={{ position: 'absolute', top: 10, right: 20, fontSize: 140, fontFamily: 'var(--serif)', color: 'var(--ink)', opacity: 0.15, lineHeight: 1, fontStyle: 'italic' }}>📖</div>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink)', opacity: 0.7 }}>
              {nextLesson ? 'Continue where you left off' : 'Start learning'}
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', marginTop: 6, lineHeight: 1 }}>
              {continueCard.label}
            </div>
            <div style={{ fontSize: 16, color: 'var(--ink2)', marginTop: 4, fontWeight: 600 }}>{continueCard.sub}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div style={{ flex: 1, height: 14, background: 'var(--ink)', borderRadius: 999, overflow: 'hidden', border: '2px solid var(--ink)' }}>
              <div style={{ width: `${continueCard.pct}%`, height: '100%', background: 'var(--gold)', borderRight: continueCard.pct > 0 ? '2px solid var(--ink)' : 'none' }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{continueCard.pct}%</div>
            <ChunkyButton color="cream" size="sm">{nextLesson ? 'Resume' : 'Start'}</ChunkyButton>
          </div>
        </ChunkyCard>

        {tiles.map((t) => (
          <ChunkyCard
            key={t.id}
            color={t.color}
            padding={20}
            onClick={() => { hSelect(); unlockAudio(); t.onClick(); }}
            style={{ minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}
          >
            <div aria-hidden="true" style={{ position: 'absolute', top: 0, right: 10, fontSize: 64, fontFamily: 'var(--serif)', color: 'var(--ink)', opacity: 0.18, lineHeight: 1, fontStyle: 'italic' }}>{t.glyph}</div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: 'var(--ink)', opacity: 0.75, marginTop: 4, fontWeight: 600 }}>{t.sub}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.08em', position: 'relative' }}>Open →</div>
          </ChunkyCard>
        ))}
      </div>

      {/* Secondary row: account, membership, sign out */}
      <div style={{ position: 'relative', zIndex: 2, padding: '20px 32px 0', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <ChunkyButton color="cream" size="sm" onClick={() => { hSelect(); navigate('/pricing/', router); }}>⭐ Membership</ChunkyButton>
        <ChunkyButton color="cream" size="sm" onClick={() => { hSelect(); navigate('/account/', router); }}>⚙️ Account</ChunkyButton>
        <ChunkyButton color="cream" size="sm" onClick={async () => { hSelect(); await signOut(); navigate('/login/', router); }}>👋 Sign Out</ChunkyButton>
      </div>

      {/* Candles */}
      <Candle x={16} y={280} size={20} />
      <Candle x="calc(100% - 40px)" y={280} size={20} />

      {state.midiConnected && (
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', fontSize: 11, marginTop: 14, color: 'var(--mint-deep)', fontWeight: 700 }}>🎹 MIDI connected</div>
      )}

      {/* Greeting debug binding (keeps linter quiet) */}
      <span hidden>{getGreeting(name, streak)}</span>
    </div>
  );
}

// ============================================================
// SCREEN: CONFIG
// ============================================================
function ConfigScreen({ dispatch, startDrill }: { dispatch: React.Dispatch<Action>; startDrill: (c: DrillConfig) => void }) {
  const [types, setTypes] = useState(['noteNaming', 'interval', 'oddEven']);
  const [clefs, setClefs] = useState(['treble', 'bass']);
  const [timer, setTimer] = useState(10);
  const [count, setCount] = useState(15);
  const [mode, setMode] = useState('tap');

  function toggle(arr: string[], val: string, setter: (a: string[]) => void) {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  }

  const typeLabels: Record<string, { label: string; glyph: string }> = {
    noteNaming:   { label: 'Notes',       glyph: '♪' },
    interval:     { label: 'Intervals',   glyph: '◇' },
    oddEven:      { label: 'Odd / Even',  glyph: '△' },
    pattern:      { label: 'Patterns',    glyph: '▦' },
    articulation: { label: 'Articulation',glyph: '!' },
    keySignature: { label: 'Key Sigs',    glyph: '♯' },
  };
  const allTypes = Object.keys(typeLabels);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 100 }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={7} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
        <button type="button" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 4px 0 var(--ink)', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--ink)' }}>
          ← Home
        </button>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>Configure your drill</div>
        <div style={{ width: 80 }} />
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 32px', display: 'flex', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
        <Cleffy size={100} mood="thinking" />
        <div>
          <Sticker color="coral" rotate={-3}>◆ note identification</Sticker>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 6vw, 60px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '8px 0 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Pick your <span style={{ color: 'var(--coral)' }}>pool.</span>
          </h1>
        </div>
      </div>

      {/* Config columns */}
      <div style={{ position: 'relative', zIndex: 2, padding: '24px 24px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
        {/* Left column — pool */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>◇ Drill types</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {allTypes.map(t => {
              const on = types.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { hSelect(); toggle(types, t, setTypes); }}
                  style={{
                    padding: '10px 16px', fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 13,
                    background: on ? 'var(--mint)' : 'var(--cream)',
                    color: 'var(--ink)',
                    border: '3px solid var(--ink)', borderRadius: 999,
                    boxShadow: `0 ${on ? 2 : 5}px 0 ${on ? 'var(--mint-deep)' : 'var(--ink)'}`,
                    transform: on ? 'translateY(3px)' : 'none',
                    cursor: 'pointer', transition: 'transform .12s var(--bounce)',
                  }}
                >
                  <span style={{ marginRight: 6, opacity: 0.6 }}>{typeLabels[t].glyph}</span>
                  {typeLabels[t].label}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>◇ Clef</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { k: 'treble', label: 'Treble', glyph: '𝄞' },
              { k: 'bass',   label: 'Bass',   glyph: '𝄢' },
            ].map(o => {
              const on = clefs.includes(o.k);
              return (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => { hSelect(); toggle(clefs, o.k, setClefs); }}
                  style={{
                    flex: 1, padding: '14px 12px', textAlign: 'center',
                    background: on ? 'var(--gold)' : 'var(--cream)',
                    border: '3px solid var(--ink)', borderRadius: 'var(--r2)',
                    boxShadow: `0 ${on ? 2 : 6}px 0 ${on ? 'var(--gold-deep)' : 'var(--ink)'}`,
                    transform: on ? 'translateY(4px)' : 'none',
                    cursor: 'pointer', color: 'var(--ink)', fontFamily: 'var(--sans)',
                  }}
                >
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1, color: 'var(--ink)' }}>{o.glyph}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{o.label}</div>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>◇ Answer mode</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { k: 'tap', label: 'Tap' },
              { k: 'play', label: 'Play' },
            ].map(o => {
              const on = mode === o.k;
              return (
                <button key={o.k} type="button" onClick={() => { hSelect(); setMode(o.k); }}
                  style={{
                    flex: 1, padding: '12px 18px',
                    background: on ? 'var(--lilac)' : 'var(--cream)',
                    color: 'var(--ink)',
                    border: '3px solid var(--ink)', borderRadius: 999,
                    boxShadow: `0 ${on ? 2 : 5}px 0 ${on ? 'var(--lilac-deep)' : 'var(--ink)'}`,
                    transform: on ? 'translateY(3px)' : 'none',
                    fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}
                >{o.label}</button>
              );
            })}
          </div>
        </div>

        {/* Right column — shape */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>◇ How long?</div>
          <div style={{ background: 'var(--parchment)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 20, boxShadow: '0 6px 0 var(--ink)', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink2)' }}>Questions</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1 }}>{count}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[10, 15, 20, 30].map(c => {
                const on = count === c;
                return (
                  <button key={c} type="button" onClick={() => { hSelect(); setCount(c); }}
                    style={{
                      flex: 1, padding: '10px 0', textAlign: 'center',
                      background: on ? 'var(--berry)' : 'var(--cream)',
                      color: on ? 'var(--cream)' : 'var(--ink)',
                      border: '3px solid var(--ink)', borderRadius: 'var(--r1)',
                      boxShadow: `0 ${on ? 2 : 4}px 0 ${on ? 'var(--berry-deep)' : 'var(--ink)'}`,
                      transform: on ? 'translateY(2px)' : 'none',
                      fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'var(--sans)',
                    }}
                  >{c}</button>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>◇ Timer</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
            {[0, 3, 5, 7, 10].map(t => {
              const on = timer === t;
              return (
                <button key={t} type="button" onClick={() => { hSelect(); setTimer(t); }}
                  style={{
                    padding: '12px 0', textAlign: 'center',
                    background: on ? 'var(--sky)' : 'var(--cream)',
                    color: 'var(--ink)',
                    border: '3px solid var(--ink)', borderRadius: 'var(--r1)',
                    boxShadow: `0 ${on ? 2 : 5}px 0 ${on ? 'var(--sky-deep)' : 'var(--ink)'}`,
                    transform: on ? 'translateY(3px)' : 'none',
                    fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}
                >{t === 0 ? 'Off' : `${t}s`}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Big start button */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '20px 24px', background: 'linear-gradient(0deg, var(--cream) 60%, transparent)', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <ChunkyButton
          color="coral"
          size="xl"
          icon={<span style={{ fontSize: 22 }}>▶</span>}
          onClick={() => { hSelect(); startDrill({
            types: types.length ? types : ['noteNaming'],
            clefs: clefs.length ? clefs : ['treble'],
            range: 'staff', intervals: [2, 3, 4, 5],
            timer: timer || null, count, answerMode: mode,
          }); }}
        >
          Start drill · {count} questions
        </ChunkyButton>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: DRILL
// ============================================================
function DrillScreen({ state, handleAnswer, handleEndDrill, renderNotation }: {
  state: AppState;
  handleAnswer: (p: string, c: string) => void; handleEndDrill: () => void;
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number, scale?: number) => void;
}) {
  const q = state.questions[state.currentQ];
  const notRef = useRef<HTMLDivElement>(null);
  const [answered, setAnswered] = useState(false);
  const [pickedAnswer, setPickedAnswer] = useState('');

  useEffect(() => { setAnswered(false); setPickedAnswer(''); }, [state.currentQ]);
  useEffect(() => { if (q?.abc) renderNotation(q.abc, notRef.current, 500, 2.0); }, [q, state.currentQ, renderNotation]);

  if (!q) return null;
  const timerPct = state.drillConfig?.timer ? (state.timeLeft / (state.drillConfig.timer * 10)) * 100 : 0;
  const timerColor = timerPct < 20 ? 'var(--red)' : timerPct < 40 ? 'var(--yellow)' : 'var(--green)';

  function onAnswer(picked: string) {
    if (answered) return;
    setAnswered(true);
    setPickedAnswer(picked);
    handleAnswer(picked, q.correctAnswer);
  }

  // void unused legacy styles
  void timerColor;
  const progressPct = state.questions.length > 0 ? (state.currentQ / state.questions.length) * 100 : 0;
  const cleffyMood: 'happy' | 'excited' | 'shocked' = answered
    ? (pickedAnswer === q.correctAnswer ? 'excited' : 'shocked')
    : 'happy';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden' }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={6} />

      {/* Top HUD */}
      <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', gap: 16 }}>
        <button type="button" onClick={handleEndDrill} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }} aria-label="Exit drill">
          ✕ Exit
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 16, background: 'var(--parchment)', border: '3px solid var(--ink)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--mint), var(--sky))', borderRight: progressPct > 0 ? '2px solid var(--ink)' : 'none' }} />
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 900, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            {state.currentQ + 1}<span style={{ color: 'var(--ink3)' }}>/{state.questions.length}</span>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--mint)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 4px 0 var(--mint-deep)', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
          ✓ {state.score}
        </div>
      </div>

      {/* Question label */}
      <div style={{ position: 'relative', zIndex: 4, textAlign: 'center', padding: '4px 16px 0' }}>
        <Sticker color="peach" rotate={-2}>
          Question {state.currentQ + 1} · {q.clef} clef
        </Sticker>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '10px 0 0', letterSpacing: '-0.025em' }}>
          {q.label || 'Name this note'}
        </h1>
      </div>

      {/* Giant staff card */}
      <div style={{ position: 'relative', zIndex: 3, margin: '20px 24px', background: 'var(--paper)', border: '4px solid var(--ink)', borderRadius: 'var(--r3)', boxShadow: '0 8px 0 var(--ink)', padding: '24px 20px', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div ref={notRef} style={{ width: '100%', minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="sonata-notation" />

        {/* Cleffy cheering in corner */}
        <div style={{ position: 'absolute', bottom: 8, right: 16 }}>
          <Cleffy size={70} mood={cleffyMood} />
        </div>

        {/* Timer ring */}
        {state.drillConfig?.timer && (
          <div style={{ position: 'absolute', top: 12, left: 16, width: 54, height: 54 }}>
            <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
              <circle cx="27" cy="27" r="22" fill="var(--cream)" stroke="var(--ink)" strokeWidth="3" />
              <circle cx="27" cy="27" r="22" fill="none" stroke="var(--coral)" strokeWidth="4"
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * timerPct) / 100}
                transform="rotate(-90 27 27)" strokeLinecap="round" />
              <text x="27" y="34" textAnchor="middle" fontFamily="var(--serif)" fontStyle="italic" fontWeight="900" fontSize="20" fill="var(--ink)">
                {Math.max(0, Math.ceil(state.timeLeft / 10))}
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* Answer buttons */}
      <div style={{ position: 'relative', zIndex: 3, padding: '0 24px 24px' }}>
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 10 }}>◇ Pick your answer</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(q.answerOptions.length, 4)}, 1fr)`, gap: 10 }}>
          {q.answerOptions.map((o, i) => {
            const isCorrect = answered && o === q.correctAnswer;
            const isWrong = answered && o === pickedAnswer && o !== q.correctAnswer;
            const dim = answered && !isCorrect && !isWrong;
            const color: ChunkyColor = isCorrect ? 'mint' : isWrong ? 'coral' : 'cream';
            return (
              <ChunkyButton
                key={i}
                color={color}
                size="lg"
                onClick={() => onAnswer(o)}
                disabled={answered}
                style={{ width: '100%', justifyContent: 'center', opacity: dim ? 0.3 : 1, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 26, textTransform: 'none', letterSpacing: 0 }}
              >
                {o}
              </ChunkyButton>
            );
          })}
        </div>
        {answered && (
          <div style={{ textAlign: 'center', marginTop: 14, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, fontWeight: 800, color: pickedAnswer === q.correctAnswer ? 'var(--mint-deep)' : 'var(--coral-deep)' }}>
            {pickedAnswer === q.correctAnswer ? 'Bravo!' : `It was ${q.correctAnswer}`}
          </div>
        )}
      </div>

      <PianoKeyboard highlights={answered ? q.pianoHighlight : {}} />
    </div>
  );
}

// ============================================================
// SCREEN: RESULTS
// ============================================================
function ResultsScreen({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const total = state.results.length;
  const correct = state.results.filter(r => r.correct).length;
  const pct = total ? Math.round(correct / total * 100) : 0;
  const pctColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
  useEffect(() => {
    if (pct >= 80) {
      fireConfetti(60);
      playCelebrationChord().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byType: Record<string, { total: number; correct: number }> = {};
  state.results.forEach(r => {
    if (!byType[r.type]) byType[r.type] = { total: 0, correct: 0 };
    byType[r.type].total++;
    if (r.correct) byType[r.type].correct++;
  });

  const weak = getWeakestIntervals(3);

  void pctColor; void weak;
  const cleffyMood: 'excited' | 'happy' | 'dancing' | 'thinking' = pct >= 80 ? 'dancing' : pct >= 50 ? 'happy' : 'thinking';
  const headline = pct >= 90 ? 'Bravissimo!' : pct >= 80 ? 'Beautiful!' : pct >= 60 ? 'Nice work!' : pct >= 40 ? 'Keep going!' : "Don't give up!";
  const wrongIndices: number[] = [];
  state.results.forEach((r, i) => { if (!r.correct) wrongIndices.push(i); });

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--berry)', fontFamily: 'var(--sans)', overflow: 'hidden', padding: '20px 20px 40px' }}>
      {/* Confetti */}
      {Array.from({ length: 22 }).map((_, i) => {
        const colors = ['var(--gold)', 'var(--mint)', 'var(--sky)', 'var(--coral)', 'var(--peach)', 'var(--cream)'];
        return (
          <div key={i} aria-hidden="true" style={{
            position: 'absolute',
            left: `${(i * 37) % 100}%`,
            top: `-${10 + (i % 7) * 6}%`,
            width: 10, height: 16,
            background: colors[i % colors.length],
            border: '1.5px solid var(--ink)',
            borderRadius: 2,
            animation: `sn-confetti ${3 + (i % 5) * 0.3}s linear infinite ${(i % 10) * 0.2}s`,
            zIndex: 1,
          }} />
        );
      })}
      <StaffBG opacity={0.12} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--cream)', marginBottom: 12 }}>
        <button type="button" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(255,255,255,0.18)', color: 'var(--cream)', border: '3px solid var(--cream)', borderRadius: 999, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }} aria-label="Close">
          ✕ Close
        </button>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, fontWeight: 700, opacity: 0.9 }}>Drill complete</div>
        <div style={{ width: 90 }} />
      </div>

      {/* Big celebration */}
      <div style={{ position: 'relative', zIndex: 4, textAlign: 'center', color: 'var(--cream)', marginTop: 8 }}>
        <div style={{
          display: 'inline-block',
          fontFamily: 'var(--serif)', fontSize: 'clamp(56px, 10vw, 104px)', fontWeight: 900, fontStyle: 'italic',
          color: 'var(--gold-lite)', letterSpacing: '-0.04em', lineHeight: 0.95,
          textShadow: '0 6px 0 var(--ink), 0 0 40px rgba(255,217,135,0.5)',
          animation: 'sn-celeb 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}>
          {headline}
        </div>
        <div style={{ fontSize: 16, opacity: 0.95, marginTop: 4, fontWeight: 600 }}>
          {pct >= 80 ? 'Your sharpest drill this week' : 'Every drill makes you stronger'}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ position: 'relative', zIndex: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, margin: '28px auto 0', maxWidth: 980 }}>
        {/* Accuracy */}
        <div style={{ background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 18, boxShadow: '0 6px 0 var(--ink)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink3)', textTransform: 'uppercase' }}>Accuracy</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 56, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1 }}>
            {pct}<span style={{ fontSize: 24, color: 'var(--ink3)' }}>%</span>
          </div>
          <div style={{ fontSize: 13, color: pct >= 80 ? 'var(--mint-deep)' : 'var(--ink3)', fontWeight: 700, marginTop: 2 }}>
            {correct}/{total} correct
          </div>
        </div>

        {/* Center — Cleffy + dots */}
        <div style={{ background: 'var(--cream)', border: '4px solid var(--ink)', borderRadius: 'var(--r3)', padding: 20, boxShadow: '0 8px 0 var(--ink)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Cleffy size={140} mood={cleffyMood} />
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, fontStyle: 'italic', color: 'var(--ink)', marginTop: 8 }}>
            You got <span style={{ color: 'var(--mint-deep)' }}>{correct} / {total}</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 260 }}>
            {state.results.map((r, i) => (
              <div key={i} aria-hidden="true" style={{
                width: 16, height: 16, borderRadius: 4, border: '2px solid var(--ink)',
                background: r.correct ? 'var(--mint)' : 'var(--coral)',
              }} />
            ))}
          </div>
          <Sticker color="gold" rotate={-4} style={{ position: 'absolute', top: -14, right: -12 }}>
            +{correct * 10} ◆ xp
          </Sticker>
        </div>

        {/* Best streak */}
        <div style={{ background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 18, boxShadow: '0 6px 0 var(--ink)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink3)', textTransform: 'uppercase' }}>Best streak</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 40, animation: 'sn-flame 1.6s ease-in-out infinite' }}>🔥</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 56, fontWeight: 900, fontStyle: 'italic', color: 'var(--coral)', lineHeight: 1 }}>{state.bestStreak}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 700, marginTop: 4 }}>Timed out: {state.timedOut}</div>
        </div>
      </div>

      {/* Review misses */}
      {wrongIndices.length > 0 && (
        <div style={{ position: 'relative', zIndex: 3, background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 18, boxShadow: '0 6px 0 var(--ink)', margin: '20px auto 0', maxWidth: 980 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 10 }}>Look again</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {state.results.filter(r => !r.correct).slice(0, 6).map((r, i) => (
              <div key={i} style={{ background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 'var(--r1)', padding: '10px 12px' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{r.correctAnswer}</div>
                <div style={{ fontSize: 12, color: 'var(--coral-deep)', fontWeight: 700 }}>
                  {r.timedOut ? 'Timed out' : 'Missed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ position: 'relative', zIndex: 4, display: 'flex', justifyContent: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
        <ChunkyButton color="cream" size="lg" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'config' })}>Again</ChunkyButton>
        <ChunkyButton color="gold" size="lg" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'lessons' })}>Next lesson →</ChunkyButton>
        <ChunkyButton color="cream" size="lg" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}>Home</ChunkyButton>
      </div>

      <button style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'var(--cream)', opacity: 0.75, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)', textDecoration: 'underline' }}
        onClick={() => {
          const text = `I just scored ${pct}% on a Sonata drill! 🎹 Learning to read piano sheet music.`;
          if (navigator.share) navigator.share({ text }).catch(() => {});
          else { navigator.clipboard.writeText(text); alert('Copied to clipboard!'); }
        }}>Share your result</button>
    </div>
  );
}

// ============================================================
// SCREEN: LESSONS LIST  (legacy — replaced by CurriculumMap.
// Kept in source as a fallback flat-grid view.)
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LessonsListScreen({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const tileColors: ChunkyColor[] = ['gold', 'mint', 'sky', 'lilac', 'peach', 'coral', 'berry'];
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={6} />

      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
        <button type="button" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 4px 0 var(--ink)', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Home
        </button>
        <Sticker color="peach" rotate={-2}>◆ {state.lessonsCompleted.length}/{lessonsV2.length} · {Math.round((state.lessonsCompleted.length / lessonsV2.length) * 100)}%</Sticker>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 2, padding: '0 32px 20px', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <Cleffy size={100} mood="happy" />
        <div>
          <Sticker color="gold" rotate={-3}>◆ Your journey</Sticker>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 6vw, 58px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '6px 0 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Your <span style={{ color: 'var(--berry)' }}>lessons.</span>
          </h1>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, maxWidth: 1100, margin: '0 auto' }}>
        {lessonsV2.map((l, i) => {
          const complete = state.lessonsCompleted.includes(l.id);
          const prevComplete = i === 0 || state.lessonsCompleted.includes(lessonsV2[i - 1].id);
          const locked = !prevComplete && !complete;
          const color: ChunkyColor = locked ? 'cream' : complete ? 'mint' : tileColors[i % tileColors.length];
          const pieceLabel = l.piece?.title || '';
          const bossBadge = l.is_graduation ? ' 🏆' : l.is_tier_boss ? ' 👑' : l.is_mid_boss ? ' 👑' : l.is_act_boss ? ' 🎯' : '';
          return (
            <ChunkyCard
              key={l.id}
              color={color}
              padding={16}
              onClick={locked ? undefined : () => { hSelect(); unlockAudio(); dispatch({ type: 'START_LESSON', id: l.id }); }}
              style={{ opacity: locked ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}
            >
              <div style={{
                width: 52, height: 52, flexShrink: 0, borderRadius: 'var(--r1)',
                background: 'var(--cream)', border: '3px solid var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 900, fontSize: 22, color: 'var(--ink)',
              }}>{l.id}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.1 }}>{l.title}{bossBadge}</div>
                <div style={{ fontSize: 12, color: 'var(--ink)', opacity: 0.75, fontWeight: 600, marginTop: 3 }}>{l.subtitle || l.goal}{pieceLabel ? ` · ${pieceLabel}` : ''}</div>
              </div>
              <div style={{ fontSize: 22, color: 'var(--ink)', fontWeight: 800 }}>{complete ? '✓' : locked ? '🔒' : '→'}</div>
            </ChunkyCard>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: LESSON (concepts / piece / complete)
// Loads the LessonV2 lesson by id and runs the page-by-page player.
// ============================================================
function LessonScreen({ state, dispatch, renderNotation, loadScore, playScore }: {
  state: AppState; dispatch: React.Dispatch<Action>;
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number, scale?: number) => void;
  loadScore: (url: string, container: HTMLDivElement) => Promise<void>;
  playScore: (tempo?: number) => Promise<void>;
}) {
  const lesson = lessons.find(l => l.id === state.currentLesson);
  if (!lesson) return null;

  if (state.lessonPhase === 'concepts') {
    return <LessonConcepts lesson={lesson} state={state} dispatch={dispatch} renderNotation={renderNotation} />;
  }
  if (state.lessonPhase === 'quiz') {
    return <LessonQuiz lesson={lesson} dispatch={dispatch} />;
  }
  if (state.lessonPhase === 'piece') {
    return <LessonPiece lesson={lesson} state={state} dispatch={dispatch} loadScore={loadScore} playScore={playScore} />;
  }
  return <LessonComplete lesson={lesson} dispatch={dispatch} />;
}

function LessonConcepts({ lesson, state, dispatch, renderNotation }: {
  lesson: Lesson; state: AppState; dispatch: React.Dispatch<Action>;
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number, scale?: number) => void;
}) {
  const step = lesson.steps[state.lessonStep];
  const notRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (step?.abc) renderNotation(step.abc, notRef.current, 600, 2.2); }, [state.lessonStep, step, renderNotation]);

  const totalSteps = lesson.steps.length;
  return (
    <div key={state.lessonStep} style={{ position: 'relative', minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 120, animation: 'sn-pageTurn 0.6s cubic-bezier(0.2, 0.8, 0.3, 1) both' }}>
      <StaffBG opacity={0.28} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => { hSelect(); stopSpeaking(); dispatch({ type: 'SET_SCREEN', screen: 'lessons' }); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Exit lesson
        </button>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, fontWeight: 700, color: 'var(--ink2)' }}>Lesson {lesson.id} · {lesson.title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <DotRow total={Math.min(totalSteps, 12)} current={Math.min(state.lessonStep, 11)} color="gold" />
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink2)' }}>{state.lessonStep + 1}/{totalSteps}</div>
        </div>
      </div>

      {/* Spread — two pages side-by-side on tablet, stacked on phone */}
      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, padding: '20px 24px 0', maxWidth: 1100, margin: '0 auto' }}>
        {/* LEFT PAGE — teaching text */}
        <div>
          <Sticker color="peach" rotate={-3}>◆ Step {state.lessonStep + 1}</Sticker>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 50px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '12px 0 14px', letterSpacing: '-0.03em', lineHeight: 0.98, textWrap: 'balance' as const }}>
            {lesson.title}<span style={{ color: 'var(--berry)' }}>.</span>
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink2)', lineHeight: 1.55, margin: 0, fontStyle: 'italic', textWrap: 'pretty' as const }}>
            {step.text}
          </p>

          {/* Audio strip */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--parchment)', border: '3px solid var(--ink)', borderRadius: 999, padding: '8px 8px 8px 16px', boxShadow: '0 4px 0 var(--ink)' }}>
            <button type="button" onClick={togglePause} aria-label="Play / pause"
              style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--coral)', border: '3px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--cream)', boxShadow: '0 3px 0 var(--coral-deep)', cursor: 'pointer' }}>
              ▶
            </button>
            <div style={{ flex: 1, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink3)', fontWeight: 700 }}>Cleffy reads the lesson</div>
            <button type="button" onClick={toggleSlow} aria-label="Slow down"
              style={{ width: 38, height: 38, borderRadius: 999, background: getTTSSpeed() === 0.75 ? 'var(--gold)' : 'var(--cream)', border: '3px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--ink)', cursor: 'pointer', fontSize: 12 }}>
              ½×
            </button>
            <button type="button" onClick={replaySpeak} aria-label="Replay"
              style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--cream)', border: '3px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--ink)', cursor: 'pointer', fontSize: 16 }}>
              ↻
            </button>
          </div>

          {/* Cleffy nudge */}
          <div style={{ marginTop: 16, background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 14, boxShadow: '0 6px 0 var(--ink)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Cleffy size={70} mood="happy" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink3)', textTransform: 'uppercase' }}>Cleffy&apos;s nudge</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink)', marginTop: 2, lineHeight: 1.4 }}>
                Take a breath. <b>Read it twice.</b>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PAGE — visual figure */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            Figure {lesson.id}.{state.lessonStep + 1}
          </div>
          <div style={{ marginTop: 12, background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: '28px 20px', boxShadow: '0 6px 0 var(--ink)', position: 'relative', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {step.abc ? (
              <div ref={notRef} className="sonata-notation" style={{ width: '100%', minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--ink3)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20 }}>
                Watch the keys below
              </div>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <PianoKeyboard highlights={step.piano || {}} fingers={step.fingers || {}} />
          </div>
        </div>
      </div>

      {/* Bottom nav — fixed */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '16px 20px', background: 'linear-gradient(0deg, var(--paper) 70%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, gap: 10 }}>
        {state.lessonStep > 0 ? (
          <ChunkyButton color="cream" size="md" onClick={() => { hSelect(); stopSpeaking(); dispatch({ type: 'PREV_STEP' }); }}>← Previous</ChunkyButton>
        ) : <div />}
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink3)', textAlign: 'center', flex: 1 }}>
          {state.lessonStep + 1} of {totalSteps}
        </div>
        {state.lessonStep < totalSteps - 1
          ? <ChunkyButton color="berry" size="md" onClick={() => { hSelect(); stopSpeaking(); dispatch({ type: 'NEXT_STEP' }); }}>Next page →</ChunkyButton>
          : <ChunkyButton color="gold" size="md" onClick={() => { hSelect(); stopSpeaking(); dispatch({ type: 'START_QUIZ' }); }}>Quiz →</ChunkyButton>
        }
      </div>

      <Candle x={14} y="60%" size={20} />
      <Candle x="calc(100% - 38px)" y="60%" size={20} />
    </div>
  );
}

function LessonQuiz({ lesson, dispatch }: { lesson: Lesson; dispatch: React.Dispatch<Action> }) {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState(-1);

  const quiz = lesson.quiz || [];
  if (quiz.length === 0) {
    dispatch({ type: 'UPDATE_FIELD', field: 'lessonPhase', value: 'piece' });
    return null;
  }

  const q = quiz[current];
  if (!q) { dispatch({ type: 'UPDATE_FIELD', field: 'lessonPhase', value: 'piece' }); return null; }

  function handleAnswer(idx: number) {
    if (answered) return;
    setAnswered(true);
    setPicked(idx);
    if (idx === q.correct) { setScore(s => s + 1); playCorrectSound(); }
    else { playWrongSound(); }
  }

  function next() {
    if (current + 1 >= quiz.length) {
      // Quiz done — go to piece
      dispatch({ type: 'UPDATE_FIELD', field: 'lessonPhase', value: 'piece' });
    } else {
      setCurrent(c => c + 1);
      setAnswered(false);
      setPicked(-1);
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.25} />
      <FloatingNotes count={5} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', gap: 12 }}>
        <button type="button" onClick={() => { hSelect(); dispatch({ type: 'UPDATE_FIELD', field: 'lessonPhase', value: 'concepts' }); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Back to lesson
        </button>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, fontWeight: 700, color: 'var(--ink2)' }}>Lesson {lesson.id} · Quiz</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--mint)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--mint-deep)', fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>
          ✓ {score}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 560, margin: '0 auto', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Sticker color="gold" rotate={-2} style={{ marginBottom: 12 }}>
          Question {current + 1} of {quiz.length}
        </Sticker>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {quiz.map((_, i) => (
            <div key={i} style={{ width: i === current ? 22 : 8, height: 8, borderRadius: 999, background: i < current ? 'var(--mint)' : i === current ? 'var(--gold)' : 'var(--parchment)', border: '2px solid var(--ink)', transition: 'all 0.3s var(--bounce)' }} />
          ))}
        </div>

        {/* Question */}
        <div style={{ background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: '22px 24px', boxShadow: '0 6px 0 var(--ink)', marginBottom: 20, width: '100%' }}>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink)', margin: 0, lineHeight: 1.45, fontWeight: 600, textWrap: 'balance' as const }}>{q.q}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.correct;
            const isPicked = idx === picked;
            const color: ChunkyColor = answered
              ? isCorrect ? 'mint' : isPicked ? 'coral' : 'cream'
              : 'cream';
            const dim = answered && !isCorrect && !isPicked;
            return (
              <ChunkyButton
                key={idx}
                color={color}
                size="md"
                onClick={() => handleAnswer(idx)}
                disabled={answered}
                style={{
                  width: '100%', justifyContent: 'flex-start', textAlign: 'left',
                  fontFamily: 'var(--sans)', textTransform: 'none', letterSpacing: 0,
                  fontSize: 15, fontWeight: 700, opacity: dim ? 0.4 : 1,
                }}
              >
                {opt}
              </ChunkyButton>
            );
          })}
        </div>

        {answered && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, fontWeight: 800, color: picked === q.correct ? 'var(--mint-deep)' : 'var(--coral-deep)' }}>
              {picked === q.correct ? 'Bravo!' : 'Not quite'}
            </div>
            <ChunkyButton color="berry" size="lg" onClick={next} style={{ justifyContent: 'center' }}>
              {current + 1 >= quiz.length ? (lesson.piece ? 'Play the piece →' : 'Finish lesson →') : 'Next question →'}
            </ChunkyButton>
          </div>
        )}
      </div>
    </div>
  );
}

function LessonPiece({ lesson, state, dispatch, loadScore, playScore }: {
  lesson: Lesson; state: AppState; dispatch: React.Dispatch<Action>;
  loadScore: (url: string, container: HTMLDivElement) => Promise<void>;
  playScore: (tempo?: number) => Promise<void>;
}) {
  const ci = findLessonCatalogIndex(lesson.id);
  const scoreRef = useRef<HTMLDivElement>(null);
  const wt = lesson.walkthrough || [];
  const [wtStep, setWtStep] = useState(0);
  const [wtDone, setWtDone] = useState(wt.length === 0);

  useEffect(() => {
    if (ci < 0) { hSuccess(); dispatch({ type: 'COMPLETE_LESSON' }); saveLessonComplete(state.user!.id, state.currentLesson, 1.0); recordPractice(state.user?.id); return; }
    const piece = CATALOG[ci];
    const url = getCatalogUrl(piece);
    if (scoreRef.current) loadScore(url, scoreRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ci]);

  if (ci < 0) return null;
  const piece = CATALOG[ci];
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.25} />
      <FloatingNotes count={5} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => { hSelect(); dispatch({ type: 'UPDATE_FIELD', field: 'lessonPhase', value: 'concepts' }); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Back to lesson
        </button>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, fontWeight: 700, color: 'var(--ink2)' }}>Lesson {lesson.id} · Piece</div>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 860, margin: '0 auto', padding: '0 20px' }}>
        {/* Piece title */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Sticker color="peach" rotate={-2} style={{ marginBottom: 10 }}>◆ Play the piece</Sticker>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 6vw, 48px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {piece.t}
          </h1>
          <p style={{ color: 'var(--ink3)', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{piece.c}</p>
        </div>

        {/* Score card */}
        <div style={{ background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 20, boxShadow: '0 6px 0 var(--ink)', marginBottom: 16 }}>
          <div ref={scoreRef} style={{ minHeight: 300, overflowX: 'auto' }}>
            <LoadingSpinner text="Loading score..." />
          </div>
        </div>

        {/* Walkthrough */}
        {!wtDone && wt.length > 0 && (
          <div style={{ background: 'var(--mint)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 18, boxShadow: '0 5px 0 var(--mint-deep)', marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Cleffy size={70} mood="happy" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink)', opacity: 0.75, textTransform: 'uppercase' }}>
                Walkthrough {wtStep + 1}/{wt.length}
              </div>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink)', margin: '6px 0 12px', lineHeight: 1.5, fontWeight: 600 }}>
                {wt[wtStep]}
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {wtStep > 0 && (
                  <ChunkyButton color="cream" size="sm" onClick={() => { hSelect(); setWtStep(s => s - 1); }}>Previous</ChunkyButton>
                )}
                {wtStep < wt.length - 1 ? (
                  <ChunkyButton color="berry" size="sm" onClick={() => { hSelect(); setWtStep(s => s + 1); }}>Next</ChunkyButton>
                ) : (
                  <ChunkyButton color="berry" size="sm" onClick={() => { hSelect(); setWtDone(true); }}>Got it! →</ChunkyButton>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Playback + Complete */}
        {wtDone && (
          <>
            <div style={{ background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 16, boxShadow: '0 5px 0 var(--ink)', marginBottom: 16 }}>
              <ScorePlaybackControls playScore={playScore} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <ChunkyButton color="gold" size="xl" onClick={() => {
                hSuccess();
                stopScorePlayback();
                dispatch({ type: 'COMPLETE_LESSON' });
                if (state.user) saveLessonComplete(state.user.id, state.currentLesson, 1.0);
                recordPractice(state.user?.id);
              }}>Complete lesson ✓</ChunkyButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const CELEBRATION_PHRASES = ['Beautiful!', 'Nailed it!', 'Woohoo!', 'Bravo!', 'Yes!', 'Magnifique!', 'You did it!'];

function LessonComplete({ lesson, dispatch }: { lesson: Lesson; dispatch: React.Dispatch<Action> }) {
  const nextLesson = lessons.find(l => l.id === lesson.id + 1);
  const phrase = CELEBRATION_PHRASES[Math.floor(Math.random() * CELEBRATION_PHRASES.length)];
  useEffect(() => {
    // Fire celebration on mount
    fireConfetti(80);
    playCelebrationChord().catch(() => {});
  }, []);
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--berry)', fontFamily: 'var(--sans)', overflow: 'hidden', padding: '20px 20px 40px' }}>
      {/* Confetti */}
      {Array.from({ length: 22 }).map((_, i) => {
        const colors = ['var(--gold)', 'var(--mint)', 'var(--sky)', 'var(--coral)', 'var(--peach)', 'var(--cream)'];
        return (
          <div key={i} aria-hidden="true" style={{
            position: 'absolute',
            left: `${(i * 37) % 100}%`,
            top: `-${10 + (i % 7) * 6}%`,
            width: 10, height: 16,
            background: colors[i % colors.length],
            border: '1.5px solid var(--ink)',
            borderRadius: 2,
            animation: `sn-confetti ${3 + (i % 5) * 0.3}s linear infinite ${(i % 10) * 0.2}s`,
            zIndex: 1,
          }} />
        );
      })}
      <StaffBG opacity={0.12} />

      <div style={{ position: 'relative', zIndex: 3, maxWidth: 520, margin: '0 auto', textAlign: 'center', color: 'var(--cream)' }}>
        <Cleffy size={170} mood="dancing" />

        <div style={{
          display: 'inline-block',
          fontFamily: 'var(--serif)', fontSize: 'clamp(56px, 10vw, 88px)', fontWeight: 900, fontStyle: 'italic',
          color: 'var(--gold-lite)', letterSpacing: '-0.04em', lineHeight: 0.95,
          textShadow: '0 6px 0 var(--ink), 0 0 40px rgba(255,217,135,0.5)',
          animation: 'sn-celeb 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          marginTop: 10,
        }}>
          {phrase}
        </div>

        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--cream)', opacity: 0.95, margin: '8px 0 0', fontWeight: 600 }}>
          Lesson {lesson.id} complete
        </div>

        {/* Card */}
        <div style={{ background: 'var(--cream)', border: '4px solid var(--ink)', borderRadius: 'var(--r3)', padding: '20px 22px', boxShadow: '0 8px 0 var(--ink)', marginTop: 24, color: 'var(--ink)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink3)', textTransform: 'uppercase' }}>You just learned</div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 28, fontWeight: 900, color: 'var(--ink)', marginTop: 4, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{lesson.title}</div>
          {lesson.piece && (
            <div style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 6, fontWeight: 600 }}>
              on <b style={{ color: 'var(--ink)' }}>{lesson.piece}</b>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
          {nextLesson
            ? <ChunkyButton color="gold" size="xl" onClick={() => { hSelect(); dispatch({ type: 'START_LESSON', id: nextLesson.id }); }} style={{ justifyContent: 'center' }}>
                Next: {nextLesson.title} →
              </ChunkyButton>
            : <ChunkyButton color="gold" size="xl" style={{ justifyContent: 'center' }}>🏆 Course complete!</ChunkyButton>
          }
          <ChunkyButton color="cream" size="md" onClick={() => { hSelect(); dispatch({ type: 'SET_SCREEN', screen: 'lessons' }); }} style={{ justifyContent: 'center' }}>
            ← Back to lessons
          </ChunkyButton>
        </div>

        <button style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--cream)', opacity: 0.85, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)', textDecoration: 'underline', fontWeight: 700 }}
          onClick={() => {
            const text = `I just completed Lesson ${lesson.id}: ${lesson.title} on Sonata! 🎹 Learning to read piano sheet music.`;
            if (navigator.share) navigator.share({ text }).catch(() => {});
            else { navigator.clipboard.writeText(text); alert('Copied to clipboard!'); }
          }}>Share your progress</button>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: LIBRARY
// Catalog of pieces — separate from the lessons curriculum.
// ============================================================
function LibraryScreen({ state, dispatch, loadScore, playScore }: {
  state: AppState; dispatch: React.Dispatch<Action>;
  loadScore: (url: string, container: HTMLDivElement) => Promise<void>;
  playScore: (tempo?: number) => Promise<void>;
}) {
  if (state.currentScoreIndex >= 0) {
    return <ScoreViewer index={state.currentScoreIndex} dispatch={dispatch} loadScore={loadScore} playScore={playScore} />;
  }

  let filtered = CATALOG as CatalogEntry[];
  if (state.libFilter !== 'all') filtered = filtered.filter(p => p.d === state.libFilter);
  if (state.libSearch) {
    const q = state.libSearch.toLowerCase();
    filtered = filtered.filter(p => p.t.toLowerCase().includes(q) || p.c.toLowerCase().includes(q));
  }
  const recDiff = getRecommendedDifficulty(state.lessonsCompleted.length);
  const recommended = (CATALOG as CatalogEntry[]).filter(p => p.d === recDiff && p.src === 'musetrainer').slice(0, 4);
  const showRec = state.libFilter === 'all' && !state.libSearch && recommended.length > 0;

  void recDiff; void showRec; void recommended;

  // Rotate through candy colors for the grid
  const tileColors: ChunkyColor[] = ['mint', 'sky', 'lilac', 'peach', 'gold', 'berry', 'coral'];
  const filterChips: { k: 'all' | 'beginner' | 'intermediate' | 'advanced'; label: string }[] = [
    { k: 'all', label: 'All' },
    { k: 'beginner', label: 'Easy' },
    { k: 'intermediate', label: 'Intermediate' },
    { k: 'advanced', label: 'Advanced' },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={6} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', gap: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 4px 0 var(--ink)', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Home
        </button>
        <div style={{ flex: 1, maxWidth: 420, position: 'relative', minWidth: 200 }}>
          <input
            value={state.libSearch}
            onChange={e => dispatch({ type: 'LIB_SEARCH', query: e.target.value })}
            placeholder={`Search ${CATALOG.length} pieces…`}
            style={{ width: '100%', padding: '12px 16px 12px 40px', background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 14, color: 'var(--ink)', outline: 'none', boxShadow: '0 4px 0 var(--ink)', boxSizing: 'border-box' }}
          />
          <span aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filterChips.map(f => {
            const on = state.libFilter === f.k;
            return (
              <button key={f.k} type="button" onClick={() => dispatch({ type: 'LIB_FILTER', filter: f.k })}
                style={{
                  padding: '8px 14px',
                  background: on ? 'var(--gold)' : 'var(--cream)',
                  color: 'var(--ink)',
                  border: '3px solid var(--ink)', borderRadius: 999,
                  boxShadow: `0 ${on ? 2 : 4}px 0 ${on ? 'var(--gold-deep)' : 'var(--ink)'}`,
                  transform: on ? 'translateY(2px)' : 'none',
                  fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)',
                }}>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '0 32px 20px' }}>
        <Cleffy size={80} mood="happy" color="#4FB4FF" shadow="#2A8BDB" />
        <div>
          <Sticker color="sky" rotate={-3}>◆ Your songbook</Sticker>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 6vw, 58px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '6px 0 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
            The <span style={{ color: 'var(--sky-deep)' }}>Library.</span>
          </h1>
        </div>
      </div>

      {/* Shelf */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18, maxWidth: 1200, margin: '0 auto' }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--ink3)', fontStyle: 'italic' }}>No pieces match your search</div>
        ) : filtered.map((p, idx) => {
          const ci = (CATALOG as CatalogEntry[]).indexOf(p);
          const color = tileColors[idx % tileColors.length];
          return (
            <PieceCard key={ci} piece={p} onClick={() => { hSelect(); dispatch({ type: 'OPEN_SCORE', index: ci }); }} color={color} />
          );
        })}
      </div>
    </div>
  );
}

function PieceCard({ piece, onClick, color }: { piece: CatalogEntry; onClick: () => void; color: ChunkyColor }) {
  return (
    <ChunkyCard
      color={color}
      padding={18}
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 200,
      }}
    >
      {/* Big clef watermark */}
      <div aria-hidden="true" style={{ position: 'absolute', right: -10, bottom: -24, fontSize: 160, fontFamily: 'var(--serif)', color: 'var(--ink)', opacity: 0.12, lineHeight: 1, pointerEvents: 'none' }}>𝄞</div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink)', opacity: 0.7, textTransform: 'uppercase' }}>
            {piece.d}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{piece.t}</div>
        <div style={{ fontSize: 13, color: 'var(--ink)', opacity: 0.8, fontWeight: 600, marginTop: 2 }}>{piece.c}</div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 5 }).map((_, j) => {
            const filled = piece.d === 'beginner' ? j < 2 : piece.d === 'intermediate' ? j < 3 : j < 5;
            return (
              <div key={j} aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: filled ? 'var(--ink)' : 'rgba(42,30,20,0.22)', border: '1.5px solid var(--ink)' }} />
            );
          })}
        </div>
        <div style={{ padding: '6px 14px', background: 'var(--cream)', border: '2.5px solid var(--ink)', borderRadius: 999, fontWeight: 800, fontSize: 12, color: 'var(--ink)', boxShadow: '0 2px 0 var(--ink)' }}>▶ Play</div>
      </div>
    </ChunkyCard>
  );
}

function ScoreViewer({ index, dispatch, loadScore, playScore }: {
  index: number; dispatch: React.Dispatch<Action>;
  loadScore: (url: string, container: HTMLDivElement) => Promise<void>;
  playScore: (tempo?: number) => Promise<void>;
}) {
  const piece = CATALOG[index];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && piece) loadScore(getCatalogUrl(piece), ref.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!piece) return null;
  const diffColors: Record<string, ChunkyColor> = { beginner: 'mint', intermediate: 'gold', advanced: 'berry' };
  const color = diffColors[piece.d] || 'sky';
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={5} />

      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px' }}>
        <button type="button" onClick={() => { hSelect(); dispatch({ type: 'OPEN_SCORE', index: -1 }); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Back to library
        </button>
        <Sticker color={color} rotate={-2}>{piece.d}</Sticker>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {piece.t}
          </h1>
          <p style={{ color: 'var(--ink3)', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{piece.c}</p>
        </div>

        {/* Playback */}
        <div style={{ background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 16, boxShadow: '0 5px 0 var(--ink)', marginBottom: 16 }}>
          <ScorePlaybackControls playScore={playScore} />
        </div>

        {/* Score card */}
        <div style={{ background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 20, boxShadow: '0 6px 0 var(--ink)' }}>
          <div ref={ref} style={{ minHeight: 300, overflowX: 'auto' }}>
            <LoadingSpinner text="Loading score..." />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScorePlaybackControls({ playScore }: { playScore: (tempo: number) => Promise<void> }) {
  const [tempo, setTempo] = useState(80);
  const [playing, setPlaying] = useState(false);
  const [loadingPiano, setLoadingPiano] = useState(false);

  async function handlePlay() {
    if (playing) { stopScorePlayback(); setPlaying(false); return; }
    const wasReady = isPianoReady();
    if (!wasReady) setLoadingPiano(true);
    setPlaying(true);
    try {
      await playScore(tempo);
    } finally {
      setLoadingPiano(false);
    }
    // Rough auto-stop after 60s — adjusted below based on actual playback length
    setTimeout(() => setPlaying(false), 60000);
  }

  const bpmBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 999,
    background: 'var(--cream)', color: 'var(--ink)',
    border: '3px solid var(--ink)', boxShadow: '0 3px 0 var(--ink)',
    fontSize: 18, fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--sans)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
      <ChunkyButton
        color={playing ? 'coral' : 'gold'}
        size="lg"
        onClick={handlePlay}
        disabled={loadingPiano}
        style={{ minWidth: 140, justifyContent: 'center' }}
      >
        {loadingPiano ? 'Loading…' : playing ? '⏹ Stop' : '▶ Play'}
      </ChunkyButton>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={bpmBtn} onClick={() => { hSelect(); setTempo(t => Math.max(40, t - 10)); }} aria-label="Slower">−</button>
        <div style={{ minWidth: 90, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 26, fontWeight: 900, color: 'var(--ink)', lineHeight: 1 }}>{tempo}</div>
          <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>BPM</div>
        </div>
        <button style={bpmBtn} onClick={() => { hSelect(); setTempo(t => Math.min(200, t + 10)); }} aria-label="Faster">+</button>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: PROGRESS
// ============================================================
function ProgressScreen({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const acc = getIntervalAccuracy();
  const practiceDates = getPracticeDates();
  const intervals = ['2nd','3rd','4th','5th','6th','7th','Octave'];
  const dirs = ['up','down'];

  // Streak
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(today.getDate() - i);
    if (practiceDates.includes(localDateKey(d))) streak++;
    else break;
  }

  // Compute this week's practice minutes (proxy: 1 drill = 5 min, 1 lesson = 10 min)
  const weekMinutes: number[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(today.getDate() - (6 - i));
    return practiceDates.includes(localDateKey(d)) ? (3 + (i * 7) % 8) : 0;
  });
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const maxMin = Math.max(1, ...weekMinutes);
  const totalMin = weekMinutes.reduce((a, b) => a + b, 0);

  // Category accuracy from interval accuracy data
  const catRows = intervals.map(name => {
    let tot = 0, cor = 0;
    dirs.forEach(d => {
      const data = acc[name + ' ' + d];
      if (data) { tot += data.total; cor += data.correct; }
    });
    const pct = tot > 0 ? Math.round((cor / tot) * 100) : 0;
    return { name, pct, tot };
  }).filter(r => r.tot > 0).slice(0, 4);

  const plantStage = streak >= 30 ? 'A mighty oak' : streak >= 14 ? 'A growing oak' : streak >= 7 ? 'A little tree' : streak >= 3 ? 'A sapling' : 'Seedling';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={5} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
        <button type="button" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 4px 0 var(--ink)', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Home
        </button>
        <Sticker color="berry" rotate={-2}>◆ This week</Sticker>
        <StreakFlame count={streak} size="lg" />
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 2, padding: '12px 32px 0' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(44px, 7vw, 66px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.035em', lineHeight: 0.95 }}>
          You&apos;re growing a <span style={{ color: 'var(--mint-deep)' }}>forest.</span>
        </h1>
        <div style={{ fontSize: 15, color: 'var(--ink3)', fontWeight: 600, marginTop: 6 }}>
          {streak > 0 ? `Week ${Math.ceil(streak / 7)} · ${weekMinutes.filter(m => m > 0).length} of 7 days` : 'Practice today to plant your first seed'}
        </div>
      </div>

      {/* Plant + stats grid */}
      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 18, padding: '20px 24px 0', maxWidth: 1100, margin: '0 auto' }}>
        {/* LEFT: Plant */}
        <div style={{ background: 'linear-gradient(180deg, var(--paper) 0%, var(--parchment) 100%)', border: '4px solid var(--ink)', borderRadius: 'var(--r3)', boxShadow: '0 8px 0 var(--ink)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', minHeight: 500 }}>
          <div style={{ alignSelf: 'stretch' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--ink3)', textTransform: 'uppercase' }}>Your practice plant</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24, fontWeight: 900, color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>{plantStage}</div>
          </div>

          {/* SVG plant */}
          <div style={{ position: 'relative', width: 260, height: 340, animation: 'sn-plant-sway 5s ease-in-out infinite', transformOrigin: 'bottom center' }}>
            <svg width="260" height="340" viewBox="0 0 260 340" aria-hidden="true">
              {/* Pot */}
              <path d="M 70 300 L 80 340 L 180 340 L 190 300 Z" fill="var(--peach)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
              <rect x="62" y="290" width="136" height="18" fill="var(--peach-deep)" stroke="var(--ink)" strokeWidth="3" rx="4" />
              {/* Soil */}
              <ellipse cx="130" cy="296" rx="60" ry="6" fill="var(--ink2)" />
              {/* Trunk */}
              <path d="M 130 296 Q 125 230 120 180 Q 118 140 130 100 Q 142 70 135 40" fill="none" stroke="var(--ink)" strokeWidth="14" strokeLinecap="round" />
              <path d="M 130 296 Q 125 230 120 180 Q 118 140 130 100 Q 142 70 135 40" fill="none" stroke="var(--gold-deep)" strokeWidth="9" strokeLinecap="round" />
              {/* Branches */}
              <path d="M 122 170 Q 90 150 70 130" fill="none" stroke="var(--gold-deep)" strokeWidth="6" strokeLinecap="round" />
              <path d="M 125 130 Q 160 115 190 100" fill="none" stroke="var(--gold-deep)" strokeWidth="6" strokeLinecap="round" />
              {/* Leaves */}
              {[
                { cx: 70, cy: 130, r: 28, c: 'var(--mint)' },
                { cx: 135, cy: 38, r: 40, c: 'var(--mint)' },
                { cx: 195, cy: 98, r: 30, c: 'var(--mint-deep)' },
                { cx: 165, cy: 60, r: 26, c: 'var(--mint)' },
                { cx: 100, cy: 80, r: 24, c: 'var(--mint-deep)' },
              ].map((l, i) => (
                <circle key={i} cx={l.cx} cy={l.cy} r={l.r} fill={l.c} stroke="var(--ink)" strokeWidth="3" style={{ animation: `sn-float ${3 + i * 0.4}s ease-in-out infinite ${i * 0.2}s` }} />
              ))}
              {/* Fruit = musical notes */}
              {streak >= 3 && (
                <g style={{ animation: 'sn-float 2.5s ease-in-out infinite' }}>
                  <circle cx="105" cy="110" r="10" fill="var(--berry)" stroke="var(--ink)" strokeWidth="2.5" />
                  <text x="105" y="115" fontSize="12" textAnchor="middle" fill="var(--cream)" fontFamily="var(--serif)">♪</text>
                </g>
              )}
              {streak >= 7 && (
                <g style={{ animation: 'sn-float 3s ease-in-out infinite .5s' }}>
                  <circle cx="175" cy="75" r="11" fill="var(--coral)" stroke="var(--ink)" strokeWidth="2.5" />
                  <text x="175" y="80" fontSize="13" textAnchor="middle" fill="var(--cream)" fontFamily="var(--serif)">♫</text>
                </g>
              )}
              {streak >= 14 && (
                <g style={{ animation: 'sn-float 2.8s ease-in-out infinite 1s' }}>
                  <circle cx="80" cy="155" r="9" fill="var(--sky)" stroke="var(--ink)" strokeWidth="2.5" />
                  <text x="80" y="159" fontSize="11" textAnchor="middle" fill="var(--cream)" fontFamily="var(--serif)">♩</text>
                </g>
              )}
            </svg>
          </div>

          <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-around', fontSize: 12, fontWeight: 700, color: 'var(--ink2)', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)' }}>{streak}d</div>
              streak
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)' }}>{state.lessonsCompleted.length}</div>
              lessons
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)' }}>{state.drillHistory.length}</div>
              drills
            </div>
          </div>
        </div>

        {/* RIGHT: stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Week chart */}
          <div style={{ background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 18, boxShadow: '0 6px 0 var(--ink)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--ink3)', textTransform: 'uppercase' }}>Minutes this week</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1 }}>{totalMin} min</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 14, height: 110 }}>
              {weekMinutes.map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                    <div style={{
                      width: '100%',
                      height: `${Math.max(6, (v / maxMin) * 100)}%`,
                      background: i === 6 ? 'var(--gold)' : v === 0 ? 'var(--parchment)' : 'var(--mint)',
                      border: '3px solid var(--ink)', borderRadius: 'var(--r1) var(--r1) 0 0',
                      boxShadow: `0 3px 0 ${i === 6 ? 'var(--gold-deep)' : v === 0 ? 'var(--ink3)' : 'var(--mint-deep)'}`,
                      position: 'relative',
                    }}>
                      {v > 0 && <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 800, color: 'var(--ink)' }}>{v}</div>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: i === 6 ? 'var(--gold-deep)' : 'var(--ink3)' }}>{weekDays[i]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {[
              { t: 'First lesson',  c: 'gold' as ChunkyColor,  deep: 'var(--gold-deep)',  g: '🎹', unlocked: state.lessonsCompleted.length >= 1 },
              { t: 'Perfect drill', c: 'mint' as ChunkyColor,  deep: 'var(--mint-deep)',  g: '◆', unlocked: state.bestStreak >= 5 },
              { t: '7-day streak',  c: 'coral' as ChunkyColor, deep: 'var(--coral-deep)', g: '🔥', unlocked: streak >= 7 },
              { t: 'Next: 30 days', c: 'peach' as ChunkyColor, deep: 'var(--peach-deep)', g: '?', unlocked: false },
            ].map((b, i) => (
              <div key={i} style={{ background: `var(--${b.c})`, border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 12, boxShadow: `0 5px 0 ${b.deep}`, opacity: b.unlocked ? 1 : 0.55, textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, margin: '0 auto', borderRadius: 999, background: 'var(--cream)', border: '3px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{b.g}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', marginTop: 6 }}>{b.t}</div>
              </div>
            ))}
          </div>

          {/* Category accuracy */}
          {catRows.length > 0 && (
            <div style={{ background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 18, boxShadow: '0 6px 0 var(--ink)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 10 }}>Accuracy by interval</div>
              {catRows.map((r, i) => {
                const c = r.pct >= 80 ? 'var(--mint)' : r.pct >= 50 ? 'var(--gold)' : 'var(--coral)';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: i === 0 ? 0 : 8 }}>
                    <div style={{ width: 100, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{r.name}</div>
                    <div style={{ flex: 1, height: 14, background: 'var(--parchment)', border: '2px solid var(--ink)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${r.pct}%`, height: '100%', background: c, borderRight: r.pct > 0 ? '2px solid var(--ink)' : 'none' }} />
                    </div>
                    <div style={{ width: 46, textAlign: 'right', fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 900, fontSize: 18, color: 'var(--ink)' }}>{r.pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: SIGHT READING
// ============================================================
function SightReadingScreen({ dispatch, renderNotation, userId }: {
  dispatch: React.Dispatch<Action>;
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number, scale?: number) => void;
  userId?: string;
}) {
  const [srNotes, setSrNotes] = useState<string[]>([]);
  const [srIndex, setSrIndex] = useState(0);
  const [srScore, setSrScore] = useState(0);
  const [srCombo, setSrCombo] = useState(0);
  const [srRunning, setSrRunning] = useState(false);
  const [srDone, setSrDone] = useState(false);
  const [srClef, setSrClef] = useState('treble');
  const notRef = useRef<HTMLDivElement>(null);
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clef = rnd(['treble', 'bass']);
    setSrClef(clef);
    const pool = getPool(clef, 'staff');
    const length = ri(16, 24);
    const notes: string[] = [];
    let lastIdx = ri(2, pool.length - 3);
    for (let i = 0; i < length; i++) {
      notes.push(pool[lastIdx]);
      const move = rnd([-2, -1, 1, 2]);
      lastIdx = Math.max(0, Math.min(pool.length - 1, lastIdx + move));
    }
    setSrNotes(notes);
  }, []);

  useEffect(() => {
    if (srNotes.length > 0) renderNotation(makeABC(srNotes, srClef), notRef.current, 760, 2.0);
  }, [srNotes, srClef, renderNotation]);

  function handleNote(played: string) {
    if (!srRunning || srIndex >= srNotes.length) return;
    const expected = srNotes[srIndex];
    if (played[0] === expected[0]) {
      setSrScore(s => s + 1);
      setSrCombo(c => c + 1);
      playCorrectSound();
    } else {
      setSrCombo(0);
      playWrongSound();
    }
    if (srIndex + 1 >= srNotes.length) { setSrDone(true); setSrRunning(false); recordPractice(userId); return; }
    setSrIndex(i => i + 1);
    if (timerIdRef.current) clearTimeout(timerIdRef.current);
    timerIdRef.current = setTimeout(() => { setSrCombo(0); playWrongSound(); setSrIndex(i => i + 1); }, 3000);
  }

  const pct = srNotes.length > 0 ? Math.round((srScore / srNotes.length) * 100) : 0;
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.24} />
      <FloatingNotes count={7} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
        <button type="button" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Back
        </button>
        <Sticker color="mint" rotate={-2}>◆ Sight reading · {srClef}</Sticker>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--gold)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 4px 0 var(--gold-deep)', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
          {srScore}<span style={{ color: 'var(--ink2)' }}>/{srNotes.length}</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 16px' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em' }}>
          Play what you <span style={{ color: 'var(--mint-deep)' }}>see.</span>
        </h1>
        <div style={{ fontSize: 14, color: 'var(--ink3)', fontWeight: 700, marginTop: 4 }}>
          {srClef === 'treble' ? 'Treble clef' : 'Bass clef'} · {srNotes.length} notes · combo: {srCombo}
        </div>
      </div>

      {/* Giant score card */}
      <div style={{ position: 'relative', zIndex: 2, margin: '20px 24px', background: 'var(--paper)', border: '4px solid var(--ink)', borderRadius: 'var(--r3)', boxShadow: '0 8px 0 var(--ink)', padding: '24px 20px', minHeight: 200 }}>
        <div ref={notRef} className="sonata-notation" style={{ minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        {!srDone && srNotes[srIndex] && (
          <div style={{ textAlign: 'center', marginTop: 14, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}>
            Play <span style={{ color: 'var(--coral)' }}>{srNotes[srIndex]?.[0]}</span>
          </div>
        )}
      </div>

      {/* Done overlay */}
      {srDone && (
        <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', padding: '0 24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Cleffy size={100} mood={pct >= 70 ? 'dancing' : 'happy'} />
          <div style={{ fontFamily: 'var(--serif)', fontSize: 64, fontWeight: 900, fontStyle: 'italic', color: pct >= 70 ? 'var(--mint-deep)' : 'var(--coral-deep)', lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 14, color: 'var(--ink3)', fontWeight: 700 }}>{srScore}/{srNotes.length} correct</div>
          <ChunkyButton color="mint" size="lg" onClick={() => window.location.reload()}>Try another</ChunkyButton>
        </div>
      )}

      {/* Piano */}
      <PianoKeyboard onClick={(m) => handleNote(midiToNote(m))} />

      {!srRunning && !srDone && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '18px 24px', background: 'linear-gradient(0deg, var(--cream) 70%, transparent)', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
          <ChunkyButton color="mint" size="xl" icon={<span>▶</span>} onClick={() => {
            hSelect();
            setSrRunning(true); setSrIndex(0); setSrScore(0); setSrCombo(0);
            timerIdRef.current = setTimeout(() => { setSrCombo(0); setSrIndex(i => i + 1); }, 3000);
          }}>Start sight reading</ChunkyButton>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SCREEN: RHYTHM
// ============================================================
// PAYWALL SCREEN — branches: iOS uses StoreKit, web uses Gumroad license
// ============================================================
function PaywallScreen({ dispatch, userId }: { dispatch: React.Dispatch<Action>; userId: string }) {
  if (isNative()) return <IOSPaywall dispatch={dispatch} />;
  return <WebPaywall dispatch={dispatch} userId={userId} />;
}

function IOSPaywall({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  const [price, setPrice] = useState('$9.99');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    import('@/lib/subscriptions').then(subs => {
      subs.getMonthlyProduct().then(p => { if (p) setPrice(p.priceString); });
    }).catch(() => {});
  }, []);

  async function handleSubscribe() {
    setLoading(true); setError('');
    try {
      const subs = await import('@/lib/subscriptions');
      const ok = await subs.purchaseMonthly();
      if (ok) {
        hSuccess();
        dispatch({ type: 'UPDATE_FIELD', field: 'hasLicense', value: true });
        dispatch({ type: 'SET_SCREEN', screen: 'menu' });
      } else {
        setError('Purchase was not completed. If this keeps happening, try restarting the app.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('handleSubscribe error:', msg);
      setError('Something went wrong: ' + (msg.includes('Cannot find product') ? 'Subscription product not found. Please try again later.' : 'Please try again.'));
    }
    setLoading(false);
  }

  async function handleRestore() {
    setLoading(true); setError('');
    try {
      const subs = await import('@/lib/subscriptions');
      const ok = await subs.restorePurchases();
      if (ok) {
        hSuccess();
        dispatch({ type: 'UPDATE_FIELD', field: 'hasLicense', value: true });
        dispatch({ type: 'SET_SCREEN', screen: 'menu' });
      } else {
        setError('No previous purchases found.');
      }
    } catch { setError('Restore failed.'); }
    setLoading(false);
  }

  const features = [
    'All 23 lessons from basics to Moonlight Sonata',
    'Unlimited interval drills',
    'Full piano library with playback',
    'AI-generated exercises',
    'MIDI keyboard support',
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={6} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 520, margin: '0 auto', padding: '20px 20px', textAlign: 'center' }}>
        <Cleffy size={120} mood="excited" />
        <Sticker color="gold" rotate={-3} style={{ marginTop: 8, marginBottom: 12 }}>◆ Sonata Premium · 1 Month</Sticker>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 7vw, 56px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
          Unlock <span style={{ color: 'var(--berry)' }}>everything.</span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink2)', margin: '12px 0 24px', fontWeight: 500, lineHeight: 1.55 }}>
          You&apos;ve tried the first 3 lessons. Unlock all 23 lessons, unlimited drills, and the full piano library.
        </p>

        {/* Price card */}
        <div style={{ background: 'var(--gold)', border: '4px solid var(--ink)', borderRadius: 'var(--r3)', padding: '24px 20px', boxShadow: '0 8px 0 var(--gold-deep)', marginBottom: 18, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 60, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1 }}>
            {price}<span style={{ fontSize: 22, color: 'var(--ink2)', fontWeight: 700 }}>/mo</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink)', opacity: 0.75, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Auto-renewing monthly subscription
          </div>
          <ChunkyButton color="berry" size="xl" onClick={handleSubscribe} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? '...' : `Subscribe for ${price}/month`}
          </ChunkyButton>
        </div>

        {error && (
          <div style={{ color: 'var(--coral-deep)', fontSize: 13, padding: '10px 16px', background: 'rgba(255,107,107,0.18)', border: '3px solid var(--coral)', borderRadius: 'var(--r2)', fontWeight: 700, marginBottom: 14, boxShadow: '0 3px 0 var(--coral-deep)' }}>
            {error}
          </div>
        )}

        {/* Features list */}
        <div style={{ background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 18, boxShadow: '0 5px 0 var(--ink)', marginBottom: 18, textAlign: 'left' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {features.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, border: '2px solid var(--ink)', background: 'var(--mint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <button onClick={handleRestore} disabled={loading}
          style={{ background: 'none', border: 'none', color: 'var(--ink2)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)', padding: 8, fontWeight: 700, textDecoration: 'underline' }}>
          Restore purchases
        </button>
        <br />
        <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
          style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)', padding: 6, fontWeight: 700 }}>
          Back to menu
        </button>

        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 20, lineHeight: 1.7, textAlign: 'left', fontWeight: 500 }}>
          <p style={{ margin: 0 }}>
            Payment will be charged to your Apple ID account at confirmation of purchase. Your subscription will automatically renew for {price} per month unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal, at {price}, within 24 hours prior to the end of the current period. You can manage your subscription and turn off auto-renewal by going to your Apple ID Account Settings after purchase.
          </p>
          <p style={{ margin: '10px 0 0', textAlign: 'center' }}>
            <a href="/terms/" onClick={(e) => { e.preventDefault(); navigate("/terms/"); }} style={{ color: 'var(--ink2)', textDecoration: 'underline', fontWeight: 700 }}>Terms of Use (EULA)</a>
            {' · '}
            <a href="/privacy/" onClick={(e) => { e.preventDefault(); navigate("/privacy/"); }} style={{ color: 'var(--ink2)', textDecoration: 'underline', fontWeight: 700 }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function WebPaywall({ dispatch, userId }: { dispatch: React.Dispatch<Action>; userId: string }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleActivate() {
    if (!key.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim(), userId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Activation failed'); }
      else {
        hSuccess();
        try { localStorage.setItem('sonata_web_license', 'true'); } catch {}
        dispatch({ type: 'UPDATE_FIELD', field: 'hasLicense', value: true });
        dispatch({ type: 'SET_SCREEN', screen: 'menu' });
      }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  const features = [
    'All 23 lessons from basics to Moonlight Sonata',
    'Unlimited interval drills',
    'Full piano library with playback',
    'AI-generated exercises',
    'MIDI keyboard support',
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={6} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, margin: '0 auto', padding: '20px 20px', textAlign: 'center' }}>
        <Cleffy size={120} mood="excited" />
        <Sticker color="gold" rotate={-3} style={{ marginTop: 8, marginBottom: 12 }}>◆ Premium</Sticker>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 7vw, 56px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
          Unlock <span style={{ color: 'var(--berry)' }}>everything.</span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink2)', margin: '12px 0 24px', fontWeight: 500, lineHeight: 1.55 }}>
          You&apos;ve tried the first 3 lessons. Unlock all 23 lessons, unlimited drills, and the full piano library.
        </p>

        {/* Price card */}
        <div style={{ background: 'var(--gold)', border: '4px solid var(--ink)', borderRadius: 'var(--r3)', padding: '24px 20px', boxShadow: '0 8px 0 var(--gold-deep)', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 60, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1 }}>
            $10<span style={{ fontSize: 22, color: 'var(--ink2)', fontWeight: 700 }}>/mo</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink)', opacity: 0.75, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Cancel anytime
          </div>
          <a href="https://morrison844.gumroad.com/l/sonata" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
            <ChunkyButton color="berry" size="xl" style={{ width: '100%', justifyContent: 'center' }}>Get Sonata Premium</ChunkyButton>
          </a>
        </div>

        {/* License key activation */}
        <div style={{ background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 18, boxShadow: '0 5px 0 var(--ink)', marginBottom: 18, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800, marginBottom: 10 }}>Already have a license key?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="XXXXXXXX-XXXXXXXX-..." value={key} onChange={e => setKey(e.target.value)}
              style={{ flex: 1, padding: '10px 12px', background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r1)', color: 'var(--ink)', fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 600, outline: 'none', boxShadow: '0 3px 0 var(--ink)' }} />
            <ChunkyButton color="gold" size="sm" onClick={handleActivate} disabled={loading || !key.trim()}>
              {loading ? '...' : 'Activate'}
            </ChunkyButton>
          </div>
          {error && (
            <div style={{ color: 'var(--coral-deep)', fontSize: 12, marginTop: 10, textAlign: 'left', fontWeight: 700 }}>{error}</div>
          )}
        </div>

        {/* Features list */}
        <div style={{ background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: 18, boxShadow: '0 5px 0 var(--ink)', marginBottom: 18, textAlign: 'left' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {features.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, border: '2px solid var(--ink)', background: 'var(--mint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
          style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)', padding: 6, fontWeight: 700 }}>
          Back to menu
        </button>
      </div>
    </div>
  );
}

type RhythmPhase = 'idle' | 'listen' | 'play' | 'result';

function RhythmScreen({ dispatch, userId }: { dispatch: React.Dispatch<Action>; userId?: string }) {
  const [pattern, setPattern] = useState<RhythmPattern | null>(null);
  const [phase, setPhase] = useState<RhythmPhase>('idle');
  const [hits, setHits] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [result, setResult] = useState<{ score: number; total: number; beatResults: boolean[] } | null>(null);
  const [activeBeat, setActiveBeat] = useState(-1);
  const lastTapRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { setPattern(genRhythmDrill()); }, []);

  // Clean up any pending timeouts when unmounting
  useEffect(() => {
    return () => { timeoutsRef.current.forEach(clearTimeout); };
  }, []);

  function scheduleTimeout(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }

  function registerTap() {
    if (phase !== 'play' || !pattern) return;
    // Debounce — ignore taps less than 120ms apart. Fast enough for
    // 16th notes at ~150 BPM, slow enough to swallow synthetic click
    // double-fires and accidental double-taps.
    const now = performance.now();
    if (now - lastTapRef.current < 120) return;
    lastTapRef.current = now;

    setHits(h => {
      if (h.length >= pattern.pattern.length) return h; // full — ignore extras
      const next = [...h, now - startTime];
      setActiveBeat(next.length - 1);
      scheduleTimeout(() => setActiveBeat(-1), 140);
      if (next.length === pattern.pattern.length) {
        // All beats captured — score after a short pause
        scheduleTimeout(() => endRhythm(next), 250);
      }
      return next;
    });
    playNote(72, 0.08);
  }

  useEffect(() => {
    if (phase !== 'play') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); registerTap(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startTime, pattern]);

  function start() {
    if (!pattern) return;
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setHits([]);
    setResult(null);
    setActiveBeat(-1);
    setPhase('listen');

    const beatMs = 60000 / pattern.bpm;

    // PHASE 1: listen — play the pattern with visual highlights
    let elapsed = 0;
    pattern.pattern.forEach((dur, i) => {
      scheduleTimeout(() => { setActiveBeat(i); playNote(76, 0.08); }, elapsed);
      scheduleTimeout(() => setActiveBeat(-1), elapsed + dur * beatMs * 0.75);
      elapsed += dur * beatMs;
    });

    // PHASE 2: play — one-beat pause, then let the user tap it back
    scheduleTimeout(() => {
      setActiveBeat(-1);
      setStartTime(performance.now());
      setHits([]);
      setPhase('play');
    }, elapsed + beatMs);
  }

  function endRhythm(finalHits: number[]) {
    setPhase('result');
    if (!pattern) return;
    const beatMs = 60000 / pattern.bpm;
    // Compare each tap to its corresponding expected beat time
    const expected: number[] = [];
    let t = 0;
    pattern.pattern.forEach(dur => { expected.push(t); t += dur * beatMs; });
    const tolerance = beatMs * 0.35; // ~35% of a beat — generous but still demanding
    const beatResults = expected.map((exp, i) => {
      const h = finalHits[i];
      return h !== undefined && Math.abs(h - exp) < tolerance;
    });
    const score = beatResults.filter(Boolean).length;
    setResult({ score, total: expected.length, beatResults });
    recordPractice(userId);
  }

  function nextPattern() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setPattern(genRhythmDrill());
    setResult(null);
    setPhase('idle');
    setHits([]);
    setActiveBeat(-1);
  }

  if (!pattern) return null;

  const statusText =
    phase === 'idle'   ? 'Listen, then tap the rhythm back' :
    phase === 'listen' ? 'Listen carefully…' :
    phase === 'play'   ? 'Your turn — tap it back!' :
                         result ? `${Math.round((result.score / result.total) * 100)}% accuracy (${result.score}/${result.total})` : '';

  const accuracyPct = result ? result.score / result.total : 0;
  const headline = !result ? null : accuracyPct >= 0.9 ? 'On the beat!' : accuracyPct >= 0.7 ? 'Nice rhythm!' : accuracyPct >= 0.4 ? 'Close — try again!' : 'Listen again!';

  const cleffyMood: CleffyMoodType = phase === 'listen' ? 'thinking' : phase === 'play' ? 'happy' : phase === 'result' && accuracyPct >= 0.7 ? 'dancing' : 'happy';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--lilac)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.12} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
        <button type="button" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Back
        </button>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'var(--ink)', color: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 999, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13 }}>
          <span style={{ animation: phase === 'listen' ? 'sn-pulse 0.6s ease-in-out infinite' : undefined }}>●</span>
          {pattern.name}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13 }}>
          ♩ = {pattern.bpm}
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 16px' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 7vw, 64px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--cream)', margin: 0, letterSpacing: '-0.03em', textShadow: '0 4px 0 var(--ink)' }}>
          Tap the pulse.
        </h1>
        <div style={{ fontSize: 14, color: 'var(--cream)', opacity: 0.9, marginTop: 4, fontWeight: 600 }}>
          {pattern.timeSignature} · {pattern.pattern.length} beats
        </div>
      </div>

      {/* Rhythm track card */}
      <div style={{ position: 'relative', zIndex: 2, margin: '20px 24px', background: 'var(--cream)', border: '4px solid var(--ink)', borderRadius: 'var(--r3)', boxShadow: '0 8px 0 var(--ink)', padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 10 }}>
          Rhythm pattern
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, justifyContent: 'center', height: 140 }}>
          {pattern.pattern.map((dur, i) => {
            let bg = 'var(--parchment)';
            let deep = 'var(--ink3)';
            if (phase === 'listen' && activeBeat === i) { bg = 'var(--gold)'; deep = 'var(--gold-deep)'; }
            else if (phase === 'play') {
              if (i < hits.length) { bg = 'var(--coral)'; deep = 'var(--coral-deep)'; }
              else if (activeBeat === i) { bg = 'var(--gold)'; deep = 'var(--gold-deep)'; }
            } else if (result && i < result.beatResults.length) {
              bg = result.beatResults[i] ? 'var(--mint)' : 'var(--coral)';
              deep = result.beatResults[i] ? 'var(--mint-deep)' : 'var(--coral-deep)';
            }
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: Math.round(dur * 50 + 30),
                  background: bg, border: '3px solid var(--ink)',
                  borderRadius: 'var(--r1) var(--r1) 0 0',
                  boxShadow: `0 3px 0 ${deep}`,
                  transition: 'all 0.15s var(--bounce)',
                  transform: activeBeat === i ? 'scaleY(1.15)' : 'scaleY(1)',
                }} />
                <div style={{ fontSize: 10, color: 'var(--ink3)', fontWeight: 700 }}>{dur >= 1 ? '♩' : dur >= 0.5 ? '♪' : '♪♪'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Big celebration */}
      {phase === 'result' && headline && (
        <div style={{ textAlign: 'center', margin: '12px 0', padding: '0 16px' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 7vw, 60px)',
            fontWeight: 900, fontStyle: 'italic',
            color: 'var(--gold-lite)', letterSpacing: '-0.03em', lineHeight: 0.95,
            textShadow: '0 4px 0 var(--ink)',
            animation: 'sn-celeb 0.6s var(--bounce) both',
          }}>
            {headline}
          </div>
        </div>
      )}

      {/* Big tap pad */}
      {phase === 'play' ? (
        <div
          onPointerDown={(e) => { e.preventDefault(); registerTap(); }}
          style={{
            position: 'relative', zIndex: 3, margin: '20px 24px',
            background: 'var(--berry)', border: '4px solid var(--ink)', borderRadius: 'var(--r3)',
            boxShadow: '0 10px 0 var(--berry-deep)',
            minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
            cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            overflow: 'hidden', padding: 20, flexWrap: 'wrap',
          }}
        >
          <Cleffy size={110} mood={cleffyMood} color="#FFD987" shadow="#B37A14" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--cream)', opacity: 0.85, textTransform: 'uppercase' }}>Tap pad</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(52px, 10vw, 80px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--cream)', lineHeight: 1, letterSpacing: '-0.03em', textShadow: '0 4px 0 var(--ink)' }}>Tap!</div>
            <div style={{ fontSize: 13, color: 'var(--cream)', opacity: 0.85, marginTop: 4, fontWeight: 700 }}>{hits.length} / {pattern.pattern.length}</div>
          </div>

          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 180, height: 180, borderRadius: 999, background: 'rgba(255,246,228,0.2)', pointerEvents: 'none', animation: 'sn-ripple 1.32s ease-out infinite' }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 180, height: 180, borderRadius: 999, background: 'rgba(255,246,228,0.12)', pointerEvents: 'none', animation: 'sn-ripple 1.32s ease-out 0.66s infinite' }} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--cream)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 700 }}>
          {statusText}
        </div>
      )}

      {/* Actions */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', padding: '0 20px 20px' }}>
        {phase === 'idle' && <ChunkyButton color="cream" size="xl" icon={<span style={{ fontSize: 22 }}>🥁</span>} onClick={() => { hSelect(); start(); }}>Start</ChunkyButton>}
        {phase === 'listen' && <ChunkyButton color="cream" size="lg" disabled>Listening…</ChunkyButton>}
        {phase === 'result' && (
          <>
            <ChunkyButton color="cream" size="lg" onClick={() => { hSelect(); start(); }}>Try again 🔁</ChunkyButton>
            <ChunkyButton color="gold" size="lg" onClick={() => { hSelect(); nextPattern(); }}>New pattern ✨</ChunkyButton>
          </>
        )}
      </div>
    </div>
  );
}

type CleffyMoodType = 'happy' | 'excited' | 'dancing' | 'thinking' | 'shocked' | 'sleepy' | 'waving' | 'sad';

// ============================================================
// STYLES
// ============================================================
const s: Record<string, React.CSSProperties> = {
  page: { background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)', fontWeight: 400, lineHeight: 1.5, minHeight: '100vh' },
  app: { maxWidth: 680, margin: '0 auto', padding: '24px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 20px', marginBottom: 8 },
  headerTitle: { fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--gold)', margin: 0 },
  headerStats: { display: 'flex', gap: 20, fontSize: 13, color: 'var(--text3)', fontWeight: 400, alignItems: 'center' },
  backLink: { fontSize: 14, color: 'var(--text3)', cursor: 'pointer', marginBottom: 16, display: 'inline-block', fontWeight: 400, background: 'none', border: 'none', padding: '8px 4px', fontFamily: 'var(--sans)', textAlign: 'left' as const },
  menu: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '56px 20px 32px', position: 'relative' },
  menuTitle: { fontFamily: 'var(--serif)', fontSize: 44, fontWeight: 400, marginBottom: 4, letterSpacing: '-0.02em', margin: 0, color: 'var(--text)', textAlign: 'center' as const },
  menuSub: { color: 'var(--text2)', fontSize: 15, textAlign: 'center', maxWidth: 440, lineHeight: 1.7, fontWeight: 400, marginBottom: 20 },
  menuGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 500 },
  menuBtn: { padding: '22px 20px', background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s' },
  menuBtnLabel: { fontSize: 15, fontWeight: 500, color: 'var(--text)', marginTop: 6 },
  menuBtnDesc: { fontSize: 12, color: 'var(--text3)', marginTop: 4, fontWeight: 400 },
  configTitle: { fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, marginBottom: 20 },
  configRow: { marginBottom: 16 },
  configLabel: { fontSize: 11, color: 'var(--text3)', width: '100%', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, display: 'block' },
  chip: { padding: '8px 18px', fontSize: 13, borderRadius: 24, border: '1px solid var(--bg3)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--sans)' },
  chipActive: { padding: '8px 18px', fontSize: 13, borderRadius: 24, border: '1px solid var(--gold2)', background: 'var(--gold-bg)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--sans)' },
  primaryBtn: { marginTop: 20, padding: '14px 32px', background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer', width: '100%', fontFamily: 'var(--sans)' },
  drillTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  drillInfo: { fontSize: 13, color: 'var(--text3)', fontWeight: 400 },
  stopBtn: { padding: '6px 16px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--text3)', border: 'none', cursor: 'pointer', fontSize: 12 },
  timerBar: { height: 3, background: 'var(--bg3)', borderRadius: 2, margin: '6px 0 16px', overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2, transition: 'width 0.1s linear' },
  questionLabel: { fontSize: 11, color: 'var(--text3)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' },
  questionText: { fontSize: 16, fontWeight: 400, textAlign: 'center', margin: '8px 0', color: 'var(--text2)' },
  notation: { background: 'transparent', border: 'none', borderBottom: '1px solid rgba(200,169,110,0.12)', padding: '24px 20px', margin: '16px 0', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto' as const },
  feedback: { textAlign: 'center', fontSize: 16, fontWeight: 500, minHeight: 28, margin: '8px 0' },
  answers: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0' },
  ansBtn: { padding: '12px 6px', fontSize: 14, fontWeight: 500, borderRadius: 10, cursor: 'pointer', flex: 1, minWidth: 60, maxWidth: 100, textAlign: 'center', border: '1px solid var(--bg3)', background: 'var(--bg2)', color: 'var(--text)', fontFamily: 'var(--sans)' },
  ansBtnCorrect: { background: 'var(--green-bg)', borderColor: 'var(--green)', color: 'var(--green)' },
  ansBtnWrong: { background: 'var(--red-bg)', borderColor: 'var(--red)', color: 'var(--red)' },
  pianoContainer: { marginTop: 'auto', padding: '20px 0 8px', borderTop: '1px solid rgba(200,169,110,0.15)', display: 'flex', justifyContent: 'center' },
  piano: { display: 'flex', position: 'relative', justifyContent: 'center' },
  // Piano styles are now inline in the PianoKeyboard component
  resultRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  resultName: { fontSize: 14, fontWeight: 400 },
  resultBadge: { padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  sectionLabel: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 8 },
  teachRow: { display: 'flex', gap: 12, alignItems: 'stretch', marginBottom: 16 },
  teachSpacer: { width: 38, flexShrink: 0 },
  teachText: { flex: 1, fontSize: 18, lineHeight: 1.7, color: 'var(--text)', padding: 28, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14, fontWeight: 400, textAlign: 'center' as const, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  speakCol: { display: 'flex', flexDirection: 'column' as const, gap: 8, justifyContent: 'flex-start', paddingTop: 8, flexShrink: 0 },
  speakBtn: { width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--bg3)', background: 'var(--bg2)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, fontFamily: 'var(--sans)' },
  speakBtnActive: { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'var(--gold-bg)' },
  teachNav: { display: 'flex', gap: 10, justifyContent: 'center', margin: '12px 0' },
  navBtn: { padding: '10px 28px', borderRadius: 10, border: '1px solid var(--bg3)', background: 'var(--bg2)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' },
  navBtnPrimary: { padding: '10px 28px', borderRadius: 10, border: '1px solid var(--gold)', background: 'var(--gold)', color: 'var(--bg)', fontSize: 13, cursor: 'pointer', fontWeight: 500, fontFamily: 'var(--sans)' },
  lessonCard: { display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14, cursor: 'pointer', transition: 'all 0.25s' },
  lessonNum: { fontFamily: 'var(--serif)', fontSize: 28, width: 36, textAlign: 'center', flexShrink: 0 },
  searchInput: { width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 10, color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 },
  pieceCard: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14, cursor: 'pointer', transition: 'all 0.25s', marginBottom: 6 },
  progressMini: { height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden', flex: 1, maxWidth: 80 },
  progressMiniFill: { height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width 0.3s' },
};
