// ============================================================
// SUPABASE DATA — Progress persistence
// ============================================================

import { supabase } from './supabase';
import { getIntervalAccuracy } from './music/storage';
import type { User } from '@supabase/supabase-js';

/**
 * Returns the currently authenticated user, or null.
 *
 * On Capacitor, after a hard navigation (window.location.href = '/app/...'),
 * the fresh Supabase client restores the session from localStorage
 * asynchronously. getSession() can return null for the first ~100–500ms
 * even when a valid session exists. We poll every 100ms for up to 2s
 * before concluding the user is actually signed out.
 *
 * This delay is only noticeable when the user is NOT signed in (2s wait),
 * which is fine — signed-out users don't typically hit /app/ directly.
 */
export async function checkAuth(): Promise<User | null> {
  for (let i = 0; i < 20; i++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.user;
    if (i < 19) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return null;
}

/**
 * Signs the user out of Supabase.
 * Does NOT redirect — the caller should use Next.js router.push('/login')
 * so Capacitor's static export navigation (with trailingSlash) works correctly.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export interface ProgressData {
  lessonsCompleted: number[];
  drillCount: number;
  intervalAccuracy: Record<string, { correct: number; total: number }>;
  practiceDates: string[];
}

export async function loadProgress(userId: string): Promise<ProgressData | null> {
  try {
    // Load or create user_progress
    // eslint-disable-next-line prefer-const
    let { data: prog, error: progErr } = await supabase
      .from('user_progress').select('*').eq('user_id', userId).maybeSingle();
    if (progErr) throw progErr;
    if (!prog) {
      await supabase.from('user_progress').insert({ user_id: userId });
      prog = { current_lesson: 1, streak_days: 0, total_drills_completed: 0, interval_accuracy: {}, last_practice_date: null };
    }

    // Lesson progress
    const lessonsCompleted: number[] = [];
    const { data: lessonRows } = await supabase
      .from('lesson_progress').select('*').eq('user_id', userId);
    if (lessonRows) {
      lessonRows.forEach((r: { completed: boolean; lesson_id: number }) => {
        if (r.completed) lessonsCompleted.push(r.lesson_id);
      });
    }

    // Drill count
    const { count } = await supabase
      .from('drill_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId);

    // Practice dates — read from practice_days table (canonical, counts
    // lessons + drills + sight reading + rhythm). Fall back to drill_sessions
    // timestamps if the practice_days table is empty (legacy users).
    let practiceDates: string[] = [];
    try {
      const { data: pdays } = await supabase
        .from('practice_days')
        .select('practice_date')
        .eq('user_id', userId)
        .order('practice_date', { ascending: false })
        .limit(365);
      if (pdays && pdays.length > 0) {
        practiceDates = pdays.map((r: { practice_date: string }) => r.practice_date);
      }
    } catch { /* table may not exist yet — fall through */ }

    if (practiceDates.length === 0) {
      // Legacy fallback — derive from drill sessions.
      const { data: sessions } = await supabase
        .from('drill_sessions').select('created_at').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(200);
      practiceDates = sessions
        ? Array.from(new Set(sessions.map((s: { created_at: string }) => {
            const d = new Date(s.created_at);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          })))
        : [];
    }

    return {
      lessonsCompleted,
      drillCount: count || 0,
      intervalAccuracy: prog.interval_accuracy || {},
      practiceDates,
    };
  } catch(e) {
    console.warn('loadProgress failed, using localStorage:', e);
    return null;
  }
}

// Build a YYYY-MM-DD date key in LOCAL time (matches storage.ts localDateKey)
function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Record that the user practised today. Called from every practice activity
 * (drill, lesson, sight reading, rhythm). Idempotent per user + day.
 * Writes to practice_days and updates user_progress.streak_days
 * + last_practice_date. Safe to fire-and-forget.
 */
export async function recordPracticeDay(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const today = localDateKey();

    // Upsert into practice_days — unique constraint on (user_id, practice_date)
    // means duplicates are silently rejected, which is what we want.
    await supabase
      .from('practice_days')
      .upsert({ user_id: userId, practice_date: today }, { onConflict: 'user_id,practice_date', ignoreDuplicates: true });

    // Update the summary streak counter in user_progress.
    const { data: prog } = await supabase
      .from('user_progress').select('*').eq('user_id', userId).maybeSingle();
    const lastDate = prog?.last_practice_date;

    // Already practised today — streak unchanged
    if (lastDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = localDateKey(yesterday);

    let streak = prog?.streak_days || 0;
    if (lastDate === yesterdayKey) streak++;       // continues streak
    else streak = 1;                                // new streak

    if (prog) {
      await supabase.from('user_progress').update({
        last_practice_date: today,
        streak_days: streak,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);
    } else {
      await supabase.from('user_progress').insert({
        user_id: userId,
        last_practice_date: today,
        streak_days: streak,
      });
    }
  } catch(e) { console.warn('recordPracticeDay failed:', e); }
}

export async function saveDrillSession(
  userId: string,
  results: { type: string; correct: boolean; correctAnswer: string }[],
  totalTime: number
): Promise<void> {
  try {
    const correct = results.filter(r => r.correct).length;
    await supabase.from('drill_sessions').insert({
      user_id: userId,
      score: correct,
      total: results.length,
      results: results.map(r => ({ type: r.type, correct: r.correct, correctAnswer: r.correctAnswer })),
      duration_seconds: Math.round(totalTime || 0)
    });

    // Bump total drills and store interval accuracy — streak handled by recordPracticeDay
    const intervalAcc = getIntervalAccuracy();
    const { data: prog } = await supabase
      .from('user_progress').select('*').eq('user_id', userId).maybeSingle();
    if (prog) {
      await supabase.from('user_progress').update({
        total_drills_completed: (prog.total_drills_completed || 0) + 1,
        interval_accuracy: intervalAcc,
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
    }

    // Record practice day (fire-and-forget)
    recordPracticeDay(userId).catch(() => {});
  } catch(e) { console.warn('saveDrillSession failed:', e); }
}

export async function saveLessonComplete(userId: string, lessonId: number, accuracy: number): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('lesson_progress').select('*').eq('user_id', userId).eq('lesson_id', lessonId).single();

    if (existing) {
      await supabase.from('lesson_progress').update({
        completed: true,
        best_accuracy: Math.max(existing.best_accuracy || 0, accuracy),
        completed_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else {
      await supabase.from('lesson_progress').insert({
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        best_accuracy: accuracy,
        completed_at: new Date().toISOString()
      });
    }

    await supabase.from('user_progress').update({
      current_lesson: Math.max(lessonId + 1, 1),
      updated_at: new Date().toISOString()
    }).eq('user_id', userId);
  } catch(e) { console.warn('saveLessonComplete failed:', e); }
}

// ============================================================
// LICENSE KEY (Gumroad)
// ============================================================

export interface LicenseRow {
  license_key: string;
  product_id: string | null;
  email: string | null;
  activated_at: string;
}

export async function loadLicense(userId: string): Promise<LicenseRow | null> {
  try {
    const { data, error } = await supabase
      .from('licenses').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('loadLicense failed:', e);
    return null;
  }
}

