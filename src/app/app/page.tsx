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
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--bg3)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      <div style={{ fontSize: 13 }}>{text || 'Loading...'}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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
  lessons, CATALOG, getCatalogUrl, DIFF_COLORS, getRecommendedDifficulty, findLessonCatalogIndex,
} from "@/lib/music";
import type { Question, DrillConfig, RhythmPattern, CatalogEntry, Lesson } from "@/lib/music";
import { checkAuth, signOut, loadProgress, saveDrillSession, saveLessonComplete, loadLicense } from "@/lib/supabaseData";
import { Cleffy } from "./Cleffy";
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

  // ---- OSMD score loading ----
  async function loadScore(url: string, container: HTMLDivElement) {
    try {
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
      // Dark theme: use CSS filter to invert the entire SVG
      // This is bulletproof — catches all elements regardless of how OSMD styles them
      container.querySelectorAll('svg').forEach(svg => {
        svg.style.filter = 'invert(1)';
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

  async function playScore(tempo: number = 100) {
    const notes = extractScoreNotes();
    if (notes.length === 0) return;
    await playScoreNotes(notes, tempo);
  }

  // ============================================================
  // RENDER
  // ============================================================
  if (state.screen === 'loading') {
    return (
      <div style={s.page} className="sonata-page">
        <div style={s.app}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <SonataLogo size={48} />
              <div style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--gold)' }}>Sonata</div>
            </div>
            <LoadingSpinner text="Loading your progress..." />
          </div>
        </div>
      </div>
    );
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
            {state.screen === 'lessons' && <LessonsListScreen state={state} dispatch={dispatch} />}
            {state.screen === 'lesson' && <LessonScreen state={state} dispatch={dispatch} renderNotation={renderNotation} loadScore={loadScore} playScore={playScore} />}
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
                background: '#0C0A09', color: '#C8A96E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, pointerEvents: 'none', zIndex: 3,
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
                background: '#FAFAF9', color: '#0C0A09',
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

  if (step === 'intro') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '32px 20px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--gold)', marginBottom: 8 }}>Sonata</div>
        <p style={{ color: 'var(--text2)', fontSize: 15, textAlign: 'center', maxWidth: 380, lineHeight: 1.7, marginBottom: 8 }}>
          Learn to read piano sheet music by distance, not memorisation.
        </p>
        <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', maxWidth: 380, lineHeight: 1.6, marginBottom: 32 }}>
          Answer a few quick questions so we can find the right starting point for you.
        </p>
        <button style={s.primaryBtn} onClick={() => setStep('quiz')}>Start</button>
        <button onClick={() => { setPlacementResult(1); dispatch({ type: 'SET_SCREEN', screen: 'onboarding' }); }}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)', marginTop: 16 }}>
          I&apos;m a complete beginner — skip quiz
        </button>
      </div>
    );
  }

  if (step === 'result') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '32px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>
          {levelIndex === 0 ? '🌱' : levelIndex === 1 ? '🎵' : levelIndex === 2 ? '🎶' : '🎹'}
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--gold)', marginBottom: 8 }}>
          {levelNames[levelIndex]}
        </div>
        <p style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center', maxWidth: 360, lineHeight: 1.6, marginBottom: 8 }}>
          You got {score} out of {PLACEMENT_QUESTIONS.length} right.
        </p>
        <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', maxWidth: 360, lineHeight: 1.6, marginBottom: 32 }}>
          {startLesson === 1 ? "We'll start from the very beginning — no prior knowledge needed." :
           `We'll start you at Lesson ${startLesson} and mark earlier lessons as complete.`}
        </p>
        <button style={s.primaryBtn} onClick={() => {
          setPlacementResult(startLesson);
          dispatch({ type: 'SET_SCREEN', screen: 'onboarding' });
        }}>Continue</button>
      </div>
    );
  }

  // Quiz step
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '32px 20px' }}>
      <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 16 }}>
        Question {qIndex + 1} of {PLACEMENT_QUESTIONS.length}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {PLACEMENT_QUESTIONS.map((_, i) => (
          <div key={i} style={{ width: i === qIndex ? 16 : 6, height: 6, borderRadius: 3, background: i === qIndex ? 'var(--gold)' : i < qIndex ? 'var(--green)' : 'var(--bg4)', transition: 'all 0.3s' }} />
        ))}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--text1)', textAlign: 'center', maxWidth: 380, marginBottom: 16, lineHeight: 1.4 }}>
        {q.q}
      </div>
      {q.abc && <div ref={notRef} style={{ minHeight: 80, marginBottom: 8 }} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360, marginTop: 8 }}>
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct;
          const picked = answered === i;
          let bg = 'var(--bg2)';
          let border = '1px solid var(--bg3)';
          if (answered >= 0) {
            if (isCorrect) { bg = 'rgba(74,222,128,0.15)'; border = '1px solid var(--green)'; }
            else if (picked) { bg = 'rgba(248,113,113,0.15)'; border = '1px solid #F87171'; }
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)}
              style={{ padding: '14px 16px', background: bg, border, borderRadius: 10, color: 'var(--text1)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)', textAlign: 'left', transition: 'all 0.2s' }}>
              {opt}
            </button>
          );
        })}
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '32px 20px' }} className="sonata-app">
      <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--gold)', marginBottom: 8 }}>{sl.title}</div>
      <p style={{ color: 'var(--text2)', fontSize: 15, textAlign: 'center', maxWidth: 400, lineHeight: 1.7, marginBottom: 20 }}>{sl.body}</p>
      {sl.abc && <div ref={notRef} style={{ minHeight: 80, marginBottom: 8 }} />}
      {!sl.abc && <div style={{ textAlign: 'center', marginTop: 16, fontSize: 40 }}>🎹</div>}
      <div style={{ display: 'flex', gap: 6, margin: '24px 0' }}>
        {slides.map((_, i) => (
          <div key={i} style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, background: i === slide ? 'var(--gold)' : i < slide ? 'var(--green)' : 'var(--bg4)', transition: 'all 0.3s' }} />
        ))}
      </div>
      <button style={s.primaryBtn} onClick={() => {
        if (slide < slides.length - 1) setSlide(slide + 1);
        else {
          setOnboarded();
          const startAt = getPlacementResult() || 1;
          // Auto-complete lessons before the starting point
          if (startAt > 1) {
            const prior = Array.from({ length: startAt - 1 }, (_, i) => i + 1);
            setStoredLessons(prior);
            dispatch({ type: 'LOAD_PROGRESS', lessonsCompleted: prior, drillCount: 0 });
          }
          dispatch({ type: 'SET_SCREEN', screen: 'menu' });
        }
      }}>{slide < slides.length - 1 ? 'Next' : `Let's go`}</button>
    </div>
  );
}

