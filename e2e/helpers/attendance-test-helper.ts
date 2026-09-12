import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aibklzudikrwhmnipchj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmtsenVkaWtyd2htbmlwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTc1MzgsImV4cCI6MjEwNDU5MzUzOH0.iMKol8D4vaDxH0ZXB1HVE-SI6cFGTJyO4JvnTilp9EQ';

export function getTestSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export async function setAttendanceCreatedAt(attendanceId: string, minutesAgo: number): Promise<void> {
  const supabase = getTestSupabaseClient();
  const { error } = await supabase.rpc('test_set_attendance_created_at', {
    p_attendance_id: attendanceId,
    p_minutes_ago: minutesAgo,
  });
  if (error) {
    console.error('Failed to set attendance created_at:', error);
    throw error;
  }
}

export async function getAttendanceRecord(attendanceId: string) {
  const supabase = getTestSupabaseClient();
  await supabase.auth.signInWithPassword({
    email: 'qa.superadmin@ptftest.local',
    password: 'Qa@Super2026!',
  });
  const { data, error } = await supabase
    .from('attendance')
    .select('*, student:students(*, profile:profiles(*))')
    .eq('id', attendanceId)
    .single();
  if (error) throw error;
  return data;
}

export async function getLatestAuditRecord(attendanceId: string) {
  const supabase = getTestSupabaseClient();
  await supabase.auth.signInWithPassword({
    email: 'qa.superadmin@ptftest.local',
    password: 'Qa@Super2026!',
  });
  const { data, error } = await supabase
    .from('attendance_audit_history')
    .select('*, original_marked_by_profile:profiles!original_marked_by(*), edited_by_profile:profiles!edited_by(*)')
    .eq('attendance_id', attendanceId)
    .order('edited_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteAttendanceRecord(attendanceId: string) {
  const supabase = getTestSupabaseClient();
  await supabase.auth.signInWithPassword({
    email: 'qa.superadmin@ptftest.local',
    password: 'Qa@Super2026!',
  });
  await supabase.from('attendance_audit_history').delete().eq('attendance_id', attendanceId);
  await supabase.from('attendance').delete().eq('id', attendanceId);
}

let dateOffsetCounter = Math.floor(Math.random() * 80000) + 20000;

export function generateTestDate(): string {
  // Guarantee collision-free unique dates in the distant future
  dateOffsetCounter += Math.floor(Math.random() * 50) + 1;
  const d = new Date(Date.now() + dateOffsetCounter * 86400000);
  return d.toISOString().split('T')[0];
}
