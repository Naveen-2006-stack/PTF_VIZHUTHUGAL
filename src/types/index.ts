// PTF Vizhuthugal Student Portal - Domain & Database Types

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'SEMI_ADMIN'
  | 'PTF_SECRETARY'
  | 'STAFF_MENTOR'
  | 'STUDENT';

export type PermissionCode = 
  | 'VIEW'
  | 'CREATE'
  | 'EDIT'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'EXPORT'
  | 'MARK_ATTENDANCE';

export interface Campus {
  id: string;
  code: 'SRM_KTR' | 'SRM_BAB' | 'SRM_AP';
  name: string;
  location: string;
  capacity: number;
  logo_path: string;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  campus_id: string;
  code: string;
  name: string;
  created_at: string;
  campus?: Campus;
}

export interface Course {
  id: string;
  department_id: string;
  code: string;
  name: string;
  degree: string;
  duration_years: number;
  created_at: string;
  department?: Department;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  profile_id: string | null;
  ptf_id: string;
  register_number: string;
  campus_id: string;
  department_id: string;
  course_id: string;
  current_year: number;
  academic_year: string;
  parent_name?: string;
  parent_phone?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ALUMNI';
  is_special_class_eligible?: boolean;
  created_at: string;
  updated_at: string;
  campus?: Campus;
  department?: Department;
  course?: Course;
  profile?: Profile;
  assigned_staff?: StaffProfile;
}

export interface StaffProfile {
  id: string;
  profile_id: string;
  staff_code: string;
  campus_id: string;
  department_id: string;
  designation: string;
  is_active: boolean;
  created_at: string;
  campus?: Campus;
  department?: Department;
  profile?: Profile;
}

export interface StaffMappingRequest {
  id: string;
  student_id: string;
  staff_id: string;
  campus_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  student_remarks?: string;
  decision_remarks?: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  student?: Student;
  staff?: StaffProfile;
}

export interface StaffStudentAssignment {
  id: string;
  student_id: string;
  staff_id: string;
  assigned_by?: string;
  mapping_request_id?: string;
  is_active: boolean;
  active_from: string;
  active_until?: string;
  remarks?: string;
  student?: Student;
  staff?: StaffProfile;
}

export interface Semester {
  id: string;
  semester_number: number;
  academic_year: string;
  is_current: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  course_id: string;
  semester_id: string;
  subject_code: string;
  subject_name: string;
  max_ct_marks: number;
  created_at: string;
}

export type CTMarkStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTION_REQUIRED' | 'VERIFIED' | 'REJECTED' | 'LOCKED';

export interface SubjectMark {
  id: string;
  student_id: string;
  subject_id: string;
  semester_id: string;
  ct_test_number: number;
  mark_obtained: number;
  max_mark: number;
  proof_url?: string;
  status: CTMarkStatus;
  remarks?: string;
  created_by: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  subject?: Subject;
  student?: Student;
}

export interface AcademicRecord {
  id: string;
  student_id: string;
  semester_id: string;
  sgpa?: number;
  cgpa?: number;
  proof_document_url?: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  remarks?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  semester?: Semester;
  student?: Student;
}

export type AttendanceSessionType = 'MORNING' | 'EVENING';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string;
  session_type: AttendanceSessionType;
  session_id?: string;
  mentor_id: string;
  status: AttendanceStatus;
  remarks?: string;
  is_locked: boolean;
  last_edited_by?: string;
  edit_reason?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  mentor?: Profile;
}

export interface AttendanceAuditHistory {
  id: string;
  attendance_id: string;
  student_id: string;
  previous_status: AttendanceStatus;
  new_status: AttendanceStatus;
  original_marked_by: string;
  edited_by: string;
  original_created_at: string;
  edited_at: string;
  reason: string;
  is_super_admin_override: boolean;
  student?: Student;
  editor?: Profile;
  original_marker?: Profile;
}

export type RequestStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  student_id: string;
  from_date: string;
  from_time: string;
  to_date: string;
  to_time: string;
  reason: string;
  supporting_doc_url?: string;
  status: RequestStatus;
  admin_remarks?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  approver?: Profile;
  approval_doc?: ApprovalDocument;
}

export interface PermissionRequest {
  id: string;
  student_id: string;
  permission_date: string;
  from_time: string;
  to_time: string;
  reason: string;
  supporting_doc_url?: string;
  status: RequestStatus;
  admin_remarks?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  approver?: Profile;
  approval_doc?: ApprovalDocument;
}

export interface ApprovalDocument {
  id: string;
  request_type: 'LEAVE' | 'PERMISSION';
  request_id: string;
  student_id: string;
  slip_number: string;
  pdf_storage_path?: string;
  issued_at: string;
  approver_name: string;
  approver_designation: string;
  organization: string;
  student?: Student;
}

export interface ScholarshipApplication {
  id: string;
  student_id: string;
  academic_year: string;
  status: RequestStatus;
  admin_remarks?: string;
  deadline?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
}

export interface SummerActivity {
  id: string;
  title: string;
  description: string;
  activity_date: string;
  location: string;
  report_url?: string;
  photos_urls: string[];
  status: RequestStatus;
  submitted_by: string;
  admin_remarks?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: 'ACADEMIC' | 'CT_MARKS' | 'ATTENDANCE' | 'LEAVE' | 'PERMISSION' | 'RENEWAL' | 'ACTIVITY' | 'MAPPING' | 'ANNOUNCEMENT';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  read: boolean;
  link_url?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  actor?: Profile;
}
