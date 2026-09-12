'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Student } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, Filter, GraduationCap, Eye, UserCheck, Phone, Mail } from 'lucide-react';

import { useRouter } from 'next/navigation';

export default function MyStudentsPage() {
  const { role, staff } = useAuth();
  const router = useRouter();
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (role === 'STAFF_MENTOR') {
      router.replace('/attendance/abdul-kalam');
    }
  }, [role, router]);

  useEffect(() => {
    async function loadMyStudents() {
      setIsLoading(true);
      try {
        if (!staff && role !== 'SUPER_ADMIN') {
          setIsLoading(false);
          return;
        }

        let query = supabase
          .from('staff_student_assignments')
          .select('*, student:students(*, profile:profiles(*), department:departments(*), course:courses(*), campus:campuses(*))')
          .eq('is_active', true);

        if (staff && role === 'STAFF_MENTOR') {
          query = query.eq('staff_id', staff.id);
        }

        const { data } = await query;

        if (data) {
          const studentsList = data
            .map((item: any) => item.student)
            .filter((s): s is Student => Boolean(s));
          setAssignedStudents(studentsList);
          setFilteredStudents(studentsList);
        }
      } catch (err) {
        console.error('Error loading assigned students:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMyStudents();
  }, [staff, role]);

  useEffect(() => {
    let result = assignedStudents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.ptf_id.toLowerCase().includes(q) ||
          s.register_number.toLowerCase().includes(q) ||
          s.profile?.full_name.toLowerCase().includes(q)
      );
    }
    if (departmentFilter) {
      result = result.filter((s) => s.department?.code === departmentFilter);
    }
    setFilteredStudents(result);
  }, [searchQuery, departmentFilter, assignedStudents]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            FACULTY ROSTER
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            My Assigned Students
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Scholars officially mapped to your mentorship under the Vizhuthugal scheme.
          </p>
        </div>
        <div className="text-xs font-bold bg-[#0A192F] text-white px-3.5 py-1.5 rounded-full self-start sm:self-auto">
          Assigned Scholars: {assignedStudents.length}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="institutional-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Scholar ID, Name, or University Reg No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
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

      {/* Assigned Students Grid / Table */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          title="No Assigned Students Found"
          description={
            assignedStudents.length === 0
              ? 'You have not been assigned any students yet. When students select you in the Mapping Workflow and you approve them, they will appear here.'
              : 'No students matched your search criteria.'
          }
          actionLabel="Check Mapping Requests"
          onAction={() => {
            window.location.href = '/staff-mapping';
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredStudents.map((s) => (
            <div key={s.id} className="institutional-card p-5 flex flex-col justify-between gold-accent-top">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-wider uppercase">
                    {s.ptf_id}
                  </span>
                  <Badge variant="success" size="sm" dot>
                    Active
                  </Badge>
                </div>
                <h4 className="text-base font-bold text-[#0A192F]">{s.profile?.full_name || 'Scholar'}</h4>
                <p className="text-xs text-[#64748B] font-medium">Reg: {s.register_number}</p>

                <div className="mt-4 pt-3 border-t border-[#F1F5F9] space-y-1.5 text-xs text-[#334155]">
                  <p><strong>Campus:</strong> {s.campus?.name}</p>
                  <p><strong>Department:</strong> {s.department?.name} ({s.department?.code})</p>
                  <p><strong>Current Year:</strong> Year {s.current_year} (Academic {s.academic_year})</p>
                  {s.profile?.email && (
                    <p className="flex items-center gap-1.5 text-[#64748B] truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{s.profile.email}</span>
                    </p>
                  )}
                  {s.parent_phone && (
                    <p className="flex items-center gap-1.5 text-[#64748B]">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{s.parent_phone}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                <Link href={`/academics/ct-marks?studentId=${s.id}`}>
                  <Button variant="outline" size="sm" leftIcon={<GraduationCap className="w-3.5 h-3.5" />}>
                    Enter CT Marks
                  </Button>
                </Link>
                <Link href={`/attendance?studentId=${s.id}`}>
                  <Button variant="ghost" size="sm">
                    Attendance Log →
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
