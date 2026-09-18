import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';
import { StudentMarkSheetRecord, StudentMarkSheetSubject, ExportMetadata } from '@/lib/academic-export';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
    }

    // Role check: SUPER_ADMIN, SEMI_ADMIN, PTF_SECRETARY only
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      (profile.role !== 'SUPER_ADMIN' &&
        profile.role !== 'SEMI_ADMIN' &&
        profile.role !== 'PTF_SECRETARY')
    ) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to export academic records.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      scope = 'ALL_STUDENTS',
      studentId,
      studentIds = [],
      semesterId,
    } = body;

    // Determine campus restriction for SEMI_ADMIN
    let restrictedCampusId: string | null = null;
    if (profile.role === 'SEMI_ADMIN') {
      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('campus_id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (staffData?.campus_id) {
        restrictedCampusId = staffData.campus_id;
      }
    }

    // 1. Fetch Semester details
    let selectedSemester: any = null;
    if (semesterId) {
      const { data: sem } = await supabase
        .from('semesters')
        .select('*')
        .eq('id', semesterId)
        .maybeSingle();
      selectedSemester = sem;
    } else {
      const { data: sem } = await supabase
        .from('semesters')
        .select('*')
        .eq('is_current', true)
        .maybeSingle();
      selectedSemester = sem;
    }

    // 2. Query target students based on scope and campus restrictions
    let studentQuery = supabase
      .from('students')
      .select('id, ptf_id, register_number, campus_id, academic_year, current_year, campus:campuses(*), profile:profiles(*)');

    if (restrictedCampusId) {
      studentQuery = studentQuery.eq('campus_id', restrictedCampusId);
    }

    if (scope === 'CURRENT_STUDENT' && studentId) {
      studentQuery = studentQuery.eq('id', studentId);
    } else if (scope === 'SELECTED_STUDENTS' && Array.isArray(studentIds) && studentIds.length > 0) {
      studentQuery = studentQuery.in('id', studentIds);
    }

    const { data: students, error: studentError } = await studentQuery;

    if (studentError) {
      console.error('Error fetching students for export:', studentError);
      return NextResponse.json({ error: 'Failed to retrieve students' }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        records: [],
        metadata: {
          academicYear: selectedSemester?.academic_year || '2026-2027',
          semesterText: selectedSemester ? `Semester ${selectedSemester.semester_number}` : 'All Semesters',
          campusText: restrictedCampusId ? 'Assigned Campus' : 'All Authorized Campuses',
          generatedDate: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
          generatedBy: profile.full_name || 'Administrator',
        },
      });
    }

    const resolvedStudentIds = students.map((s) => s.id);

    // 3. Query subject marks for resolved students (and semester if provided)
    let marksQuery = supabase
      .from('subject_marks')
      .select('*, subject:subjects(*)')
      .in('student_id', resolvedStudentIds);

    if (selectedSemester?.id) {
      marksQuery = marksQuery.eq('semester_id', selectedSemester.id);
    }

    const { data: marksData, error: marksError } = await marksQuery;
    if (marksError) {
      console.error('Error fetching subject marks for export:', marksError);
    }

    // 4. Query academic records for SGPA / CGPA values
    let acadQuery = supabase
      .from('academic_records')
      .select('*')
      .in('student_id', resolvedStudentIds);

    if (selectedSemester?.id) {
      acadQuery = acadQuery.eq('semester_id', selectedSemester.id);
    }

    const { data: acadData, error: acadError } = await acadQuery;
    if (acadError) {
      console.error('Error fetching academic records for export:', acadError);
    }

    // Map academic records by student_id
    const acadMap = new Map<string, any>();
    if (acadData) {
      acadData.forEach((rec) => {
        acadMap.set(rec.student_id, rec);
      });
    }

    // Map marks by student_id -> map by subject_id -> array of CT tests
    const studentMarksMap = new Map<string, Map<string, any[]>>();
    if (marksData) {
      marksData.forEach((m) => {
        if (!studentMarksMap.has(m.student_id)) {
          studentMarksMap.set(m.student_id, new Map());
        }
        const subMap = studentMarksMap.get(m.student_id)!;
        const subKey = m.subject_id || m.subject?.subject_name || 'General';
        if (!subMap.has(subKey)) {
          subMap.set(subKey, []);
        }
        subMap.get(subKey)!.push(m);
      });
    }

    // 5. Structure records into StudentMarkSheetRecord format
    const records: StudentMarkSheetRecord[] = [];

    students.forEach((st) => {
      const acad = acadMap.get(st.id);
      const subMap = studentMarksMap.get(st.id);

      const subjects: StudentMarkSheetSubject[] = [];

      if (subMap && subMap.size > 0) {
        subMap.forEach((markList) => {
          // Sort by test number 1, 2, 3
          markList.sort((a, b) => a.ct_test_number - b.ct_test_number);

          const ct1Entry = markList.find((m) => m.ct_test_number === 1);
          const ct2Entry = markList.find((m) => m.ct_test_number === 2);
          const ct3Entry = markList.find((m) => m.ct_test_number === 3);

          const ct1Val = ct1Entry ? ct1Entry.mark_obtained : '—';
          const ct2Val = ct2Entry ? ct2Entry.mark_obtained : '—';
          const ct3Val = ct3Entry ? ct3Entry.mark_obtained : '—';

          // Calculate total of available CT numbers
          let sumObtained = 0;
          let count = 0;
          [ct1Entry, ct2Entry, ct3Entry].forEach((e) => {
            if (e && typeof e.mark_obtained === 'number') {
              sumObtained += e.mark_obtained;
              count++;
            }
          });

          const totalVal = count > 0 ? sumObtained : '—';
          const subjectName = markList[0]?.subject?.subject_name || 'Subject';
          const subjectCode = markList[0]?.subject?.subject_code || '';

          // Determine composite status
          const hasVerified = markList.some((m) => m.status === 'VERIFIED');
          const hasRejected = markList.some((m) => m.status === 'REJECTED');
          const hasCorrection = markList.some((m) => m.status === 'CORRECTION_REQUIRED');
          const status = hasRejected
            ? 'Rejected'
            : hasCorrection
            ? 'Correction Required'
            : hasVerified
            ? 'Verified'
            : markList[0]?.status || 'Submitted';

          subjects.push({
            subjectName,
            subjectCode,
            ct1: ct1Val,
            ct2: ct2Val,
            ct3: ct3Val,
            total: totalVal,
            status,
          });
        });
      }

      const studentProfile: any = (st as any).profile;
      const studentCampus: any = (st as any).campus;

      records.push({
        studentId: st.id,
        studentName: studentProfile?.full_name || 'Student',
        registerNumber: st.register_number || st.ptf_id,
        campusName: studentCampus?.name || studentCampus?.code || 'SRMIST',
        campusCode: studentCampus?.code,
        academicYear: selectedSemester?.academic_year || st.academic_year || '2026-2027',
        semesterNumber: selectedSemester?.semester_number || 1,
        semesterText: selectedSemester ? `Semester ${selectedSemester.semester_number}` : 'Semester 1',
        sgpa: acad?.sgpa !== undefined && acad?.sgpa !== null ? acad.sgpa : '—',
        cgpa: acad?.cgpa !== undefined && acad?.cgpa !== null ? acad.cgpa : '—',
        status: acad?.status || (subjects.length > 0 ? subjects[0].status : 'Pending Review'),
        subjects,
      });
    });

    const firstStudentCampus: any = (students[0] as any)?.campus;
    const metadata: ExportMetadata = {
      academicYear: selectedSemester?.academic_year || '2026-2027',
      semesterText: selectedSemester ? `Semester ${selectedSemester.semester_number}` : 'All Semesters',
      campusText: restrictedCampusId
        ? firstStudentCampus?.name || 'Assigned Campus'
        : 'All Authorized Campuses',
      generatedDate: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
      generatedBy: `${profile.full_name} (${profile.role.replace('_', ' ')})`,
    };

    // 6. Audit logging
    await logAuditEvent({
      actorId: profile.id,
      action: 'EXPORT_ACADEMIC_MARKSHEET',
      entity: 'subject_marks',
      entityId: selectedSemester?.id || 'all_semesters',
      newState: {
        scope,
        studentCount: records.length,
        semesterId: selectedSemester?.id,
      },
    });

    return NextResponse.json({ records, metadata });
  } catch (error: any) {
    console.error('Academic export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process academic export.' },
      { status: 500 }
    );
  }
}
