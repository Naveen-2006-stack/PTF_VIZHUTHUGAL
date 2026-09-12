'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { AttendanceRecord, AttendanceSessionType, AttendanceStatus, Student } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InstitutionalLogos } from '@/components/branding/InstitutionalLogos';
import {
  CalendarCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Search,
  AlertCircle,
  ShieldCheck,
  UserX,
} from 'lucide-react';

export default function AbdulKalamAttendancePage() {
  const { role, profile, student, isSpecialClassEligible } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSession = (searchParams.get('session') as AttendanceSessionType) || 'MORNING';

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] = useState<AttendanceSessionType>(initialSession);
  const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
  const [existingDailyAttendance, setExistingDailyAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [markingStudentId, setMarkingStudentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Student specific history
  const [studentHistory, setStudentHistory] = useState<AttendanceRecord[]>([]);

  const supabase = createClient();
  const isStudent = role === 'STUDENT';
  const isStaffMentor = role === 'STAFF_MENTOR';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'SEMI_ADMIN';
  const isSecretary = role === 'PTF_SECRETARY';
  const canMark = isStaffMentor || isAdmin;

  // Student route guard: if student is not eligible, redirect or block
  useEffect(() => {
    if (isStudent && !isSpecialClassEligible) {
      // Handled by view below
    }
  }, [isStudent, isSpecialClassEligible]);

  useEffect(() => {
    loadAttendanceData();
  }, [attendanceDate, sessionType, student, isStudent, isSpecialClassEligible, canMark, isSecretary]);

  async function loadAttendanceData() {
    setIsLoading(true);
    setFeedback(null);
    try {
      if (isStudent && student && isSpecialClassEligible) {
        // Load student's own attendance history
        const { data: myHistory } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', student.id)
          .order('attendance_date', { ascending: false });

        if (myHistory) setStudentHistory(myHistory as any);
      } else if (canMark || isSecretary) {
        // 1. Fetch eligible students strictly from special_class_eligibility
        const { data: eligibilityData } = await supabase
          .from('special_class_eligibility')
          .select('student_id')
          .eq('is_eligible', true);

        const eligibleStudentIds = new Set((eligibilityData || []).map((e) => e.student_id).filter(Boolean));

        const { data: allStudents } = await supabase
          .from('students')
          .select('*, profile:profiles(*), department:departments(*), campus:campuses(*)')
          .eq('status', 'ACTIVE')
          .order('ptf_id', { ascending: true });

        if (allStudents) {
          // Strictly show only eligible students
          const filtered = (allStudents as Student[]).filter((s) => eligibleStudentIds.has(s.id));
          setEligibleStudents(filtered);
        }

        // 2. Fetch all attendance records for THIS DATE across ALL sessions to enforce the ONE-SESSION-PER-DAY rule
        const { data: dailyRecords } = await supabase
          .from('attendance')
          .select('*')
          .eq('attendance_date', attendanceDate);

        if (dailyRecords) {
          const map: Record<string, AttendanceRecord> = {};
          dailyRecords.forEach((r: any) => {
            map[r.student_id] = r;
          });
          setExistingDailyAttendance(map);
        }
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Mark single student attendance
  const handleMarkAttendance = async (studentId: string, status: AttendanceStatus) => {
    setMarkingStudentId(studentId);
    setFeedback(null);

    try {
      const response = await fetch('/api/attendance/abdul-kalam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          attendanceDate,
          sessionType,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to record attendance.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: `Attendance marked as ${status} for ${attendanceDate}.`,
      });
      loadAttendanceData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error recording attendance.' });
    } finally {
      setMarkingStudentId(null);
    }
  };

  const filteredList = eligibleStudents.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.ptf_id.toLowerCase().includes(q) ||
      s.register_number.toLowerCase().includes(q) ||
      s.profile?.full_name.toLowerCase().includes(q)
    );
  });

  // If student is NOT eligible for Abdul Kalam Class
  if (isStudent && !isSpecialClassEligible) {
    return (
      <div className="institutional-card p-8 text-center max-w-lg mx-auto">
        <UserX className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#0A192F]">Not Enrolled in Abdul Kalam Class</h3>
        <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
          Dr. APJ Abdul Kalam Special Classes are restricted to eligible foundation cohorts.
          Your current profile is not enrolled in this special class. If you believe this is an error, please contact your Super Admin.
        </p>
        <Button
          variant="primary"
          size="md"
          className="mt-6"
          onClick={() => router.replace('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            DISCIPLINE &amp; SOCIAL SERVICE
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Dr. APJ Abdul Kalam Special Class Attendance
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Mandatory daily sessions. Rule: <strong>ONE ATTENDANCE SESSION PER STUDENT PER DATE</strong> (Morning or Evening).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <InstitutionalLogos height={22} className="hidden sm:flex" />

          <div className="flex items-center gap-2 bg-[#0A192F] text-white px-3 py-1.5 rounded-full text-xs font-bold">
            <Clock className="w-4 h-4 text-[#D4AF37]" />
            <span>Morning 5:30-7:00 AM | Evening 5:30-7:00 PM</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
            feedback.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#10B981]" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-[#E11D48]" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* STUDENT VIEW: MY ATTENDANCE LOG */}
      {isStudent && isSpecialClassEligible && (
        <div className="institutional-card p-6">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-4">
            <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
              My Abdul Kalam Attendance Log
            </h3>
            <span className="text-xs bg-[#0A192F] text-[#D4AF37] px-3 py-1 rounded-full font-bold">
              Total Recorded: {studentHistory.length}
            </span>
          </div>

          {studentHistory.length === 0 ? (
            <EmptyState
              title="No Attendance Recorded Yet"
              description="Your mentor records attendance during the Morning (5:30 - 7:00 AM) or Evening (5:30 - 7:00 PM) session."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Session Type</th>
                    <th className="py-3 px-4">Timing Window</th>
                    <th className="py-3 px-4">Attendance Status</th>
                    <th className="py-3 px-4">Locked Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {studentHistory.map((att) => (
                    <tr key={att.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0A192F]">
                        {new Date(att.attendance_date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0A192F]">
                        {att.session_type}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {att.session_type === 'MORNING' ? '5:30 AM – 7:00 AM' : '5:30 PM – 7:00 PM'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            att.status === 'PRESENT'
                              ? 'success'
                              : att.status === 'LATE'
                              ? 'warning'
                              : att.status === 'EXCUSED'
                              ? 'neutral'
                              : 'error'
                          }
                          dot
                        >
                          {att.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#10B981] font-semibold">
                          <Lock className="w-3 h-3" /> Locked &amp; Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STAFF MENTOR / ADMIN / SECRETARY VIEW: ATTENDANCE CONSOLE */}
      {(canMark || isSecretary) && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="institutional-card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">
                Attendance Date
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#0A192F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">
                Class Session
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSessionType('MORNING')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                    sessionType === 'MORNING'
                      ? 'bg-[#0A192F] text-white border-[#0A192F] shadow-sm'
                      : 'bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1]'
                  }`}
                >
                  Morning (5:30 AM)
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType('EVENING')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                    sessionType === 'EVENING'
                      ? 'bg-[#0A192F] text-white border-[#0A192F] shadow-sm'
                      : 'bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1]'
                  }`}
                >
                  Evening (5:30 PM)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">
                Search Scholar
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name or PTF ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
                />
              </div>
            </div>
          </div>

          {/* Strict Rule Notice Alert */}
          <div className="p-4 rounded-xl bg-[#FEF9C3] border border-[#FDE047] text-[#854D0E] text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#D4AF37]" />
            <div>
              <p className="font-bold">Strict Daily Constraint (One Session Per Day):</p>
              <p className="mt-0.5">
                A student can attend only <strong>ONE</strong> session per day. If a student is marked in the <strong>{sessionType === 'MORNING' ? 'Evening' : 'Morning'}</strong> session, marking in the <strong>{sessionType}</strong> session is strictly blocked by database integrity.
              </p>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="institutional-card p-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-4">
              <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
                Eligible Scholars Roster ({filteredList.length})
              </h3>
              <span className="text-xs text-[#64748B] font-semibold">
                Marking for: <strong className="text-[#0A192F]">{sessionType} Session</strong> on {attendanceDate}
              </span>
            </div>

            {filteredList.length === 0 ? (
              <EmptyState
                title="No Eligible Scholars Found"
                description="Scholars must be marked as eligible for Abdul Kalam Special Class by Super Admin before they appear on this attendance roster."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                      <th className="py-3 px-4">Scholar</th>
                      <th className="py-3 px-4">Campus &amp; Dept</th>
                      <th className="py-3 px-4">Today&apos;s Status</th>
                      <th className="py-3 px-4 text-right">Record Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredList.map((st) => {
                      const existing = existingDailyAttendance[st.id];
                      const isSameSession = existing && existing.session_type === sessionType;
                      const isOtherSession = existing && existing.session_type !== sessionType;

                      return (
                        <tr key={st.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#0A192F]">
                            {st.profile?.full_name || 'Scholar'}
                            <span className="block text-[10px] text-[#D4AF37] font-semibold">
                              {st.ptf_id} • Reg: {st.register_number}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#334155]">
                            {st.campus?.code} • {st.department?.code}
                          </td>
                          <td className="py-3 px-4">
                            {existing ? (
                              <div>
                                <Badge
                                  variant={
                                    existing.status === 'PRESENT'
                                      ? 'success'
                                      : existing.status === 'LATE'
                                      ? 'warning'
                                      : existing.status === 'EXCUSED'
                                      ? 'neutral'
                                      : 'error'
                                  }
                                  dot
                                >
                                  {existing.session_type}: {existing.status}
                                </Badge>
                                {isOtherSession && (
                                  <span className="block text-[10px] text-red-600 font-bold mt-0.5">
                                    🔒 Locked in {existing.session_type}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#94A3B8] italic">Unrecorded</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isSecretary ? (
                              <span className="text-[11px] text-[#64748B] italic">Read-Only Monitoring</span>
                            ) : isOtherSession ? (
                              <span className="text-[11px] text-[#64748B] font-semibold bg-[#F1F5F9] px-2 py-1 rounded">
                                Attended in {existing.session_type}
                              </span>
                            ) : isSameSession ? (
                              <span className="text-[11px] text-[#10B981] font-bold bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Marked ({existing.status})
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={markingStudentId === st.id}
                                  onClick={() => handleMarkAttendance(st.id, 'PRESENT')}
                                >
                                  Present
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={markingStudentId === st.id}
                                  onClick={() => handleMarkAttendance(st.id, 'ABSENT')}
                                >
                                  Absent
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={markingStudentId === st.id}
                                  onClick={() => handleMarkAttendance(st.id, 'LATE')}
                                >
                                  Late
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={markingStudentId === st.id}
                                  onClick={() => handleMarkAttendance(st.id, 'EXCUSED')}
                                >
                                  Excused
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
