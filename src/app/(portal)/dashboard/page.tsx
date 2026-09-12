'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Award,
  SunMedium,
  CalendarCheck2,
  FileCheck2,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  UserCheck2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { InstitutionalLogos } from '@/components/branding/InstitutionalLogos';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardPage() {
  const { role, profile, student, staff, campusCode, isSpecialClassEligible } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    ktrStudents: 0,
    babStudents: 0,
    apStudents: 0,
    pendingLeaves: 0,
    pendingPermissions: 0,
    kalamEligibleCount: 0,
    todayAttendanceMarkedCount: 0,
  });
  const [todayAttendanceMarked, setTodayAttendanceMarked] = useState<string | null>(null);
  const [activeMappingStaff, setActiveMappingStaff] = useState<string | null>(null);

  const supabase = createClient();
  const currentRole = role || 'SUPER_ADMIN';

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Load campus counts
        const { data: studentsData } = await supabase
          .from('students')
          .select('campus:campuses(code)');

        if (studentsData) {
          const total = studentsData.length;
          const ktr = studentsData.filter((s: any) => s.campus?.code === 'SRM_KTR').length;
          const bab = studentsData.filter((s: any) => s.campus?.code === 'SRM_BAB').length;
          const ap = studentsData.filter((s: any) => s.campus?.code === 'SRM_AP').length;
          setStats((prev) => ({
            ...prev,
            totalStudents: total,
            ktrStudents: ktr,
            babStudents: bab,
            apStudents: ap,
          }));
        }

        // Pending Leaves
        const { count: leaveCount } = await supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'SUBMITTED');

        // Pending Permissions
        const { count: permCount } = await supabase
          .from('permission_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'SUBMITTED');

        // Kalam Eligible Count
        const { count: eligibleCount } = await supabase
          .from('special_class_eligibility')
          .select('*', { count: 'exact', head: true })
          .eq('is_eligible', true);

        // Today's attendance records count
        const todayStr = new Date().toISOString().split('T')[0];
        const { count: todayAttCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_date', todayStr);

        setStats((prev) => ({
          ...prev,
          pendingLeaves: leaveCount || 0,
          pendingPermissions: permCount || 0,
          kalamEligibleCount: eligibleCount || 0,
          todayAttendanceMarkedCount: todayAttCount || 0,
        }));

        // If student: Check today's Abdul Kalam attendance & active staff mapping
        if (student) {
          const { data: attData } = await supabase
            .from('attendance')
            .select('session_type, status')
            .eq('student_id', student.id)
            .eq('attendance_date', todayStr)
            .maybeSingle();

          if (attData) {
            setTodayAttendanceMarked(`${attData.session_type} (${attData.status})`);
          }

          // Check active staff mapping
          const { data: assignData } = await supabase
            .from('staff_student_assignments')
            .select('staff:staff_profiles(staff_code, profile:profiles(full_name))')
            .eq('student_id', student.id)
            .eq('is_active', true)
            .maybeSingle();

          if (assignData && (assignData as any).staff?.profile) {
            setActiveMappingStaff(`${(assignData as any).staff.profile.full_name} (${(assignData as any).staff.staff_code})`);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard counts:', err);
      }
    }

    loadDashboardData();
  }, [student, staff]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  /* -------------------------------------------------------------
     1. STUDENT DASHBOARD
  ------------------------------------------------------------- */
  if (currentRole === 'STUDENT') {
    return (
      <div className="space-y-6">
        {/* Personalized Banner */}
        <div className="relative rounded-2xl bg-[#0A192F] text-white p-6 sm:p-8 overflow-hidden shadow-xl border border-[#1E293B]">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase font-bold tracking-widest text-[#D4AF37]">
                  PUTHIYA THALAIMURAI FOUNDATION
                </span>
                <span className="text-[#64748B]">•</span>
                <span className="text-xs text-[#94A3B8] font-semibold">Scholar Fellow</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {getGreeting()}, {profile?.full_name || 'Scholar'} 👋
              </h2>
              <p className="text-sm text-[#CBD5E1] mt-1 italic font-medium">
                “Discipline today. A better tomorrow.”
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-[#1E293B]">
                <div className="text-xs bg-[#1E293B] text-white px-3 py-1 rounded-full font-bold border border-[#334155]">
                  Scholar ID: {student?.ptf_id || 'PTF-PROVISIONING'}
                </div>
                <div className="text-xs bg-[#1E293B] text-[#D4AF37] px-3 py-1 rounded-full font-bold border border-[#334155]">
                  {student?.department?.code || 'Engineering'} • Year {student?.current_year || 1}
                </div>
                {activeMappingStaff ? (
                  <div className="text-xs text-[#10B981] bg-[#ECFDF5]/10 px-3 py-1 rounded-full font-medium border border-[#10B981]/30">
                    Staff Mentor: {activeMappingStaff}
                  </div>
                ) : (
                  <div className="text-xs text-[#94A3B8] bg-[#1E293B] px-3 py-1 rounded-full font-medium border border-[#334155]">
                    Staff: Pending Super Admin Allocation
                  </div>
                )}
              </div>
            </div>

            <InstitutionalLogos height={24} className="shrink-0" />
          </div>
        </div>

        {/* Primary Student Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Link href="/academics/ct-marks">
            <StatCard
              title="Cycle Test (CT) Marks"
              value="My Marksheet"
              subtitle="Self-entry with proof upload"
              badgeText="Student Entry"
              badgeVariant="gold"
              icon={<GraduationCap className="w-5 h-5 text-[#0A192F]" />}
              accentColor="#D4AF37"
            />
          </Link>
          <Link href="/scholarship">
            <StatCard
              title="Scholarship Renewal"
              value="Renewal Status"
              subtitle="Academic Year 2026-2027"
              badgeText="Active"
              badgeVariant="success"
              icon={<Award className="w-5 h-5 text-[#10B981]" />}
              accentColor="#10B981"
            />
          </Link>
          <Link href="/summer-activity">
            <StatCard
              title="Summer Activity"
              value="Activity Diary"
              subtitle="Submit social service logs"
              badgeText="Open"
              badgeVariant="neutral"
              icon={<SunMedium className="w-5 h-5 text-[#F59E0B]" />}
              accentColor="#F59E0B"
            />
          </Link>
          {isSpecialClassEligible ? (
            <Link href="/attendance/abdul-kalam">
              <StatCard
                title="Abdul Kalam Class"
                value={todayAttendanceMarked || 'Not Marked Yet'}
                subtitle="1 session/day strictly enforced"
                badgeText={todayAttendanceMarked ? 'Recorded' : 'Eligible'}
                badgeVariant={todayAttendanceMarked ? 'success' : 'warning'}
                icon={<CalendarCheck2 className="w-5 h-5 text-[#0A192F]" />}
                accentColor="#0A192F"
              />
            </Link>
          ) : (
            <StatCard
              title="Abdul Kalam Class"
              value="Not Enrolled"
              subtitle="Special cohort attribute"
              badgeText="Ineligible"
              badgeVariant="neutral"
              icon={<CalendarCheck2 className="w-5 h-5 text-[#64748B]" />}
              accentColor="#94A3B8"
            />
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link href="/leave-permission" className="block">
            <div className="institutional-card p-4 text-center hover:border-[#D4AF37] transition-all">
              <FileCheck2 className="w-6 h-6 text-[#0A192F] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#0A192F]">Apply Leave</p>
              <p className="text-[10px] text-[#64748B] mt-0.5">Medical / Personal</p>
            </div>
          </Link>
          <Link href="/leave-permission" className="block">
            <div className="institutional-card p-4 text-center hover:border-[#D4AF37] transition-all">
              <Calendar className="w-6 h-6 text-[#0A192F] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#0A192F]">Request Permission</p>
              <p className="text-[10px] text-[#64748B] mt-0.5">On-Duty / Events</p>
            </div>
          </Link>
          <Link href="/profile#password" className="block">
            <div className="institutional-card p-4 text-center hover:border-[#D4AF37] transition-all">
              <ShieldCheck className="w-6 h-6 text-[#0A192F] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#0A192F]">Change Password</p>
              <p className="text-[10px] text-[#64748B] mt-0.5">Security Settings</p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     2. STAFF_MENTOR DASHBOARD (ABDUL KALAM ATTENDANCE ONLY)
  ------------------------------------------------------------- */
  if (currentRole === 'STAFF_MENTOR') {
    return (
      <div className="space-y-6">
        <div className="bg-[#0A192F] text-white p-6 sm:p-8 rounded-2xl border border-[#1E293B] shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest">
                STAFF / MENTOR ATTENDANCE CONSOLE
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-xs text-[#94A3B8] font-semibold">Puthiya Thalaimurai Foundation</span>
            </div>
            <h2 className="text-2xl font-extrabold mt-1">
              Dr. APJ Abdul Kalam Special Class Attendance
            </h2>
            <p className="text-xs text-[#CBD5E1] mt-1 max-w-2xl">
              You are authorized exclusively for recording daily Abdul Kalam Special Class attendance for eligible scholars.
              Enforces strict institutional rule: <strong>Maximum ONE session per student per date</strong>.
            </p>
          </div>

          <InstitutionalLogos height={24} className="shrink-0" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="institutional-card p-6 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl w-fit text-[#0A192F] mb-4">
                <Clock className="w-6 h-6 text-[#0A192F]" />
              </div>
              <h3 className="text-base font-bold text-[#0A192F]">Morning Session</h3>
              <p className="text-xs text-[#D4AF37] font-bold mt-0.5">5:30 AM – 7:00 AM</p>
              <p className="text-xs text-[#64748B] mt-2">
                Mark attendance for eligible scholars present in the morning drill. Automatically prevents attendance recording in the evening for the same student on this date.
              </p>
            </div>
            <Link href="/attendance/abdul-kalam?session=MORNING" className="mt-6">
              <Button variant="primary" size="md" className="w-full font-bold">
                Open Morning Session Attendance
              </Button>
            </Link>
          </div>

          <div className="institutional-card p-6 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl w-fit text-[#0A192F] mb-4">
                <Clock className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="text-base font-bold text-[#0A192F]">Evening Session</h3>
              <p className="text-xs text-[#D4AF37] font-bold mt-0.5">5:30 PM – 7:00 PM</p>
              <p className="text-xs text-[#64748B] mt-2">
                Mark attendance for eligible scholars present in the evening class. Automatically blocks students who were already marked in the morning.
              </p>
            </div>
            <Link href="/attendance/abdul-kalam?session=EVENING" className="mt-6">
              <Button variant="gold" size="md" className="w-full font-bold">
                Open Evening Session Attendance
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick link to Attendance History */}
        <div className="institutional-card p-5 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#0A192F]">Attendance History &amp; Logs</h4>
            <p className="text-xs text-[#64748B] mt-0.5">Review previously submitted session records and timestamps.</p>
          </div>
          <Link href="/attendance">
            <Button variant="outline" size="sm">
              View History →
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     3. PTF SECRETARY DASHBOARD (MONITORING / READ-ONLY)
  ------------------------------------------------------------- */
  if (currentRole === 'PTF_SECRETARY') {
    return (
      <div className="space-y-6">
        <div className="bg-[#0A192F] text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-[#1E293B] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest">
              EXECUTIVE MONITORING CONSOLE
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-1">
              Foundation Monitoring Overview
            </h2>
            <p className="text-xs text-[#CBD5E1] mt-1">
              PTF Secretary oversight dashboard: Real-time read-only summaries of enrollment, academics, attendance, and welfare workflows.
            </p>
          </div>

          <InstitutionalLogos height={24} className="shrink-0" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            subtitle="Verified foundation scholars"
            badgeText="Enrolled"
            badgeVariant="gold"
            icon={<Users className="w-5 h-5 text-[#0A192F]" />}
            accentColor="#D4AF37"
          />
          <StatCard
            title="Kalam Class Cohort"
            value={stats.kalamEligibleCount}
            subtitle="Eligible for special classes"
            badgeText="Active Cohort"
            badgeVariant="navy"
            icon={<CalendarCheck2 className="w-5 h-5 text-[#0A192F]" />}
            accentColor="#0A192F"
          />
          <StatCard
            title="Pending Leaves"
            value={stats.pendingLeaves}
            subtitle="Awaiting administrative action"
            badgeText={stats.pendingLeaves > 0 ? 'Pending' : 'Clear'}
            badgeVariant={stats.pendingLeaves > 0 ? 'warning' : 'success'}
            icon={<FileCheck2 className="w-5 h-5 text-[#F59E0B]" />}
            accentColor="#F59E0B"
          />
          <StatCard
            title="Today's Attendance"
            value={stats.todayAttendanceMarkedCount}
            subtitle="Students marked today"
            badgeText="Daily Log"
            badgeVariant="success"
            icon={<Clock className="w-5 h-5 text-[#10B981]" />}
            accentColor="#10B981"
          />
        </div>

        {/* Monitoring Navigation Links */}
        <div className="institutional-card p-6">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider mb-4 border-b border-[#E2E8F0] pb-3">
            Monitoring Modules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/admin/students" className="block p-4 border border-[#E2E8F0] rounded-xl hover:border-[#D4AF37] transition-all">
              <Users className="w-5 h-5 text-[#0A192F] mb-2" />
              <h4 className="text-xs font-bold text-[#0A192F]">Students Overview</h4>
              <p className="text-[11px] text-[#64748B] mt-1">Review scholar directory and campus enrollment breakdown.</p>
            </Link>
            <Link href="/academics" className="block p-4 border border-[#E2E8F0] rounded-xl hover:border-[#D4AF37] transition-all">
              <GraduationCap className="w-5 h-5 text-[#0A192F] mb-2" />
              <h4 className="text-xs font-bold text-[#0A192F]">Academic Summary</h4>
              <p className="text-[11px] text-[#64748B] mt-1">Monitor SGPA/CGPA progression and CT marks.</p>
            </Link>
            <Link href="/attendance" className="block p-4 border border-[#E2E8F0] rounded-xl hover:border-[#D4AF37] transition-all">
              <Clock className="w-5 h-5 text-[#0A192F] mb-2" />
              <h4 className="text-xs font-bold text-[#0A192F]">Attendance Summary</h4>
              <p className="text-[11px] text-[#64748B] mt-1">View Abdul Kalam Class attendance statistics.</p>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     4. SUPER ADMIN & SEMI ADMIN DASHBOARDS
  ------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Top Banner with Capacity Metric */}
      <div className="bg-[#0A192F] text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-[#1E293B]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#D4AF37] font-extrabold uppercase tracking-widest">
                FOUNDATION EXECUTIVE CONSOLE
              </span>
              <span className="text-xs bg-[#1E293B] text-white px-2 py-0.5 rounded font-bold">
                {currentRole.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
              PTF Vizhuthugal Institutional Overview
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Initial Target Capacity: <strong className="text-white">204 Students</strong> across SRM KTR, SRM BAB, and SRM AP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <InstitutionalLogos height={24} />

            {currentRole === 'SUPER_ADMIN' && (
              <Link href="/admin/students">
                <Button variant="gold" size="md" leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
                  Import Verified Students
                </Button>
              </Link>
            )}
            <Link href="/admin/reports">
              <Button variant="secondary" size="md">
                Institutional Reports
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Target Capacity Cards */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
          Campus Enrollment &amp; Institutional Capacity
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Student Capacity"
            value="204"
            subtitle={`${stats.totalStudents} verified records imported`}
            badgeText="Foundation Capacity"
            badgeVariant="gold"
            icon={<Users className="w-5 h-5 text-[#0A192F]" />}
            accentColor="#D4AF37"
          />
          <StatCard
            title="SRM KTR Campus"
            value="153"
            subtitle={`${stats.ktrStudents} verified enrolled`}
            badgeText="Kattankulathur"
            badgeVariant="navy"
            icon={<Building2 className="w-5 h-5 text-[#0A192F]" />}
            accentColor="#0A192F"
          />
          <StatCard
            title="SRM BAB Campus"
            value="27"
            subtitle={`${stats.babStudents} verified enrolled`}
            badgeText="Babusahebpet"
            badgeVariant="neutral"
            icon={<Building2 className="w-5 h-5 text-[#64748B]" />}
            accentColor="#1E3E62"
          />
          <StatCard
            title="SRM AP Campus"
            value="24"
            subtitle={`${stats.apStudents} verified enrolled`}
            badgeText="Amaravati"
            badgeVariant="neutral"
            icon={<Building2 className="w-5 h-5 text-[#64748B]" />}
            accentColor="#B89726"
          />
        </div>
      </div>

      {/* Action Queues */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
          Workflow Queues &amp; Approvals
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/leave-permission" className="block">
            <StatCard
              title="Pending Leave Requests"
              value={stats.pendingLeaves}
              subtitle="Requires approval & PDF slip generation"
              badgeText={stats.pendingLeaves > 0 ? 'Pending' : 'Zero Pending'}
              badgeVariant={stats.pendingLeaves > 0 ? 'warning' : 'success'}
              icon={<FileCheck2 className="w-5 h-5 text-[#0A192F]" />}
              accentColor="#F59E0B"
            />
          </Link>
          <Link href="/leave-permission" className="block">
            <StatCard
              title="Pending Permission Requests"
              value={stats.pendingPermissions}
              subtitle="On-Duty requests for review"
              badgeText={stats.pendingPermissions > 0 ? 'Pending' : 'Zero Pending'}
              badgeVariant={stats.pendingPermissions > 0 ? 'warning' : 'success'}
              icon={<CalendarCheck2 className="w-5 h-5 text-[#0A192F]" />}
              accentColor="#D4AF37"
            />
          </Link>
          <Link href="/attendance/abdul-kalam" className="block">
            <StatCard
              title="Kalam Class Cohort"
              value={stats.kalamEligibleCount}
              subtitle="Eligible students for daily sessions"
              badgeText="Active Cohort"
              badgeVariant="navy"
              icon={<Clock className="w-5 h-5 text-[#10B981]" />}
              accentColor="#10B981"
            />
          </Link>
        </div>
      </div>

      {stats.totalStudents === 0 && (
        <EmptyState
          title="No Student Records Imported Yet"
          description="In strict compliance with the Foundation Data Integrity Policy, zero demo students or dummy credentials are created. Use the verified CSV/XLSX bulk import engine to initialize the 204 student scholars."
          actionLabel="Open Student Bulk Import Engine"
          onAction={() => {
            window.location.href = '/admin/students';
          }}
        />
      )}
    </div>
  );
}
