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

// YYYY-MM-DD in LOCAL time (not UTC). Using toISOString() caused streaks
// and "practiced today" checks to fail near midnight for users east of UTC.
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function recordPractice(userId?: string): void {
  // Always write locally so offline/anonymous users still get streaks.
  const dates: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRACTICE_DATES) || '[]');
  const today = localDateKey();
  if(!dates.includes(today)) {
    dates.push(today);
    localStorage.setItem(STORAGE_KEYS.PRACTICE_DATES, JSON.stringify(dates));
  }

  // Fire-and-forget server write. Dynamic import to keep this module
  // free of Supabase dependency at load time.
  if (userId) {
    import('../supabaseData')
      .then(({ recordPracticeDay }) => recordPracticeDay(userId).catch(() => {}))
      .catch(() => {});
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
