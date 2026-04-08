// ============================================================
// LOCALSTORAGE LAYER — All localStorage keys and access functions
// ============================================================

export const STORAGE_KEYS = {
  LESSONS: 'sonata_lessons',
  DRILLS: 'sonata_drills',
  INTERVAL_ACC: 'sonata_interval_acc',
  PRACTICE_DATES: 'sonata_practice_dates',
  ONBOARDED: 'sonata_onboarded',
  PLACEMENT: 'sonata_placement',
} as const;

export function getStoredLessons(): number[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.LESSONS) || '[]'); }
  catch { return []; }
}

export function setStoredLessons(lessons: number[]): void {
  localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
}

export function getStoredDrills(): { timestamp: number; score: number; total: number }[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.DRILLS) || '[]'); }
  catch { return []; }
}

export function setStoredDrills(drills: { timestamp: number; score: number; total: number }[]): void {
  localStorage.setItem(STORAGE_KEYS.DRILLS, JSON.stringify(drills));
}

export interface IntervalAccEntry { correct: number; total: number }

export function getIntervalAccuracy(): Record<string, IntervalAccEntry> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.INTERVAL_ACC) || '{}'); }
  catch { return {}; }
}

export function updateIntervalAccuracy(name: string, correct: boolean): void {
  const acc = getIntervalAccuracy();
  if(!acc[name]) acc[name] = { correct:0, total:0 };
  acc[name].total++;
  if(correct) acc[name].correct++;
  localStorage.setItem(STORAGE_KEYS.INTERVAL_ACC, JSON.stringify(acc));
}

export interface WeakInterval { name: string; pct: number; correct: number; total: number }

export function getWeakestIntervals(n: number = 3): WeakInterval[] {
  const acc = getIntervalAccuracy();
  return Object.entries(acc)
    .map(([name, d]) => ({ name, pct: Math.round(d.correct/d.total*100), ...d }))
    .sort((a,b) => a.pct - b.pct)
    .slice(0, n);
}

export function recordPractice(): void {
  const dates: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRACTICE_DATES) || '[]');
  const today = new Date().toISOString().slice(0,10);
  if(!dates.includes(today)) {
    dates.push(today);
    localStorage.setItem(STORAGE_KEYS.PRACTICE_DATES, JSON.stringify(dates));
  }
}

export function getPracticeDates(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRACTICE_DATES) || '[]'); }
  catch { return []; }
}

export function isOnboarded(): boolean {
  return !!localStorage.getItem(STORAGE_KEYS.ONBOARDED);
}

export function setOnboarded(): void {
  localStorage.setItem(STORAGE_KEYS.ONBOARDED, '1');
}

export function getPlacementResult(): number | null {
  const v = localStorage.getItem(STORAGE_KEYS.PLACEMENT);
  return v ? parseInt(v, 10) : null;
}

export function setPlacementResult(startLesson: number): void {
  localStorage.setItem(STORAGE_KEYS.PLACEMENT, String(startLesson));
}

export function saveState(lessonsCompleted: number[], drillHistory: { timestamp: number; score: number; total: number }[]): void {
  setStoredLessons(lessonsCompleted);
  setStoredDrills(drillHistory);
}
