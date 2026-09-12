-- ==============================================================================
-- PTF VIZHUTHUGAL STUDENT PORTAL
-- CLEAN AND RESEED ABDUL KALAM ATTENDANCE (PREVIOUS 7 DAYS ONLY)
-- ==============================================================================
-- Rules enforced:
-- 1. Cleans existing attendance and dependent audit records (cascaded).
-- 2. Calculates dynamic 7-day window relative to CURRENT_DATE:
--    [CURRENT_DATE - 6 days, CURRENT_DATE]
-- 3. Realistic marked_at timestamps matching attendance session dates.
-- 4. Maximum ONE session per student per date.
-- 5. Tests 24-hour edit window scenarios:
--    - Recently marked (editable)
--    - ~23 hours old (editable)
--    - > 24 hours old (locked - expired)
--    - Marked by another mentor (locked - other mentor)
--    - Older past-week records (locked)
-- ==============================================================================

DO $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_now TIMESTAMPTZ := NOW();
  
  -- Eligible Scholars
  v_student_qa001 UUID := 'a6666666-6666-4666-a666-666666666666';
  v_student_ptf001 UUID := '0e2c88f1-a128-4ef8-a4ec-4f1efb49463b';
  
  -- Mentors
  v_mentor_1 UUID := '44444444-4444-4444-a444-444444444444'; -- qa.staffmentor@ptftest.local
  v_mentor_2 UUID := '55555555-5555-4555-a555-555555555555'; -- qa.staffmentor2@ptftest.local
  v_mentor_sundar UUID := '55a1e2f3-b4c5-4d6e-8f90-123456789abc'; -- staff.mentor@ptffoundation.org

