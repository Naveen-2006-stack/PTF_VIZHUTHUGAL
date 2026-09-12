'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { AcademicRecord, Semester } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { GraduationCap, Award, FileText, CheckCircle2 } from 'lucide-react';

export default function AcademicsPage() {
  const { role, student } = useAuth();
  const router = useRouter();
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();
  const isStudent = role === 'STUDENT';

  useEffect(() => {
    if (role === 'STAFF_MENTOR') {
      router.replace('/attendance/abdul-kalam');
    }
  }, [role, router]);

  useEffect(() => {
    async function loadRecords() {
      setIsLoading(true);
      try {
        let query = supabase
          .from('academic_records')
          .select('*, semester:semesters(*), student:students(*, profile:profiles(*))')
          .order('created_at', { ascending: false });

        if (isStudent && student) {
          query = query.eq('student_id', student.id);
        }

        const { data } = await query;
        if (data) setAcademicRecords(data as any);
      } catch (err) {
        console.error('Error loading academic records:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecords();
  }, [student, isStudent]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            ACADEMIC EXCELLENCE
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Academic Performance &amp; Grade Records
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            SGPA, CGPA, and semester progression certified by Puthiya Thalaimurai Foundation.
          </p>
        </div>

        <Link href="/academics/ct-marks">
          <Button variant="primary" size="md" leftIcon={<GraduationCap className="w-4 h-4 text-[#D4AF37]" />}>
            Cycle Test (CT) Marks →
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="institutional-card p-6 gold-accent-top">
          <span className="text-xs font-bold text-[#64748B] uppercase">Academic Standing</span>
          <p className="text-2xl font-extrabold text-[#0A192F] mt-1">Good Standing</p>
          <p className="text-xs text-[#10B981] mt-1 font-semibold">✓ Meets scholarship benchmark</p>
        </div>

        <div className="institutional-card p-6 gold-accent-top">
          <span className="text-xs font-bold text-[#64748B] uppercase">Cycle Test Verification</span>
          <p className="text-2xl font-extrabold text-[#0A192F] mt-1">Faculty Certified</p>
          <p className="text-xs text-[#64748B] mt-1">Staff-entered &amp; verified</p>
        </div>

        <div className="institutional-card p-6 gold-accent-top">
          <span className="text-xs font-bold text-[#64748B] uppercase">Overall Minimum Target</span>
          <p className="text-2xl font-extrabold text-[#D4AF37] mt-1">8.0+ CGPA</p>
          <p className="text-xs text-[#64748B] mt-1">Foundation merit honor</p>
        </div>
      </div>

      {/* Semesters Table */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
            Semester Grade Progression
          </h3>
        </div>

        {academicRecords.length === 0 ? (
          <EmptyState
            title="No Semester Grade Records Uploaded Yet"
            description="Semester marksheets and SGPA certificates will be listed here after examination cell verification."
            actionLabel="View Cycle Test (CT) Marks"
            onAction={() => {
              window.location.href = '/academics/ct-marks';
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">SGPA</th>
                  <th className="py-3 px-4">Cumulative CGPA</th>
                  <th className="py-3 px-4">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {academicRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-bold text-[#0A192F]">
                      Semester {rec.semester?.semester_number}
                    </td>
                    <td className="py-3 px-4 text-[#334155]">{rec.semester?.academic_year}</td>
                    <td className="py-3 px-4 font-extrabold text-[#D4AF37]">{rec.sgpa || '—'}</td>
                    <td className="py-3 px-4 font-extrabold text-[#0A192F]">{rec.cgpa || '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="success" size="sm" dot>
                        {rec.status}
                      </Badge>
                    </td>
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
