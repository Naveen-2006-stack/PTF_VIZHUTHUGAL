'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { SubjectMark, Semester, Subject, Student, CTMarkStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  Edit3,
  ExternalLink,
  Upload,
  Lock,
  FileCheck2,
  XCircle,
  Download,
} from 'lucide-react';
import { logAuditEvent } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { ExportMarkSheetModal } from '@/components/academics/ExportMarkSheetModal';

export default function CtMarksPage() {
  const { role, profile, student } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get('studentId');

  const [marks, setMarks] = useState<SubjectMark[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId || '');
  const [isLoading, setIsLoading] = useState(true);

  // Student Mark Entry / Edit modal
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null);
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTestNumber, setFormTestNumber] = useState(1);
  const [formMarkObtained, setFormMarkObtained] = useState('');
  const [formMaxMark, setFormMaxMark] = useState('50');
  const [formRemarks, setFormRemarks] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [existingProofUrl, setExistingProofUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin Verification & Correction modal
  const [adminActionModalOpen, setAdminActionModalOpen] = useState(false);
  const [selectedMarkForAction, setSelectedMarkForAction] = useState<SubjectMark | null>(null);
  const [actionType, setActionType] = useState<'VERIFY' | 'CORRECTION' | 'REJECT'>('VERIFY');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const isStudent = role === 'STUDENT';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'SEMI_ADMIN';
  const isSecretary = role === 'PTF_SECRETARY';
  const isStaffMentor = role === 'STAFF_MENTOR';

  // Strict check: STAFF_MENTOR has ZERO access to CT Marks
  useEffect(() => {
    if (isStaffMentor) {
      router.replace('/attendance/abdul-kalam');
    }
  }, [isStaffMentor, router]);

  useEffect(() => {
    if (!isStaffMentor) {
      loadReferenceData();
    }
  }, [student, role, isStaffMentor]);

  async function loadReferenceData() {
    setIsLoading(true);
    try {
      // 1. Load semesters
      const { data: semData } = await supabase
        .from('semesters')
        .select('*')
        .order('semester_number', { ascending: true });
      if (semData && semData.length > 0) {
        setSemesters(semData);
        setSelectedSemesterId(semData.find((s) => s.is_current)?.id || semData[0].id);
      }

      // 2. If Admin or Secretary, load students list
      if (isAdmin || isSecretary) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('*, profile:profiles(*)')
          .order('ptf_id', { ascending: true });
        if (studentsData) {
          setAllStudents(studentsData as any);
          if (!selectedStudentId && studentsData.length > 0) {
            setSelectedStudentId(studentsData[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading reference data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Load subjects when semester changes
  useEffect(() => {
    async function loadSubjects() {
      if (!selectedSemesterId) return;
      const { data: subData } = await supabase
        .from('subjects')
        .select('*')
        .eq('semester_id', selectedSemesterId)
        .order('subject_name', { ascending: true });
      if (subData) {
        setSubjects(subData);
        if (subData.length > 0 && !formSubjectId) {
          setFormSubjectId(subData[0].id);
        }
      }
    }
    loadSubjects();
  }, [selectedSemesterId]);

  // Load marks
  useEffect(() => {
    if (!isStaffMentor) {
      loadMarks();
    }
  }, [selectedSemesterId, selectedStudentId, student, isStudent, isStaffMentor]);

  async function loadMarks() {
    try {
      let query = supabase
        .from('subject_marks')
        .select('*, subject:subjects(*), student:students(*, profile:profiles(*))')
        .order('ct_test_number', { ascending: true });

      if (selectedSemesterId) {
        query = query.eq('semester_id', selectedSemesterId);
      }

      if (isStudent && student) {
        query = query.eq('student_id', student.id);
      } else if (selectedStudentId) {
        query = query.eq('student_id', selectedStudentId);
      }

      const { data } = await query;
      if (data) setMarks(data as any);
    } catch (err) {
      console.error('Error loading marks:', err);
    }
  }

  // Helper to open proof in private storage via signed URL
  const handleViewProof = async (proofUrl: string) => {
    try {
      // Remove any leading bucket prefix if present
      const cleanPath = proofUrl.replace(/^academic-proofs\//, '');
      const { data, error } = await supabase.storage
        .from('academic-proofs')
        .createSignedUrl(cleanPath, 120); // 2-minute signed URL
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      alert(`Unable to open private document: ${err.message}`);
    }
  };

  // Open entry modal for new mark or edit
  const openNewEntryModal = () => {
    setEditingMarkId(null);
    setFormSubjectId(subjects.length > 0 ? subjects[0].id : '');
    setFormTestNumber(1);
    setFormMarkObtained('');
    setFormMaxMark('50');
    setFormRemarks('');
    setProofFile(null);
    setExistingProofUrl(null);
    setIsEntryModalOpen(true);
  };

  const openEditModal = (m: SubjectMark) => {
    // Only DRAFT and CORRECTION_REQUIRED can be edited
    if (m.status !== 'DRAFT' && m.status !== 'CORRECTION_REQUIRED' && m.status !== 'SUBMITTED') {
      alert('Verified and locked marks cannot be modified.');
      return;
    }
    setEditingMarkId(m.id);
    setFormSubjectId(m.subject_id);
    setFormTestNumber(m.ct_test_number);
    setFormMarkObtained(m.mark_obtained.toString());
    setFormMaxMark(m.max_mark.toString());
    setFormRemarks(m.remarks || '');
    setProofFile(null);
    setExistingProofUrl(m.proof_url || null);
    setIsEntryModalOpen(true);
  };

  // Student submits mark (DRAFT or SUBMITTED)
  const handleSubmitMark = async (submitStatus: 'DRAFT' | 'SUBMITTED') => {
    setFeedback(null);
    const markVal = parseFloat(formMarkObtained);
    const maxVal = parseFloat(formMaxMark);

    if (isNaN(markVal) || markVal < 0 || markVal > maxVal) {
      setFeedback({ type: 'error', message: `Mark obtained must be between 0 and maximum mark (${maxVal}).` });
      return;
    }

    if (!formSubjectId) {
      setFeedback({ type: 'error', message: 'Please select a subject.' });
      return;
    }

    const currentStudentId = student?.id;
    if (!currentStudentId) {
      setFeedback({ type: 'error', message: 'Student identity could not be verified.' });
      return;
    }

    setIsSubmitting(true);

    try {
      let finalProofPath = existingProofUrl;

      // Upload file to private academic-proofs bucket if chosen
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const safeFileName = `${currentStudentId}/${Date.now()}_CT${formTestNumber}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('academic-proofs')
          .upload(safeFileName, proofFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Failed to upload academic proof: ${uploadError.message}`);
        }
        finalProofPath = safeFileName;
      }

      if (editingMarkId) {
        // Update existing draft / correction required mark
        const { error: updateError } = await supabase
          .from('subject_marks')
          .update({
            subject_id: formSubjectId,
            ct_test_number: formTestNumber,
            mark_obtained: markVal,
            max_mark: maxVal,
            proof_url: finalProofPath,
            status: submitStatus,
            remarks: formRemarks || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMarkId)
          .eq('student_id', currentStudentId);

        if (updateError) throw updateError;

        await logAuditEvent({
          actorId: profile?.id,
          action: 'UPDATE_CT_MARK',
          entity: 'subject_marks',
          entityId: editingMarkId,
          newState: { mark: markVal, maxMark: maxVal, status: submitStatus },
        });

        setFeedback({
          type: 'success',
          message: submitStatus === 'SUBMITTED' ? 'CT mark submitted for admin verification.' : 'CT mark saved as draft.',
        });
      } else {
        // Insert new student mark
        const { data: inserted, error: insertError } = await supabase
          .from('subject_marks')
          .insert({
            student_id: currentStudentId,
            subject_id: formSubjectId,
            semester_id: selectedSemesterId,
            ct_test_number: formTestNumber,
            mark_obtained: markVal,
            max_mark: maxVal,
            proof_url: finalProofPath,
            status: submitStatus,
            remarks: formRemarks || null,
            created_by: profile?.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        await logAuditEvent({
          actorId: profile?.id,
          action: 'CREATE_CT_MARK',
          entity: 'subject_marks',
          entityId: inserted.id,
          newState: { mark: markVal, maxMark: maxVal, status: submitStatus },
        });

        setFeedback({
          type: 'success',
          message: submitStatus === 'SUBMITTED' ? 'CT mark submitted successfully for verification!' : 'CT mark saved as draft.',
        });
      }

      setIsEntryModalOpen(false);
      loadMarks();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit mark.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin processes verification / correction / rejection
  const handleAdminDecision = async () => {
    if (!selectedMarkForAction) return;

    try {
      let nextStatus: CTMarkStatus = 'VERIFIED';
      if (actionType === 'CORRECTION') nextStatus = 'CORRECTION_REQUIRED';
      if (actionType === 'REJECT') nextStatus = 'REJECTED';

      const updates: any = {
        status: nextStatus,
        remarks: adminRemarks ? `Admin remarks: ${adminRemarks}` : selectedMarkForAction.remarks,
        verified_by: profile?.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('subject_marks')
        .update(updates)
        .eq('id', selectedMarkForAction.id);

      if (error) throw error;

      await logAuditEvent({
        actorId: profile?.id,
        action: `ADMIN_ACTION_CT_MARK_${nextStatus}`,
        entity: 'subject_marks',
        entityId: selectedMarkForAction.id,
        newState: { status: nextStatus, remarks: adminRemarks },
      });

      // Dispatch in-portal notification to student
      const studentProfileId = selectedMarkForAction.student?.profile_id;
      if (studentProfileId) {
        const statusLabel =
          nextStatus === 'VERIFIED'
            ? 'Verified'
            : nextStatus === 'CORRECTION_REQUIRED'
            ? 'Correction Required'
            : 'Rejected';

        await sendNotification({
          userId: studentProfileId,
          title: `Cycle Test Mark ${statusLabel}`,
          message: `Your Cycle Test mark submission has been marked as ${statusLabel.toLowerCase()}.${
            adminRemarks ? ` Remarks: ${adminRemarks}` : ''
          }`,
          category: 'CT_MARKS',
          priority: nextStatus === 'CORRECTION_REQUIRED' ? 'HIGH' : 'NORMAL',
          linkUrl: '/academics/ct-marks',
          referenceId: `ct_mark_${selectedMarkForAction.id}_${nextStatus}`,
        });
      }

      setAdminActionModalOpen(false);
      setSelectedMarkForAction(null);
      setAdminRemarks('');
      setFeedback({ type: 'success', message: `Mark updated to ${nextStatus}.` });
      loadMarks();
    } catch (err: any) {
      alert(`Error updating mark: ${err.message}`);
    }
  };

  if (isStaffMentor) {
    return (
      <div className="institutional-card p-8 text-center max-w-lg mx-auto">
        <ShieldCheck className="w-12 h-12 text-[#E11D48] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#0A192F]">Staff Access Restricted</h3>
        <p className="text-xs text-[#64748B] mt-2">
          As a Staff Mentor, your portal responsibility is dedicated exclusively to Abdul Kalam Attendance.
          Academic records and CT marks are managed directly by scholars and institutional administrators.
        </p>
        <Button
          variant="primary"
          size="md"
          className="mt-6"
          onClick={() => router.replace('/attendance/abdul-kalam')}
        >
          Go to Abdul Kalam Attendance
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
            ACADEMIC INTEGRITY &amp; PERFORMANCE
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Cycle Test (CT) Marks Portal
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            {isStudent
              ? 'Enter your college CT marks and upload supporting marksheet proof for institutional verification.'
              : isSecretary
              ? 'Monitoring view of all scholar academic performances and CT marks.'
              : 'Review, verify, and audit student-submitted CT marks and documentation.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(isAdmin || isSecretary) && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Download className="w-4 h-4 text-[#D4AF37]" />}
              onClick={() => setIsExportModalOpen(true)}
            >
              Export Mark Sheet
            </Button>
          )}

          {/* Student Entry Action */}
          {isStudent && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4 text-[#D4AF37]" />}
              onClick={openNewEntryModal}
            >
              Enter CT Mark
            </Button>
          )}
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

      {/* Filter / Selector Bar */}
      <div className="institutional-card p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-1/3">
          <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">
            Semester
          </label>
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F] focus:ring-2 focus:ring-[#D4AF37]"
          >
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                Semester {sem.semester_number} ({sem.academic_year}){sem.is_current ? ' - Current' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Admin Scholar Selector */}
        {(isAdmin || isSecretary) && (
          <div className="w-full sm:w-1/2">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">
              Select Scholar
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F] focus:ring-2 focus:ring-[#D4AF37]"
            >
              <option value="">-- Choose Student --</option>
              {allStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.ptf_id} - {st.profile?.full_name} ({st.register_number})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Marks Table / List */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between mb-4 border-b border-[#E2E8F0] pb-3">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
            {isStudent ? 'My Entered CT Marks' : 'Submitted Student Marksheet'}
          </h3>
          <span className="text-xs text-[#64748B] font-semibold">
            {marks.length} Records Found
          </span>
        </div>

        {marks.length === 0 ? (
          <EmptyState
            title="No CT Marks Recorded Yet"
            description={
              isStudent
                ? 'You have not submitted any Cycle Test marks for this semester yet. Click "Enter CT Mark" above.'
                : 'No CT marks have been submitted by this scholar for the selected semester.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Test</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Proof Document</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {marks.map((m) => {
                  const pct = ((m.mark_obtained / m.max_mark) * 100).toFixed(1);
                  const isLocked = m.status === 'VERIFIED' || m.status === 'LOCKED';
                  const canEdit = isStudent && (m.status === 'DRAFT' || m.status === 'CORRECTION_REQUIRED' || m.status === 'SUBMITTED');

                  return (
                    <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0A192F]">
                        {m.subject?.subject_name || 'Subject'}
                        <span className="block text-[10px] text-[#64748B]">
                          {m.subject?.subject_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0A192F]">
                        CT-{m.ct_test_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0A192F]">
                        {m.mark_obtained} / {m.max_mark}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-[#D4AF37]">
                        {pct}%
                      </td>
                      <td className="py-3 px-4">
                        {m.proof_url ? (
                          <button
                            onClick={() => handleViewProof(m.proof_url!)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0A192F] hover:text-[#D4AF37] underline cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View Proof
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#94A3B8] italic">No proof attached</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            m.status === 'VERIFIED' || m.status === 'LOCKED'
                              ? 'success'
                              : m.status === 'REJECTED'
                              ? 'error'
                              : m.status === 'CORRECTION_REQUIRED'
                              ? 'warning'
                              : 'neutral'
                          }
                          dot
                        >
                          {m.status.replace('_', ' ')}
                        </Badge>
                        {m.remarks && (
                          <p className="text-[10px] text-[#64748B] mt-0.5 line-clamp-1 italic" title={m.remarks}>
                            {m.remarks}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isStudent && canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                            onClick={() => openEditModal(m)}
                          >
                            Edit / Resubmit
                          </Button>
                        )}
                        {isStudent && isLocked && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#10B981] font-bold">
                            <Lock className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="gold"
                              size="sm"
                              onClick={() => {
                                setSelectedMarkForAction(m);
                                setActionType('VERIFY');
                                setAdminActionModalOpen(true);
                              }}
                            >
                              Verify
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMarkForAction(m);
                                setActionType('CORRECTION');
                                setAdminActionModalOpen(true);
                              }}
                            >
                              Correction
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

      {/* Student Entry / Edit Modal */}
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title={editingMarkId ? 'Edit / Resubmit CT Mark' : 'Enter Cycle Test (CT) Mark'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0A192F] mb-1">Subject</label>
            <select
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(e.target.value)}
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.subject_code} - {sub.subject_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] mb-1">Test Number</label>
              <select
                value={formTestNumber}
                onChange={(e) => setFormTestNumber(parseInt(e.target.value, 10))}
                className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
              >
                <option value={1}>CT 1</option>
                <option value={2}>CT 2</option>
                <option value={3}>CT 3</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A192F] mb-1">Score Obtained</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={formMaxMark}
                value={formMarkObtained}
                onChange={(e) => setFormMarkObtained(e.target.value)}
                placeholder="e.g. 45"
                className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A192F] mb-1">Maximum Score</label>
              <input
                type="number"
                value={formMaxMark}
                onChange={(e) => setFormMaxMark(e.target.value)}
                className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
              />
            </div>
          </div>

          {/* Supporting Proof Upload */}
          <div>
            <label className="block text-xs font-bold text-[#0A192F] mb-1">
              Supporting Marksheet / Screenshot Proof
            </label>
            <div className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-3 text-center bg-[#F8FAFC]">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setProofFile(e.target.files[0]);
                  }
                }}
              />
              <p className="text-xs text-[#64748B]">
                {proofFile ? (
                  <span className="font-bold text-[#0A192F]">{proofFile.name}</span>
                ) : existingProofUrl ? (
                  <span className="text-[#10B981] font-semibold">Existing proof attached. Click to replace.</span>
                ) : (
                  'Upload college result screenshot or PDF (Private Storage)'
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] mb-1">Remarks (Optional)</label>
            <textarea
              rows={2}
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="Add any faculty remarks or course notes..."
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleSubmitMark('DRAFT')}
              disabled={isSubmitting}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => handleSubmitMark('SUBMITTED')}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin Verification Modal */}
      <Modal
        isOpen={adminActionModalOpen}
        onClose={() => setAdminActionModalOpen(false)}
        title={
          actionType === 'VERIFY'
            ? 'Verify & Lock CT Mark'
            : actionType === 'CORRECTION'
            ? 'Request Scholar Correction'
            : 'Reject CT Mark'
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[#64748B]">
            {actionType === 'VERIFY'
              ? 'Verifying this mark will lock it permanently against student edits and confirm it for institutional standing.'
              : actionType === 'CORRECTION'
              ? 'Requesting correction will allow the student to edit the score and re-upload supporting documentation.'
              : 'Rejecting this mark will mark it as invalid.'}
          </p>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] mb-1">Administrative Remarks</label>
            <textarea
              rows={3}
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              placeholder="e.g. Verified against official university portal."
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button variant="outline" size="sm" onClick={() => setAdminActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'VERIFY' ? 'gold' : actionType === 'CORRECTION' ? 'primary' : 'outline'}
              size="sm"
              onClick={handleAdminDecision}
            >
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Mark Sheet Modal */}
      {(isAdmin || isSecretary) && (
        <ExportMarkSheetModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          semesters={semesters}
          currentSemesterId={selectedSemesterId}
          currentStudent={allStudents.find((s) => s.id === selectedStudentId) || null}
          allStudents={allStudents}
        />
      )}
    </div>
  );
}
