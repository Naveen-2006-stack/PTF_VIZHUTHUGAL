'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { ScholarshipApplication, RequestStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { sendNotification } from '@/lib/notifications';
import { logAuditEvent } from '@/lib/audit';

export default function ScholarshipPage() {
  const { role, profile, student } = useAuth();
  const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Apply Renewal Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [docType, setDocType] = useState('Mark Sheet');
  const [docPath, setDocPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Review Modal (Admin)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ScholarshipApplication | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');

  const supabase = createClient();
  const isStudent = role === 'STUDENT';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'SEMI_ADMIN';

  useEffect(() => {
    loadScholarships();
  }, [student, role]);

  async function loadScholarships() {
    setIsLoading(true);
    try {
      let query = supabase
        .from('scholarship_applications')
        .select('*, student:students(*, campus:campuses(*), department:departments(*), profile:profiles(*))')
        .order('created_at', { ascending: false });

      if (isStudent && student) {
        query = query.eq('student_id', student.id);
      }

      const { data } = await query;
      if (data) setApplications(data as any);
    } catch (err) {
      console.error('Error loading scholarships:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Student submits renewal application
  const handleApplyRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!student) {
      setFeedback({ type: 'error', message: 'You must have an active scholar profile.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Insert scholarship application
      const { data, error } = await supabase
        .from('scholarship_applications')
        .insert({
          student_id: student.id,
          academic_year: academicYear,
          status: 'SUBMITTED',
          deadline: '2026-11-30',
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Audit log
      await logAuditEvent({
        actorId: profile?.id,
        action: 'SUBMIT_SCHOLARSHIP_RENEWAL',
        entity: 'scholarship_applications',
        entityId: data.id,
        newState: { academicYear },
      });

      setFeedback({ type: 'success', message: 'Scholarship renewal application submitted successfully!' });
      setIsApplyModalOpen(false);
      loadScholarships();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit application.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin approves / rejects application
  const handleReviewDecision = async (decision: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED') => {
    if (!selectedApp) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('scholarship_applications')
        .update({
          status: decision,
          admin_remarks: adminRemarks || null,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedApp.id);

      if (error) throw error;

      if (selectedApp.student?.profile_id) {
        await sendNotification({
          userId: selectedApp.student.profile_id,
          title: `Scholarship Renewal ${decision}`,
          message: `Your scholarship renewal application for ${selectedApp.academic_year} has been ${decision.toLowerCase()}.`,
          category: 'RENEWAL',
          priority: 'HIGH',
          linkUrl: '/scholarship',
        });
      }

      await logAuditEvent({
        actorId: profile?.id,
        action: `SCHOLARSHIP_${decision}`,
        entity: 'scholarship_applications',
        entityId: selectedApp.id,
        newState: { status: decision, remarks: adminRemarks },
      });

      setReviewModalOpen(false);
      setSelectedApp(null);
      setAdminRemarks('');
      setFeedback({ type: 'success', message: `Application ${decision.toLowerCase()} successfully.` });
      loadScholarships();
    } catch (err: any) {
      alert(`Error updating application: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            FOUNDATION BURSARY
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Scholarship Renewal Scheme
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Merit-cum-means scholarship renewal portal for Puthiya Thalaimurai Foundation fellows.
          </p>
        </div>

        {isStudent && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Award className="w-4 h-4 text-[#D4AF37]" />}
            onClick={() => setIsApplyModalOpen(true)}
          >
            Apply for Renewal
          </Button>
        )}
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

      {/* Institutional Guidelines Card */}
      <div className="institutional-card p-6 border-l-4 border-l-[#D4AF37] bg-[#F8FAFC]">
        <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider mb-2">
          Vizhuthugal Scheme Renewal Criteria
        </h3>
        <ul className="text-xs text-[#475569] space-y-1 list-disc pl-4">
          <li>Minimum <strong>85% attendance</strong> in Dr. APJ Abdul Kalam daily special sessions.</li>
          <li>Pass in all subjects in Cycle Tests (CT) and University Semester Exams.</li>
          <li>Completion of mandatory <strong>Summer Activity</strong> and community service hours.</li>
          <li>Annual renewal submission deadline for 2026-2027: <strong>30th November 2026</strong>.</li>
        </ul>
      </div>

      {/* Applications Roster */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
            {isStudent ? 'My Renewal Applications' : 'All Scholar Applications'}
          </h3>
          <span className="text-xs text-[#64748B] font-semibold">
            {applications.length} Records
          </span>
        </div>

        {applications.length === 0 ? (
          <EmptyState
            title="No Renewal Applications Found"
            description={
              isStudent
                ? 'You have not submitted a renewal application for this academic cycle yet.'
                : 'No scholarship renewal applications have been submitted yet.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Scholar</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0A192F]">
                      {app.student?.profile?.full_name || 'Scholar'}
                      <span className="block text-[10px] text-[#D4AF37] font-semibold">
                        {app.student?.ptf_id} • {app.student?.campus?.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0A192F]">
                      {app.academic_year}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          app.status === 'APPROVED' ? 'success' :
                          app.status === 'REJECTED' ? 'error' :
                          app.status === 'CORRECTION_REQUIRED' ? 'warning' :
                          'neutral'
                        }
                        dot
                      >
                        {app.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[#64748B] max-w-xs truncate">
                      {app.admin_remarks || 'Pending verification'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAdmin && app.status === 'SUBMITTED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setReviewModalOpen(true);
                          }}
                        >
                          Review &amp; Decide
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Scholarship Renewal"
        subtitle="Submit academic proofs for foundation bursary renewal"
      >
        <form onSubmit={handleApplyRenewal} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Academic Year
            </label>
            <input
              type="text"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
            >
              <option value="Mark Sheet">Previous Semester Mark Sheet</option>
              <option value="Bonafide Certificate">College Bonafide Certificate</option>
              <option value="Tuition Fee Receipt">Tuition Fee Receipt</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsApplyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin Review Modal */}
      {selectedApp && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title="Review Scholarship Renewal"
          subtitle={`Applicant: ${selectedApp.student?.profile?.full_name} (${selectedApp.student?.ptf_id})`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Foundation Administrative Remarks
              </label>
              <textarea
                rows={3}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Enter remarks for approval or reason for correction..."
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <Button
                variant="danger"
                size="md"
                isLoading={isSubmitting}
                onClick={() => handleReviewDecision('REJECTED')}
              >
                Reject
              </Button>
              <Button
                variant="outline"
                size="md"
                isLoading={isSubmitting}
                onClick={() => handleReviewDecision('CORRECTION_REQUIRED')}
              >
                Request Correction
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                onClick={() => handleReviewDecision('APPROVED')}
              >
                Approve Renewal
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