// ============================================================
// SCREEN: MENU
// ============================================================
function getNextLesson(completed: number[]): typeof lessons[0] | null {
  for (const l of lessons) {
    if (!completed.includes(l.id)) return l;
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
  const lessonPct = Math.round(state.lessonsCompleted.length / lessons.length * 100);
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

  return (
    <>
      <Header title="Sonata" right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="sonata-metronome" aria-hidden="true" />
          {email && <span style={{ opacity: 0.6, fontSize: 11 }}>{email}</span>}
          <div style={s.progressMini}><div style={{ ...s.progressMiniFill, width: lessonPct + '%' }} /></div>
        </div>
      } />
      <div style={s.menu} className="sonata-menu">
        <div className="sonata-staff-bg" aria-hidden="true" />
        {/* Hero — Cleffy + warm greeting */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -8 }}>
          <Cleffy size={130} mood={streak >= 2 ? 'excited' : practicedToday ? 'happy' : 'waving'} />
        </div>
        <div className="sonata-menu-title-wrap" style={{ marginTop: 4 }}>
          <div className="sonata-menu-watermark" aria-hidden="true">♪</div>
          <h2 style={s.menuTitle} className="sonata-menu-title">{getGreeting(name, streak)}</h2>
          <span className="sonata-menu-title-underline" aria-hidden="true" />
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--text3)', marginTop: 6, textAlign: 'center', fontWeight: 500 }}>
          Let&apos;s play something today ✨
        </div>

        {/* Streak + progress plant */}
        {streak >= 1 && (
          <div style={{ marginTop: 16, padding: '10px 22px', background: 'var(--gold-bg)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 24, fontSize: 14, color: 'var(--gold)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span className="sonata-plant" aria-hidden="true" style={{ fontSize: 22 }}>
              {streak >= 30 ? '🌳' : streak >= 14 ? '🌲' : streak >= 7 ? '🪴' : streak >= 3 ? '🌱' : '🌱'}
            </span>
            <span className="sonata-flame" style={{ fontSize: 18 }}>🔥</span>
            <span>{streak === 1 ? 'Day 1 — nice start!' : `${streak}-day streak!`}</span>
          </div>
        )}
        {streak === 0 && dates.length > 0 && (
          <div style={{ marginTop: 16, padding: '10px 22px', background: 'var(--coral-bg)', border: '1px solid rgba(255,159,126,0.35)', borderRadius: 24, fontSize: 14, color: 'var(--coral)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>🌱</span>
            <span>Fresh start — let&apos;s grow a new streak</span>
          </div>
        )}
        {streak === 0 && dates.length === 0 && (
          <div style={{ marginTop: 16, padding: '10px 22px', background: 'var(--mint-bg)', border: '1px solid rgba(127,216,190,0.35)', borderRadius: 24, fontSize: 14, color: 'var(--mint)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>✨</span>
            <span>Your first day — let&apos;s make it count!</span>
          </div>
        )}

        <StaffDivider />

        {/* Daily mission card */}
        <div style={{
          width: '100%', maxWidth: 560, padding: '18px 22px', marginBottom: 12,
          background: 'linear-gradient(135deg, rgba(200,169,110,0.08) 0%, var(--bg2) 60%)',
          border: '1px solid rgba(200,169,110,0.18)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <ProgressRing progress={missionPct} size={64} label={`${missionDone}/${missionTasks.length}`} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 6 }}>Today&apos;s mission</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {missionTasks.map((t, i) => (
                <div key={i} style={{ fontSize: 13, color: t.done ? 'var(--text)' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: t.done ? 'var(--green)' : 'var(--bg4)', fontSize: 12, width: 14 }}>{t.done ? '✓' : '○'}</span>
                  <span style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.7 : 1 }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Level / XP card */}
        <div style={{
          width: '100%', maxWidth: 560, padding: '14px 20px', marginBottom: 12,
          background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--gold)', width: 30, textAlign: 'center' }}>{tier.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{tier.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{totalXP} XP · {next !== tier ? `${next.min - totalXP} to ${next.name}` : 'Max level'}</div>
              </div>
            </div>
            {earnedAchievements.length > 0 && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {earnedAchievements.slice(0, 5).map((a, i) => (
                  <div key={i} className="sonata-achievement-pop" title={a.label} style={{ fontSize: 18, animationDelay: `${i * 80}ms` }}>{a.icon}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${levelProgress * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--gold2), var(--gold))', borderRadius: 2, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* Continue learning */}
        {nextLesson && (
          <div className="sonata-glow-active" onClick={() => { hSelect(); unlockAudio(); dispatch({ type: 'START_LESSON', id: nextLesson.id }); }} style={{
            width: '100%', maxWidth: 560, padding: '18px 22px', marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(200,169,110,0.12) 0%, var(--bg2) 60%)',
            border: '1px solid rgba(200,169,110,0.3)', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
            transition: 'transform 0.18s ease',
          }}>
            <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>
              ▶  Pick up where you left off
            </div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Lesson {nextLesson.id}: {nextLesson.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{nextLesson.sub} · {nextLesson.piece}</div>
          </div>
        )}

        {/* Piece of the day */}
        {featuredPiece && (
          <div onClick={() => { hSelect(); dispatch({ type: 'OPEN_SCORE', index: featuredIndex }); dispatch({ type: 'SET_SCREEN', screen: 'library' }); }} style={{
            width: '100%', maxWidth: 560, padding: '16px 20px', marginBottom: 20,
            background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--gold)', color: 'var(--bg)', fontSize: 10, padding: '3px 10px', borderBottomLeftRadius: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Today</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--gold)' }}>𝄞</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Piece of the day</div>
              <div style={{ fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{featuredPiece.t}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{featuredPiece.c}</div>
            </div>
          </div>
        )}

        <StaffDivider />

        <div style={s.menuGrid} className="sonata-menu-grid">
          {[
            { emoji: '🎹', label: 'Lessons',         desc: lessons.length + ' bite-size lessons',     cat: 'lessons',  onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'lessons' }) },
            { emoji: '🎯', label: 'Quick Drill',     desc: 'Timed note practice',                     cat: 'drill',    onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'config' }) },
            { emoji: '💪', label: 'Weak Spots',      desc: 'AI targets what you miss',                cat: 'drill',    onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'config' }) },
            { emoji: '🎵', label: 'Sight Reading',   desc: 'Play along in real time',                 cat: 'sight',    onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'sightReading' }) },
            { emoji: '🥁', label: 'Rhythm',          desc: 'Tap in time',                             cat: 'rhythm',   onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'rhythm' }) },
            { emoji: '📚', label: 'Library',         desc: CATALOG.length + ' piano pieces',          cat: 'library',  onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'library' }) },
            { emoji: '📈', label: 'Progress',        desc: 'Stats & accuracy',                        cat: 'progress', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'progress' }) },
            { emoji: '⭐', label: 'Membership',      desc: 'Pricing & subscription',                  cat: 'neutral',  onClick: () => navigate('/pricing/', router) },
            { emoji: '⚙️', label: 'Account',         desc: 'Settings & preferences',                  cat: 'neutral',  onClick: () => navigate('/account/', router) },
            { emoji: '👋', label: 'Sign Out',        desc: 'See you soon!',                           cat: 'neutral',  onClick: async () => { await signOut(); navigate('/login/', router); } },
          ].map((btn, i) => (
            <div key={i}
              style={{ ...s.menuBtn, ['--i' as unknown as string]: i } as React.CSSProperties}
              className={`sonata-menu-btn menu-cat-${btn.cat}`}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
                e.currentTarget.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
              }}
              onClick={() => { hSelect(); unlockAudio(); btn.onClick(); }}
            >
              <div className="menu-btn-emoji" aria-hidden="true">{btn.emoji}</div>
              <div style={s.menuBtnLabel}>{btn.label}</div>
              <div style={s.menuBtnDesc}>{btn.desc}</div>
            </div>
          ))}
        </div>
        {state.midiConnected && <div style={{ fontSize: 11, marginTop: 12, color: 'var(--green)' }}>🎹 MIDI connected</div>}
      </div>
    </>
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

  return (
    <>
      <Header title="Sonata" />
      <BackLink onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />
      <div style={{ padding: '20px 0' }} className="sonata-app">
        <h3 style={s.configTitle}>Set up your drill 🎯</h3>
        <div style={s.configRow}>
          <label style={s.configLabel}>Drill types</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['noteNaming','interval','oddEven','pattern','articulation','keySignature'].map(t => (
              <button key={t} style={types.includes(t) ? s.chipActive : s.chip} onClick={() => toggle(types, t, setTypes)}>
                {t === 'noteNaming' ? 'Notes' : t === 'keySignature' ? 'Key Sigs' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={s.configRow}>
          <label style={s.configLabel}>Clefs</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['treble','bass'].map(c => (
              <button key={c} style={clefs.includes(c) ? s.chipActive : s.chip} onClick={() => toggle(clefs, c, setClefs)}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={s.configRow}>
          <label style={s.configLabel}>Timer</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0,10,7,5,3].map(t => (
              <button key={t} style={timer === t ? s.chipActive : s.chip} onClick={() => setTimer(t)}>{t === 0 ? 'Off' : t + 's'}</button>
            ))}
          </div>
        </div>
        <div style={s.configRow}>
          <label style={s.configLabel}>Answer mode</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={mode === 'tap' ? s.chipActive : s.chip} onClick={() => setMode('tap')}>Tap to answer</button>
            <button style={mode === 'play' ? s.chipActive : s.chip} onClick={() => setMode('play')}>Play to answer</button>
          </div>
        </div>
        <div style={s.configRow}>
          <label style={s.configLabel}>Questions</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[10,15,20,30].map(c => (
              <button key={c} style={count === c ? s.chipActive : s.chip} onClick={() => setCount(c)}>{c}</button>
            ))}
          </div>
        </div>
        <button style={s.primaryBtn} onClick={() => startDrill({
          types: types.length ? types : ['noteNaming'],
          clefs: clefs.length ? clefs : ['treble'],
          range: 'staff', intervals: [2,3,4,5],
          timer: timer || null, count, answerMode: mode,
        })}>Let&apos;s go! 🎯</button>
      </div>
    </>
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="sonata-app">
      <div style={s.drillTop} className="sonata-drill-top">
        <span style={s.drillInfo}>Score: <b>{state.score}</b>/{state.currentQ} &nbsp; Streak: <b>{state.streak}</b></span>
        <span style={s.drillInfo}>Q<b>{state.currentQ + 1}</b>/{state.questions.length}</span>
        <button style={s.stopBtn} onClick={handleEndDrill}>Stop</button>
      </div>
      {state.drillConfig?.timer && (
        <div style={s.timerBar}><div style={{ ...s.timerFill, width: timerPct + '%', background: timerColor }} /></div>
      )}
      <div style={s.questionLabel}>
        {q.isAI && <span style={{ background: 'var(--blue-bg)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 10, fontSize: 10, marginRight: 6 }}>AI</span>}
        {q.type.replace(/([A-Z])/g, ' $1').trim()} — {q.clef} clef
      </div>
      <div ref={notRef} style={s.notation} className="sonata-notation" />
      <div style={s.questionText}>{q.label || ''}</div>
      <div style={s.feedback}>
        {answered && (pickedAnswer === q.correctAnswer
          ? <span style={{ color: 'var(--green)' }}>Correct!</span>
          : <span style={{ color: 'var(--red)' }}>{q.correctAnswer}</span>
        )}
      </div>
      <div style={s.answers} className="sonata-answers">
        {q.answerOptions.map((o, i) => (
          <button key={i} className="ans-btn" disabled={answered}
            style={{
              ...s.ansBtn,
              ...(answered && o === q.correctAnswer ? s.ansBtnCorrect : {}),
              ...(answered && o === pickedAnswer && o !== q.correctAnswer ? s.ansBtnWrong : {}),
              ...(answered ? { opacity: o !== q.correctAnswer && o !== pickedAnswer ? 0.3 : 1, cursor: 'default' } : {}),
            }}
            onClick={() => onAnswer(o)}>{o}</button>
        ))}
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

  const cleffyMood: 'excited' | 'happy' | 'thinking' = pct >= 80 ? 'excited' : pct >= 50 ? 'happy' : 'thinking';
  const headline = pct >= 90 ? 'Nailed it!' : pct >= 80 ? 'Beautiful!' : pct >= 60 ? 'Nice work!' : pct >= 40 ? 'Keep going!' : "Don't give up!";
  return (
    <>
      <Header title="Sonata" />
      <div style={{ padding: '20px 0', textAlign: 'center' }} className="sonata-app">
        <div><Cleffy size={110} mood={cleffyMood} /></div>
        <div className="sonata-big-celebration" style={{ fontSize: 52, marginTop: 4, marginBottom: 8 }}>{headline}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 56, fontWeight: 400, lineHeight: 1, color: pctColor, marginTop: 12 }}>{pct}%</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8, marginBottom: 24 }}>
          {correct}/{total} correct · Best streak: {state.bestStreak} · Timed out: {state.timedOut}
        </div>
        {Object.entries(byType).map(([type, d]) => {
          const p = Math.round(d.correct / d.total * 100);
          const c = p >= 80 ? 'var(--green)' : p >= 50 ? 'var(--yellow)' : 'var(--red)';
          const bg = p >= 80 ? 'var(--green-bg)' : p >= 50 ? 'var(--yellow-bg)' : 'var(--red-bg)';
          return <div key={type} style={s.resultRow}><span style={s.resultName}>{type}</span><span style={{ ...s.resultBadge, background: bg, color: c }}>{d.correct}/{d.total} ({p}%)</span></div>;
        })}
        {weak.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={s.sectionLabel}>Weakest intervals</div>
            {weak.map(w => {
              const c = w.pct < 50 ? 'var(--red)' : w.pct < 80 ? 'var(--yellow)' : 'var(--green)';
              return (
                <div key={w.name} style={s.resultRow}>
                  <span style={s.resultName}>{w.name}</span>
                  <div style={{ flex: 1, margin: '0 12px', height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: w.pct + '%', height: '100%', background: c, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, color: c, fontWeight: 500 }}>{w.pct}%</span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button style={{ ...s.primaryBtn, background: 'var(--bg2)', border: '1px solid var(--bg3)', color: 'var(--text)' }} onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'config' })}>One more! 🔁</button>
          <button style={s.primaryBtn} onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}>Home</button>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', marginTop: 12, fontFamily: 'var(--sans)', textDecoration: 'underline' }}
          onClick={() => {
            const text = `I just scored ${pct}% on a sight-reading drill on Sonata! 🎹 Learn to read piano sheet music at sonata.app`;
            if (navigator.share) navigator.share({ text }).catch(() => {});
            else { navigator.clipboard.writeText(text); alert('Copied to clipboard!'); }
          }}>Share your result</button>
      </div>
    </>
  );
}

// ============================================================
// SCREEN: LESSONS LIST
// ============================================================
function LessonsListScreen({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  return (
    <>
      <Header title="Sonata" />
      <BackLink onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Cleffy size={46} mood="happy" />
        <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--text)' }}>Your lessons</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
        {lessons.map((l, i) => {
          const complete = state.lessonsCompleted.includes(l.id);
          const prevComplete = i === 0 || state.lessonsCompleted.includes(lessons[i - 1].id);
          const locked = !prevComplete && !complete;
          return (
            <div key={l.id}
              style={{ ...s.lessonCard, ...(locked ? { opacity: 0.3, cursor: 'default' } : {}), ...(complete ? {} : {}) }}
              onClick={() => { if (!locked) { unlockAudio(); dispatch({ type: 'START_LESSON', id: l.id }); } }}>
              <div style={{ ...s.lessonNum, color: complete ? 'var(--green)' : locked ? 'var(--bg4)' : 'var(--gold)' }}>{l.id}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{l.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{l.sub}{l.piece ? ` · ${l.piece}` : ''}</div>
              </div>
              <div style={{ fontSize: 16 }}>{complete ? '✓' : locked ? '🔒' : '→'}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ============================================================
// SCREEN: LESSON (concepts / piece / complete)
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

  return (
    <>
      <Header title={`Lesson ${lesson.id}`} right={<span style={{ fontSize: 13, color: 'var(--text3)' }}>{lesson.title}</span>} />
      <BackLink onClick={() => { stopSpeaking(); dispatch({ type: 'SET_SCREEN', screen: 'lessons' }); }} label="← Back to lessons" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="sonata-app">
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '16px 0' }}>
          {lesson.steps.map((_, i) => (
            <div key={i} style={{ width: i === state.lessonStep ? 20 : 6, height: 6, borderRadius: 3, background: i < state.lessonStep ? 'var(--green)' : i === state.lessonStep ? 'var(--gold)' : 'var(--bg4)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <div className="sonata-lesson-wrap">
          <div style={s.teachRow} className="sonata-teach-row">
            {/* Left spacer — same width as the speak column so the text is truly centered */}
            <div style={s.teachSpacer} className="sonata-teach-spacer" aria-hidden="true" />
            <div style={s.teachText} className="sonata-teach-text">
              {step.text}
            </div>
            <div style={s.speakCol} className="sonata-speak-col">
              <button style={s.speakBtn} onClick={togglePause} aria-label="Play / pause">⏸</button>
              <button style={{ ...s.speakBtn, ...(getTTSSpeed() === 0.75 ? s.speakBtnActive : {}) }} onClick={() => { toggleSlow(); }} aria-label="Slow down">½×</button>
              <button style={s.speakBtn} onClick={replaySpeak} aria-label="Replay">↻</button>
            </div>
          </div>
          {step.abc && <div ref={notRef} style={s.notation} className="sonata-notation" />}
        </div>
        <PianoKeyboard highlights={step.piano || {}} fingers={step.fingers || {}} />
        <div style={s.teachNav} className="sonata-teach-nav">
          {state.lessonStep > 0 && <button style={s.navBtn} onClick={() => { hSelect(); stopSpeaking(); dispatch({ type: 'PREV_STEP' }); }}>Previous</button>}
          {state.lessonStep < lesson.steps.length - 1
            ? <button style={s.navBtnPrimary} onClick={() => { hSelect(); stopSpeaking(); dispatch({ type: 'NEXT_STEP' }); }}>Next</button>
            : <button style={s.navBtnPrimary} onClick={() => { hSelect(); stopSpeaking(); dispatch({ type: 'START_QUIZ' }); }}>Quiz →</button>
          }
        </div>
        <div style={{ fontSize: 10, color: 'var(--bg4)', textAlign: 'center', marginTop: 4 }}>← → arrows · Space = next · P = pause · Esc = back</div>
      </div>
    </>
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
    <>
      <Header title={`Lesson ${lesson.id}`} right={<span style={{ fontSize: 13, color: 'var(--text3)' }}>Quiz</span>} />
      <BackLink onClick={() => dispatch({ type: 'UPDATE_FIELD', field: 'lessonPhase', value: 'concepts' })} label="← Back to lesson" />
      <div className="sonata-app" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Question {current + 1} of {quiz.length} · Score: {score}/{current + (answered ? 1 : 0)}
        </div>
        <div style={{
          padding: 24, background: 'var(--bg2)', border: '1px solid var(--bg3)',
          borderRadius: 14, marginBottom: 16, fontSize: 15, lineHeight: 1.7, color: 'var(--text2)',
        }}>
          {q.q}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {q.options.map((opt, idx) => {
            let bg = 'var(--bg2)';
            let border = 'var(--bg3)';
            let color = 'var(--text)';
            if (answered) {
              if (idx === q.correct) { bg = 'var(--green-bg)'; border = 'var(--green)'; color = 'var(--green)'; }
              else if (idx === picked) { bg = 'var(--red-bg)'; border = 'var(--red)'; color = 'var(--red)'; }
              else { color = 'var(--text3)'; }
            }
            return (
              <button key={idx} onClick={() => handleAnswer(idx)} disabled={answered} style={{
                padding: '14px 18px', background: bg, border: `1px solid ${border}`,
                borderRadius: 10, color, fontSize: 14, textAlign: 'left', cursor: answered ? 'default' : 'pointer',
                fontFamily: 'var(--sans)', transition: 'all 0.15s',
                opacity: answered && idx !== q.correct && idx !== picked ? 0.4 : 1,
              }}>
                {opt}
              </button>
            );
          })}
        </div>
        {answered && (
          <button style={{ ...s.primaryBtn, maxWidth: 200, margin: '16px auto 0' }} onClick={next}>
            {current + 1 >= quiz.length ? (lesson.piece ? 'Play the piece →' : 'Finish lesson →') : 'Next question'}
          </button>
        )}
      </div>
    </>
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
    <>
      <Header title={`Lesson ${lesson.id}`} right={<span style={{ fontSize: 13, color: 'var(--text3)' }}>{lesson.title}</span>} />
      <BackLink onClick={() => dispatch({ type: 'UPDATE_FIELD', field: 'lessonPhase', value: 'concepts' })} label="← Back to lesson" />
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400 }}>{piece.t}</h3>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>{piece.c}</p>
      </div>
      <div ref={scoreRef} style={{ minHeight: 300, padding: '16px 0', overflowX: 'auto' }}>
        <LoadingSpinner text="Loading score..." />
      </div>

      {/* Walkthrough */}
      {!wtDone && wt.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 6 }}>
            Walkthrough {wtStep + 1}/{wt.length}
          </div>
          <div style={{
            padding: 16, background: 'var(--bg2)', border: '1px solid rgba(200,169,110,0.15)',
            borderRadius: 14, fontSize: 14, lineHeight: 1.7, color: 'var(--text2)',
          }}>
            {wt[wtStep]}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
            {wtStep > 0 && (
              <button style={s.navBtn} onClick={() => setWtStep(s => s - 1)}>Previous</button>
            )}
            {wtStep < wt.length - 1 ? (
              <button style={s.navBtnPrimary} onClick={() => setWtStep(s => s + 1)}>Next</button>
            ) : (
              <button style={s.navBtnPrimary} onClick={() => setWtDone(true)}>Got it! →</button>
            )}
          </div>
        </div>
      )}

      {/* Playback + Complete (shown after walkthrough) */}
      {wtDone && (
        <>
          <ScorePlaybackControls playScore={playScore} />
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button style={{ ...s.primaryBtn, maxWidth: 250, margin: '0 auto' }} className="sonata-primary-btn" onClick={() => {
              hSuccess();
              stopScorePlayback();
              dispatch({ type: 'COMPLETE_LESSON' });
              if (state.user) saveLessonComplete(state.user.id, state.currentLesson, 1.0);
              recordPractice(state.user?.id);
            }}>Complete Lesson</button>
          </div>
        </>
      )}
    </>
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
    <>
      <Header title="Sonata" />
      <div style={{ padding: '20px 0', textAlign: 'center' }} className="sonata-app">
        <div style={{ marginBottom: 8 }}><Cleffy size={140} mood="excited" /></div>
        <div className="sonata-big-celebration" style={{ marginBottom: 12 }}>{phrase}</div>
        <h3 style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 500, marginBottom: 20, color: 'var(--text2)' }}>Lesson {lesson.id} complete</h3>
        <p style={{ color: 'var(--text2)', margin: '16px 0', lineHeight: 1.6 }}>
          You just learned <b style={{ color: 'var(--text)' }}>{lesson.title}</b>
          {lesson.piece && <><br />on <b style={{ color: 'var(--text)' }}>{lesson.piece}</b></>}
        </p>
        {nextLesson
          ? <button style={s.primaryBtn} onClick={() => dispatch({ type: 'START_LESSON', id: nextLesson.id })}>Next up: {nextLesson.title} →</button>
          : <button style={s.primaryBtn}>🏆 You finished the course!</button>
        }
        <div style={{ marginTop: 8 }}>
          <button style={{ ...s.primaryBtn, background: 'var(--bg2)', border: '1px solid var(--bg3)', color: 'var(--text)' }} onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'lessons' })}>← Back to lessons</button>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', marginTop: 12, fontFamily: 'var(--sans)', textDecoration: 'underline' }}
          onClick={() => {
            const text = `I just completed Lesson ${lesson.id}: ${lesson.title} on Sonata! 🎹 Learning to read piano sheet music.`;
            if (navigator.share) navigator.share({ text }).catch(() => {});
            else { navigator.clipboard.writeText(text); alert('Copied to clipboard!'); }
          }}>Share your progress</button>
      </div>
    </>
  );
}

// ============================================================
// SCREEN: LIBRARY
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

  return (
    <>
      <Header title="Sonata" />
      <BackLink onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Cleffy size={46} mood="waving" />
        <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--text)' }}>Piano library <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 300, fontFamily: 'var(--sans)' }}>· {CATALOG.length} pieces</span></h3>
      </div>
      <input value={state.libSearch} onChange={e => dispatch({ type: 'LIB_SEARCH', query: e.target.value })} placeholder="Search pieces or composers..." style={s.searchInput} className="sonata-search-input" />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {['all','beginner','intermediate','advanced'].map(f => (
          <button key={f} style={state.libFilter === f ? s.chipActive : s.chip} onClick={() => dispatch({ type: 'LIB_FILTER', filter: f })}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {showRec && (
        <div style={{ marginBottom: 16 }}>
          <div style={s.sectionLabel}>Recommended for you <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--gold-bg)', color: 'var(--gold)', borderRadius: 10, marginLeft: 4 }}>{recDiff}</span></div>
          {recommended.map(p => {
            const ci = (CATALOG as CatalogEntry[]).indexOf(p);
            const dc = DIFF_COLORS[p.d] || DIFF_COLORS.beginner;
            return <PieceCard key={ci} piece={p} onClick={() => dispatch({ type: 'OPEN_SCORE', index: ci })} dc={dc} />;
          })}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 ? <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 20 }}>No pieces match your search</div> :
          filtered.map(p => {
            const ci = (CATALOG as CatalogEntry[]).indexOf(p);
            const dc = DIFF_COLORS[p.d] || DIFF_COLORS.beginner;
            return <PieceCard key={ci} piece={p} onClick={() => dispatch({ type: 'OPEN_SCORE', index: ci })} dc={dc} />;
          })
        }
      </div>
    </>
  );
}

