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
  playCorrectSound, playWrongSound, playNote,
  speak, stopSpeaking, togglePause, toggleSlow, replaySpeak, getTTSSpeed, setTTSStateCallback,
  getIntervalAccuracy, updateIntervalAccuracy, getWeakestIntervals, recordPractice, getPracticeDates,
  getStoredLessons, setStoredLessons, getStoredDrills, setStoredDrills, isOnboarded, setOnboarded,
  lessons, CATALOG, getCatalogUrl, DIFF_COLORS, getRecommendedDifficulty, findLessonCatalogIndex,
} from "@/lib/music";
import type { Question, DrillConfig, RhythmPattern, CatalogEntry, Lesson } from "@/lib/music";
import { checkAuth, signOut, loadProgress, saveDrillSession, saveLessonComplete } from "@/lib/supabaseData";
import type { User } from "@supabase/supabase-js";
import "./sonata.css";

// ============================================================
// STATE
// ============================================================
type Screen = 'loading'|'onboarding'|'menu'|'config'|'drill'|'results'|'lessons'|'lesson'|'library'|'progress'|'sightReading'|'rhythm';

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
  lessonPhase: 'concepts'|'piece'|'complete';
  lessonsCompleted: number[];
  returnToLesson: boolean;
  drillHistory: { timestamp: number; score: number; total: number }[];
  // Library
  libFilter: string;
  libSearch: string;
  currentScoreIndex: number;
  // MIDI
  midiConnected: boolean;
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
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN': return { ...state, screen: action.screen };
    case 'SET_USER': return { ...state, user: action.user };
    case 'LOAD_PROGRESS': return { ...state, lessonsCompleted: action.lessonsCompleted, drillHistory: new Array(action.drillCount) };
    case 'START_DRILL': return { ...state, screen: 'drill', drillConfig: action.config, questions: action.questions, currentQ: 0, score: 0, streak: 0, bestStreak: 0, timedOut: 0, results: [], timeLeft: action.config.timer ? action.config.timer * 10 : 0 };
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
    case 'START_LESSON': return { ...state, screen: 'lesson', currentLesson: action.id, lessonStep: 0, lessonPhase: 'concepts' };
    case 'NEXT_STEP': return { ...state, lessonStep: state.lessonStep + 1 };
    case 'PREV_STEP': return { ...state, lessonStep: state.lessonStep - 1 };
    case 'START_PIECE': return { ...state, lessonPhase: 'piece' };
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
    (async () => {
      const user = await checkAuth();
      if (!user) { router.push('/login'); return; }
      dispatch({ type: 'SET_USER', user });

      const progress = await loadProgress(user.id);
      if (progress) {
        dispatch({ type: 'LOAD_PROGRESS', lessonsCompleted: progress.lessonsCompleted, drillCount: progress.drillCount });
        if (Object.keys(progress.intervalAccuracy).length > 0) {
          localStorage.setItem('sonata_interval_acc', JSON.stringify(progress.intervalAccuracy));
        }
        if (progress.practiceDates.length > 0) {
          localStorage.setItem('sonata_practice_dates', JSON.stringify(progress.practiceDates));
        }
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

      if (!isOnboarded()) {
        dispatch({ type: 'SET_SCREEN', screen: 'onboarding' });
      } else {
        dispatch({ type: 'SET_SCREEN', screen: 'menu' });
      }
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- ABCJS rendering ----
  const renderNotation = useCallback((abc: string, container: HTMLDivElement | null, width: number = 350) => {
    if (!container || !abc) return;
    import('abcjs').then((ABCJS) => {
      ABCJS.default.renderAbc(container, abc, {
        staffwidth: width, paddingtop: 0, paddingbottom: 0,
        add_classes: true, responsive: 'resize'
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
          else if (lesson && state.lessonStep === lesson.steps.length - 1) { stopSpeaking(); dispatch({ type: 'START_PIECE' }); }
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
    if (ok) playCorrectSound(); else playWrongSound();
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
    recordPractice();
    dispatch({ type: 'UPDATE_FIELD', field: 'drillHistory', value: history });

    if (state.user) saveDrillSession(state.user.id, state.results, 0);

    if (state.returnToLesson) {
      const lesson = lessons.find(l => l.id === state.currentLesson);
      const total = state.results.length;
      const correct = state.results.filter(r => r.correct).length;
      const accuracy = total ? correct / total : 0;
      if (accuracy >= (lesson?.advance || 0.80)) {
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
      // Dark theme recoloring
      setTimeout(() => {
        container.querySelectorAll('svg *').forEach(el => {
          const fill = el.getAttribute('fill');
          const stroke = el.getAttribute('stroke');
          if (fill === '#000000' || fill === '#000' || fill === 'black') el.setAttribute('fill', '#FAFAF9');
          if (stroke === '#000000' || stroke === '#000' || stroke === 'black') el.setAttribute('stroke', '#FAFAF9');
        });
      }, 100);
      osmdInstanceRef.current = instance;
    } catch (e) {
      container.innerHTML = `<div style="color:var(--red);text-align:center;padding:40px">Failed to load score.<br><span style="font-size:12px;color:var(--text3)">${(e as Error).message || ''}</span></div>`;
    }
  }

  // ---- Play score via Web Audio ----
  function playScore(tempo: number = 100) {
    const inst = osmdInstanceRef.current;
    if (!inst || !inst.Sheet) return;
    const notes: { midi: number; time: number; duration: number }[] = [];
    const beatDur = 60 / tempo;
    let currentTime = 0;
    try {
      for (const measure of inst.Sheet.SourceMeasures) {
        for (const staff of measure.VerticalSourceStaffEntryContainers) {
          for (const entry of staff.StaffEntries) {
            if (!entry) continue;
            for (const voiceEntry of entry.VoiceEntries) {
              for (const note of voiceEntry.Notes) {
                if (note.isRest()) continue;
                const midi = note.halfTone + 12; // OSMD halfTone is semitones from C-1
                const dur = note.Length.RealValue * 4 * beatDur;
                notes.push({ midi, time: currentTime, duration: Math.min(dur, 2) });
              }
            }
            // Advance time by the shortest note in this entry
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const shortest = Math.min(...Array.from(entry.VoiceEntries).flatMap((ve: any) =>
              Array.from(ve.Notes).filter((n: any) => !n.isRest()).map((n: any) => n.Length.RealValue * 4 * beatDur)
            ).filter((d: number) => d > 0), 1);
            /* eslint-enable @typescript-eslint/no-explicit-any */
            currentTime += shortest || beatDur;
          }
        }
      }
    } catch { /* Some scores have unusual structures */ }
    if (notes.length === 0) return;
    // Deduplicate by time (chords produce multiple notes at same time)
    notes.forEach(n => {
      setTimeout(() => playNote(n.midi, Math.min(n.duration, 1.5)), n.time * 1000);
    });
  }

  // ============================================================
  // RENDER
  // ============================================================
  if (state.screen === 'loading') {
    return (
      <div style={s.page} className="sonata-page">
        <div style={s.app}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--gold)', marginBottom: 16 }}>Sonata</div>
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
          {state.screen === 'onboarding' && <OnboardingScreen slide={onboardSlide} setSlide={setOnboardSlide} dispatch={dispatch} renderNotation={renderNotation} />}
          {state.screen === 'menu' && <MenuScreen state={state} dispatch={dispatch} />}
          {state.screen === 'config' && <ConfigScreen dispatch={dispatch} startDrill={startDrill} />}
          {state.screen === 'drill' && <DrillScreen state={state} handleAnswer={handleAnswer} handleEndDrill={handleEndDrill} renderNotation={renderNotation} />}
          {state.screen === 'results' && <ResultsScreen state={state} dispatch={dispatch} />}
          {state.screen === 'lessons' && <LessonsListScreen state={state} dispatch={dispatch} />}
          {state.screen === 'lesson' && <LessonScreen state={state} dispatch={dispatch} renderNotation={renderNotation} loadScore={loadScore} playScore={playScore} />}
          {state.screen === 'library' && <LibraryScreen state={state} dispatch={dispatch} loadScore={loadScore} playScore={playScore} />}
          {state.screen === 'progress' && <ProgressScreen state={state} dispatch={dispatch} />}
          {state.screen === 'sightReading' && <SightReadingScreen dispatch={dispatch} renderNotation={renderNotation} />}
          {state.screen === 'rhythm' && <RhythmScreen dispatch={dispatch} />}
        </div>
      </div>
    </ErrorBoundary>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={s.header} className="sonata-header">
      <h1 style={s.headerTitle}>{title}</h1>
      {right && <div style={s.headerStats}>{right}</div>}
    </div>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label?: string }) {
  return <span style={s.backLink} onClick={onClick}>{label || '← Back'}</span>;
}

function PianoKeyboard({ startMidi = 48, endMidi = 84, highlights = {}, fingers = {}, onClick, showNames = true }: {
  startMidi?: number; endMidi?: number; highlights?: Record<number, string>; fingers?: Record<number, number>;
  onClick?: (midi: number) => void; showNames?: boolean;
}) {
  const keys: React.ReactNode[] = [];
  for (let m = startMidi; m <= endMidi; m++) {
    if (isBlack(m)) continue;
    keys.push(
      <div key={m} className="sonata-key-white" style={{ ...s.keyWhite, position: 'relative' }} onClick={() => onClick?.(m)}>
        {showNames && <span className="sonata-note-name" style={s.keyNoteName}>{NOTES[m % 12]}</span>}
        {highlights[m] && <div style={{ ...s.keyHighlight, background: highlights[m] }} />}
        {fingers[m] && <div style={s.fingerBadge}>{fingers[m]}</div>}
      </div>
    );
    const nb = m + 1;
    if (nb <= endMidi && isBlack(nb)) {
      keys.push(
        <div key={nb} className="sonata-key-black" style={{ ...s.keyBlack, position: 'relative' }} onClick={() => onClick?.(nb)}>
          {highlights[nb] && <div style={{ ...s.keyHighlight, background: highlights[nb], opacity: 0.5 }} />}
          {fingers[nb] && <div style={{ ...s.fingerBadge, background: 'var(--text)', color: 'var(--bg)' }}>{fingers[nb]}</div>}
        </div>
      );
    }
  }
  return (
    <div style={s.pianoContainer} className="sonata-piano-container">
      <div style={s.piano}>{keys}</div>
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
function OnboardingScreen({ slide, setSlide, dispatch, renderNotation }: {
  slide: number; setSlide: (s: number) => void; dispatch: React.Dispatch<Action>;
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number) => void;
}) {
  const slides = [
    { title: 'Read by distance', body: 'Sonata teaches you to read music by distance, not by memorising note names. Steps, skips, and leaps.', abc: 'X:1\nM:4/4\nL:1/4\nK:clef=treble\nC D z E G |' },
    { title: 'The odd/even trick', body: 'Odd intervals (3rd, 5th, 7th) land on the same type — both lines or both spaces. Even intervals cross.', abc: 'X:1\nM:4/4\nL:1/4\nK:clef=treble\nC E z C F |' },
    { title: 'Tap or play', body: 'Answer drills by tapping on screen — or by playing notes on your real piano.', abc: '' },
  ];
  const sl = slides[slide];
  const notRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (sl.abc) renderNotation(sl.abc, notRef.current, 250); }, [slide, sl.abc, renderNotation]);

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
        else { setOnboarded(); dispatch({ type: 'START_LESSON', id: 1 }); }
      }}>{slide < slides.length - 1 ? 'Next' : 'Start Lesson 1'}</button>
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
    if (practiceDates.includes(d.toISOString().slice(0, 10))) streak++; else break;
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

function MenuScreen({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const email = state.user?.email || '';
  const lessonPct = Math.round(state.lessonsCompleted.length / lessons.length * 100);
  const nextLesson = getNextLesson(state.lessonsCompleted);
  const achievements = getAchievements(state);
  const newAchievements = achievements.filter(a => a.done);

  return (
    <>
      <Header title="Sonata" right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {email && <span style={{ opacity: 0.6, fontSize: 11 }}>{email}</span>}
          <div style={s.progressMini}><div style={{ ...s.progressMiniFill, width: lessonPct + '%' }} /></div>
        </div>
      } />
      <div style={s.menu} className="sonata-menu">
        <h2 style={s.menuTitle} className="sonata-menu-title">Learn to read music</h2>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--text3)', marginTop: -8, letterSpacing: '0.02em' }}>by Adam Morris</div>

        {/* Streak banner */}
        {(() => {
          const dates = getPracticeDates();
          let streak = 0;
          for (let i = 0; i < 365; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            if (dates.includes(d.toISOString().slice(0, 10))) streak++; else break;
          }
          if (streak >= 2) return (
            <div style={{ marginTop: 12, padding: '8px 20px', background: 'var(--gold-bg)', border: '1px solid rgba(200,169,110,0.15)', borderRadius: 20, fontSize: 13, color: 'var(--gold)', fontWeight: 500 }}>
              🔥 {streak}-day streak — keep it going!
            </div>
          );
          if (streak === 0 && dates.length > 0) return (
            <div style={{ marginTop: 12, padding: '8px 20px', background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 20, fontSize: 13, color: 'var(--red)', fontWeight: 400 }}>
              Your streak ended — practice today to start a new one
            </div>
          );
          return null;
        })()}

        {/* Daily practice / Continue button */}
        {nextLesson && (
          <div onClick={() => dispatch({ type: 'START_LESSON', id: nextLesson.id })} style={{
            width: '100%', maxWidth: 500, padding: '20px 24px', marginTop: 16, marginBottom: 8,
            background: 'linear-gradient(135deg, rgba(200,169,110,0.08) 0%, var(--bg2) 60%)',
            border: '1px solid rgba(200,169,110,0.2)', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 6 }}>
              Continue learning
            </div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Lesson {nextLesson.id}: {nextLesson.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{nextLesson.sub} · {nextLesson.piece}</div>
          </div>
        )}

        {/* Achievements row */}
        {newAchievements.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8, marginBottom: 4 }}>
            {newAchievements.map((a, i) => (
              <div key={i} title={a.label} style={{ fontSize: 16, opacity: 0.8 }}>{a.icon}</div>
            ))}
          </div>
        )}

        <div style={s.menuGrid} className="sonata-menu-grid">
          {[
            { label: 'Lessons', desc: lessons.length + ' structured lessons', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'lessons' }) },
            { label: 'Quick Drill', desc: 'Timed exercises', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'config' }) },
            { label: 'Target Weak Spots', desc: 'AI-focused drills', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'config' }) },
            { label: 'Sight Reading', desc: 'Play along in real time', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'sightReading' }) },
            { label: 'Rhythm', desc: 'Tap in time', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'rhythm' }) },
            { label: 'Library', desc: CATALOG.length + ' pieces', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'library' }) },
            { label: 'Progress', desc: 'Stats & accuracy', onClick: () => dispatch({ type: 'SET_SCREEN', screen: 'progress' }) },
            { label: 'Account', desc: 'Settings & password', onClick: () => { window.location.href = '/account'; } },
            { label: 'Sign Out', desc: 'Log out', onClick: () => signOut() },
          ].map((btn, i) => (
            <div key={i} style={s.menuBtn} onClick={btn.onClick}>
              <div style={s.menuBtnLabel}>{btn.label}</div>
              <div style={s.menuBtnDesc}>{btn.desc}</div>
            </div>
          ))}
        </div>
        {state.midiConnected && <div style={{ fontSize: 11, marginTop: 12, color: 'var(--green)' }}>MIDI connected</div>}
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
        <h3 style={s.configTitle}>Configure Drill</h3>
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
        })}>Start Drill</button>
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
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number) => void;
}) {
  const q = state.questions[state.currentQ];
  const notRef = useRef<HTMLDivElement>(null);
  const [answered, setAnswered] = useState(false);
  const [pickedAnswer, setPickedAnswer] = useState('');

  useEffect(() => { setAnswered(false); setPickedAnswer(''); }, [state.currentQ]);
  useEffect(() => { if (q?.abc) renderNotation(q.abc, notRef.current, 300); }, [q, state.currentQ, renderNotation]);

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
      <PianoKeyboard highlights={answered ? {} : q.pianoHighlight} />
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

  const byType: Record<string, { total: number; correct: number }> = {};
  state.results.forEach(r => {
    if (!byType[r.type]) byType[r.type] = { total: 0, correct: 0 };
    byType[r.type].total++;
    if (r.correct) byType[r.type].correct++;
  });

  const weak = getWeakestIntervals(3);

  return (
    <>
      <Header title="Sonata" />
      <div style={{ padding: '20px 0' }} className="sonata-app">
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, textAlign: 'center', marginBottom: 20 }}>Drill Complete</h3>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 56, fontWeight: 400, textAlign: 'center', lineHeight: 1, color: pctColor }}>{pct}%</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          {correct}/{total} correct · Streak: {state.bestStreak} · Timed out: {state.timedOut}
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
          <button style={{ ...s.primaryBtn, background: 'var(--bg2)', border: '1px solid var(--bg3)', color: 'var(--text)' }} onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'config' })}>Drill Again</button>
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
      <h3 style={{ marginBottom: 12 }}>{lessons.length} Lessons</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
        {lessons.map((l, i) => {
          const complete = state.lessonsCompleted.includes(l.id);
          const prevComplete = i === 0 || state.lessonsCompleted.includes(lessons[i - 1].id);
          const locked = !prevComplete && !complete;
          return (
            <div key={l.id}
              style={{ ...s.lessonCard, ...(locked ? { opacity: 0.3, cursor: 'default' } : {}), ...(complete ? {} : {}) }}
              onClick={() => !locked && dispatch({ type: 'START_LESSON', id: l.id })}>
              <div style={{ ...s.lessonNum, color: complete ? 'var(--green)' : locked ? 'var(--bg4)' : 'var(--gold)' }}>{l.id}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{l.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{l.sub} · {l.piece}</div>
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
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number) => void;
  loadScore: (url: string, container: HTMLDivElement) => Promise<void>;
  playScore: (tempo?: number) => void;
}) {
  const lesson = lessons.find(l => l.id === state.currentLesson);
  if (!lesson) return null;

  if (state.lessonPhase === 'concepts') {
    return <LessonConcepts lesson={lesson} state={state} dispatch={dispatch} renderNotation={renderNotation} />;
  }
  if (state.lessonPhase === 'piece') {
    return <LessonPiece lesson={lesson} state={state} dispatch={dispatch} loadScore={loadScore} playScore={playScore} />;
  }
  return <LessonComplete lesson={lesson} dispatch={dispatch} />;
}

function LessonConcepts({ lesson, state, dispatch, renderNotation }: {
  lesson: Lesson; state: AppState; dispatch: React.Dispatch<Action>;
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number) => void;
}) {
  const step = lesson.steps[state.lessonStep];
  const notRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (step?.abc) renderNotation(step.abc, notRef.current, 350); }, [state.lessonStep, step, renderNotation]);

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
        <div style={s.teachText} className="sonata-teach-text">
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
            <button style={s.speakBtn} onClick={togglePause}>⏸</button>
            <button style={{ ...s.speakBtn, ...(getTTSSpeed() === 0.75 ? s.speakBtnActive : {}) }} onClick={() => { toggleSlow(); }}>½×</button>
            <button style={s.speakBtn} onClick={replaySpeak}>↻</button>
          </div>
          {step.text}
        </div>
        {step.abc && <div ref={notRef} style={s.notation} className="sonata-notation" />}
        <PianoKeyboard highlights={step.piano || {}} fingers={step.fingers || {}} />
        <div style={s.teachNav} className="sonata-teach-nav">
          {state.lessonStep > 0 && <button style={s.navBtn} onClick={() => { stopSpeaking(); dispatch({ type: 'PREV_STEP' }); }}>Previous</button>}
          {state.lessonStep < lesson.steps.length - 1
            ? <button style={s.navBtnPrimary} onClick={() => { stopSpeaking(); dispatch({ type: 'NEXT_STEP' }); }}>Next</button>
            : <button style={s.navBtnPrimary} onClick={() => { stopSpeaking(); dispatch({ type: 'START_PIECE' }); }}>Play the piece →</button>
          }
        </div>
        <div style={{ fontSize: 10, color: 'var(--bg4)', textAlign: 'center', marginTop: 4 }}>← → arrows · Space = next · P = pause · Esc = back</div>
      </div>
    </>
  );
}

