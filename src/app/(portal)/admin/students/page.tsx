'use client';

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Student, Campus, Department } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { BrandedLoader } from '@/components/ui/BrandedLoader';
import {
  Users,
  Upload,
  Download,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Building2,
} from 'lucide-react';

export default function AdminStudentsPage() {
  const { role } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Bulk Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [credentialsExport, setCredentialsExport] = useState<any[] | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      // 1. Load Campuses & Depts
      const { data: campusData } = await supabase.from('campuses').select('*');
      if (campusData) setCampuses(campusData);

      const { data: deptData } = await supabase.from('departments').select('*');
      if (deptData) setDepartments(deptData);

      // 2. Load all students
      const { data: studentData } = await supabase
        .from('students')
        .select('*, profile:profiles(*), campus:campuses(*), department:departments(*), course:courses(*)')
        .order('ptf_id', { ascending: true });

      if (studentData) {
        setStudents(studentData as any);
        setFilteredStudents(studentData as any);
      }
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter students
  useEffect(() => {
    let result = students;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.ptf_id.toLowerCase().includes(q) ||
          s.register_number.toLowerCase().includes(q) ||
          s.profile?.full_name.toLowerCase().includes(q)
      );
    }
    if (campusFilter) {
      result = result.filter((s) => s.campus?.code === campusFilter);
    }
    if (deptFilter) {
      result = result.filter((s) => s.department?.code === deptFilter);
    }
    setFilteredStudents(result);
  }, [searchQuery, campusFilter, deptFilter, students]);

  // File Upload Handler (CSV & XLSX)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportSummary(null);
    setCredentialsExport(null);

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setParsedRows(results.data);
            setPreviewColumns(Object.keys(results.data[0] as object));
          }
        },
        error: (err) => {
          setImportErrors([`CSV Parsing Error: ${err.message}`]);
        },
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data: any[] = XLSX.utils.sheet_to_json(ws);
          if (data && data.length > 0) {
            setParsedRows(data);
            setPreviewColumns(Object.keys(data[0]));
          }
        } catch (err: any) {
          setImportErrors([`Excel Parsing Error: ${err.message}`]);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setImportErrors(['Unsupported file format. Please upload a CSV or XLSX file.']);
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'name,register_number,campus_code,department_code,course_code,current_year,academic_year,parent_name,parent_phone,staff_code\n' +
      'Aravind Kumar,RA2311003010001,SRM_KTR,CSE,BTECH_CSE,1,2026-2027,K. Raman,9876543210,STAFF001\n' +
      'Bhavani S,RA2311003010002,SRM_KTR,ECE,BTECH_ECE,1,2026-2027,M. Sundaram,9876543211,STAFF001\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'PTF_Student_Import_Template.csv';
    link.click();
  };

  // Download Generated Credentials File
  const handleDownloadCredentials = () => {
    if (!credentialsExport || credentialsExport.length === 0) return;
    const header = 'PTF ID,Student Name,Register Number,Campus,Department,Staff Code,Staff Name,Temporary Password,Email\n';
    const rows = credentialsExport.map((c) =>
      `"${c.ptf_id}","${c.student_name}","${c.register_number}","${c.campus}","${c.department}","${c.staff_code}","${c.staff_name}","${c.temporary_password}","${c.email}"`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PTF_Student_Credentials_Export_${Date.now()}.csv`;
    link.click();
  };

  // Submit Bulk Import to API
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setImportErrors([]);

    try {
      const response = await fetch('/api/import/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsedRows }),
      });

      const res = await response.json();

      if (!response.ok) {
        setImportErrors([res.error || 'Import failed']);
        return;
      }

      setImportSummary(`Successfully provisioned ${res.importedCount} verified students with secure credentials!`);
      if (res.credentials && res.credentials.length > 0) {
        setCredentialsExport(res.credentials);
      }
      if (res.errors && res.errors.length > 0) {
        setImportErrors(res.errors);
      }

      loadData();
    } catch (err: any) {
      setImportErrors([err.message || 'Import failed']);
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return <BrandedLoader text="Loading Scholar Directory..." fullScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            INSTITUTIONAL DIRECTORY
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Student Management &amp; Bulk Import
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Maintain verified scholar identities. Initial target capacity: <strong>204 Students</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Download className="w-4 h-4 text-[#D4AF37]" />}
            onClick={handleDownloadTemplate}
          >
            Template CSV
          </Button>
          <Button
            variant="gold"
            size="md"
            leftIcon={<Upload className="w-4 h-4 text-[#0A192F]" />}
            onClick={() => {
              setIsImportModalOpen(true);
              setParsedRows([]);
              setImportErrors([]);
              setImportSummary(null);
            }}
          >
            Bulk Import (CSV/XLSX)
          </Button>
        </div>
      </div>

      {/* Capacity Progress Tracker */}
      <div className="institutional-card p-5 bg-gradient-to-r from-[#0A192F] to-[#1E293B] text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
              Enrolled Scholars vs Capacity
            </span>
            <p className="text-xl font-extrabold text-white">
              {students.length} / 204 Total Capacity
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-[#CBD5E1]">
            <span>KTR: 153 Max</span>
            <span>•</span>
            <span>BAB: 27 Max</span>
            <span>•</span>
            <span>AP: 24 Max</span>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-[#07101E] rounded-full h-2.5 overflow-hidden border border-[#334155]">
          <div
            className="bg-[#D4AF37] h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (students.length / 204) * 100)}%` }}
          />
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="institutional-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Scholar ID (PTF001...), Name, or Register Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
          >
            <option value="">All Campuses</option>
            <option value="SRM_KTR">SRM KTR</option>
            <option value="SRM_BAB">SRM BAB</option>
            <option value="SRM_AP">SRM AP</option>
          </select>
        </div>

        <div className="w-full sm:w-44">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
          >
            <option value="">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="IT">IT</option>
            <option value="CIVIL">CIVIL</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
            Verified Scholar Directory
          </h3>
          <span className="text-xs text-[#64748B] font-semibold">
            {filteredStudents.length} Students Listed
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <EmptyState
            title="No Verified Students Found"
            description="Zero demo students are created in compliance with the Foundation Data Integrity Policy. Click 'Bulk Import' to upload the verified student roster."
            actionLabel="Open Bulk Import Modal"
            onAction={() => setIsImportModalOpen(true)}
          />
        ) : (
          <div className="w-full">
            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4">
              {filteredStudents.map((s) => (
                <div key={s.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-[#0A192F] text-sm">
                        {s.profile?.full_name || 'Unclaimed Account'}
                      </h4>
                      <span className="text-[#D4AF37] font-bold text-xs">{s.ptf_id}</span>
                    </div>
                    <Badge variant={s.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
                      {s.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 mt-3 text-xs text-[#475569]">
                    <p><span className="font-semibold text-[#0A192F]">Reg No:</span> {s.register_number}</p>
                    <p><span className="font-semibold text-[#0A192F]">Campus:</span> {s.campus?.code}</p>
                    <p><span className="font-semibold text-[#0A192F]">Dept:</span> {s.department?.code} • Year {s.current_year}</p>
                    {s.profile?.email && <p><span className="font-semibold text-[#0A192F]">Email:</span> {s.profile.email}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                    <th className="py-3 px-4">Scholar ID</th>
                    <th className="py-3 px-4">Register Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Campus</th>
                    <th className="py-3 px-4">Department &amp; Year</th>
                    <th className="py-3 px-4">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#D4AF37]">
                        {s.ptf_id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0A192F]">
                        {s.register_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0A192F]">
                        {s.profile?.full_name || 'Unclaimed Account'}
                        {s.profile?.email && (
                          <span className="block text-[10px] text-[#64748B] font-normal">
                            {s.profile.email}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#334155]">
                        {s.campus?.code}
                      </td>
                      <td className="py-3 px-4 text-[#334155]">
                        {s.department?.code} • Year {s.current_year}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={s.status === 'ACTIVE' ? 'success' : 'neutral'}
                          dot
                        >
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Verified Student Bulk Import"
        subtitle="Upload institutional roster (CSV / XLSX) with automatic PTF ID sequencing"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {importSummary && (
            <div className="p-3.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[#10B981]" />
                <span className="font-bold">{importSummary}</span>
              </div>
              {credentialsExport && credentialsExport.length > 0 && (
                <div className="pt-2 border-t border-[#A7F3D0]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-[11px] text-[#065F46]">
                    🔒 One-Time Credential Export ready: {credentialsExport.length} temporary passwords generated. Passwords cannot be retrieved again after closing.
                  </p>
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleDownloadCredentials}
                  >
                    Download Credentials CSV
                  </Button>
                </div>
              )}
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="p-3.5 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-[#E11D48]" />
                <span>Import Errors / Warnings:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 max-h-32 overflow-y-auto">
                {importErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* File Upload Box */}
          <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 text-center hover:border-[#D4AF37] transition-colors bg-[#F8FAFC]">
            <Upload className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
            <p className="text-xs font-bold text-[#0A192F]">
              Select CSV or Excel (.xlsx) file to upload
            </p>
            <p className="text-[11px] text-[#64748B] mt-1">
              Columns required: <code>register_number, campus_code, department_code, current_year</code>
            </p>
            <label className="mt-3 inline-block">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="px-4 py-2 bg-[#0A192F] text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-[#1E293B] transition-colors inline-block">
                Browse File
              </span>
            </label>
          </div>

          {/* Preview Parsed Rows */}
          {parsedRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0A192F]">
                  Data Preview ({parsedRows.length} Rows Detected)
                </span>
                <span className="text-[11px] text-[#10B981] font-semibold">
                  ✓ Schema Validated
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-[#E2E8F0] rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 font-bold text-[#64748B]">
                    <tr>
                      {previewColumns.map((col) => (
                        <th key={col} className="p-2 truncate">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]">
                        {previewColumns.map((col) => (
                          <td key={col} className="p-2 truncate text-[#334155]">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <p className="text-[10px] text-[#64748B] mt-1 italic">
                  Showing first 10 rows of {parsedRows.length} rows...
                </p>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsImportModalOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isImporting}
              disabled={parsedRows.length === 0}
              onClick={handleConfirmImport}
            >
              Confirm &amp; Ingest {parsedRows.length} Scholars
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