function PieceCard({ piece, onClick, dc }: { piece: CatalogEntry; onClick: () => void; dc: { bg: string; color: string } }) {
  return (
    <div style={s.pieceCard} className="sonata-piece-card" onClick={onClick}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{piece.t}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{piece.c}</div>
      </div>
      <div style={{ fontSize: 10, padding: '3px 10px', borderRadius: 12, fontWeight: 500, background: dc.bg, color: dc.color }}>{piece.d}</div>
    </div>
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
  return (
    <>
      <Header title="Sonata" />
      <BackLink onClick={() => dispatch({ type: 'OPEN_SCORE', index: -1 })} label="← Back to library" />
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400 }}>{piece.t}</h3>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>{piece.c}</p>
      </div>
      <ScorePlaybackControls playScore={playScore} />
      <div ref={ref} style={{ minHeight: 300, padding: '16px 0', overflowX: 'auto' }}>
        <LoadingSpinner text="Loading score..." />
      </div>
    </>
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

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '12px 0 20px', flexWrap: 'wrap', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14 }}>
      <button onClick={handlePlay} disabled={loadingPiano}
        style={{ padding: '12px 28px', background: playing ? 'var(--red)' : 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', opacity: loadingPiano ? 0.7 : 1, minWidth: 120 }}>
        {loadingPiano ? 'Loading…' : playing ? '⏹ Stop' : '▶ Play'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button style={{ ...s.chip, padding: '6px 12px', fontSize: 14, minWidth: 32 }} onClick={() => setTempo(t => Math.max(40, t - 10))}>−</button>
        <span style={{ fontSize: 13, color: 'var(--text2)', minWidth: 70, textAlign: 'center', fontFamily: 'var(--mono)' }}>{tempo} BPM</span>
        <button style={{ ...s.chip, padding: '6px 12px', fontSize: 14, minWidth: 32 }} onClick={() => setTempo(t => Math.min(200, t + 10))}>+</button>
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

  return (
    <>
      <Header title="Sonata" />
      <BackLink onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Cleffy size={46} mood={streak >= 3 ? 'excited' : 'thinking'} />
        <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--text)' }}>Your progress</h3>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {[
          { val: state.drillHistory.length, label: 'Drills' },
          { val: state.lessonsCompleted.length + '/' + lessons.length, label: 'Lessons' },
          { val: streak, label: 'Day streak' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: 16, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--gold)' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={s.sectionLabel}>Practice Calendar (30 days)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, margin: '12px 0' }}>
          {Array.from({ length: 30 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (29 - i));
            const key = localDateKey(d);
            const practiced = practiceDates.includes(key);
            return <div key={i} title={key} style={{ width: 16, height: 16, borderRadius: 3, background: practiced ? 'var(--green)' : 'var(--bg3)', opacity: practiced ? 1 : 0.4 }} />;
          })}
        </div>
      </div>
      <div>
        <div style={s.sectionLabel}>Interval Accuracy</div>
        <div style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              <td style={{ padding: '6px 8px', color: 'var(--text3)' }}></td>
              {dirs.map(d => <td key={d} style={{ padding: '6px 8px', color: 'var(--text3)', textAlign: 'center' }}>{d === 'up' ? 'Asc' : 'Desc'}</td>)}
            </tr></thead>
            <tbody>
              {intervals.map(name => (
                <tr key={name}>
                  <td style={{ padding: '6px 8px', color: 'var(--text2)' }}>{name}</td>
                  {dirs.map(d => {
                    const key = name + ' ' + d;
                    const data = acc[key];
                    let bg = 'var(--bg3)', color = 'var(--text3)', text = '—';
                    if (data && data.total > 0) {
                      const pct = Math.round(data.correct / data.total * 100);
                      text = pct + '%';
                      if (pct >= 80) { bg = 'var(--green-bg)'; color = 'var(--green)'; }
                      else if (pct >= 50) { bg = 'var(--yellow-bg)'; color = 'var(--yellow)'; }
                      else { bg = 'var(--red-bg)'; color = 'var(--red)'; }
                    }
                    return <td key={d} style={{ padding: '6px 8px', textAlign: 'center', background: bg, color, borderRadius: 4 }}>{text}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
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

  return (
    <>
      <Header title="Sonata" />
      <BackLink onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />
      <div className="sonata-app">
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 12, color: 'var(--text3)' }}>
          <span>Sight Reading · {srClef} clef</span>
          <span style={{ color: 'var(--green)', fontWeight: 500 }}>Combo: {srCombo}</span>
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--gold)' }}>{srScore}/{srNotes.length}</span>
        </div>
        <div ref={notRef} style={s.notation} className="sonata-notation" />
        {!srDone && srNotes[srIndex] && (
          <div style={{ textAlign: 'center', margin: '12px 0', fontSize: 13, color: 'var(--text3)' }}>
            Play note <b style={{ color: 'var(--gold)' }}>{srNotes[srIndex]?.[0]}</b> ({srNotes[srIndex]})
          </div>
        )}
        {srDone && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 36, color: srScore / srNotes.length >= 0.7 ? 'var(--green)' : 'var(--red)' }}>{Math.round(srScore / srNotes.length * 100)}%</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{srScore}/{srNotes.length} correct</div>
          </div>
        )}
        <PianoKeyboard onClick={(m) => handleNote(midiToNote(m))} />
        {!srRunning && !srDone && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button style={{ ...s.primaryBtn, maxWidth: 200, margin: '0 auto' }} onClick={() => {
              setSrRunning(true); setSrIndex(0); setSrScore(0); setSrCombo(0);
              timerIdRef.current = setTimeout(() => { setSrCombo(0); setSrIndex(i => i + 1); }, 3000);
            }}>Start</button>
          </div>
        )}
      </div>
    </>
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
        setError('Purchase was not completed.');
      }
    } catch { setError('Something went wrong. Please try again.'); }
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

  return (
    <div style={{ padding: 24, textAlign: 'center', maxWidth: 440, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>♪</div>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, color: '#C8A96E', marginBottom: 8 }}>
        Unlock Sonata
      </h2>
      <p style={{ color: '#A8A29E', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
        You&apos;ve tried the first 3 lessons. Unlock all 23 lessons, unlimited drills, and the full piece library.
      </p>

      <div style={{ background: '#1C1917', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 14, padding: '24px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#C8A96E', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 6 }}>Sonata Premium — 1 Month</div>
        <div style={{ fontSize: 36, fontWeight: 600, color: '#FAFAF9', marginBottom: 4 }}>{price}<span style={{ fontSize: 15, fontWeight: 300, color: '#78716C' }}>/month</span></div>
        <div style={{ fontSize: 12, color: '#78716C', marginBottom: 18 }}>Auto-renewing monthly subscription.</div>
        <button onClick={handleSubscribe} disabled={loading} className="sonata-primary-btn"
          style={{ width: '100%', padding: '16px 0', background: '#C8A96E', color: '#0C0A09', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif", opacity: loading ? 0.6 : 1 }}>
          {loading ? '...' : `Subscribe for ${price}/month`}
        </button>
      </div>

      {error && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <ul style={{ textAlign: 'left', color: '#D6D3D1', fontSize: 14, lineHeight: 2, listStyle: 'none', padding: 0, marginBottom: 24 }}>
        <li>✓ All 23 lessons from basics to Moonlight Sonata</li>
        <li>✓ Unlimited interval drills</li>
        <li>✓ Full piano library with playback</li>
        <li>✓ AI-generated exercises</li>
        <li>✓ MIDI keyboard support</li>
      </ul>

      <button onClick={handleRestore} disabled={loading}
        style={{ background: 'none', border: 'none', color: '#C8A96E', fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif", padding: 8, marginBottom: 6 }}>
        Restore purchases
      </button>
      <br />
      <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
        style={{ background: 'none', border: 'none', color: '#44403C', fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif", padding: 6 }}>
        Back to menu
      </button>

      <div style={{ fontSize: 11, color: '#78716C', marginTop: 20, lineHeight: 1.7, textAlign: 'left' }}>
        <p style={{ margin: 0 }}>
          Payment will be charged to your Apple ID account at confirmation of purchase. Your subscription will automatically renew for {price} per month unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal, at {price}, within 24 hours prior to the end of the current period. You can manage your subscription and turn off auto-renewal by going to your Apple ID Account Settings after purchase.
        </p>
        <p style={{ margin: '10px 0 0', textAlign: 'center' }}>
          <a href="/terms/" onClick={(e) => { e.preventDefault(); navigate("/terms/"); }} style={{ color: '#A8A29E', textDecoration: 'underline' }}>Terms of Use (EULA)</a>
          {' · '}
          <a href="/privacy/" onClick={(e) => { e.preventDefault(); navigate("/privacy/"); }} style={{ color: '#A8A29E', textDecoration: 'underline' }}>Privacy Policy</a>
        </p>
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

  return (
    <div style={{ padding: 24, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>♪</div>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, color: '#C8A96E', marginBottom: 8 }}>
        Unlock Sonata
      </h2>
      <p style={{ color: '#A8A29E', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        You&apos;ve tried the first 3 lessons. Unlock all 23 lessons, unlimited drills, and the full piece library.
      </p>

      <div style={{ background: '#1C1917', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 14, padding: '24px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 32, fontWeight: 600, color: '#FAFAF9', marginBottom: 4 }}>$10<span style={{ fontSize: 14, fontWeight: 300, color: '#78716C' }}>/month</span></div>
        <div style={{ fontSize: 12, color: '#78716C', marginBottom: 16 }}>Cancel anytime.</div>
        <a href="https://morrison844.gumroad.com/l/sonata" target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', width: '100%', padding: '14px 0', background: '#C8A96E', color: '#0C0A09', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, textDecoration: 'none', textAlign: 'center', fontFamily: "'Outfit', system-ui, sans-serif", boxSizing: 'border-box' }}>
          Get Sonata Premium
        </a>
      </div>

      <div style={{ background: '#1C1917', border: '1px solid #292524', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 10 }}>Already have a license key?</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="XXXXXXXX-XXXXXXXX-..." value={key} onChange={e => setKey(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', background: '#0C0A09', border: '1px solid #292524', borderRadius: 8, color: '#FAFAF9', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
          <button onClick={handleActivate} disabled={loading || !key.trim()}
            style={{ padding: '10px 16px', background: '#C8A96E', color: '#0C0A09', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif", opacity: loading || !key.trim() ? 0.5 : 1 }}>
            {loading ? '...' : 'Activate'}
          </button>
        </div>
        {error && <p style={{ color: '#F87171', fontSize: 12, marginTop: 8, textAlign: 'left' }}>{error}</p>}
      </div>

      <ul style={{ textAlign: 'left', color: '#D6D3D1', fontSize: 13, lineHeight: 2, listStyle: 'none', padding: 0, marginBottom: 20 }}>
        <li>✓ All 23 lessons from basics to Moonlight Sonata</li>
        <li>✓ Unlimited interval drills</li>
        <li>✓ Full piano library with playback</li>
        <li>✓ AI-generated exercises</li>
        <li>✓ MIDI keyboard support</li>
      </ul>

      <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
        style={{ background: 'none', border: 'none', color: '#44403C', fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif" }}>
        Back to menu
      </button>
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

  return (
    <>
      <Header title="Sonata" />
      <BackLink onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />
      <div className="sonata-app">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 6 }}>
          <Cleffy size={48} mood={phase === 'listen' ? 'thinking' : phase === 'play' ? 'happy' : phase === 'result' && accuracyPct >= 0.7 ? 'excited' : 'idle'} />
          <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 24 }}>{pattern.name}</h3>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
          {pattern.timeSignature} at {pattern.bpm} BPM · {pattern.pattern.length} beats
        </div>

        {/* Rhythm bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, justifyContent: 'center', padding: '16px 0' }}>
          {pattern.pattern.map((dur, i) => {
            let bg = 'var(--bg3)';
            if (phase === 'listen' && activeBeat === i) bg = 'var(--gold)';
            else if (phase === 'play') {
              if (i < hits.length) bg = 'var(--coral)';
              else if (activeBeat === i) bg = 'var(--gold)';
            } else if (result && i < result.beatResults.length) {
              bg = result.beatResults[i] ? 'var(--green)' : 'var(--red)';
            }
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 28, height: Math.round(dur * 44 + 18), borderRadius: 4, background: bg, transition: 'all 0.15s var(--bounce)', transform: activeBeat === i ? 'scaleY(1.15)' : 'scaleY(1)' }} />
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>{dur >= 1 ? dur + '' : dur >= 0.5 ? '8th' : 'tri'}</div>
              </div>
            );
          })}
        </div>

        {/* Big celebration on good score */}
        {phase === 'result' && headline && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <div className="sonata-big-celebration" style={{ fontSize: 40 }}>{headline}</div>
          </div>
        )}

        {/* Status + tap zone */}
        {phase === 'play' ? (
          <div
            onPointerDown={(e) => { e.preventDefault(); registerTap(); }}
            style={{
              background: 'rgba(255,159,126,0.08)', border: '2px dashed rgba(255,159,126,0.35)',
              borderRadius: 18, padding: '46px 20px', margin: '16px 0', cursor: 'pointer',
              textAlign: 'center', fontSize: 22, color: 'var(--coral)', fontFamily: 'var(--serif)',
              userSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            }}
          >
            Tap! 🥁
            <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 8, fontFamily: 'var(--sans)', fontWeight: 500 }}>
              {hits.length} / {pattern.pattern.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--sans)' }}>
              or press spacebar
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', minHeight: 48, margin: '16px 0', fontSize: 15, color: phase === 'listen' ? 'var(--gold)' : 'var(--text3)', fontWeight: phase === 'listen' ? 600 : 400 }}>
            {statusText}
          </div>
        )}

        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          {phase === 'idle' && (
            <button style={{ ...s.primaryBtn, maxWidth: 240, margin: '0 auto' }} onClick={start}>Start 🥁</button>
          )}
          {phase === 'listen' && (
            <button style={{ ...s.primaryBtn, maxWidth: 240, margin: '0 auto', opacity: 0.55 }} disabled>Listening…</button>
          )}
          {phase === 'play' && (
            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Waiting for your taps…</div>
          )}
          {phase === 'result' && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button style={{ ...s.primaryBtn, background: 'var(--bg2)', border: '1px solid var(--bg3)', color: 'var(--text)', maxWidth: 180 }} onClick={start}>Try again 🔁</button>
              <button style={{ ...s.primaryBtn, maxWidth: 180 }} onClick={nextPattern}>New pattern ✨</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

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
