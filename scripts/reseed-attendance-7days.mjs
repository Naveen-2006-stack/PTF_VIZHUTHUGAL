import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aibklzudikrwhmnipchj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmtsenVkaWtyd2htbmlwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTc1MzgsImV4cCI6MjEwNDU5MzUzOH0.iMKol8D4vaDxH0ZXB1HVE-SI6cFGTJyO4JvnTilp9EQ';

export async function runReseed() {
  console.log('===============================================================');
  console.log('  RESEEDING ABDUL KALAM ATTENDANCE (DYNAMIC 7-DAY WINDOW ONLY)');
  console.log('===============================================================');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Authenticate as Super Admin
  const authRes = await supabase.auth.signInWithPassword({
    email: 'demo@ptffoundation.org',
    password: 'Demo@2026',
  });

  if (authRes.error || !authRes.data.user) {
    throw new Error(`Admin authentication failed: ${authRes.error?.message}`);
  }
  console.log(`Authenticated as Super Admin: ${authRes.data.user.email}`);

  // Fetch authoritative server time
  let serverTime = new Date();
  try {
    const res = await fetch('http://localhost:3000/api/time');
    if (res.ok) {
      const data = await res.json();
      serverTime = new Date(data.serverTime);
      console.log(`Fetched authoritative server time: ${serverTime.toISOString()}`);
    }
  } catch (err) {
    console.log(`Using system time: ${serverTime.toISOString()} (${err.message})`);
  }

  // Determine current calendar date in IST (Asia/Kolkata)
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = istFormatter.format(serverTime);
  console.log(`Current Database/Server Date (IST): ${todayStr}`);

  // 1. Check existing records before cleanup
  const { data: existingAttendance } = await supabase.from('attendance').select('id, attendance_date, created_at');
  const { data: existingAudits } = await supabase.from('attendance_audit_history').select('id');
  const oldAttendanceCount = existingAttendance ? existingAttendance.length : 0;
  const oldAuditCount = existingAudits ? existingAudits.length : 0;
  console.log(`Existing records to delete: ${oldAttendanceCount} attendance records, ${oldAuditCount} audit records`);

  // 2. Delete audit history first to prevent foreign key or orphan issues
  if (oldAuditCount > 0) {
    const { error: auditDeleteErr } = await supabase.from('attendance_audit_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (auditDeleteErr) throw new Error(`Failed to delete attendance audits: ${auditDeleteErr.message}`);
    console.log('Successfully deleted all attendance audit history records.');
  }

  // 3. Delete attendance records
  if (oldAttendanceCount > 0) {
    const { error: attendanceDeleteErr } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (attendanceDeleteErr) throw new Error(`Failed to delete attendance: ${attendanceDeleteErr.message}`);
    console.log('Successfully deleted all existing attendance records.');
  }

  // Eligible Scholars
  const STUDENT_QA001 = 'a6666666-6666-4666-a666-666666666666'; // QA001
  const STUDENT_PTF001 = '0e2c88f1-a128-4ef8-a4ec-4f1efb49463b'; // PTF001

  // Mentors
  const MENTOR_QA1 = '44444444-4444-4444-a444-444444444444'; // QA Staff Mentor 1
  const MENTOR_QA2 = '55555555-5555-4555-a555-555555555555'; // QA Staff Mentor 2
  const MENTOR_SUNDAR = '55a1e2f3-b4c5-4d6e-8f90-123456789abc'; // Dr. K. Sundar

  // Helper to compute date string for (today - offsetDays)
  function getDateString(offsetDays) {
    const d = new Date(serverTime.getTime() - offsetDays * 86400000);
    return istFormatter.format(d);
  }

  // Helper to construct realistic UTC timestamps matching IST session windows:
  // Morning: 5:30 AM - 7:00 AM IST -> 00:00 - 01:30 UTC
  // Evening: 5:30 PM - 7:00 PM IST -> 12:00 - 13:30 UTC
  function makeTimestamp(dateStr, sessionType, timeOffsetMinutes) {
    if (sessionType === 'MORNING') {
      const totalMinutesUtc = timeOffsetMinutes;
      const hh = String(Math.floor(totalMinutesUtc / 60)).padStart(2, '0');
      const mm = String(totalMinutesUtc % 60).padStart(2, '0');
      return `${dateStr}T${hh}:${mm}:00.000Z`;
    } else {
      const totalMinutesUtc = 12 * 60 + timeOffsetMinutes;
      const hh = String(Math.floor(totalMinutesUtc / 60)).padStart(2, '0');
      const mm = String(totalMinutesUtc % 60).padStart(2, '0');
      return `${dateStr}T${hh}:${mm}:00.000Z`;
    }
  }

  const recordsToInsert = [];

  // --------------------------------------------------------------------------
  // DAY 0 (TODAY: getDateString(0))
  // --------------------------------------------------------------------------
  const day0 = getDateString(0);
  // QA001: Evening session, marked at 17:45 IST (12:15 UTC) -> Editable (< 24h)
  const day0QA001Time = makeTimestamp(day0, 'EVENING', 15);
  recordsToInsert.push({
    student_id: STUDENT_QA001,
    attendance_date: day0,
    session_type: 'EVENING',
    mentor_id: MENTOR_QA1,
    status: 'PRESENT',
    is_locked: false,
    created_at: day0QA001Time,
    updated_at: day0QA001Time,
  });

  // PTF001: Morning session, marked at 06:30 IST (01:00 UTC) by Mentor 2 -> Locked for Mentor 1
  const day0PTF001Time = makeTimestamp(day0, 'MORNING', 60);
  recordsToInsert.push({
    student_id: STUDENT_PTF001,
    attendance_date: day0,
    session_type: 'MORNING',
    mentor_id: MENTOR_QA2,
    status: 'PRESENT',
    is_locked: false,
    created_at: day0PTF001Time,
    updated_at: day0PTF001Time,
  });

  // --------------------------------------------------------------------------
  // DAY 1 (YESTERDAY: getDateString(1))
  // --------------------------------------------------------------------------
  const day1 = getDateString(1);
  // QA001: Evening session, marked yesterday evening at 18:30 IST (13:00 UTC) -> Editable (~23.5h old)
  const day1QA001Time = makeTimestamp(day1, 'EVENING', 60);
  recordsToInsert.push({
    student_id: STUDENT_QA001,
    attendance_date: day1,
    session_type: 'EVENING',
    mentor_id: MENTOR_QA1,
    status: 'PRESENT',
    is_locked: false,
    created_at: day1QA001Time,
    updated_at: day1QA001Time,
  });

  // PTF001: Morning session, marked yesterday morning at 06:15 IST (00:45 UTC) -> Locked (> 24h old)
  const day1PTF001Time = makeTimestamp(day1, 'MORNING', 45);
  recordsToInsert.push({
    student_id: STUDENT_PTF001,
    attendance_date: day1,
    session_type: 'MORNING',
    mentor_id: MENTOR_QA1,
    status: 'LATE',
    is_locked: true,
    created_at: day1PTF001Time,
    updated_at: day1PTF001Time,
  });

  // --------------------------------------------------------------------------
  // DAY 2 (getDateString(2))
  // --------------------------------------------------------------------------
  const day2 = getDateString(2);
  const day2QA001Time = makeTimestamp(day2, 'MORNING', 60); // 06:30 IST
  recordsToInsert.push({
    student_id: STUDENT_QA001,
    attendance_date: day2,
    session_type: 'MORNING',
    mentor_id: MENTOR_QA1,
    status: 'PRESENT',
    is_locked: true,
    created_at: day2QA001Time,
    updated_at: day2QA001Time,
  });

  const day2PTF001Time = makeTimestamp(day2, 'EVENING', 30); // 18:00 IST
  recordsToInsert.push({
    student_id: STUDENT_PTF001,
    attendance_date: day2,
    session_type: 'EVENING',
    mentor_id: MENTOR_SUNDAR,
    status: 'PRESENT',
    is_locked: true,
    created_at: day2PTF001Time,
    updated_at: day2PTF001Time,
  });

  // --------------------------------------------------------------------------
  // DAY 3 (getDateString(3))
  // --------------------------------------------------------------------------
  const day3 = getDateString(3);
  const day3QA001Time = makeTimestamp(day3, 'EVENING', 45); // 18:15 IST
  recordsToInsert.push({
    student_id: STUDENT_QA001,
    attendance_date: day3,
    session_type: 'EVENING',
    mentor_id: MENTOR_QA1,
    status: 'ABSENT',
    is_locked: true,
    created_at: day3QA001Time,
    updated_at: day3QA001Time,
  });

  const day3PTF001Time = makeTimestamp(day3, 'MORNING', 50); // 06:20 IST
  recordsToInsert.push({
    student_id: STUDENT_PTF001,
    attendance_date: day3,
    session_type: 'MORNING',
    mentor_id: MENTOR_QA1,
    status: 'PRESENT',
    is_locked: true,
    created_at: day3PTF001Time,
    updated_at: day3PTF001Time,
  });

  // --------------------------------------------------------------------------
  // DAY 4 (getDateString(4))
  // --------------------------------------------------------------------------
  const day4 = getDateString(4);
  const day4QA001Time = makeTimestamp(day4, 'MORNING', 45); // 06:15 IST
  recordsToInsert.push({
    student_id: STUDENT_QA001,
    attendance_date: day4,
    session_type: 'MORNING',
    mentor_id: MENTOR_QA1,
    status: 'PRESENT',
    is_locked: true,
    created_at: day4QA001Time,
    updated_at: day4QA001Time,
  });

  const day4PTF001Time = makeTimestamp(day4, 'MORNING', 60); // 06:30 IST
  recordsToInsert.push({
    student_id: STUDENT_PTF001,
    attendance_date: day4,
    session_type: 'MORNING',
    mentor_id: MENTOR_QA2,
    status: 'PRESENT',
    is_locked: true,
    created_at: day4PTF001Time,
    updated_at: day4PTF001Time,
  });

  // --------------------------------------------------------------------------
  // DAY 5 (getDateString(5))
  // --------------------------------------------------------------------------
  const day5 = getDateString(5);
  const day5QA001Time = makeTimestamp(day5, 'EVENING', 15); // 17:45 IST
  recordsToInsert.push({
    student_id: STUDENT_QA001,
    attendance_date: day5,
    session_type: 'EVENING',
    mentor_id: MENTOR_QA1,
    status: 'PRESENT',
    is_locked: true,
    created_at: day5QA001Time,
    updated_at: day5QA001Time,
  });

  const day5PTF001Time = makeTimestamp(day5, 'EVENING', 45); // 18:15 IST
  recordsToInsert.push({
    student_id: STUDENT_PTF001,
    attendance_date: day5,
    session_type: 'EVENING',
    mentor_id: MENTOR_QA2,
    status: 'LATE',
    is_locked: true,
    created_at: day5PTF001Time,
    updated_at: day5PTF001Time,
  });

  // --------------------------------------------------------------------------
  // DAY 6 (getDateString(6) - Exactly current date minus 6 days)
  // --------------------------------------------------------------------------
  const day6 = getDateString(6);
  const day6QA001Time = makeTimestamp(day6, 'MORNING', 50); // 06:20 IST
  recordsToInsert.push({
    student_id: STUDENT_QA001,
    attendance_date: day6,
    session_type: 'MORNING',
    mentor_id: MENTOR_QA1,
    status: 'PRESENT',
    is_locked: true,
    created_at: day6QA001Time,
    updated_at: day6QA001Time,
  });

  const day6PTF001Time = makeTimestamp(day6, 'MORNING', 55); // 06:25 IST
  recordsToInsert.push({
    student_id: STUDENT_PTF001,
    attendance_date: day6,
    session_type: 'MORNING',
    mentor_id: MENTOR_QA1,
    status: 'PRESENT',
    is_locked: true,
    created_at: day6PTF001Time,
    updated_at: day6PTF001Time,
  });

  // 4. Bulk insert the reseeded records
  console.log(`Inserting ${recordsToInsert.length} fresh attendance records across 7 days (${day6} to ${day0})...`);
  const { data: insertedData, error: insertErr } = await supabase.from('attendance').insert(recordsToInsert).select();

  if (insertErr) {
    throw new Error(`Failed to insert reseeded attendance: ${insertErr.message}`);
  }

  console.log(`Successfully created ${insertedData.length} attendance records.`);
  console.log('Final Date Range:', day6, 'through', day0);

  return {
    deletedAttendanceCount: oldAttendanceCount,
    deletedAuditCount: oldAuditCount,
    createdAttendanceCount: insertedData.length,
    startDate: day6,
    endDate: day0,
  };
}

// Run when executed directly
if (process.argv[1]?.endsWith('reseed-attendance-7days.mjs')) {
  runReseed()
    .then((result) => {
      console.log('\nReseed completed successfully:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('\nReseed failed:', err);
      process.exit(1);
    });
}
