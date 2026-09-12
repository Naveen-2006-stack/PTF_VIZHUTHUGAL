'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Navbar } from '@/components/navigation/Navbar';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { useRouter, usePathname } from 'next/navigation';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, profile, student, staff, campusCode, isSpecialClassEligible, isLoading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Route security guard
  useEffect(() => {
    if (isLoading) return;

    if (!role) {
      router.replace('/login');
      return;
    }

    // 1. STAFF_MENTOR route restrictions
    if (role === 'STAFF_MENTOR') {
      const allowedStaffRoutes = ['/dashboard', '/attendance/abdul-kalam', '/attendance', '/notifications', '/profile'];
      const isAllowed = allowedStaffRoutes.some(route => pathname === route || pathname.startsWith('/attendance'));
      if (!isAllowed) {
        router.replace('/attendance/abdul-kalam');
        return;
      }
    }

    // 2. STUDENT route restrictions
    if (role === 'STUDENT') {
      // Students cannot access admin, staff-mapping, settings, or staff routes
      if (pathname.startsWith('/admin') || pathname.startsWith('/staff-mapping') || pathname.startsWith('/settings')) {
        router.replace('/dashboard');
        return;
      }

      // Students cannot access Abdul Kalam attendance page if not eligible
      if (pathname.startsWith('/attendance/abdul-kalam') && !isSpecialClassEligible) {
        router.replace('/dashboard');
        return;
      }
    }

    // 3. PTF_SECRETARY and SEMI_ADMIN restrictions
    if (role === 'PTF_SECRETARY' || role === 'SEMI_ADMIN') {
      if (pathname.startsWith('/settings') || pathname.startsWith('/admin/campuses') || pathname.startsWith('/admin/audit-logs')) {
        router.replace('/dashboard');
        return;
      }
    }
  }, [role, pathname, isLoading, isSpecialClassEligible, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-[#0A192F] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] font-extrabold text-xl animate-pulse mb-3">
          V
        </div>
        <p className="text-xs font-bold text-[#0A192F] tracking-wide">
          Loading PTF Vizhuthugal Portal...
        </p>
      </div>
    );
  }

  // Fallback to default if not authenticated or visitor
  const currentRole = role || 'STUDENT';
  const userName = profile?.full_name || 'Guest User';
  const ptfId = student?.ptf_id || staff?.staff_code || (role ? role.replace('_', ' ') : undefined);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <div className="flex flex-1">
        {/* Desktop Left Rail Sidebar */}
        <Sidebar
          role={currentRole}
          campusCode={campusCode}
          userName={userName}
          ptfId={ptfId}
          isSpecialClassEligible={isSpecialClassEligible}
          onSignOut={signOut}
        />

        {/* Mobile Sidebar Overlay Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-64 bg-[#0A192F] h-full z-10 shadow-2xl flex flex-col">
              <Sidebar
                role={currentRole}
                campusCode={campusCode}
                userName={userName}
                ptfId={ptfId}
                isSpecialClassEligible={isSpecialClassEligible}
                onSignOut={signOut}
              />
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            role={currentRole}
            userName={userName}
            campusCode={campusCode}
            ptfId={ptfId}
            onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            onSignOut={signOut}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 lg:pb-10">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav role={currentRole} isSpecialClassEligible={isSpecialClassEligible} />
    </div>
  );
}
