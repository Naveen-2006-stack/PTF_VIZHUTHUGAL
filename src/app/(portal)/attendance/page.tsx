'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { AttendanceRecord } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PtfLogo } from '@/components/branding/PtfLogo';
import { InstitutionalLogos } from '@/components/branding/InstitutionalLogos';
import { Clock, Lock, Edit3, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { EditAttendanceModal } from '@/components/attendance/EditAttendanceModal';

// Helper to format timestamps consistently: [DD Mon YYYY, HH:MM AM/PM]
function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  
  const day = d.toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' });
  const month = d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });
  const year = d.toLocaleDateString('en-IN', { year: 'numeric', timeZone: 'Asia/Kolkata' });
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).toUpperCase();
  
  return `${day} ${month} ${year}, ${time}`;
}

export default function AttendanceHistoryPage() {
  const { role, profile, student } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<AttendanceRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Authoritative server-time synchronization
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [currentTick, setCurrentTick] = useState<number>(Date.now());

  const supabase = createClient();
  const isStudent = role === 'STUDENT';
  const isStaffMentor = role === 'STAFF_MENTOR';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Synchronize with server time on mount
  useEffect(() => {
    async function syncTime() {
      try {
        const start = Date.now();
        const res = await fetch('/api/time');
        if (res.ok) {
          const data = await res.json();
          const serverMs = new Date(data.serverTime).getTime();
          const end = Date.now();
          const latency = (end - start) / 2;
          setServerTimeOffset(serverMs - (end - latency));
        }
      } catch {
        // Fallback to client clock
      }
    }
    syncTime();

    // Live countdown update interval (every 10 seconds)
    const interval = setInterval(() => {
      setCurrentTick(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select('*, student:students(*, campus:campuses(*), department:departments(*), profile:profiles(*)), mentor:profiles!mentor_id(*)')
        .order('attendance_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (isStudent && student) {
        query = query.eq('student_id', student.id);
      }

      if (dateFilter) {
        query = query.eq('attendance_date', dateFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error loading attendance from supabase:', error);
      }
      if (data) setRecords(data as any);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [student, isStudent, dateFilter]);

  const handleOpenEdit = (record: AttendanceRecord) => {
    setSelectedRecordForEdit(record);
    setIsEditModalOpen(true);
  };

  // Authoritative current effective time
  const effectiveNow = currentTick + serverTimeOffset;

  return (
    <div className="space-y-6">
      {/* Top Header with Dual Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <PtfLogo height={42} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                ATTENDANCE LOG
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="text-[11px] font-semibold text-[#64748B]">
                24-Hour Edit Governance
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
              Dr. APJ Abdul Kalam Attendance Records
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Historical session logs. Original creators may correct status within 24 hours of database creation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <InstitutionalLogos height={24} className="hidden md:flex" />

          {(isStaffMentor || isSuperAdmin) && (
            <Link href="/attendance/abdul-kalam">
              <Button variant="primary" size="md" leftIcon={<Clock className="w-4 h-4 text-[#D4AF37]" />}>
                Mark Daily Session
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="institutional-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-52">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">
              Filter by Attendance Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
            />
          </div>
          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="mt-4">
              Clear Filter
            </Button>
          )}
        </div>

        {/* Legend / Rule Pill */}
        <div className="text-[11px] text-[#475569] bg-[#F1F5F9] px-3 py-1.5 rounded-lg border border-[#E2E8F0] flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#0A192F]" />
          <span>Rule: <strong>Edit Deadline = Marked Time + 24 Hours</strong> (Authoritative Server Time)</span>
        </div>
      </div>

      {/* Roster Table */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
            Attendance Log ({records.length})
          </h3>
          <span className="text-[11px] text-[#64748B]">
            One session per scholar per calendar date
          </span>
        </div>

        {records.length === 0 ? (
          <EmptyState
            title="No Attendance Records Found"
            description="No attendance records match your filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                  <th className="py-3 px-3">Session Date</th>
                  <th className="py-3 px-3">Student Particulars</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Marked &amp; Edit Window</th>
                  <th className="py-3 px-3">Recorded By</th>
                  <th className="py-3 px-3">Edit Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {records.map((r) => {
                  // The 24-hour window MUST be calculated from the exact server/database timestamp:
                  // editable_until = original_created_at + 24 hours
                  const createdAtTime = new Date(r.created_at).getTime();
                  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
                  const editUntilTime = createdAtTime + twentyFourHoursMs;
                  const editUntilDate = new Date(editUntilTime);

                  const remainingMs = Math.max(0, editUntilTime - effectiveNow);
                  const isWithin24Hours = remainingMs > 0;
                  const isOriginalCreator = profile?.id === r.mentor_id;

                  const hoursRemaining = Math.floor(remainingMs / (1000 * 60 * 60));
                  const minutesRemaining = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

                  // Role permission determination:
                  // 1. STAFF_MENTOR: Can edit ONLY if original creator AND within 24 hours.
                  // 2. SUPER_ADMIN: Can edit within 24h OR override after 24h.
                  // 3. Other roles: Cannot edit.
                  const canEditNormal = (isStaffMentor && isOriginalCreator && isWithin24Hours) || (isSuperAdmin && isWithin24Hours);
                  const canSuperAdminOverride = isSuperAdmin && !isWithin24Hours;
                  const canEdit = canEditNormal || canSuperAdminOverride;

                  // Status text according to specification:
                  // - Editable
                  // OR
                  // - Locked
                  // OR
                  // - Admin Override Available
                  let statusLabel = 'Locked';
                  if (isWithin24Hours && (isOriginalCreator || isSuperAdmin)) {
                    statusLabel = 'Editable';
                  } else if (isSuperAdmin && !isWithin24Hours) {
                    statusLabel = 'Admin Override Available';
                  } else {
                    statusLabel = 'Locked';
                  }

                  return (
                    <tr
                      key={r.id}
                      data-testid={`attendance-row-${r.attendance_date}`}
                      data-date={r.attendance_date}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      {/* Session Date */}
                      <td className="py-3 px-3 font-bold text-[#0A192F]">
                        {new Date(r.attendance_date + 'T12:00:00').toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold text-[#D4AF37]">
                            {r.session_type}
                          </span>
                          <span className="text-[10px] text-[#64748B] font-mono">
                            • {r.attendance_date}
                          </span>
                        </div>
                      </td>

                      {/* Student Particulars */}
                      <td className="py-3 px-3 font-semibold text-[#0A192F]">
                        {r.student?.profile?.full_name || 'Scholar'}
                        <span className="block text-[10px] text-[#64748B] font-mono">
                          {r.student?.ptf_id}
                        </span>
                      </td>

                      {/* Attendance Status */}
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            r.status === 'PRESENT' ? 'success' :
                            r.status === 'LATE' ? 'warning' :
                            r.status === 'EXCUSED' ? 'gold' :
                            'error'
                          }
                          dot
                        >
                          {r.status}
                        </Badge>
                      </td>

                      {/* Marked & Edit Until Timestamps */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-[#0A192F] font-medium">
                            <span className="text-[#64748B] font-normal">Marked: </span>
                            {formatDateTime(r.created_at)}
                          </div>
                          <div className="text-[11px] text-[#475569]">
                            <span className="text-[#64748B] font-normal">Edit Until: </span>
                            <span className="font-mono text-[10.5px]">{formatDateTime(editUntilDate.toISOString())}</span>
                          </div>
                        </div>
                      </td>

                      {/* Recorded By */}
                      <td className="py-3 px-3 text-[#64748B]">
                        {r.mentor?.full_name || 'Staff Mentor'}
                        {isOriginalCreator && (
                          <span className="block text-[10px] text-[#16A34A] font-semibold">
                            (You)
                          </span>
                        )}
                      </td>

                      {/* Edit Status & Live Countdown */}
                      <td className="py-3 px-3">
                        {statusLabel === 'Editable' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#166534] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                              Editable
                            </span>
                            <span className="block text-[10.5px] text-[#166534] font-medium">
                              {hoursRemaining}h {minutesRemaining}m remaining
                            </span>
                          </div>
                        ) : statusLabel === 'Admin Override Available' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#B45309] font-bold bg-[#FEF3C7] px-2 py-0.5 rounded">
                              <ShieldAlert className="w-3 h-3 text-[#D97706]" />
                              Admin Override Available
                            </span>
                            <span className="block text-[10px] text-[#64748B]">
                              Window expired (Admin authorized)
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B] font-bold bg-[#F1F5F9] px-2 py-0.5 rounded">
                              <Lock className="w-3 h-3 text-[#94A3B8]" />
                              Locked
                            </span>
                            <span className="block text-[10px] text-[#DC2626] font-medium">
                              {!isWithin24Hours ? 'Editing window expired' : 'Other mentor record'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3 text-right">
                        {canEditNormal ? (
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-[#0A192F] text-[#D4AF37] hover:bg-[#1E293B] transition-all shadow-2xs"
                            data-testid={`edit-attendance-${r.id}`}
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit Attendance
                          </button>
                        ) : canSuperAdminOverride ? (
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-[#B45309] text-white hover:bg-[#92400E] transition-all shadow-2xs"
                            data-testid={`edit-attendance-${r.id}`}
                          >
                            <ShieldAlert className="w-3 h-3" />
                            Admin Override
                          </button>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8] font-bold">
                              <Lock className="w-3 h-3 text-[#94A3B8]" /> Locked
                            </span>
                            <span className="text-[9.5px] text-[#DC2626] font-medium">
                              Editing window expired
                            </span>
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

      {/* Edit Attendance Modal */}
      <EditAttendanceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRecordForEdit(null);
        }}
        record={selectedRecordForEdit}
        isSuperAdmin={isSuperAdmin}
        onSuccess={loadAttendance}
      />
    </div>
  );
}
