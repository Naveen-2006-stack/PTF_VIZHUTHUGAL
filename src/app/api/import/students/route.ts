import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';
import crypto from 'crypto';

function generateSecureTempPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  const bytes = crypto.randomBytes(8);
  let pwd = 'Ptf@';
  for (let i = 0; i < 8; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role verification: Super Admin ONLY
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin can import students and generate credentials.' }, { status: 403 });
    }

    const body = await request.json();
    const { students } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No student records provided for import.' }, { status: 400 });
    }

    // 1. Load Campuses, Departments, Courses
    const { data: campuses } = await supabase.from('campuses').select('id, code, name');
    const { data: departments } = await supabase.from('departments').select('id, code, name, campus_id');
    const { data: courses } = await supabase.from('courses').select('id, code, name, department_id');

    // 2. Load active Staff Profiles for mapping
    const { data: staffList } = await supabase
      .from('staff_profiles')
      .select(`
        id,
        staff_code,
        campus_id,
        department_id,
        is_active,
        profiles (full_name)
      `)
      .eq('is_active', true);

    const campusByCode = new Map((campuses || []).map((c) => [c.code.toUpperCase(), c]));
    const staffByCode = new Map((staffList || []).map((s) => [s.staff_code.toUpperCase(), s]));

    // 3. Determine highest existing PTF sequence
    const { data: existingStudents } = await supabase.from('students').select('ptf_id, register_number');
    const existingPtfSet = new Set((existingStudents || []).map((s) => s.ptf_id.toUpperCase()));
    const existingRegSet = new Set((existingStudents || []).map((s) => s.register_number.toUpperCase()));

    let currentSeq = 0;
    (existingStudents || []).forEach((s) => {
      const match = s.ptf_id.match(/PTF(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > currentSeq) currentSeq = num;
      }
    });

    const successRecords: any[] = [];
    const credentialsExport: any[] = [];
    const duplicateErrors: string[] = [];

    for (let index = 0; index < students.length; index++) {
      const row = students[index];
      const rowNum = index + 1;

      const regNo = (row.register_number || row.registerNumber || row.reg_no || '').toString().trim().toUpperCase();
      const fullName = (row.name || row.full_name || row.student_name || '').toString().trim();

      if (!fullName) {
        duplicateErrors.push(`Row ${rowNum}: Student Name is required.`);
        continue;
      }

      if (!regNo) {
        duplicateErrors.push(`Row ${rowNum} (${fullName}): University Register Number is required.`);
        continue;
      }

      if (existingRegSet.has(regNo)) {
        duplicateErrors.push(`Row ${rowNum}: Register number "${regNo}" already exists in the system.`);
        continue;
      }

      // Campus validation
      const rawCampus = (row.campus_code || row.campus || 'SRM_KTR').toString().trim().toUpperCase();
      const campus = campusByCode.get(rawCampus);
      if (!campus) {
        duplicateErrors.push(`Row ${rowNum}: Invalid campus "${rawCampus}".`);
        continue;
      }

      // Department validation
      const rawDept = (row.department_code || row.department || 'CSE').toString().trim().toUpperCase();
      const dept = departments?.find((d) => d.code.toUpperCase() === rawDept && d.campus_id === campus.id);
      if (!dept) {
        duplicateErrors.push(`Row ${rowNum}: Invalid department "${rawDept}" for campus "${rawCampus}".`);
        continue;
      }

      // Course validation
      const rawCourse = (row.course_code || row.course || 'BTECH_CSE').toString().trim().toUpperCase();
      const course = courses?.find((c) => (c.code.toUpperCase() === rawCourse || c.department_id === dept.id));
      if (!course) {
        duplicateErrors.push(`Row ${rowNum}: Invalid course for department "${rawDept}".`);
        continue;
      }

      // Staff mapping validation (if provided)
      let matchedStaff: any = null;
      const rawStaff = (row.staff_id || row.staff_code || row.staff || '').toString().trim().toUpperCase();
      if (rawStaff) {
        matchedStaff = staffByCode.get(rawStaff);
        if (!matchedStaff) {
          duplicateErrors.push(`Row ${rowNum}: Staff Code "${rawStaff}" does not exist or is inactive.`);
          continue;
        }
        // Validate staff campus matching if staff has a campus assigned
        if (matchedStaff.campus_id && matchedStaff.campus_id !== campus.id) {
          duplicateErrors.push(`Row ${rowNum}: Staff "${rawStaff}" belongs to a different campus.`);
          continue;
        }
      }

      // Generate sequential PTF ID
      currentSeq += 1;
      const formattedPtfId = `PTF${currentSeq.toString().padStart(3, '0')}`;
      if (existingPtfSet.has(formattedPtfId)) {
        currentSeq += 1;
      }

      // Generate secure temporary password
      const tempPassword = generateSecureTempPassword();
      const email = (row.email || `${formattedPtfId.toLowerCase()}@ptffoundation.org`).toString().trim().toLowerCase();
      const currentYear = parseInt(row.current_year || row.year || '1', 10) || 1;
      const academicYear = (row.academic_year || '2026-2027').toString().trim();
      const parentName = row.parent_name ? String(row.parent_name).trim() : null;
      const parentPhone = row.parent_phone ? String(row.parent_phone).trim() : null;

      // Call database security definer procedure
      const { data: createdResult, error: createError } = await supabase.rpc('create_student_account', {
        p_email: email,
        p_password: tempPassword,
        p_full_name: fullName,
        p_ptf_id: formattedPtfId,
        p_register_number: regNo,
        p_campus_id: campus.id,
        p_department_id: dept.id,
        p_course_id: course.id,
        p_current_year: currentYear,
        p_academic_year: academicYear,
        p_parent_name: parentName,
        p_parent_phone: parentPhone,
        p_staff_id: matchedStaff ? matchedStaff.id : null,
      });

      if (createError) {
        duplicateErrors.push(`Row ${rowNum} (${fullName}): ${createError.message}`);
        currentSeq -= 1; // Roll back sequence number for failed insert
      } else {
        existingRegSet.add(regNo);
        existingPtfSet.add(formattedPtfId);
        successRecords.push(createdResult);

        const staffName = Array.isArray(matchedStaff?.profiles)
          ? matchedStaff?.profiles[0]?.full_name
          : matchedStaff?.profiles?.full_name || 'Unassigned';

        // Add to one-time protected credential export
        credentialsExport.push({
          ptf_id: formattedPtfId,
          student_name: fullName,
          register_number: regNo,
          campus: campus.code,
          department: dept.code,
          staff_code: matchedStaff ? matchedStaff.staff_code : 'UNASSIGNED',
          staff_name: staffName,
          temporary_password: tempPassword,
          email: email,
        });
      }
    }

    // Audit log
    await logAuditEvent({
      actorId: user.id,
      action: 'BULK_STUDENT_IMPORT',
      entity: 'students',
      newState: {
        importedCount: successRecords.length,
        errorCount: duplicateErrors.length,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      importedCount: successRecords.length,
      credentials: credentialsExport,
      errors: duplicateErrors,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Bulk import failed' }, { status: 500 });
  }
}
