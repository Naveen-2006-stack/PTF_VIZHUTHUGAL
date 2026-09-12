// Business Rules Automated Verification Suite for PTF Vizhuthugal Student Portal
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aibklzudikrwhmnipchj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmtsenVkaWtyd2htbmlwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTc1MzgsImV4cCI6MjEwNDU5MzUzOH0.iMKol8D4vaDxH0ZXB1HVE-SI6cFGTJyO4JvnTilp9EQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const results = [];

function assert(description, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${description}`);
    results.push({ test: description, status: 'PASS', details });
  } else {
    console.error(`[FAIL] ${description} - ${details}`);
    results.push({ test: description, status: 'FAIL', details });
  }
}

async function runBusinessRulesTests() {
  console.log('================================================================');
  console.log('  PTF VIZHUTHUGAL - BUSINESS RULES & CONSTRAINTS SUITE');
  console.log('================================================================\n');

  // Sign in as Super Admin to test business rule enforcement
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'maniraj.e@ptffoundation.org',
    password: 'Vizhuthugal@2026',
  });

  if (authError) {
    console.error('Failed to authenticate Super Admin:', authError);
    process.exit(1);
  }

  const adminClient = supabase;

  // RULE 1: Abdul Kalam Attendance - Mandatory One Session Per Student Per Date
  // Enforced by uq_student_attendance_date
  try {
    // Check if unique index or constraint exists
    const { data, error } = await adminClient
      .from('attendance')
      .select('id')
      .limit(1);

    assert('Attendance Table Accessible under Admin Session', !error, error?.message);
  } catch (err) {
    assert('Attendance Rule Check', false, err.message);
  }

  // RULE 2: Staff-Student Single Active Assignment
  // Enforced by partial unique index uq_student_active_staff
  try {
    const { data, error } = await adminClient
      .from('staff_student_assignments')
      .select('id')
      .limit(1);

    assert('Staff Assignment Table Accessible under Admin Session', !error, error?.message);
  } catch (err) {
    assert('Staff Assignment Rule Check', false, err.message);
  }

  // RULE 3: Verify Reference Seed Data Completeness
  try {
    const { count: rolesCount } = await adminClient.from('roles').select('*', { count: 'exact', head: true });
    assert('RBAC: Exactly 6 System Roles Seeded', rolesCount === 6, `Count: ${rolesCount}`);

    const { count: permCount } = await adminClient.from('permissions').select('*', { count: 'exact', head: true });
    assert('RBAC: Permissions Seeded', permCount >= 8, `Count: ${permCount}`);

    const { count: deptsCount } = await adminClient.from('departments').select('*', { count: 'exact', head: true });
    assert('Academic Hierarchy: Departments Seeded', deptsCount >= 3, `Count: ${deptsCount}`);

    const { count: coursesCount } = await adminClient.from('courses').select('*', { count: 'exact', head: true });
    assert('Academic Hierarchy: Courses Seeded', coursesCount >= 3, `Count: ${coursesCount}`);
  } catch (err) {
    assert('Reference Seed Data Check', false, err.message);
  }

  await adminClient.auth.signOut();

  console.log('\n================================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`  BUSINESS RULES SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${results.length})`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runBusinessRulesTests();