function LessonPiece({ lesson, state, dispatch, loadScore, playScore }: {
  lesson: Lesson; state: AppState; dispatch: React.Dispatch<Action>;
  loadScore: (url: string, container: HTMLDivElement) => Promise<void>;
  playScore: (tempo?: number) => void;
}) {
  const ci = findLessonCatalogIndex(lesson.id);
  const scoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ci < 0) { dispatch({ type: 'COMPLETE_LESSON' }); saveLessonComplete(state.user!.id, state.currentLesson, 1.0); recordPractice(); return; }
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
      <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button style={{ ...s.primaryBtn, maxWidth: 200, background: 'var(--bg2)', border: '1px solid var(--bg3)', color: 'var(--text)' }} onClick={() => playScore(80)}>
          ♪ Hear it played
        </button>
        <button style={{ ...s.primaryBtn, maxWidth: 200 }} onClick={() => {
          dispatch({ type: 'COMPLETE_LESSON' });
          if (state.user) saveLessonComplete(state.user.id, state.currentLesson, 1.0);
          recordPractice();
        }}>Complete Lesson</button>
      </div>
    </>
  );
}

function LessonComplete({ lesson, dispatch }: { lesson: Lesson; dispatch: React.Dispatch<Action> }) {
  const nextLesson = lessons.find(l => l.id === lesson.id + 1);
  return (
    <>
      <Header title="Sonata" />
      <div style={{ padding: '20px 0', textAlign: 'center' }} className="sonata-app">
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, marginBottom: 20 }}>Lesson {lesson.id} Complete!</h3>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 56, fontWeight: 400, color: 'var(--green)' }}>✓</div>
        <p style={{ color: 'var(--text2)', margin: '16px 0', lineHeight: 1.6 }}>
          You&apos;ve mastered: <b style={{ color: 'var(--text)' }}>{lesson.title}</b><br />
          Piece: <b style={{ color: 'var(--text)' }}>{lesson.piece}</b>
        </p>
        {nextLesson
          ? <button style={s.primaryBtn} onClick={() => dispatch({ type: 'START_LESSON', id: nextLesson.id })}>Next: {nextLesson.title} →</button>
          : <button style={s.primaryBtn}>🏆 Course Complete!</button>
        }
        <div style={{ marginTop: 8 }}>
          <button style={{ ...s.primaryBtn, background: 'var(--bg2)', border: '1px solid var(--bg3)', color: 'var(--text)' }} onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'lessons' })}>Back to Lessons</button>
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
  playScore: (tempo?: number) => void;
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
      <h3 style={{ marginBottom: 12 }}>Library <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 300 }}>{CATALOG.length} pieces</span></h3>
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
  playScore: (tempo?: number) => void;
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
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400 }}>{piece.t}</h3>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>{piece.c}</p>
      </div>
      <div ref={ref} style={{ minHeight: 300, padding: '16px 0', overflowX: 'auto' }}>
        <LoadingSpinner text="Loading score..." />
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button style={{ ...s.primaryBtn, maxWidth: 200, background: 'var(--bg2)', border: '1px solid var(--bg3)', color: 'var(--text)', margin: '0 auto' }} onClick={() => playScore(80)}>
          ♪ Hear it played
        </button>
      </div>
    </>
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
    if (practiceDates.includes(d.toISOString().slice(0, 10))) streak++;
    else break;
  }

  return (
    <>
      <Header title="Sonata" />
      <BackLink onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />
      <h3 style={{ marginBottom: 16 }}>Progress</h3>
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
            const practiced = practiceDates.includes(d.toISOString().slice(0, 10));
            return <div key={i} title={d.toISOString().slice(0, 10)} style={{ width: 16, height: 16, borderRadius: 3, background: practiced ? 'var(--green)' : 'var(--bg3)', opacity: practiced ? 1 : 0.4 }} />;
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
function SightReadingScreen({ dispatch, renderNotation }: {
  dispatch: React.Dispatch<Action>;
  renderNotation: (abc: string, el: HTMLDivElement | null, w?: number) => void;
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
    if (srNotes.length > 0) renderNotation(makeABC(srNotes, srClef), notRef.current, 500);
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
    if (srIndex + 1 >= srNotes.length) { setSrDone(true); setSrRunning(false); recordPractice(); return; }
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
function RhythmScreen({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  const [pattern, setPattern] = useState<RhythmPattern | null>(null);
  const [running, setRunning] = useState(false);
  const [hits, setHits] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [activeBeat, setActiveBeat] = useState(-1);

  useEffect(() => { setPattern(genRhythmDrill()); }, []);

  useEffect(() => {
    if (!running) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setHits(h => [...h, performance.now() - startTime]); playNote(72, 0.08); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [running, startTime]);

  function start() {
    if (!pattern) return;
    setRunning(true); setHits([]); setResult(null);
    const st = performance.now();
    setStartTime(st);
    const beatMs = 60000 / pattern.bpm;
    let elapsed = 0;
    pattern.pattern.forEach((dur, i) => {
      setTimeout(() => { setActiveBeat(i); playNote(76, 0.05); }, elapsed);
      setTimeout(() => setActiveBeat(-1), elapsed + dur * beatMs * 0.8);
      elapsed += dur * beatMs;
    });
    setTimeout(() => endRhythm(st, elapsed), elapsed + beatMs);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function endRhythm(_st: number, _totalMs: number) {
    setRunning(false);
    if (!pattern) return;
    const beatMs = 60000 / pattern.bpm;
    const expected: number[] = [];
    let t = 0;
    pattern.pattern.forEach(dur => { expected.push(t); t += dur * beatMs; });
    const currentHits = hits;
    let score = 0;
    expected.forEach(exp => {
      const closest = currentHits.reduce((best, h) => Math.abs(h - exp) < Math.abs(best - exp) ? h : best, Infinity);
      if (Math.abs(closest - exp) < beatMs * 0.3) score++;
    });
    setResult({ score, total: expected.length });
    recordPractice();
  }

  if (!pattern) return null;

  return (
    <>
      <Header title="Sonata" />
      <BackLink onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />
      <div className="sonata-app">
        <h3 style={{ textAlign: 'center', fontFamily: 'var(--serif)', marginBottom: 4 }}>{pattern.name}</h3>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>{pattern.timeSignature} at {pattern.bpm} BPM</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, justifyContent: 'center', padding: '16px 0' }}>
          {pattern.pattern.map((dur, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 24, height: Math.round(dur * 40 + 16), borderRadius: 3, background: activeBeat === i ? 'var(--gold)' : result ? (i < (result.score) ? 'var(--green)' : 'var(--red)') : 'var(--bg3)', transition: 'all 0.15s' }} />
              <div style={{ fontSize: 9, color: 'var(--text3)' }}>{dur >= 1 ? dur + '' : dur >= 0.5 ? '8th' : 'tri'}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', minHeight: 28, margin: '12px 0', fontSize: 14, color: 'var(--text3)' }}>
          {result ? <span style={{ color: result.score / result.total >= 0.7 ? 'var(--green)' : 'var(--red)' }}>{Math.round(result.score / result.total * 100)}% accuracy ({result.score}/{result.total} beats)</span>
            : 'Tap spacebar or tap the screen in time with the pattern'}
        </div>
        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <button style={{ ...s.primaryBtn, maxWidth: 200, margin: '0 auto' }} onClick={() => { if (result) { setPattern(genRhythmDrill()); setResult(null); } else start(); }} disabled={running}>
            {running ? 'Listening...' : result ? 'Try again' : 'Start'}
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--bg4)', textAlign: 'center', marginTop: 4 }}>Space = tap · Esc = back</div>
      </div>
    </>
  );
}

// ============================================================
// STYLES
// ============================================================
const s: Record<string, React.CSSProperties> = {
  page: { background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)', fontWeight: 300, lineHeight: 1.5, minHeight: '100vh' },
  app: { maxWidth: 680, margin: '0 auto', padding: '24px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 20px', marginBottom: 8 },
  headerTitle: { fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--gold)', margin: 0 },
  headerStats: { display: 'flex', gap: 20, fontSize: 13, color: 'var(--text3)', fontWeight: 300, alignItems: 'center' },
  backLink: { fontSize: 13, color: 'var(--text3)', cursor: 'pointer', marginBottom: 16, display: 'inline-block', fontWeight: 300 },
  menu: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '56px 20px 32px', position: 'relative' },
  menuTitle: { fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400, marginBottom: 4, letterSpacing: '-0.02em', margin: 0 },
  menuSub: { color: 'var(--text2)', fontSize: 15, textAlign: 'center', maxWidth: 440, lineHeight: 1.8, fontWeight: 300, marginBottom: 20 },
  menuGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 500 },
  menuBtn: { padding: '22px 20px', background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s' },
  menuBtnLabel: { fontSize: 15, fontWeight: 500, color: 'var(--text)', marginTop: 6 },
  menuBtnDesc: { fontSize: 12, color: 'var(--text3)', marginTop: 4, fontWeight: 300 },
  configTitle: { fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, marginBottom: 20 },
  configRow: { marginBottom: 16 },
  configLabel: { fontSize: 11, color: 'var(--text3)', width: '100%', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, display: 'block' },
  chip: { padding: '8px 18px', fontSize: 13, borderRadius: 24, border: '1px solid var(--bg3)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--sans)' },
  chipActive: { padding: '8px 18px', fontSize: 13, borderRadius: 24, border: '1px solid var(--gold2)', background: 'var(--gold-bg)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--sans)' },
  primaryBtn: { marginTop: 20, padding: '14px 32px', background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer', width: '100%', fontFamily: 'var(--sans)' },
  drillTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  drillInfo: { fontSize: 13, color: 'var(--text3)', fontWeight: 300 },
  stopBtn: { padding: '6px 16px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--text3)', border: 'none', cursor: 'pointer', fontSize: 12 },
  timerBar: { height: 3, background: 'var(--bg3)', borderRadius: 2, margin: '6px 0 16px', overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2, transition: 'width 0.1s linear' },
  questionLabel: { fontSize: 11, color: 'var(--text3)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' },
  questionText: { fontSize: 16, fontWeight: 400, textAlign: 'center', margin: '8px 0', color: 'var(--text2)' },
  notation: { background: 'transparent', border: 'none', borderBottom: '1px solid rgba(200,169,110,0.12)', padding: '16px 20px', margin: '12px 0', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  feedback: { textAlign: 'center', fontSize: 16, fontWeight: 500, minHeight: 28, margin: '8px 0' },
  answers: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0' },
  ansBtn: { padding: '12px 6px', fontSize: 14, fontWeight: 500, borderRadius: 10, cursor: 'pointer', flex: 1, minWidth: 60, maxWidth: 100, textAlign: 'center', border: '1px solid var(--bg3)', background: 'var(--bg2)', color: 'var(--text)', fontFamily: 'var(--sans)' },
  ansBtnCorrect: { background: 'var(--green-bg)', borderColor: 'var(--green)', color: 'var(--green)' },
  ansBtnWrong: { background: 'var(--red-bg)', borderColor: 'var(--red)', color: 'var(--red)' },
  pianoContainer: { marginTop: 'auto', padding: '20px 0 8px', borderTop: '1px solid rgba(200,169,110,0.15)', display: 'flex', justifyContent: 'center' },
  piano: { display: 'flex', position: 'relative', justifyContent: 'center' },
  keyWhite: { width: 36, height: 130, background: 'linear-gradient(180deg,#F5F5F0,#E8E4DC)', border: '1px solid #C8C4BC', borderTop: 'none', borderRadius: '0 0 5px 5px', zIndex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8, boxShadow: '0 4px 8px rgba(0,0,0,.4),inset 0 -2px 0 rgba(0,0,0,.04)', cursor: 'pointer' },
  keyBlack: { width: 22, height: 80, background: 'linear-gradient(180deg,#333,#111)', border: '1px solid #000', borderTop: 'none', borderRadius: '0 0 3px 3px', marginLeft: -11, marginRight: -11, zIndex: 2, boxShadow: '0 4px 8px rgba(0,0,0,.6),inset 0 -1px 0 rgba(255,255,255,.06)', cursor: 'pointer' },
  keyNoteName: { fontSize: 8, color: '#999', pointerEvents: 'none' },
  keyHighlight: { position: 'absolute', inset: 0, borderRadius: 'inherit', opacity: 0.4, pointerEvents: 'none' },
  fingerBadge: { position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, pointerEvents: 'none', zIndex: 3, background: 'var(--bg)', color: 'var(--gold)' },
  resultRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  resultName: { fontSize: 14, fontWeight: 300 },
  resultBadge: { padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  sectionLabel: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 8 },
  teachText: { fontSize: 15, lineHeight: 1.85, color: 'var(--text2)', padding: 28, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 14, marginBottom: 16, fontWeight: 300, position: 'relative' },
  speakBtn: { width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--bg3)', background: 'var(--bg)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 0 },
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
