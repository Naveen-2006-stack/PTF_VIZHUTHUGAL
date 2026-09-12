'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Campus, Department, StaffProfile, Student } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  UserCheck2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Users,
  ShieldCheck,
  History,
  ArrowRight,
} from 'lucide-react';

interface AssignmentRow {
  id: string;
  student: Student;
  staff: StaffProfile & { profiles?: { full_name: string } };
  is_active: boolean;
  active_from: string;
  active_until?: string;
  remarks?: string;
}

export default function StaffMappingPage() {
  const { role, profile, student } = useAuth();
  const router = useRouter();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<AssignmentRow[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentRow[]>([]);
  const [studentActiveAssignment, setStudentActiveAssignment] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reassign Modal (Super Admin)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedStudentForReassign, setSelectedStudentForReassign] = useState<Student | null>(null);
  const [selectedNewStaffId, setSelectedNewStaffId] = useState('');
  const [reassignRemarks, setReassignRemarks] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampusCode, setSelectedCampusCode] = useState('ALL');

  const supabase = createClient();
  const isStudent = role === 'STUDENT';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isStaffMentor = role === 'STAFF_MENTOR';

  useEffect(() => {
    if (isStaffMentor) {
      router.replace('/attendance/abdul-kalam');
    }
  }, [isStaffMentor, router]);

  useEffect(() => {
    if (!isStaffMentor) {
      loadData();
    }
  }, [student, role, isStaffMentor]);

  async function loadData() {
    setIsLoading(true);
    try {
      // 1. Load campuses
      const { data: cData } = await supabase.from('campuses').select('*');
      if (cData) setCampuses(cData);

      // 2. Load active staff profiles
      const { data: sData } = await supabase
        .from('staff_profiles')
        .select('*, profiles(full_name), campus:campuses(*), department:departments(*)')
        .eq('is_active', true);
      if (sData) setAvailableStaff(sData);

      // 3. If Student: load their active assignment and history
      if (isStudent && student) {
        const { data: myAssign } = await supabase
          .from('staff_student_assignments')
          .select('*, staff:staff_profiles(*, profiles(full_name), campus:campuses(*), department:departments(*))')
          .eq('student_id', student.id)
          .order('active_from', { ascending: false });

        if (myAssign) {
          const current = myAssign.find((a: any) => a.is_active);
          setStudentActiveAssignment(current || null);
          setAssignmentHistory(myAssign.filter((a: any) => !a.is_active));
        }
      }

      // 4. If Super Admin: load all assignments
      if (isSuperAdmin) {
        const { data: allAssign } = await supabase
          .from('staff_student_assignments')
          .select('*, student:students(*, profiles(full_name), campus:campuses(*), department:departments(*)), staff:staff_profiles(*, profiles(full_name), campus:campuses(*))')
          .order('active_from', { ascending: false });

        if (allAssign) {
          const active = allAssign.filter((a: any) => a.is_active);
          const history = allAssign.filter((a: any) => !a.is_active);
          setActiveAssignments(active as any);
          setAssignmentHistory(history as any);
        }
      }
    } catch (err) {
      console.error('Error loading staff mapping data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Reassign Submit (Super Admin)
  const handleConfirmReassign = async () => {
    if (!selectedStudentForReassign || !selectedNewStaffId) return;
    setIsReassigning(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/staff/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentForReassign.id,
          staffId: selectedNewStaffId,
          remarks: reassignRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reassignment failed');

      setFeedback({
        type: 'success',
        message: `Student ${selectedStudentForReassign.ptf_id} successfully reassigned! Historical record preserved.`,
      });
      setIsReassignModalOpen(false);
      setSelectedStudentForReassign(null);
      setSelectedNewStaffId('');
      setReassignRemarks('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsReassigning(false);
    }
  };

  const filteredActive = activeAssignments.filter((row) => {
    if (selectedCampusCode !== 'ALL' && row.student?.campus?.code !== selectedCampusCode) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.student?.ptf_id.toLowerCase().includes(q) ||
      row.student?.register_number.toLowerCase().includes(q) ||
      (row.student?.profile?.full_name || '').toLowerCase().includes(q) ||
      row.staff?.staff_code.toLowerCase().includes(q) ||
      (row.staff?.profiles?.full_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            INSTITUTIONAL MENTORSHIP ARCHITECTURE
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Staff &amp; Mentor Assignment
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Section 7: Super Admin controls staff mapping. Self-selection removed. Exactly one active assignment per student with historical retention.
          </p>
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

      {/* STUDENT VIEW: READ-ONLY ASSIGNMENT DETAILS */}
      {isStudent && (
        <div className="space-y-6">
          <div className="institutional-card p-6 gold-accent-top">
            <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider mb-4 border-b border-[#E2E8F0] pb-3">
              My Assigned Staff / Mentor
            </h3>

            {studentActiveAssignment ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold text-[#64748B] uppercase">Faculty Name</span>
                  <p className="text-base font-extrabold text-[#0A192F] mt-0.5">
                    {studentActiveAssignment.staff?.profiles?.full_name || 'Faculty Mentor'}
                  </p>
                  <p className="text-xs text-[#D4AF37] font-semibold mt-0.5">
                    Code: {studentActiveAssignment.staff?.staff_code}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#64748B] uppercase">Campus &amp; Department</span>
                  <p className="text-sm font-bold text-[#334155] mt-0.5">
                    {studentActiveAssignment.staff?.campus?.name || 'Campus'}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {studentActiveAssignment.staff?.department?.name || 'Department'}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#64748B] uppercase">Assignment Status</span>
                  <div className="mt-1">
                    <Badge variant="success" dot>Active Assignment</Badge>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Assigned: {new Date(studentActiveAssignment.active_from).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No Active Staff Mentor Assigned"
                description="Your staff mentor mapping is provisioned during institutional onboarding by the Super Admin."
              />
            )}
          </div>

          {/* Historical Assignments */}
          {assignmentHistory.length > 0 && (
            <div className="institutional-card p-6">
              <h4 className="text-xs font-bold text-[#0A192F] uppercase tracking-wider mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-[#64748B]" /> Assignment History
              </h4>
              <div className="divide-y divide-[#E2E8F0]">
                {assignmentHistory.map((h) => (
                  <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#0A192F]">
                        {h.staff?.profiles?.full_name} ({h.staff?.staff_code})
                      </p>
                      <p className="text-[10px] text-[#64748B]">
                        From: {new Date(h.active_from).toLocaleDateString('en-IN')}
                        {h.active_until && ` to ${new Date(h.active_until).toLocaleDateString('en-IN')}`}
                      </p>
                    </div>
                    <Badge variant="neutral">Archived</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUPER ADMIN VIEW: FULL MAPPING TABLE & REASSIGNMENT */}
      {isSuperAdmin && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="institutional-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Filter Campus</label>
              <select
                value={selectedCampusCode}
                onChange={(e) => setSelectedCampusCode(e.target.value)}
                className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
              >
                <option value="ALL">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Search</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student, staff, PTF ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
                />
              </div>
            </div>
          </div>

          {/* Active Assignments Table */}
          <div className="institutional-card p-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
                Active Scholar → Staff Assignments ({filteredActive.length})
              </h3>
              <span className="text-xs text-[#64748B] font-semibold">
                Single Active Constraint Protected
              </span>
            </div>

            {filteredActive.length === 0 ? (
              <EmptyState
                title="No Active Assignments"
                description="Import verified student records with staff mapping to establish mentoring assignments."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Campus &amp; Dept</th>
                      <th className="py-3 px-4">Assigned Staff</th>
                      <th className="py-3 px-4">Active Since</th>
                      <th className="py-3 px-4 text-right">Reassign</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredActive.map((row) => (
                      <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#0A192F]">
                          {row.student?.profile?.full_name}
                          <span className="block text-[10px] text-[#D4AF37]">
                            {row.student?.ptf_id} • {row.student?.register_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#475569]">
                          {row.student?.campus?.code} • {row.student?.department?.code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#0A192F]">
                          {row.staff?.profiles?.full_name}
                          <span className="block text-[10px] text-[#64748B]">
                            {row.staff?.staff_code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {new Date(row.active_from).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStudentForReassign(row.student);
                              setSelectedNewStaffId('');
                              setReassignRemarks('');
                              setIsReassignModalOpen(true);
                            }}
                          >
                            Reassign
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title={`Reassign Staff for ${selectedStudentForReassign?.ptf_id || 'Student'}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-[#64748B]">
            Reassigning this student will automatically archive their current staff assignment and establish a new active relationship while retaining complete historical audit logs.
          </p>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] mb-1">Select New Staff Mentor</label>
            <select
              value={selectedNewStaffId}
              onChange={(e) => setSelectedNewStaffId(e.target.value)}
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
            >
              <option value="">-- Choose Active Faculty Member --</option>
              {availableStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.staff_code} - {st.profiles?.full_name} ({st.campus?.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] mb-1">Reason / Remarks for Reassignment</label>
            <textarea
              rows={2}
              value={reassignRemarks}
              onChange={(e) => setReassignRemarks(e.target.value)}
              placeholder="e.g. Administrative department realignment"
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button variant="outline" size="sm" onClick={() => setIsReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleConfirmReassign}
              disabled={!selectedNewStaffId || isReassigning}
            >
              {isReassigning ? 'Reassigning...' : 'Confirm Reassignment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
