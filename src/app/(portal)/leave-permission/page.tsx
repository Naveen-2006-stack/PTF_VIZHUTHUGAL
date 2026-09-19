'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { LeaveRequest, PermissionRequest, ApprovalDocument, RequestStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { InstitutionalLogos } from '@/components/branding/InstitutionalLogos';
import {
  FileCheck2,
  Calendar,
  Clock,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { generateApprovalSlipPDF, ApprovalSlipData } from '@/lib/pdf';
import { sendNotification } from '@/lib/notifications';
import { logAuditEvent } from '@/lib/audit';

export default function LeavePermissionPage() {
  const { role, profile, student, staff } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'LEAVE' | 'PERMISSION'>('LEAVE');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [approvalDocs, setApprovalDocs] = useState<Record<string, ApprovalDocument>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Application Modals
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isApplyPermOpen, setIsApplyPermOpen] = useState(false);

  // Leave form
  const [leaveFromDate, setLeaveFromDate] = useState('');
  const [leaveFromTime, setLeaveFromTime] = useState('09:00');
  const [leaveToDate, setLeaveToDate] = useState('');
  const [leaveToTime, setLeaveToTime] = useState('17:00');
  const [leaveReason, setLeaveReason] = useState('');

  // Permission form
  const [permDate, setPermDate] = useState('');
  const [permFromTime, setPermFromTime] = useState('14:00');
  const [permToTime, setPermToTime] = useState('17:00');
  const [permReason, setPermReason] = useState('');

  // Review & Approval Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedReqType, setSelectedReqType] = useState<'LEAVE' | 'PERMISSION'>('LEAVE');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const supabase = createClient();
  const isStudent = role === 'STUDENT';
  const isStaffMentor = role === 'STAFF_MENTOR';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'SEMI_ADMIN';
  const isSecretary = role === 'PTF_SECRETARY';

  useEffect(() => {
    if (isStaffMentor) {
      router.replace('/attendance/abdul-kalam');
    }
  }, [isStaffMentor, router]);

  useEffect(() => {
    if (!isStaffMentor) {
      loadRequests();
    }
  }, [student, staff, role, activeTab, isStaffMentor]);

  async function loadRequests() {
    setIsLoading(true);
    try {
      // 1. Load Leave Requests
      let leaveQuery = supabase
        .from('leave_requests')
        .select('*, student:students(*, campus:campuses(*), department:departments(*), course:courses(*), profile:profiles(*))')
        .order('created_at', { ascending: false });

      if (isStudent && student) {
        leaveQuery = leaveQuery.eq('student_id', student.id);
      }

      const { data: leaves } = await leaveQuery;
      if (leaves) setLeaveRequests(leaves as any);

      // 2. Load Permission Requests
      let permQuery = supabase
        .from('permission_requests')
        .select('*, student:students(*, campus:campuses(*), department:departments(*), course:courses(*), profile:profiles(*))')
        .order('created_at', { ascending: false });

      if (isStudent && student) {
        permQuery = permQuery.eq('student_id', student.id);
      }

      const { data: perms } = await permQuery;
      if (perms) setPermissionRequests(perms as any);

      // 3. Load generated approval documents
      const { data: docs } = await supabase.from('approval_documents').select('*');
      if (docs) {
        const docMap: Record<string, ApprovalDocument> = {};
        docs.forEach((d: any) => {
          docMap[d.request_id] = d;
        });
        setApprovalDocs(docMap);
      }
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Student applies for Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!student) {
      setFeedback({ type: 'error', message: 'You must have an active student profile to apply.' });
      return;
    }

    if (new Date(leaveToDate) < new Date(leaveFromDate)) {
      setFeedback({ type: 'error', message: 'Leave end date cannot be earlier than start date.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          student_id: student.id,
          from_date: leaveFromDate,
          from_time: leaveFromTime,
          to_date: leaveToDate,
          to_time: leaveToTime,
          reason: leaveReason,
          status: 'SUBMITTED',
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        actorId: profile?.id,
        action: 'SUBMIT_LEAVE_REQUEST',
        entity: 'leave_requests',
        entityId: data.id,
        newState: { from: leaveFromDate, to: leaveToDate, reason: leaveReason },
      });

      if (profile?.id) {
        await sendNotification({
          userId: profile.id,
          title: 'Leave Application Submitted',
          message: `Your leave application from ${leaveFromDate} to ${leaveToDate} has been submitted for review.`,
          category: 'LEAVE',
          priority: 'NORMAL',
          linkUrl: '/leave-permission',
          referenceId: `leave_sub_${data.id}`,
        });
      }

      setFeedback({ type: 'success', message: 'Leave application submitted for administrative review.' });
      setIsApplyLeaveOpen(false);
      setLeaveReason('');
      loadRequests();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit leave.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Student applies for Permission
  const handleApplyPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!student) {
      setFeedback({ type: 'error', message: 'You must have an active student profile to apply.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('permission_requests')
        .insert({
          student_id: student.id,
          permission_date: permDate,
          from_time: permFromTime,
          to_time: permToTime,
          reason: permReason,
          status: 'SUBMITTED',
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        actorId: profile?.id,
        action: 'SUBMIT_PERMISSION_REQUEST',
        entity: 'permission_requests',
        entityId: data.id,
        newState: { date: permDate, from: permFromTime, to: permToTime, reason: permReason },
      });

      if (profile?.id) {
        await sendNotification({
          userId: profile.id,
          title: 'Permission Request Submitted',
          message: `Your permission request for ${permDate} (${permFromTime} - ${permToTime}) has been submitted for review.`,
          category: 'PERMISSION',
          priority: 'NORMAL',
          linkUrl: '/leave-permission',
          referenceId: `perm_sub_${data.id}`,
        });
      }

      setFeedback({ type: 'success', message: 'Permission request submitted for administrative review.' });
      setIsApplyPermOpen(false);
      setPermReason('');
      loadRequests();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit permission.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin approves / rejects request and generates official PDF slip upon approval
  const handleReviewDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;
    
    if (!isAdmin) {
      setFeedback({ type: 'error', message: 'You do not have permission to approve or reject requests.' });
      return;
    }

    setIsSubmitting(true);

    const tableName = selectedReqType === 'LEAVE' ? 'leave_requests' : 'permission_requests';

    try {
      // 1. Update request status in database
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          status: decision,
          admin_remarks: adminRemarks || null,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // 2. If APPROVED: Generate official PDF slip and save record in approval_documents
      if (decision === 'APPROVED') {
        const year = new Date().getFullYear();
        const randomSeq = Math.floor(100000 + Math.random() * 900000);
        const prefix = selectedReqType === 'LEAVE' ? 'PTF-LV' : 'PTF-PR';
        const slipNumber = `${prefix}-${year}-${randomSeq}`;

        const { error: docError } = await supabase
          .from('approval_documents')
          .insert({
            request_type: selectedReqType,
            request_id: selectedRequest.id,
            student_id: selectedRequest.student_id,
            slip_number: slipNumber,
            approver_name: profile?.full_name || 'E Maniraj',
            approver_designation: 'SR Manager - Vizhuthugal',
            organization: 'Puthiya Thalaimurai Foundation',
          });

        if (docError) {
          console.error('Approval doc error:', docError);
        }
      }

      // 3. Dispatch in-portal notification
      if (selectedRequest.student?.profile_id) {
        await sendNotification({
          userId: selectedRequest.student.profile_id,
          title: `${selectedReqType === 'LEAVE' ? 'Leave' : 'Permission'} Application ${decision}`,
          message: `Your ${selectedReqType.toLowerCase()} request has been ${decision.toLowerCase()}.${
            adminRemarks ? ` Remarks: ${adminRemarks}` : ''
          }`,
          category: selectedReqType === 'LEAVE' ? 'LEAVE' : 'PERMISSION',
          priority: decision === 'APPROVED' ? 'NORMAL' : 'HIGH',
          linkUrl: '/leave-permission',
          referenceId: `rev_${selectedReqType}_${selectedRequest.id}_${decision}`,
        });
      }

      // 4. Immutable Audit Log
      await logAuditEvent({
        actorId: profile?.id,
        action: `${selectedReqType}_${decision}`,
        entity: tableName,
        entityId: selectedRequest.id,
        newState: { status: decision, remarks: adminRemarks },
      });

      setReviewModalOpen(false);
      setSelectedRequest(null);
      setAdminRemarks('');
      setFeedback({
        type: 'success',
        message: `Request successfully ${decision.toLowerCase()}!${
          decision === 'APPROVED' ? ' Official PDF Slip generated.' : ''
        }`,
      });
      loadRequests();
    } catch (err: any) {
      alert(`Error processing review: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // PDF Slip Download Handler
  const handleDownloadSlip = async (req: any, type: 'LEAVE' | 'PERMISSION') => {
    const docInfo = approvalDocs[req.id];
    const slipNo = docInfo?.slip_number || `PTF-${type === 'LEAVE' ? 'LV' : 'PR'}-2026-000001`;

    const slipData: ApprovalSlipData = {
      slipNumber: slipNo,
      requestType: type,
      studentName: req.student?.profile?.full_name || 'Scholar Name',
      ptfId: req.student?.ptf_id || 'PTF001',
      registerNumber: req.student?.register_number || 'REG-NUM',
      campusName: req.student?.campus?.name || 'SRM Institute of Science and Technology',
      departmentName: req.student?.department?.name || 'Department of Engineering',
      courseName: req.student?.course?.name || 'B.Tech Program',
      fromDate: req.from_date,
      fromTime: req.from_time,
      toDate: req.to_date,
      toTime: req.to_time,
      permissionDate: req.permission_date,
      reason: req.reason,
      status: 'APPROVED',
      adminRemarks: req.admin_remarks,
      approvedAt: req.approved_at || new Date().toISOString(),
      approverName: docInfo?.approver_name || 'E Maniraj',
      approverDesignation: docInfo?.approver_designation || 'SR Manager - Vizhuthugal',
      organization: 'Puthiya Thalaimurai Foundation',
    };

    const pdf = await generateApprovalSlipPDF(slipData);
    pdf.save(`${slipNo}.pdf`);
  };

  const currentList = activeTab === 'LEAVE' ? leaveRequests : permissionRequests;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center gap-4">
          <InstitutionalLogos height={22} className="hidden sm:flex" />
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
              OFFICIAL AUTHORIZATIONS
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
              Leave &amp; On-Duty Permission Workflows
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Official institutional leave approvals with automated PDF slips (`PTF-LV-2026-XXXXXX`).
            </p>
          </div>
        </div>

        {/* Student Action Buttons */}
        {isStudent && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4 text-[#D4AF37]" />}
              onClick={() => setIsApplyLeaveOpen(true)}
            >
              Apply Leave
            </Button>
            <Button
              variant="gold"
              size="md"
              leftIcon={<Plus className="w-4 h-4 text-[#0A192F]" />}
              onClick={() => setIsApplyPermOpen(true)}
            >
              Request Permission
            </Button>
          </div>
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

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#E2E8F0]">
        <button
          onClick={() => setActiveTab('LEAVE')}
          className={`py-3 px-6 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'LEAVE'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#64748B] hover:text-[#0A192F]'
          }`}
        >
          Leave Applications ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('PERMISSION')}
          className={`py-3 px-6 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'PERMISSION'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#64748B] hover:text-[#0A192F]'
          }`}
        >
          Permission / On-Duty ({permissionRequests.length})
        </button>
      </div>

      {/* Requests Table */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
            {activeTab === 'LEAVE' ? 'Leave Applications Roster' : 'Permission Requests Roster'}
          </h3>
          <span className="text-xs text-[#64748B]">
            {currentList.length} Total Applications
          </span>
        </div>

        {currentList.length === 0 ? (
          <EmptyState
            title={`No ${activeTab === 'LEAVE' ? 'Leave' : 'Permission'} Requests Found`}
            description={
              isStudent
                ? `You have not submitted any ${activeTab.toLowerCase()} requests yet.`
                : `There are currently no ${activeTab.toLowerCase()} requests pending review.`
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Scholar</th>
                  <th className="py-3 px-4">Duration &amp; Timings</th>
                  <th className="py-3 px-4">Reason / Purpose</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Approval Slip</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {currentList.map((req) => {
                  const hasDoc = req.status === 'APPROVED';
                  const docInfo = approvalDocs[req.id];

                  return (
                    <tr key={req.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0A192F]">
                        {req.student?.profile?.full_name || 'Scholar'}
                        <span className="block text-[10px] text-[#D4AF37] font-semibold">
                          {req.student?.ptf_id} • {req.student?.campus?.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#334155]">
                        {activeTab === 'LEAVE' ? (
                          <div>
                            <p className="font-semibold text-[#0A192F]">
                              {(req as LeaveRequest).from_date} to {(req as LeaveRequest).to_date}
                            </p>
                            <p className="text-[10px] text-[#64748B]">
                              {req.from_time} – {req.to_time}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-[#0A192F]">
                              {(req as PermissionRequest).permission_date}
                            </p>
                            <p className="text-[10px] text-[#64748B]">
                              {req.from_time} – {req.to_time}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#475569] max-w-xs truncate">
                        {req.reason}
                        {req.admin_remarks && (
                          <span className="block text-[10px] text-[#1E3E62] italic mt-0.5">
                            Note: {req.admin_remarks}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            req.status === 'APPROVED' ? 'success' :
                            req.status === 'REJECTED' ? 'error' :
                            'warning'
                          }
                          dot
                        >
                          {req.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {hasDoc ? (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Download className="w-3.5 h-3.5 text-[#D4AF37]" />}
                            onClick={() => handleDownloadSlip(req, activeTab)}
                          >
                            Download PDF
                          </Button>
                        ) : (
                          <span className="text-[11px] text-[#94A3B8] italic">
                            {req.status === 'REJECTED' ? 'No PDF Issued' : 'Pending Approval'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin && req.status === 'SUBMITTED' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(req);
                              setSelectedReqType(activeTab);
                              setReviewModalOpen(true);
                            }}
                          >
                            Review &amp; Decide
                          </Button>
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

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
        title="Apply for Student Leave"
        subtitle="Submit formal leave request for academic & hostel permissions"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                From Date
              </label>
              <input
                type="date"
                required
                value={leaveFromDate}
                onChange={(e) => setLeaveFromDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                From Time
              </label>
              <input
                type="time"
                required
                value={leaveFromTime}
                onChange={(e) => setLeaveFromTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                To Date
              </label>
              <input
                type="date"
                required
                value={leaveToDate}
                onChange={(e) => setLeaveToDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                To Time
              </label>
              <input
                type="time"
                required
                value={leaveToTime}
                onChange={(e) => setLeaveToTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Reason for Leave
            </label>
            <textarea
              rows={3}
              required
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="State clear purpose (e.g. Medical emergency, family function, competitive exam)..."
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsApplyLeaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Submit Leave Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* Apply Permission Modal */}
      <Modal
        isOpen={isApplyPermOpen}
        onClose={() => setIsApplyPermOpen(false)}
        title="Request On-Duty Permission"
        subtitle="Formal permission for symposiums, social service projects, or academic events"
      >
        <form onSubmit={handleApplyPermission} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Permission Date
            </label>
            <input
              type="date"
              required
              value={permDate}
              onChange={(e) => setPermDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                From Time
              </label>
              <input
                type="time"
                required
                value={permFromTime}
                onChange={(e) => setPermFromTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                To Time
              </label>
              <input
                type="time"
                required
                value={permToTime}
                onChange={(e) => setPermToTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Event / On-Duty Reason
            </label>
            <textarea
              rows={3}
              required
              value={permReason}
              onChange={(e) => setPermReason(e.target.value)}
              placeholder="State event name, venue, or institutional assignment..."
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsApplyPermOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="md"
              isLoading={isSubmitting}
            >
              Submit Permission Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin Review & Approval Decision Modal */}
      {selectedRequest && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`Review ${selectedReqType === 'LEAVE' ? 'Leave' : 'Permission'} Application`}
          subtitle={`Applicant: ${selectedRequest.student?.profile?.full_name} (${selectedRequest.student?.ptf_id})`}
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs space-y-1.5 text-[#334155]">
              <p><strong>Campus:</strong> {selectedRequest.student?.campus?.name}</p>
              <p><strong>Department:</strong> {selectedRequest.student?.department?.name}</p>
              <p>
                <strong>Duration:</strong>{' '}
                {selectedReqType === 'LEAVE'
                  ? `${selectedRequest.from_date} (${selectedRequest.from_time}) to ${selectedRequest.to_date} (${selectedRequest.to_time})`
                  : `${selectedRequest.permission_date} (${selectedRequest.from_time} to ${selectedRequest.to_time})`}
              </p>
              <p><strong>Reason:</strong> {selectedRequest.reason}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Administrative Remarks / Approval Condition
              </label>
              <textarea
                rows={3}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Remarks to appear on the official generated PDF slip..."
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <Button
                variant="danger"
                size="md"
                isLoading={isSubmitting}
                onClick={() => handleReviewDecision('REJECTED')}
              >
                Reject Request
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                onClick={() => handleReviewDecision('APPROVED')}
              >
                Approve &amp; Issue Official PDF Slip
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
