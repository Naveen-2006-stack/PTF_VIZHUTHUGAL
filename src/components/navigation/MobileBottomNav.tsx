'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  Award,
  CalendarCheck2,
  FileCheck2,
  Users,
  Clock,
} from 'lucide-react';
import { UserRole } from '@/types';
import { isNavItemActive } from '@/lib/navigation';

interface MobileBottomNavProps {
  role: UserRole;
  isSpecialClassEligible?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ role, isSpecialClassEligible = false }) => {
  const pathname = usePathname();

  // Role-specific quick bottom actions
  const getNavItems = () => {
    switch (role) {
      case 'STUDENT': {
        const items = [
          { label: 'Home', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Marks', href: '/academics/ct-marks', icon: <GraduationCap className="w-5 h-5" /> },
        ];
        if (isSpecialClassEligible) {
          items.push({ label: 'Kalam', href: '/attendance/abdul-kalam', icon: <CalendarCheck2 className="w-5 h-5" /> });
        }
        items.push(
          { label: 'Renewal', href: '/scholarship', icon: <Award className="w-5 h-5" /> },
          { label: 'Leave', href: '/leave-permission', icon: <FileCheck2 className="w-5 h-5" /> }
        );
        return items;
      }
      case 'STAFF_MENTOR':
        return [
          { label: 'Home', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Mark Attendance', href: '/attendance/abdul-kalam', icon: <Clock className="w-5 h-5" /> },
          { label: 'History', href: '/attendance', icon: <CalendarCheck2 className="w-5 h-5" /> },
        ];
      case 'PTF_SECRETARY':
        return [
          { label: 'Home', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Students', href: '/admin/students', icon: <Users className="w-5 h-5" /> },
          { label: 'Academics', href: '/academics', icon: <GraduationCap className="w-5 h-5" /> },
          { label: 'Reports', href: '/admin/reports', icon: <CalendarCheck2 className="w-5 h-5" /> },
        ];
      case 'SEMI_ADMIN':
      case 'SUPER_ADMIN':
      default:
        return [
          { label: 'Home', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Students', href: '/admin/students', icon: <Users className="w-5 h-5" /> },
          { label: 'Academics', href: '/academics/ct-marks', icon: <GraduationCap className="w-5 h-5" /> },
          { label: 'Approvals', href: '/leave-permission', icon: <FileCheck2 className="w-5 h-5" /> },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8F0] shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const allHrefs = navItems.map((i) => i.href);
          const isActive = isNavItemActive(item.href, pathname, allHrefs);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-[#0A192F] font-bold' : 'text-[#64748B] hover:text-[#0A192F]'
              }`}
            >
              <span className={isActive ? 'text-[#D4AF37]' : 'text-[#64748B]'}>
                {item.icon}
              </span>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