BEGIN
  -- 1. Clean existing attendance and associated audit history
  DELETE FROM public.attendance_audit_history;
  DELETE FROM public.attendance;

  -- 2. Insert fresh records across previous 7 calendar days

  -- --------------------------------------------------------------------------
  -- DAY 0 (TODAY: v_today)
  -- --------------------------------------------------------------------------
  -- Scenario A: Recently marked attendance (within last 2 hours, same mentor) -> EDITABLE
  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_qa001,
    v_today,
    'EVENING',
    v_mentor_1,
    'PRESENT',
    false,
    v_now - INTERVAL '2 hours',
    v_now - INTERVAL '2 hours'
  );

  -- Scenario D: Marked today morning by another mentor (v_mentor_2) -> LOCKED (other mentor)
  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_ptf001,
    v_today,
    'MORNING',
    v_mentor_2,
    'PRESENT',
    false,
    (v_today + TIME '06:30:00') AT TIME ZONE 'Asia/Kolkata',
    (v_today + TIME '06:30:00') AT TIME ZONE 'Asia/Kolkata'
  );

  -- --------------------------------------------------------------------------
  -- DAY 1 (YESTERDAY: v_today - 1 day)
  -- --------------------------------------------------------------------------
  -- Scenario B: Attendance ~22.5 hours old (yesterday evening, same mentor) -> EDITABLE
  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_qa001,
    (v_today - INTERVAL '1 day')::date,
    'EVENING',
    v_mentor_1,
    'PRESENT',
    false,
    v_now - INTERVAL '22 hours 30 minutes',
    v_now - INTERVAL '22 hours 30 minutes'
  );

  -- Scenario C: Attendance > 24 hours old (yesterday morning, same mentor) -> LOCKED (expired)
  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_ptf001,
    (v_today - INTERVAL '1 day')::date,
    'MORNING',
    v_mentor_1,
    'LATE',
    true,
    ((v_today - INTERVAL '1 day')::date + TIME '06:15:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '1 day')::date + TIME '06:15:00') AT TIME ZONE 'Asia/Kolkata'
  );

  -- --------------------------------------------------------------------------
  -- DAY 2 (v_today - 2 days)
  -- --------------------------------------------------------------------------
  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_qa001,
    (v_today - INTERVAL '2 days')::date,
    'MORNING',
    v_mentor_1,
    'PRESENT',
    true,
    ((v_today - INTERVAL '2 days')::date + TIME '06:30:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '2 days')::date + TIME '06:30:00') AT TIME ZONE 'Asia/Kolkata'
  );

  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_ptf001,
    (v_today - INTERVAL '2 days')::date,
    'EVENING',
    v_mentor_sundar,
    'PRESENT',
    true,
    ((v_today - INTERVAL '2 days')::date + TIME '18:00:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '2 days')::date + TIME '18:00:00') AT TIME ZONE 'Asia/Kolkata'
  );

  -- --------------------------------------------------------------------------
  -- DAY 3 (v_today - 3 days)
  -- --------------------------------------------------------------------------
  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_qa001,
    (v_today - INTERVAL '3 days')::date,
    'EVENING',
    v_mentor_1,
    'ABSENT',
    true,
    ((v_today - INTERVAL '3 days')::date + TIME '18:15:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '3 days')::date + TIME '18:15:00') AT TIME ZONE 'Asia/Kolkata'
  );

  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_ptf001,
    (v_today - INTERVAL '3 days')::date,
    'MORNING',
    v_mentor_1,
    'PRESENT',
    true,
    ((v_today - INTERVAL '3 days')::date + TIME '06:20:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '3 days')::date + TIME '06:20:00') AT TIME ZONE 'Asia/Kolkata'
  );

  -- --------------------------------------------------------------------------
  -- DAY 4 (v_today - 4 days)
  -- --------------------------------------------------------------------------
  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_qa001,
    (v_today - INTERVAL '4 days')::date,
    'MORNING',
    v_mentor_1,
    'PRESENT',
    true,
    ((v_today - INTERVAL '4 days')::date + TIME '06:15:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '4 days')::date + TIME '06:15:00') AT TIME ZONE 'Asia/Kolkata'
  );

  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_ptf001,
    (v_today - INTERVAL '4 days')::date,
    'MORNING',
    v_mentor_2,
    'PRESENT',
    true,
    ((v_today - INTERVAL '4 days')::date + TIME '06:30:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '4 days')::date + TIME '06:30:00') AT TIME ZONE 'Asia/Kolkata'
  );

  -- --------------------------------------------------------------------------
  -- DAY 5 (v_today - 5 days)
  -- --------------------------------------------------------------------------
  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_qa001,
    (v_today - INTERVAL '5 days')::date,
    'EVENING',
    v_mentor_1,
    'PRESENT',
    true,
    ((v_today - INTERVAL '5 days')::date + TIME '17:45:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '5 days')::date + TIME '17:45:00') AT TIME ZONE 'Asia/Kolkata'
  );

  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_ptf001,
    (v_today - INTERVAL '5 days')::date,
    'EVENING',
    v_mentor_2,
    'LATE',
    true,
    ((v_today - INTERVAL '5 days')::date + TIME '18:15:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '5 days')::date + TIME '18:15:00') AT TIME ZONE 'Asia/Kolkata'
  );

  -- --------------------------------------------------------------------------
  -- DAY 6 (v_today - 6 days)
  -- --------------------------------------------------------------------------
  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_qa001,
    (v_today - INTERVAL '6 days')::date,
    'MORNING',
    v_mentor_1,
    'PRESENT',
    true,
    ((v_today - INTERVAL '6 days')::date + TIME '06:20:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '6 days')::date + TIME '06:20:00') AT TIME ZONE 'Asia/Kolkata'
  );

  INSERT INTO public.attendance (
    student_id, attendance_date, session_type, mentor_id, status, is_locked, created_at, updated_at
  ) VALUES (
    v_student_ptf001,
    (v_today - INTERVAL '6 days')::date,
    'MORNING',
    v_mentor_1,
    'PRESENT',
    true,
    ((v_today - INTERVAL '6 days')::date + TIME '06:25:00') AT TIME ZONE 'Asia/Kolkata',
    ((v_today - INTERVAL '6 days')::date + TIME '06:25:00') AT TIME ZONE 'Asia/Kolkata'
  );

END $$;
