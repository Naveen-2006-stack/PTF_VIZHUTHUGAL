'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Semester, Student } from '@/types';
import {
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Users,
  User,
  CheckSquare,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  generateAcademicExcel,
  generateAcademicCSV,
  buildExportFilename,
  StudentMarkSheetRecord,
  ExportMetadata,
} from '@/lib/academic-export';

interface ExportMarkSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: Semester[];
  currentSemesterId?: string;
  currentStudent?: Student | null;
  allStudents?: Student[];
}

type ExportScope = 'CURRENT_STUDENT' | 'SELECTED_STUDENTS' | 'ALL_STUDENTS';
type ExportFormat = 'xlsx' | 'csv';

export const ExportMarkSheetModal: React.FC<ExportMarkSheetModalProps> = ({
  isOpen,
  onClose,
  semesters,
  currentSemesterId,
  currentStudent,
  allStudents = [],
}) => {
  const [scope, setScope] = useState<ExportScope>(
    currentStudent ? 'CURRENT_STUDENT' : 'ALL_STUDENTS'
  );
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(
    currentSemesterId || (semesters.find((s) => s.is_current)?.id || (semesters[0]?.id || ''))
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    currentStudent ? [currentStudent.id] : []
  );
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Toggle student selection for 'SELECTED_STUDENTS'
  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === allStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(allStudents.map((s) => s.id));
    }
  };

  const handleDownload = async () => {
    setFeedback(null);

    if (scope === 'SELECTED_STUDENTS' && selectedStudentIds.length === 0) {
      setFeedback({
        type: 'warning',
        message: 'Please select at least one student for the export.',
      });
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch('/api/academics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          studentId: currentStudent?.id,
          studentIds: selectedStudentIds,
          semesterId: selectedSemesterId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Unable to generate the mark sheet. Please try again.');
      }

      const { records, metadata }: { records: StudentMarkSheetRecord[]; metadata: ExportMetadata } =
        await response.json();

      if (!records || records.length === 0) {
        setFeedback({
          type: 'warning',
          message: 'No academic records available for the selected filters.',
        });
        return;
      }

      const activeSem = semesters.find((s) => s.id === selectedSemesterId);
      const semNumber = activeSem?.semester_number || metadata.semesterText?.replace(/\D/g, '') || 3;
      const acadYear = activeSem?.academic_year || metadata.academicYear || '2026-27';

      const filename = buildExportFilename(
        scope === 'CURRENT_STUDENT' ? 'single' : 'bulk',
        format,
        {
          studentName: scope === 'CURRENT_STUDENT' ? records[0]?.studentName : undefined,
          campusCode: records[0]?.campusCode,
          semesterNumber: semNumber,
          academicYear: acadYear,
        }
      );

      if (format === 'xlsx') {
        generateAcademicExcel(records, metadata, filename);
      } else {
        generateAcademicCSV(records, metadata, filename);
      }

      setFeedback({
        type: 'success',
        message: 'Mark sheet downloaded successfully.',
      });

      setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 1500);
    } catch (err: any) {
      console.error('Download mark sheet error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to generate the mark sheet. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Academic Mark Sheet" maxWidth="lg">
      <div className="space-y-5">
        <p className="text-xs text-[#64748B]">
          Download scholar Cycle Test marks and academic standings as a certified institutional report.
        </p>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
              feedback.type === 'success'
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                : feedback.type === 'warning'
                ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                : 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]'
            }`}
          >
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />}
            {feedback.type === 'warning' && <AlertCircle className="w-4 h-4 shrink-0 text-[#D97706]" />}
            {feedback.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* 1. Scope Selector */}
        <div>
          <label className="block text-[11px] font-bold text-[#0A192F] uppercase tracking-wider mb-2">
            1. Select Export Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {currentStudent && (
              <button
                type="button"
                onClick={() => setScope('CURRENT_STUDENT')}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  scope === 'CURRENT_STUDENT'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]'
                    : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className={`w-4 h-4 ${scope === 'CURRENT_STUDENT' ? 'text-[#D4AF37]' : 'text-[#64748B]'}`} />
                  <span className="text-xs font-bold text-[#0A192F]">Current Student</span>
                </div>
                <span className="text-[11px] text-[#64748B] mt-1 truncate">
                  {currentStudent.profile?.full_name || currentStudent.ptf_id}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setScope('ALL_STUDENTS')}
              className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                scope === 'ALL_STUDENTS'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]'
                  : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${scope === 'ALL_STUDENTS' ? 'text-[#D4AF37]' : 'text-[#64748B]'}`} />
                <span className="text-xs font-bold text-[#0A192F]">All Students</span>
              </div>
              <span className="text-[11px] text-[#64748B] mt-1">
                All scholars in current scope ({allStudents.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScope('SELECTED_STUDENTS')}
              className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                scope === 'SELECTED_STUDENTS'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]'
                  : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckSquare className={`w-4 h-4 ${scope === 'SELECTED_STUDENTS' ? 'text-[#D4AF37]' : 'text-[#64748B]'}`} />
                <span className="text-xs font-bold text-[#0A192F]">Selected Students</span>
              </div>
              <span className="text-[11px] text-[#64748B] mt-1">
                {selectedStudentIds.length} chosen
              </span>
            </button>
          </div>
        </div>

        {/* Selected Students Checklist (if scope is SELECTED_STUDENTS) */}
        {scope === 'SELECTED_STUDENTS' && (
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] uppercase">Choose Scholars</span>
              <button
                type="button"
                onClick={handleSelectAllStudents}
                className="text-[11px] font-bold text-[#0A192F] hover:text-[#D4AF37] underline cursor-pointer"
              >
                {selectedStudentIds.length === allStudents.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {allStudents.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2.5 text-xs text-[#0A192F] p-1.5 rounded-lg hover:bg-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(s.id)}
                    onChange={() => toggleStudentSelection(s.id)}
                    className="rounded border-[#CBD5E1] text-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <span className="font-bold">{s.ptf_id}</span>
                  <span className="truncate text-[#334155]">{s.profile?.full_name}</span>
                  <span className="text-[10px] text-[#64748B] ml-auto">{s.register_number}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 2. Semester Filter */}
        <div>
          <label className="block text-[11px] font-bold text-[#0A192F] uppercase tracking-wider mb-1.5">
            2. Academic Semester
          </label>
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="w-full py-2.5 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-semibold text-[#0A192F] focus:ring-2 focus:ring-[#D4AF37]"
          >
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                Semester {sem.semester_number} ({sem.academic_year})
                {sem.is_current ? ' - Current Academic Term' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Export Format */}
        <div>
          <label className="block text-[11px] font-bold text-[#0A192F] uppercase tracking-wider mb-2">
            3. File Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                format === 'xlsx'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]'
                  : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
              }`}
            >
              <FileSpreadsheet className={`w-5 h-5 shrink-0 mt-0.5 ${format === 'xlsx' ? 'text-[#D4AF37]' : 'text-[#64748B]'}`} />
              <div>
                <p className="text-xs font-bold text-[#0A192F]">Excel (.xlsx)</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Official format with vertically merged student cells, formatted headers, and printable layout.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                format === 'csv'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]'
                  : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
              }`}
            >
              <FileText className={`w-5 h-5 shrink-0 mt-0.5 ${format === 'csv' ? 'text-[#D4AF37]' : 'text-[#64748B]'}`} />
              <div>
                <p className="text-xs font-bold text-[#0A192F]">CSV (.csv)</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Flat normalized table with repeated student information on each row for external imports.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleDownload}
            disabled={isExporting}
            leftIcon={
              isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
              ) : (
                <Download className="w-4 h-4 text-[#D4AF37]" />
              )
            }
          >
            {isExporting ? 'Preparing mark sheet...' : 'Download Mark Sheet'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
