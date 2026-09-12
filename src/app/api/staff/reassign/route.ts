import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Only Super Admin can reassign staff
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin can reassign students to staff.' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, staffId, remarks } = body;

    if (!studentId || !staffId) {
      return NextResponse.json({ error: 'Student ID and Staff ID are required.' }, { status: 400 });
    }

    // Verify staff exists and is active
    const { data: staffData } = await supabase
      .from('staff_profiles')
      .select('id, staff_code, campus_id, is_active')
      .eq('id', staffId)
      .eq('is_active', true)
      .single();

    if (!staffData) {
      return NextResponse.json({ error: 'Selected staff member is invalid or inactive.' }, { status: 400 });
    }

    // 1. Deactivate old active assignment(s) for historical retention
    const { data: oldAssignment } = await supabase
      .from('staff_student_assignments')
      .select('id, staff_id')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .maybeSingle();

    if (oldAssignment) {
      await supabase
        .from('staff_student_assignments')
        .update({
          is_active: false,
          active_until: new Date().toISOString(),
        })
        .eq('id', oldAssignment.id);
    }

    // 2. Insert new active assignment
    const { data: newAssignment, error: insertError } = await supabase
      .from('staff_student_assignments')
      .insert({
        student_id: studentId,
        staff_id: staffId,
        assigned_by: user.id,
        is_active: true,
        active_from: new Date().toISOString(),
        remarks: remarks || 'Reassigned by Super Admin',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Audit log
    await logAuditEvent({
      actorId: user.id,
      action: 'REASSIGN_STUDENT_STAFF',
      entity: 'staff_student_assignments',
      entityId: newAssignment.id,
      previousState: oldAssignment ? { previousStaffId: oldAssignment.staff_id } : undefined,
      newState: { studentId, staffId, remarks },
    });

    return NextResponse.json({ success: true, assignment: newAssignment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Reassignment failed' }, { status: 500 });
  }
}
