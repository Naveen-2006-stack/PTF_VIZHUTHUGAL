import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role verification: Only STAFF_MENTOR, SUPER_ADMIN, or SEMI_ADMIN can record attendance
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'STAFF_MENTOR' && profile.role !== 'SUPER_ADMIN' && profile.role !== 'SEMI_ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden: Only Staff/Mentors or Admins can record Abdul Kalam attendance.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Support single record or batch submission
    const items = Array.isArray(body.records) ? body.records : [body];

    if (items.length === 0 || !items[0].studentId) {
      return NextResponse.json({ error: 'Missing required attendance parameters.' }, { status: 400 });
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (const item of items) {
      const { studentId, attendanceDate, sessionType, status, remarks } = item;

      if (!studentId || !attendanceDate || !sessionType || !status) {
        errors.push(`Missing parameters for student ${studentId}`);
        continue;
      }

      // Check student Abdul Kalam Eligibility
      const { data: eligibility } = await supabase
        .from('special_class_eligibility')
        .select('is_eligible')
        .eq('student_id', studentId)
        .maybeSingle();

      if (!eligibility || !eligibility.is_eligible) {
        errors.push(`Student is not eligible for Abdul Kalam Class.`);
        continue;
      }

      // Check existing attendance on this date (Morning exists -> Evening blocked; Evening exists -> Morning blocked)
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('id, session_type, status')
        .eq('student_id', studentId)
        .eq('attendance_date', attendanceDate)
        .maybeSingle();

      if (existingRecord) {
        errors.push(
          `Attendance already recorded for student today in the ${existingRecord.session_type} session (${existingRecord.status}). Maximum ONE session per day permitted.`
        );
        continue;
      }

      // Insert attendance record (Protected by database UNIQUE constraint uq_student_attendance_date)
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          student_id: studentId,
          attendance_date: attendanceDate,
          session_type: sessionType.toUpperCase(),
          mentor_id: user.id,
          status: status.toUpperCase(),
          remarks: remarks || null,
          is_locked: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          errors.push(`Attendance already recorded for this student on ${attendanceDate} (Duplicate blocked by DB constraint).`);
        } else {
          errors.push(`Database error: ${error.message}`);
        }
      } else {
        results.push(data);
      }
    }

    if (results.length > 0) {
      // Audit log
      await logAuditEvent({
        actorId: user.id,
        action: 'MARK_ABDUL_KALAM_ATTENDANCE',
        entity: 'attendance',
        newState: {
          markedCount: results.length,
          errorsCount: errors.length,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: errors[0], errors, code: 'DUPLICATE_DAILY_ATTENDANCE' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      records: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role verification: Only STAFF_MENTOR or SUPER_ADMIN can edit attendance
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'STAFF_MENTOR' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden: Only the original Staff/Mentor or Super Admin can edit attendance records.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { attendanceId, status, reason } = body;

    if (!attendanceId) {
      return NextResponse.json({ error: 'Missing attendanceId parameter.' }, { status: 400 });
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return NextResponse.json(
        { error: 'Reason for correction is required (minimum 3 characters).' },
        { status: 400 }
      );
    }

    // Fetch existing attendance record with student and creator details
    const { data: record, error: fetchError } = await supabase
      .from('attendance')
      .select('id, student_id, attendance_date, session_type, mentor_id, status, created_at')
      .eq('id', attendanceId)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Attendance record not found.' }, { status: 404 });
    }

    const isSuperAdmin = profile.role === 'SUPER_ADMIN';

    // Original Creator check for Staff/Mentor
    if (!isSuperAdmin && record.mentor_id !== user.id) {
      return NextResponse.json(
        {
          error: 'ORIGINAL_CREATOR_ONLY',
          message: 'Only the original Staff/Mentor who recorded this attendance can edit it.',
        },
        { status: 403 }
      );
    }

    // Verify Abdul Kalam eligibility
    const { data: eligibility } = await supabase
      .from('special_class_eligibility')
      .select('is_eligible')
      .eq('student_id', record.student_id)
      .maybeSingle();

    if (!eligibility || !eligibility.is_eligible) {
      return NextResponse.json(
        { error: 'Student is not eligible for Abdul Kalam Class.' },
        { status: 403 }
      );
    }

    // 24-Hour window verification (calculated using server timestamp against created_at)
    const createdAtTime = new Date(record.created_at).getTime();
    const serverTime = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const isWindowExpired = (serverTime - createdAtTime) > twentyFourHoursMs;

    if (!isSuperAdmin && isWindowExpired) {
      return NextResponse.json(
        {
          error: 'ATTENDANCE_EDIT_WINDOW_EXPIRED',
          message: 'Attendance can only be edited within 24 hours of marking.',
          created_at: record.created_at,
          expired_at: new Date(createdAtTime + twentyFourHoursMs).toISOString(),
        },
        { status: 409 }
      );
    }

    const previousStatus = record.status;
    const newStatus = status.toUpperCase();

    // Update attendance record (preserves immutable fields: student_id, attendance_date, session_type, mentor_id, created_at)
    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance')
      .update({
        status: newStatus,
        last_edited_by: user.id,
        edit_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: `Failed to update attendance: ${updateError.message}` }, { status: 500 });
    }

    // Insert into public.attendance_audit_history
    const { data: auditRecord, error: auditError } = await supabase
      .from('attendance_audit_history')
      .insert({
        attendance_id: record.id,
        student_id: record.student_id,
        previous_status: previousStatus,
        new_status: newStatus,
        original_marked_by: record.mentor_id,
        edited_by: user.id,
        original_created_at: record.created_at,
        reason: reason.trim(),
        is_super_admin_override: isSuperAdmin && isWindowExpired,
      })
      .select()
      .single();

    if (auditError) {
      console.error('Failed to write to attendance_audit_history:', auditError);
    }

    // Log general audit event
    await logAuditEvent({
      actorId: user.id,
      action: isSuperAdmin && isWindowExpired ? 'SUPER_ADMIN_ATTENDANCE_OVERRIDE' : 'EDIT_ABDUL_KALAM_ATTENDANCE',
      entity: 'attendance',
      entityId: record.id,
      previousState: { status: previousStatus },
      newState: {
        status: newStatus,
        reason: reason.trim(),
        edited_by: user.id,
        is_override: isSuperAdmin && isWindowExpired,
      },
    });

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      previousStatus,
      newStatus,
      auditId: auditRecord?.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
