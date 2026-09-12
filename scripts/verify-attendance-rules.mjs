import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aibklzudikrwhmnipchj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmtsenVkaWtyd2htbmlwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTc1MzgsImV4cCI6MjEwNDU5MzUzOH0.iMKol8D4vaDxH0ZXB1HVE-SI6cFGTJyO4JvnTilp9EQ';

export async function runVerification() {
  console.log('===============================================================');
  console.log('  VERIFYING ABDUL KALAM ATTENDANCE DATABASE INTEGRITY');
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

  // Fetch current server time
  let serverTime = new Date();
  try {
    const res = await fetch('http://localhost:3000/api/time');
    if (res.ok) {
      const data = await res.json();
      serverTime = new Date(data.serverTime);
    }
  } catch (err) {
    console.log(`Using system clock: ${err.message}`);
  }

  const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = istDateFormatter.format(serverTime);
  const minAllowedDate = istDateFormatter.format(new Date(serverTime.getTime() - 6 * 86400000));
  const maxAllowedDate = todayStr;

  console.log(`Verification Anchor Date: ${todayStr}`);
  console.log(`Allowed 7-Day Range: ${minAllowedDate} through ${maxAllowedDate}\n`);

  // Fetch all attendance records
  const { data: records, error: attErr } = await supabase
    .from('attendance')
    .select('id, student_id, attendance_date, session_type, status, created_at, mentor_id')
    .order('attendance_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (attErr) throw new Error(`Query failed: ${attErr.message}`);

  const checks = [];
  function assertCheck(name, passed, details = '') {
    checks.push({ name, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}${details ? ' - ' + details : ''}`);
  }

  console.log(`Total attendance records found: ${records.length}`);

  // 1. Minimum session_date is within last 7 calendar days
  const dates = records.map((r) => r.attendance_date);
  const minDate = dates.reduce((min, cur) => (cur < min ? cur : min), dates[0] || '');
  const maxDate = dates.reduce((max, cur) => (cur > max ? cur : max), dates[0] || '');

  assertCheck(
    '1. Minimum session_date is within previous 7 calendar days',
    minDate >= minAllowedDate,
    `Min session_date: ${minDate} (Allowed min: ${minAllowedDate})`
  );

  // 2. Maximum session_date is not in future
  assertCheck(
    '2. Maximum session_date is not in future',
    maxDate <= maxAllowedDate,
    `Max session_date: ${maxDate} (Allowed max: ${maxAllowedDate})`
  );

  // 3. Every session_date matches calendar date of created_at
  let allDatesMatch = true;
  const mismatchDetails = [];
  records.forEach((r) => {
    const createdAtIst = istDateFormatter.format(new Date(r.created_at));
    if (r.attendance_date !== createdAtIst) {
      allDatesMatch = false;
      mismatchDetails.push(`ID: ${r.id}, session_date: ${r.attendance_date}, created_at (IST): ${createdAtIst}`);
    }
  });

  assertCheck(
    '3. Every session_date matches calendar date of created_at',
    allDatesMatch,
    mismatchDetails.length > 0 ? mismatchDetails.join('; ') : 'All records match perfectly'
  );

  // 4. No duplicate student/date attendance
  const seenStudentDates = new Set();
  let duplicateCount = 0;
  records.forEach((r) => {
    const key = `${r.student_id}_${r.attendance_date}`;
    if (seenStudentDates.has(key)) {
      duplicateCount++;
    }
    seenStudentDates.add(key);
  });

  assertCheck(
    '4. No duplicate student/date attendance',
    duplicateCount === 0,
    `Duplicates found: ${duplicateCount}`
  );

  // 5. No malformed years (e.g. 2096, 2235, 2282, 2292)
  const currentYear = serverTime.getFullYear();
  const malformedRecords = records.filter((r) => {
    const y = parseInt(r.attendance_date.split('-')[0], 10);
    return isNaN(y) || y !== currentYear;
  });

  assertCheck(
    '5. No malformed years (e.g. 2096, 2235, 2282, 2292)',
    malformedRecords.length === 0,
    malformedRecords.length > 0
      ? `Malformed found: ${malformedRecords.map((m) => m.attendance_date).join(', ')}`
      : `All records are in current year ${currentYear}`
  );

  // 6. Zero orphan attendance audit records
  const { data: audits, error: auditErr } = await supabase.from('attendance_audit_history').select('id, attendance_id');
  if (auditErr) throw new Error(`Audit query failed: ${auditErr.message}`);

  const attendanceIdSet = new Set(records.map((r) => r.id));
  const orphanAudits = (audits || []).filter((a) => !attendanceIdSet.has(a.attendance_id));

  assertCheck(
    '6. Zero orphan attendance audit records',
    orphanAudits.length === 0,
    orphanAudits.length > 0
      ? `Orphan audits: ${orphanAudits.length}`
      : `Audit records: ${audits?.length || 0} (0 orphans)`
  );

  // 7. Session Window Conformance (Morning 5:30-7:00 AM IST, Evening 5:30-7:00 PM IST)
  const istTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  let windowViolations = 0;
  records.forEach((r) => {
    const timeStr = istTimeFormatter.format(new Date(r.created_at));
    const [hh, mm] = timeStr.split(':').map(Number);
    const minuteOfDay = hh * 60 + mm;

    if (r.session_type === 'MORNING') {
      // 5:30 (330m) to 7:00 (420m)
      if (minuteOfDay < 330 || minuteOfDay > 420) {
        windowViolations++;
      }
    } else if (r.session_type === 'EVENING') {
      // 17:30 (1050m) to 19:00 (1140m)
      if (minuteOfDay < 1050 || minuteOfDay > 1140) {
        windowViolations++;
      }
    }
  });

  assertCheck(
    '7. All marked timestamps inside session window (Morning: 5:30-7:00 AM, Evening: 5:30-7:00 PM IST)',
    windowViolations === 0,
    `Violations: ${windowViolations}`
  );

  const allPassed = checks.every((c) => c.passed);
  console.log(`\nVerification Result: ${allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);

  return {
    allPassed,
    checks,
    totalRecords: records.length,
    dateRange: `${minDate} to ${maxDate}`,
  };
}

if (process.argv[1]?.endsWith('verify-attendance-rules.mjs')) {
  runVerification()
    .then((result) => {
      process.exit(result.allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Verification script failed:', err);
      process.exit(1);
    });
}
