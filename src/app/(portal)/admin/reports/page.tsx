'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InstitutionalLogos } from '@/components/branding/InstitutionalLogos';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Calendar,
  Building2,
  Users,
  GraduationCap,
  Clock,
  FileCheck2,
} from 'lucide-react';

type ReportType = 'STUDENT' | 'ATTENDANCE' | 'CT_MARKS' | 'LEAVE' | 'MAPPING';

export default function ReportsPage() {
  const { role } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('STUDENT');
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [campusFilter, setCampusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadReportData();
  }, [reportType, campusFilter]);

  async function loadReportData() {
    setIsLoading(true);
    try {
      if (reportType === 'STUDENT') {
        let q = supabase
          .from('students')
          .select('*, profile:profiles(*), campus:campuses(*), department:departments(*), course:courses(*)');
        if (campusFilter) q = q.eq('campus.code', campusFilter);
        const { data } = await q;
        if (data) setReportData(data);
      } else if (reportType === 'ATTENDANCE') {
        const q = supabase
          .from('attendance')
          .select('*, student:students(*, campus:campuses(*), department:departments(*), profile:profiles(*)), mentor:profiles!mentor_id(*)');
        const { data } = await q;
        if (data) setReportData(data);
      } else if (reportType === 'CT_MARKS') {
        const q = supabase
          .from('subject_marks')
          .select('*, student:students(*, campus:campuses(*), department:departments(*), profile:profiles(*)), subject:subjects(*)');
        const { data } = await q;
        if (data) setReportData(data);
      } else if (reportType === 'LEAVE') {
        const q = supabase
          .from('leave_requests')
          .select('*, student:students(*, campus:campuses(*), department:departments(*), profile:profiles(*))');
        const { data } = await q;
        if (data) setReportData(data);
      } else if (reportType === 'MAPPING') {
        const q = supabase
          .from('staff_student_assignments')
          .select('*, student:students(*, campus:campuses(*), department:departments(*), profile:profiles(*)), staff:staff_profiles(*, profile:profiles(*))');
        const { data } = await q;
        if (data) setReportData(data);
      }
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Export to Excel / CSV
  const handleExport = (format: 'xlsx' | 'csv') => {
    if (reportData.length === 0) return;

    // Flatten data for export
    const exportRows = reportData.map((item) => {
      if (reportType === 'STUDENT') {
        return {
          'PTF ID': item.ptf_id,
          'Register Number': item.register_number,
          'Student Name': item.profile?.full_name || 'N/A',
          Email: item.profile?.email || 'N/A',
          Campus: item.campus?.code,
          Department: item.department?.code,
          Course: item.course?.name,
          Year: item.current_year,
          Status: item.status,
        };
      } else if (reportType === 'ATTENDANCE') {
        return {
          Date: item.attendance_date,
          Session: item.session_type,
          'Student Name': item.student?.profile?.full_name,
          'PTF ID': item.student?.ptf_id,
          Campus: item.student?.campus?.code,
          Status: item.status,
          Remarks: item.remarks,
        };
      } else if (reportType === 'CT_MARKS') {
        return {
          'PTF ID': item.student?.ptf_id,
          'Student Name': item.student?.profile?.full_name,
          Subject: item.subject?.subject_name,
          'CT Test': `CT-${item.ct_test_number}`,
          'Mark Obtained': item.mark_obtained,
          'Max Mark': item.max_mark,
          Percentage: ((item.mark_obtained / item.max_mark) * 100).toFixed(1) + '%',
          Status: item.status,
        };
      } else if (reportType === 'LEAVE') {
        return {
          'PTF ID': item.student?.ptf_id,
          'Student Name': item.student?.profile?.full_name,
          'From Date': item.from_date,
          'To Date': item.to_date,
          Reason: item.reason,
          Status: item.status,
          'Admin Remarks': item.admin_remarks,
        };
      } else {
        return {
          'PTF ID': item.student?.ptf_id,
          'Student Name': item.student?.profile?.full_name,
          Campus: item.student?.campus?.code,
          'Assigned Staff': item.staff?.profile?.full_name,
          'Active Since': item.active_from,
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${reportType}_Report`);

    const filename = `PTF_${reportType}_Report_${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'csv') {
      XLSX.writeFile(workbook, filename, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center gap-4">
          <InstitutionalLogos height={22} className="hidden sm:flex" />
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
              EXECUTIVE ANALYTICS
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
              Institutional Reports &amp; Exports
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Filterable reporting across campuses (KTR: 153, BAB: 27, AP: 24), academics, and attendance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4 text-[#D4AF37]" />}
            onClick={() => handleExport('csv')}
            disabled={reportData.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-[#10B981]" />}
            onClick={() => handleExport('xlsx')}
            disabled={reportData.length === 0}
          >
            Export Excel (XLSX)
          </Button>
        </div>
      </div>

      {/* Report Categories Switcher */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { type: 'STUDENT', label: 'Scholar Directory', icon: <Users className="w-4 h-4" /> },
          { type: 'ATTENDANCE', label: 'Abdul Kalam Log', icon: <Clock className="w-4 h-4" /> },
          { type: 'CT_MARKS', label: 'CT Marks Breakdown', icon: <GraduationCap className="w-4 h-4" /> },
          { type: 'LEAVE', label: 'Leave & Permissions', icon: <FileCheck2 className="w-4 h-4" /> },
          { type: 'MAPPING', label: 'Staff Assignments', icon: <Building2 className="w-4 h-4" /> },
        ].map((btn) => (
          <button
            key={btn.type}
            onClick={() => setReportType(btn.type as ReportType)}
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              reportType === btn.type
                ? 'bg-[#0A192F] text-white border-[#0A192F] shadow-sm'
                : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#CBD5E1]'
            }`}
          >
            <span className={reportType === btn.type ? 'text-[#D4AF37]' : 'text-[#64748B]'}>
              {btn.icon}
            </span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="institutional-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:w-48">
          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
          >
            <option value="">All Campuses (Total 204)</option>
            <option value="SRM_KTR">SRM KTR (153)</option>
            <option value="SRM_BAB">SRM BAB (27)</option>
            <option value="SRM_AP">SRM AP (24)</option>
          </select>
        </div>
        <div className="text-xs text-[#64748B] ml-auto font-semibold">
          Showing {reportData.length} records
        </div>
      </div>

      {/* Data Table */}
      <div className="institutional-card p-6">
        {reportData.length === 0 ? (
          <EmptyState
            title="No Records Found for this Report"
            description="There are currently no matching records under this category. Once student or workflow data is recorded, it will be tabulated here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                  {reportType === 'STUDENT' && (
                    <>
                      <th className="py-3 px-4">Scholar ID</th>
                      <th className="py-3 px-4">Register No</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Dept</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  {reportType === 'ATTENDANCE' && (
                    <>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Session</th>
                      <th className="py-3 px-4">Scholar</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  {reportType === 'CT_MARKS' && (
                    <>
                      <th className="py-3 px-4">Scholar</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Test</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  {reportType === 'LEAVE' && (
                    <>
                      <th className="py-3 px-4">Scholar</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  {reportType === 'MAPPING' && (
                    <>
                      <th className="py-3 px-4">Scholar</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Assigned Faculty Advisor</th>
                      <th className="py-3 px-4">Active Since</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {reportData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                    {reportType === 'STUDENT' && (
                      <>
                        <td className="py-3 px-4 font-bold text-[#D4AF37]">{item.ptf_id}</td>
                        <td className="py-3 px-4 font-semibold text-[#0A192F]">{item.register_number}</td>
                        <td className="py-3 px-4 text-[#334155]">{item.profile?.full_name || 'Scholar'}</td>
                        <td className="py-3 px-4 text-[#64748B]">{item.campus?.code}</td>
                        <td className="py-3 px-4 text-[#64748B]">{item.department?.code}</td>
                        <td className="py-3 px-4"><Badge variant="success" size="sm">{item.status}</Badge></td>
                      </>
                    )}
                    {reportType === 'ATTENDANCE' && (
                      <>
                        <td className="py-3 px-4 font-bold text-[#0A192F]">{item.attendance_date}</td>
                        <td className="py-3 px-4 font-semibold text-[#D4AF37]">{item.session_type}</td>
                        <td className="py-3 px-4 text-[#334155]">{item.student?.profile?.full_name} ({item.student?.ptf_id})</td>
                        <td className="py-3 px-4 text-[#64748B]">{item.student?.campus?.code}</td>
                        <td className="py-3 px-4"><Badge variant={item.status === 'PRESENT' ? 'success' : 'error'} size="sm">{item.status}</Badge></td>
                      </>
                    )}
                    {reportType === 'CT_MARKS' && (
                      <>
                        <td className="py-3 px-4 font-bold text-[#0A192F]">{item.student?.ptf_id}</td>
                        <td className="py-3 px-4 text-[#334155]">{item.subject?.subject_name}</td>
                        <td className="py-3 px-4 text-[#64748B]">CT-{item.ct_test_number}</td>
                        <td className="py-3 px-4 font-bold text-[#D4AF37]">{item.mark_obtained} / {item.max_mark}</td>
                        <td className="py-3 px-4"><Badge variant="success" size="sm">{item.status}</Badge></td>
                      </>
                    )}
                    {reportType === 'LEAVE' && (
                      <>
                        <td className="py-3 px-4 font-bold text-[#0A192F]">{item.student?.ptf_id}</td>
                        <td className="py-3 px-4 text-[#334155]">{item.from_date} to {item.to_date}</td>
                        <td className="py-3 px-4 text-[#64748B] truncate max-w-xs">{item.reason}</td>
                        <td className="py-3 px-4"><Badge variant={item.status === 'APPROVED' ? 'success' : 'neutral'} size="sm">{item.status}</Badge></td>
                      </>
                    )}
                    {reportType === 'MAPPING' && (
                      <>
                        <td className="py-3 px-4 font-bold text-[#0A192F]">{item.student?.ptf_id} ({item.student?.profile?.full_name})</td>
                        <td className="py-3 px-4 text-[#64748B]">{item.student?.campus?.code}</td>
                        <td className="py-3 px-4 font-semibold text-[#10B981]">{item.staff?.profile?.full_name}</td>
                        <td className="py-3 px-4 text-[#64748B]">{new Date(item.active_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
