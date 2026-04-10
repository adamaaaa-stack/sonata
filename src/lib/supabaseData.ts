// ============================================================
// SUPABASE DATA — Progress persistence
// ============================================================

import { supabase } from './supabase';
import { getIntervalAccuracy } from './music/storage';
import type { User } from '@supabase/supabase-js';

export async function checkAuth(): Promise<User | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session.user;
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

    // Practice dates
    const { data: sessions } = await supabase
      .from('drill_sessions').select('created_at').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(60);
    const practiceDates = sessions
      ? Array.from(new Set(sessions.map((s: { created_at: string }) => s.created_at.slice(0, 10))))
      : [];

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

    const intervalAcc = getIntervalAccuracy();
    const today = new Date().toISOString().slice(0, 10);
    const { data: prog } = await supabase
      .from('user_progress').select('*').eq('user_id', userId).maybeSingle();
    const lastDate = prog?.last_practice_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let streak = prog?.streak_days || 0;
    if (lastDate === yesterday) streak++;
    else if (lastDate !== today) streak = 1;

    await supabase.from('user_progress').update({
      total_drills_completed: (prog?.total_drills_completed || 0) + 1,
      interval_accuracy: intervalAcc,
      last_practice_date: today,
      streak_days: streak,
      updated_at: new Date().toISOString()
    }).eq('user_id', userId);
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

