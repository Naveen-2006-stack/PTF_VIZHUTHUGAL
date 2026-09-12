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

    // Role check: Only Super Admin can manage Abdul Kalam eligibility
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can configure Abdul Kalam Class eligibility.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const records = body.eligibility || (body.records ? body.records : [body]);

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No eligibility records provided.' }, { status: 400 });
    }

    // Load students to resolve ptf_id or student_id
    const { data: students } = await supabase
      .from('students')
      .select('id, ptf_id, campus_id, profile_id, profiles(full_name)');

    const studentByPtf = new Map((students || []).map((s) => [s.ptf_id.toUpperCase(), s]));
    const studentById = new Map((students || []).map((s) => [s.id, s]));

    const errors: string[] = [];
    let updatedCount = 0;

    for (let index = 0; index < records.length; index++) {
      const row = records[index];
      const ptfId = (row.ptf_id || row.ptfId || '').toString().trim().toUpperCase();
      const studentId = row.student_id || row.studentId;

      const student = ptfId ? studentByPtf.get(ptfId) : (studentId ? studentById.get(studentId) : null);

      if (!student) {
        errors.push(`Row ${index + 1}: Student with PTF ID "${ptfId || studentId}" not found.`);
        continue;
      }

      // Parse boolean eligibility
      let isEligible = true;
      if (typeof row.eligible === 'boolean') {
        isEligible = row.eligible;
      } else if (typeof row.is_eligible === 'boolean') {
        isEligible = row.is_eligible;
      } else if (typeof row.eligible === 'string') {
        const str = row.eligible.trim().toUpperCase();
        isEligible = str === 'YES' || str === 'TRUE' || str === '1' || str === 'Y';
      } else if (typeof row.is_eligible === 'string') {
        const str = row.is_eligible.trim().toUpperCase();
        isEligible = str === 'YES' || str === 'TRUE' || str === '1' || str === 'Y';
      }

      const { error: upsertError } = await supabase
        .from('special_class_eligibility')
        .upsert(
          {
            student_id: student.id,
            campus_id: student.campus_id,
            is_eligible: isEligible,
            valid_from: new Date().toISOString().split('T')[0],
            configured_by: user.id,
          },
          { onConflict: 'student_id' }
        );

      if (upsertError) {
        errors.push(`Failed for student ${student.ptf_id}: ${upsertError.message}`);
      } else {
        updatedCount += 1;
      }
    }

    // Audit logging
    await logAuditEvent({
      actorId: user.id,
      action: 'UPDATE_ABDUL_KALAM_ELIGIBILITY',
      entity: 'special_class_eligibility',
      newState: {
        updatedCount,
        errorsCount: errors.length,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eligibility update failed' }, { status: 500 });
  }
}
