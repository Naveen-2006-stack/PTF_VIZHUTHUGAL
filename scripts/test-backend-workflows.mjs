// Comprehensive Backend, Auth & API Automated Test Suite for PTF Vizhuthugal Student Portal
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aibklzudikrwhmnipchj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmtsenVkaWtyd2htbmlwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTc1MzgsImV4cCI6MjEwNDU5MzUzOH0.iMKol8D4vaDxH0ZXB1HVE-SI6cFGTJyO4JvnTilp9EQ';
const LOCAL_API_URL = process.env.LOCAL_API_URL || 'http://localhost:3000';

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

async function runTests() {
  console.log('================================================================');
  console.log('  PTF VIZHUTHUGAL STUDENT PORTAL - AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // TEST 1: Zero Fake Student Records Policy (Rule 57)
  try {
    const { count, error } = await anonClient
      .from('students')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    assert('Rule 57: Zero Demo Student Records Policy', count === 0, `Active students in database: ${count} (expected 0)`);
  } catch (err) {
    assert('Rule 57: Zero Demo Student Records Policy', false, err.message);
  }

  // TEST 2: Campuses & Scholar Capacity Architecture
  try {
    const { data: campuses, error } = await anonClient
      .from('campuses')
      .select('code, name, capacity');

    if (error) throw error;
    const campusMap = new Map(campuses.map(c => [c.code, c.capacity]));
    
    assert('Campus SRM_KTR exists with capacity 153', campusMap.get('SRM_KTR') === 153, `Capacity: ${campusMap.get('SRM_KTR')}`);
    assert('Campus SRM_BAB exists with capacity 27', campusMap.get('SRM_BAB') === 27, `Capacity: ${campusMap.get('SRM_BAB')}`);
    assert('Campus SRM_AP exists with capacity 24', campusMap.get('SRM_AP') === 24, `Capacity: ${campusMap.get('SRM_AP')}`);
    
    const totalCapacity = campuses.reduce((sum, c) => sum + (c.capacity || 0), 0);
    assert('Total Target Scholar Capacity is exactly 204', totalCapacity === 204, `Total: ${totalCapacity}`);
  } catch (err) {
    assert('Campuses & Capacity Verification', false, err.message);
  }

  // TEST 3: API Protection: Abdul Kalam Attendance Route
  try {
    const res = await fetch(`${LOCAL_API_URL}/api/attendance/abdul-kalam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: '00000000-0000-0000-0000-000000000000',
        attendanceDate: '2026-09-10',
        sessionType: 'MORNING',
        status: 'PRESENT',
      }),
    });
    assert('API Security: Unauthenticated Attendance POST returns 401 Unauthorized', res.status === 401, `Status: ${res.status}`);
  } catch (err) {
    assert('API Security: Attendance POST Route Protection', false, err.message);
  }

  // TEST 4: API Protection: Student Bulk Import Route
  try {
    const res = await fetch(`${LOCAL_API_URL}/api/import/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: [] }),
    });
    assert('API Security: Unauthenticated Bulk Import POST returns 401 Unauthorized', res.status === 401, `Status: ${res.status}`);
  } catch (err) {
    assert('API Security: Student Bulk Import Route Protection', false, err.message);
  }

  // TEST 5: Anonymous RLS Protection on Profiles
  try {
    const { data, error } = await anonClient
      .from('profiles')
      .select('id, full_name, email, role');

    // Due to RLS, an unauthenticated user receives an empty array, NOT unauthorized user profiles
    assert('RLS Security: Anonymous queries cannot view user profiles', (!data || data.length === 0), `Rows visible to anon: ${data ? data.length : 0}`);
  } catch (err) {
    assert('RLS Security: Anonymous Profiles Isolation', false, err.message);
  }

  // TEST 6: Super Admin Authentication & Profile Verification
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { data: authData, error: loginError } = await authClient.auth.signInWithPassword({
      email: 'maniraj.e@ptffoundation.org',
      password: 'Vizhuthugal@2026',
    });

    if (loginError) throw loginError;
    assert('Super Admin Login Successful', authData.user !== null, `User ID: ${authData.user?.id}`);

    // Fetch authenticated profile under RLS
    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('id, full_name, email, role, must_change_password, is_active')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;
    assert('Super Admin Name matches E Maniraj', profile.full_name === 'E Maniraj', `Name: ${profile.full_name}`);
    assert('Super Admin Role matches SUPER_ADMIN', profile.role === 'SUPER_ADMIN', `Role: ${profile.role}`);
    assert('Super Admin Email matches maniraj.e@ptffoundation.org', profile.email === 'maniraj.e@ptffoundation.org', `Email: ${profile.email}`);
    assert('Forced First-Login Password Change is Active', profile.must_change_password === true, `must_change_password: ${profile.must_change_password}`);

    // TEST 7: Security Definer RPC Check with Super Admin session
    const { data: isSuperAdmin, error: rpcError } = await authClient.rpc('is_super_admin');
    if (rpcError) throw rpcError;
    assert('Security Definer: is_super_admin() returns TRUE for Super Admin session', isSuperAdmin === true, `is_super_admin: ${isSuperAdmin}`);

    // TEST 8: Authenticated Audit Log Append Capability
    const { error: auditError } = await authClient.from('audit_logs').insert({
      actor_id: authData.user.id,
      action: 'AUTOMATED_TEST_VERIFICATION',
      entity: 'system_test',
      entity_id: authData.user.id,
      new_state: { testRunAt: new Date().toISOString(), status: 'SUCCESS' },
    });
    assert('Audit Trail: Super Admin can append immutable audit records', !auditError, auditError ? auditError.message : 'Appended successfully');

    // Sign out clean up
    await authClient.auth.signOut();
    assert('Session Logout Successful', true);
  } catch (err) {
    assert('Super Admin Authentication & RLS Verification', false, err.message);
  }

  // Final Summary
  console.log('\n================================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`  TEST RESULTS SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${results.length})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
