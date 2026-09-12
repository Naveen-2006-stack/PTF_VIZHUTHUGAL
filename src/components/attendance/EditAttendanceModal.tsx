'use client';

import React, { useState, useEffect } from 'react';
import { AttendanceRecord, AttendanceStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { X, AlertCircle, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  isSuperAdmin: boolean;
  onSuccess: () => void;
}

export const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({
  isOpen,
  onClose,
  record,
  isSuperAdmin,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('PRESENT');
  const [reason, setReason] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (record) {
      setSelectedStatus(record.status);
      setReason('');
      setIsConfirming(false);
      setErrorMessage('');
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const createdAtTime = new Date(record.created_at).getTime();
  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const remainingMs = Math.max(0, createdAtTime + twentyFourHoursMs - now);
  const isExpired = remainingMs === 0;

  const hoursRemaining = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  const statusOptions: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setErrorMessage('Please provide a reason for the correction.');
      return;
    }
    if (selectedStatus === record.status) {
      setErrorMessage('Please select a different attendance status.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/attendance/abdul-kalam', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: record.id,
          status: selectedStatus,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update attendance');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#E2E8F0]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0A192F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-base font-bold tracking-tight">
              {isSuperAdmin && isExpired ? 'Administrative Attendance Override' : 'Edit Attendance Record'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Super Admin Override Warning */}
          {isSuperAdmin && isExpired && (
            <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[#92400E] text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Super Admin Override Active: </span>
                You are modifying an attendance record past the 24-hour mentor correction window.
                An immutable audit log will be permanently recorded with your administrator identity.
              </div>
            </div>
          )}

          {/* Time Remaining Indicator */}
          {!isExpired && (
            <div className="p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[#166534] text-xs flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#16A34A]" />
                24-Hour Edit Window Active
              </span>
              <span className="font-mono font-bold bg-[#DCFCE7] px-2 py-0.5 rounded text-[11px]">
                {hoursRemaining}h {minutesRemaining}m remaining
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#E11D48] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Immutable Student & Attendance Details */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                Immutable Record Details
              </span>
              <span className="text-[10.5px] font-semibold text-[#0A192F] bg-white px-2 py-0.5 rounded border border-[#CBD5E1]">
                Only Attendance Status May Be Modified
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[#64748B] block text-[11px]">Scholar Name:</span>
                <span className="font-bold text-[#0A192F]">
                  {record.student?.profile?.full_name || 'Scholar'}
                </span>
                <span className="text-[10px] text-[#64748B] block font-mono">
                  PTF ID: {record.student?.ptf_id}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[11px]">Attendance Date &amp; Session:</span>
                <span className="font-bold text-[#0A192F]">
                  {new Date(record.attendance_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-[10px] font-semibold text-[#D4AF37] block">
                  {record.session_type} Session
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[11px]">Original Marked Timestamp:</span>
                <span className="font-medium text-[#0A192F] text-[11px]">
                  {(() => {
                    const d = new Date(record.created_at);
                    if (isNaN(d.getTime())) return '—';
                    const day = d.toLocaleDateString('en-IN', { day: '2-digit' });
                    const month = d.toLocaleDateString('en-IN', { month: 'short' });
                    const year = d.getFullYear();
                    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
                    return `${day} ${month} ${year}, ${time}`;
                  })()}
                </span>
                <span className="text-[10px] text-[#64748B] block">
                  Creator: {record.mentor?.full_name || 'Original Staff Mentor'}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[11px]">Edit Deadline (24h Window):</span>
                <span className="font-mono font-bold text-[#0A192F] text-[11px]">
                  {(() => {
                    const d = new Date(new Date(record.created_at).getTime() + 24 * 60 * 60 * 1000);
                    if (isNaN(d.getTime())) return '—';
                    const day = d.toLocaleDateString('en-IN', { day: '2-digit' });
                    const month = d.toLocaleDateString('en-IN', { month: 'short' });
                    const year = d.getFullYear();
                    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
                    return `${day} ${month} ${year}, ${time}`;
                  })()}
                </span>
                <div className="mt-1">
                  <span className="text-[#64748B] text-[10px] mr-1">Current Status:</span>
                  <Badge
                    variant={
                      record.status === 'PRESENT' ? 'success' :
                      record.status === 'LATE' ? 'warning' : 'error'
                    }
                    size="sm"
                  >
                    {record.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {!isConfirming ? (
            <>
              {/* Editable Status */}
              <div>
                <label className="block text-xs font-bold text-[#0A192F] uppercase tracking-wide mb-2">
                  Select Corrected Status *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {statusOptions.map((status) => {
                    const isSelected = selectedStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSelectedStatus(status)}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                          isSelected
                            ? 'bg-[#0A192F] text-[#D4AF37] border-[#0A192F] shadow-xs'
                            : 'bg-white text-[#334155] border-[#CBD5E1] hover:border-[#0A192F]'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Required Reason for Correction */}
              <div>
                <label className="block text-xs font-bold text-[#0A192F] uppercase tracking-wide mb-1">
                  Reason for Correction *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Incorrect status selected while marking during morning check-in."
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0A192F] text-[#0A192F]"
                />
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  Mandatory audit requirement. This statement will be permanently recorded in audit logs.
                </span>
              </div>
            </>
          ) : (
            /* Confirmation Step */
            <div className="p-4 bg-[#F8FAFC] border-2 border-[#D4AF37] rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-[#D4AF37]" />
                Confirm Attendance Modification
              </div>
              <p className="text-xs text-[#334155] leading-relaxed">
                Are you sure you want to change attendance for{' '}
                <span className="font-bold text-[#0A192F]">{record.student?.profile?.full_name}</span> from{' '}
                <span className="font-bold text-[#DC2626]">{record.status}</span> to{' '}
                <span className="font-bold text-[#16A34A]">{selectedStatus}</span>?
              </p>
              <div className="text-xs bg-white p-2.5 rounded border border-[#E2E8F0]">
                <span className="text-[#64748B] font-semibold block text-[11px]">Reason provided:</span>
                <span className="italic text-[#0A192F] font-medium">{reason}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-3">
          {!isConfirming ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!reason.trim() || reason.trim().length < 3) {
                    setErrorMessage('Please provide a descriptive reason for correction (at least 3 characters).');
                    return;
                  }
                  if (selectedStatus === record.status) {
                    setErrorMessage('The new status must be different from the originally recorded status.');
                    return;
                  }
                  setErrorMessage('');
                  setIsConfirming(true);
                }}
              >
                Review Correction
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />}
              >
                Confirm &amp; Save Correction
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
