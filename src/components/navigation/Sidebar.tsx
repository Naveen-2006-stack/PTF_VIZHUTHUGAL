'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardCheck,
  Award,
  SunMedium,
  CalendarCheck2,
  FileCheck2,
  Bell,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  Building2,
  FileClock,
  UserCheck,
  Clock,
  LogOut,
  UserCheck2,
  X,
} from 'lucide-react';
import { UserRole } from '@/types';
import { isNavItemActive } from '@/lib/navigation';

interface SidebarProps {
  role: UserRole;
  campusCode?: string;
  userName?: string;
  ptfId?: string;
  isSpecialClassEligible?: boolean;
  onSignOut?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  campusCode: _campusCode = 'SRM_KTR',
  userName = 'User',
  ptfId,
  isSpecialClassEligible = false,
  onSignOut,
  isMobile = false,
  onClose,
}) => {
  const pathname = usePathname();

  // Role-specific navigation items according to Section 19 specification
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'STUDENT': {
        const studentItems: NavItem[] = [
          { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'My Profile', href: '/profile', icon: <UserCheck className="w-5 h-5" /> },
          { label: 'Academics & CT', href: '/academics/ct-marks', icon: <GraduationCap className="w-5 h-5" /> },
          { label: 'Scholarship Renewal', href: '/scholarship', icon: <Award className="w-5 h-5" /> },
          { label: 'Summer Activity', href: '/summer-activity', icon: <SunMedium className="w-5 h-5" /> },
        ];

        // Abdul Kalam Class ONLY IF ELIGIBLE
        if (isSpecialClassEligible) {
          studentItems.push({
            label: 'Abdul Kalam Class',
            href: '/attendance/abdul-kalam',
            icon: <CalendarCheck2 className="w-5 h-5" />,
          });
        }

        studentItems.push(
          { label: 'Attendance', href: '/attendance', icon: <ClipboardCheck className="w-5 h-5" /> },
          { label: 'Leave & Permission', href: '/leave-permission', icon: <FileCheck2 className="w-5 h-5" /> },
          { label: 'Notifications', href: '/notifications', icon: <Bell className="w-5 h-5" /> },
        );

        return studentItems;
      }

      case 'STAFF_MENTOR':
        // STAFF_MENTOR: Abdul Kalam Attendance ONLY
        return [
          { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Abdul Kalam Attendance', href: '/attendance/abdul-kalam', icon: <Clock className="w-5 h-5" /> },
          { label: 'Attendance History', href: '/attendance', icon: <FileClock className="w-5 h-5" /> },
        ];

      case 'PTF_SECRETARY':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Students Overview', href: '/admin/students', icon: <Users className="w-5 h-5" /> },
          { label: 'Attendance Summary', href: '/attendance', icon: <ClipboardCheck className="w-5 h-5" /> },
          { label: 'Academic Summary', href: '/academics', icon: <GraduationCap className="w-5 h-5" /> },
          { label: 'Renewal Summary', href: '/scholarship', icon: <Award className="w-5 h-5" /> },
          { label: 'Activity Summary', href: '/summer-activity', icon: <SunMedium className="w-5 h-5" /> },
          { label: 'Leave/Permission', href: '/leave-permission', icon: <FileCheck2 className="w-5 h-5" /> },
          { label: 'Reports', href: '/admin/reports', icon: <FileSpreadsheet className="w-5 h-5" /> },
          { label: 'Notification Center', href: '/admin/notifications', icon: <Bell className="w-5 h-5" /> },
        ];

      case 'SEMI_ADMIN':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Students', href: '/admin/students', icon: <Users className="w-5 h-5" /> },
          { label: 'Academics & CT', href: '/academics/ct-marks', icon: <GraduationCap className="w-5 h-5" /> },
          { label: 'Scholarship', href: '/scholarship', icon: <Award className="w-5 h-5" /> },
          { label: 'Summer Activity', href: '/summer-activity', icon: <SunMedium className="w-5 h-5" /> },
          { label: 'Attendance', href: '/attendance/abdul-kalam', icon: <CalendarCheck2 className="w-5 h-5" /> },
          { label: 'Leave & Permission', href: '/leave-permission', icon: <FileCheck2 className="w-5 h-5" /> },
          { label: 'Notification Center', href: '/admin/notifications', icon: <Bell className="w-5 h-5" /> },
          { label: 'Reports', href: '/admin/reports', icon: <FileSpreadsheet className="w-5 h-5" /> },
        ];

      case 'SUPER_ADMIN':
      default:
        return [
          { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Students & Import', href: '/admin/students', icon: <Users className="w-5 h-5" /> },
          { label: 'Staff & Mentors', href: '/admin/staff', icon: <UserCheck className="w-5 h-5" /> },
          { label: 'Staff Mapping', href: '/staff-mapping', icon: <UserCheck2 className="w-5 h-5" /> },
          { label: 'Kalam Eligibility', href: '/admin/mentors', icon: <CalendarCheck2 className="w-5 h-5" /> },
          { label: 'Academics & CT', href: '/academics/ct-marks', icon: <GraduationCap className="w-5 h-5" /> },
          { label: 'Abdul Kalam Attendance', href: '/attendance/abdul-kalam', icon: <Clock className="w-5 h-5" /> },
          { label: 'Scholarship', href: '/scholarship', icon: <Award className="w-5 h-5" /> },
          { label: 'Summer Activity', href: '/summer-activity', icon: <SunMedium className="w-5 h-5" /> },
          { label: 'Leave & Permission', href: '/leave-permission', icon: <FileCheck2 className="w-5 h-5" /> },
          { label: 'Campuses', href: '/admin/campuses', icon: <Building2 className="w-5 h-5" /> },
          { label: 'Audit Logs', href: '/admin/audit-logs', icon: <ShieldCheck className="w-5 h-5" /> },
          { label: 'Reports', href: '/admin/reports', icon: <FileSpreadsheet className="w-5 h-5" /> },
          { label: 'Notification Center', href: '/admin/notifications', icon: <Bell className="w-5 h-5" /> },
          { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className={
        isMobile
          ? 'flex flex-col w-72 max-w-[85vw] bg-[#0A192F] text-white border-r border-[#1E293B] h-full shadow-2xl overflow-hidden'
          : 'hidden lg:flex flex-col w-64 bg-[#0A192F] text-white border-r border-[#1E293B] min-h-screen sticky top-0'
      }
    >
      {/* Top Branding Section */}
      <div className="p-4 border-b border-[#1E293B] space-y-3">
        {/* 1. Puthiya Thalaimurai Foundation / Vizhuthugal & Optional Mobile Close Button */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            onClick={() => isMobile && onClose?.()}
            className="block group flex-1"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-white px-2 py-1 rounded-lg shadow-sm">
                <img
                  src="/logos/ptf-vizhuthugal.png"
                  alt="Puthiya Thalaimurai Foundation - Vizhuthugal"
                  className="h-7 w-auto object-contain"
                />
              </div>
              <div>
                <h1 className="text-xs font-extrabold tracking-wider text-white group-hover:text-[#D4AF37] transition-colors">
                  VIZHUTHUGAL
                </h1>
                <p className="text-[9.5px] text-[#D4AF37] font-semibold tracking-wide uppercase">Puthiya Thalaimurai</p>
              </div>
            </div>
          </Link>

          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="p-2 -mr-1.5 text-[#94A3B8] hover:text-white hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. SRMIST & SRM University AP Partner Logos */}
        <div className="pt-2 border-t border-[#1E293B]/80 flex items-center gap-2">
          <div className="bg-white px-1.5 py-1 rounded-md shadow-2xs flex-1 flex items-center justify-center">
            <img
              src="/logos/srmist.png"
              alt="SRM Institute of Science & Technology (SRMIST)"
              className="h-5 w-auto object-contain"
            />
          </div>
          <div className="bg-white px-1.5 py-1 rounded-md shadow-2xs flex-1 flex items-center justify-center">
            <img
              src="/logos/srm-university-ap.png"
              alt="SRM University AP"
              className="h-5 w-auto object-contain"
            />
          </div>
        </div>

        {/* 3. User Role Badge */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">Portal Access</span>
          <span className="text-[10px] bg-[#1E293B] text-[#D4AF37] px-2.5 py-0.5 rounded font-bold border border-[#334155] shadow-2xs">
            {role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const allHrefs = navItems.map((i) => i.href);
          const isActive = isNavItemActive(item.href, pathname, allHrefs);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && onClose?.()}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[#D4AF37] text-[#0A192F] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-[#0A192F]' : 'text-[#94A3B8]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#1E293B] bg-[#07101E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-[#D4AF37] flex items-center justify-center text-xs font-bold text-[#D4AF37]">
              {userName.charAt(0)}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-[#64748B] truncate">{ptfId || role}</p>
            </div>
          </div>
          {onSignOut && (
            <button
              onClick={() => {
                if (isMobile && onClose) onClose();
                onSignOut();
              }}
              title="Sign Out"
              className="p-1.5 rounded-md text-[#94A3B8] hover:text-red-400 hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
