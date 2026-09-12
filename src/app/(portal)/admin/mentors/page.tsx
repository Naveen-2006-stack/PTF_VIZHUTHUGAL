'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Student, Campus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  CalendarCheck2,
  Upload,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import Papa from 'papaparse';

interface StudentEligibilityRow {
  student: Student;
  is_eligible: boolean;
  valid_from?: string;
}

export default function AbdulKalamEligibilityPage() {
  const { role, profile } = useAuth();
  const [studentsList, setStudentsList] = useState<StudentEligibilityRow[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState('ALL');
  const [eligibilityFilter, setEligibilityFilter] = useState<'ALL' | 'ELIGIBLE' | 'INELIGIBLE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const { data: cData } = await supabase.from('campuses').select('*');
      if (cData) setCampuses(cData);

      // 1. Load all active students
      const { data: allStudents } = await supabase
        .from('students')
        .select('*, profile:profiles(*), department:departments(*), campus:campuses(*)')
        .eq('status', 'ACTIVE')
        .order('ptf_id', { ascending: true });

      // 2. Load special_class_eligibility
      const { data: eligibilityData } = await supabase
        .from('special_class_eligibility')
        .select('*');

      const eligibilityMap = new Map((eligibilityData || []).map((e) => [e.student_id, e]));

      if (allStudents) {
        const rows: StudentEligibilityRow[] = (allStudents as any).map((st: Student) => {
          const rec = eligibilityMap.get(st.id);
          return {
            student: st,
            is_eligible: rec ? rec.is_eligible : false,
            valid_from: rec?.valid_from,
          };
        });
        setStudentsList(rows);
      }
    } catch (err) {
      console.error('Error loading eligibility data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Toggle single student eligibility
  const handleToggleEligibility = async (studentId: string, currentStatus: boolean, ptfId: string) => {
    try {
      const newStatus = !currentStatus;
      const res = await fetch('/api/import/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          is_eligible: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update eligibility');

      // Update local state
      setStudentsList((prev) =>
        prev.map((item) =>
          item.student.id === studentId ? { ...item, is_eligible: newStatus } : item
        )
      );

      setFeedback({
        type: 'success',
        message: `${ptfId} eligibility updated to ${newStatus ? 'ELIGIBLE' : 'INELIGIBLE'}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // CSV/Excel Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleProcessImport = () => {
    if (!importFile) return;
    setIsImporting(true);
    setFeedback(null);

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const formatted = rows.map((r) => ({
            ptf_id: r['PTF ID'] || r.ptf_id || r.ptfId,
            student_name: r['Student Name'] || r.name || r.full_name,
            eligible: r['Eligible'] || r.eligible || r.is_eligible,
          }));

          const response = await fetch('/api/import/eligibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eligibility: formatted }),
          });

          const resData = await response.json();
          if (!response.ok) throw new Error(resData.error || 'Import failed');

          setFeedback({
            type: 'success',
            message: `Successfully updated eligibility for ${resData.updatedCount} students!`,
          });
          setIsImportModalOpen(false);
          setImportFile(null);
          loadData();
        } catch (err: any) {
          setFeedback({ type: 'error', message: err.message });
        } finally {
          setIsImporting(false);
        }
      },
      error: (err) => {
        setIsImporting(false);
        setFeedback({ type: 'error', message: `CSV parse error: ${err.message}` });
      },
    });
  };

  // Template Download
  const downloadTemplate = () => {
    const csv = 'PTF ID,Student Name,Eligible\nPTF001,Student Demo,YES\nPTF002,Example Scholar,NO\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'abdul_kalam_eligibility_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter list
  const filteredRows = studentsList.filter((row) => {
    if (selectedCampus !== 'ALL' && row.student.campus?.code !== selectedCampus) return false;
    if (eligibilityFilter === 'ELIGIBLE' && !row.is_eligible) return false;
    if (eligibilityFilter === 'INELIGIBLE' && row.is_eligible) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      row.student.ptf_id.toLowerCase().includes(q) ||
      row.student.register_number.toLowerCase().includes(q) ||
      (row.student.profile?.full_name || '').toLowerCase().includes(q)
    );
  });

  const totalEligible = studentsList.filter((r) => r.is_eligible).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            STUDENT RELATIONSHIP ATTRIBUTE
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Abdul Kalam Class Eligibility Management
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Section 8: Abdul Kalam Class is not a role; it is a student attribute. Only eligible scholars can view the tab and have attendance recorded.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={downloadTemplate}
            >
              CSV Template
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Upload className="w-4 h-4 text-[#D4AF37]" />}
              onClick={() => setIsImportModalOpen(true)}
            >
              Upload Eligibility CSV
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

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="institutional-card p-5 gold-accent-top">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Total Active Students</span>
          <p className="text-2xl font-extrabold text-[#0A192F] mt-1">{studentsList.length}</p>
        </div>
        <div className="institutional-card p-5 gold-accent-top">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Kalam Eligible Cohort</span>
          <p className="text-2xl font-extrabold text-[#10B981] mt-1">{totalEligible}</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Students with active portal tab</p>
        </div>
        <div className="institutional-card p-5 gold-accent-top">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Ineligible Scholars</span>
          <p className="text-2xl font-extrabold text-[#94A3B8] mt-1">
            {studentsList.length - totalEligible}
          </p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Tab strictly hidden &amp; backend blocked</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="institutional-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Campus</label>
          <select
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
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
          <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">
            Eligibility Status
          </label>
          <select
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value as any)}
            className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
          >
            <option value="ALL">All Students</option>
            <option value="ELIGIBLE">Eligible Only (YES)</option>
            <option value="INELIGIBLE">Ineligible Only (NO)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Search</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search PTF ID, Reg No, Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
            />
          </div>
        </div>
      </div>

      {/* Student Eligibility Table */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
            Student Eligibility Roster ({filteredRows.length})
          </h3>
          <span className="text-xs text-[#64748B] font-semibold">
            Super Admin controlled
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <EmptyState
            title="No Students Found"
            description="No student records match the selected filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">PTF ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Register No</th>
                  <th className="py-3 px-4">Campus &amp; Dept</th>
                  <th className="py-3 px-4">Eligibility Status</th>
                  <th className="py-3 px-4 text-right">Quick Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredRows.map((row) => (
                  <tr key={row.student.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0A192F]">{row.student.ptf_id}</td>
                    <td className="py-3 px-4 font-semibold text-[#0A192F]">
                      {row.student.profile?.full_name}
                    </td>
                    <td className="py-3 px-4 text-[#475569]">{row.student.register_number}</td>
                    <td className="py-3 px-4 text-[#475569]">
                      {row.student.campus?.code} • {row.student.department?.code}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={row.is_eligible ? 'success' : 'neutral'} dot>
                        {row.is_eligible ? 'ELIGIBLE (YES)' : 'INELIGIBLE (NO)'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isSuperAdmin ? (
                        <Button
                          variant={row.is_eligible ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() =>
                            handleToggleEligibility(
                              row.student.id,
                              row.is_eligible,
                              row.student.ptf_id
                            )
                          }
                        >
                          {row.is_eligible ? 'Mark Ineligible' : 'Grant Eligibility'}
                        </Button>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8]">Read Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV/Excel Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Abdul Kalam Class Eligibility"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#64748B]">
            Upload an official Excel/CSV containing columns: <strong>PTF ID</strong>, <strong>Student Name</strong>, and <strong>Eligible</strong> (YES / NO).
          </p>

          <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 text-center bg-[#F8FAFC]">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <p className="text-xs font-bold text-[#0A192F]">
              {importFile ? importFile.name : 'Select CSV file to import'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose CSV File
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleProcessImport}
              disabled={!importFile || isImporting}
            >
              {isImporting ? 'Processing Import...' : 'Import Eligibility'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
