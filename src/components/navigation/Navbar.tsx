'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Menu, LogOut } from 'lucide-react';
import { PtfLogo } from '../branding/PtfLogo';
import { UserRole } from '@/types';

interface NavbarProps {
  role: UserRole;
  userName: string;
  campusCode?: string;
  ptfId?: string;
  unreadCount?: number;
  onMenuToggle?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  userName,
  campusCode: _campusCode = 'SRM_KTR',
  ptfId,
  unreadCount = 0,
  onMenuToggle,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] shadow-sm flex items-center px-4 sm:px-6">
      <div className="flex items-center justify-between w-full">
        {/* Left Mobile Menu Toggle & Logo */}
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="p-2 -ml-2 rounded-lg text-[#475569] hover:text-[#0A192F] hover:bg-[#F1F5F9] md:hidden transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link href="/dashboard" className="flex items-center gap-2">
            <PtfLogo height={38} />
          </Link>
        </div>

        {/* Center Institutional Tagline (Desktop) */}
        <div className="hidden lg:flex flex-col items-center text-center px-2">
          <span className="text-[11px] font-bold tracking-wider text-[#0A192F] uppercase">
            Puthiya Thalaimurai Foundation
          </span>
          <span className="text-[10px] text-[#D4AF37] font-semibold italic">
            &ldquo;Building Students&apos; Personality Through Social Service&rdquo;
          </span>
        </div>

        {/* Right Side: SRMIST + SRM University AP Logos + User Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Institutional SRM Partners (SRMIST + SRM AP) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border border-[#CBD5E1]/80 shadow-2xs flex items-center">
              <img
                src="/logos/srmist.png"
                alt="SRM Institute of Science & Technology (SRMIST)"
                className="h-5 sm:h-6.5 w-auto object-contain"
              />
            </div>
            <div className="bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border border-[#CBD5E1]/80 shadow-2xs flex items-center">
              <img
                src="/logos/srm-university-ap.png"
                alt="SRM University AP"
                className="h-5 sm:h-6.5 w-auto object-contain"
              />
            </div>
          </div>

          {/* Notification Icon */}
          <Link
            href="/notifications"
            id="header-notifications-btn"
            className="relative flex items-center gap-1 p-2 rounded-lg text-[#475569] hover:text-[#0A192F] hover:bg-[#F1F5F9] transition-colors"
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                id="header-unread-badge"
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-[#E11D48] rounded-full shadow-xs leading-none"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-[#E2E8F0]">
            <div className="w-8 h-8 rounded-full bg-[#0A192F] text-[#D4AF37] font-bold text-xs flex items-center justify-center border border-[#D4AF37]">
              {userName.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#0A192F] leading-tight truncate max-w-[130px]">
                {userName}
              </p>
              <p className="text-[10px] text-[#64748B] leading-tight font-medium">
                {ptfId || role.replace('_', ' ')}
              </p>
            </div>
          </div>

          {onSignOut && (
            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 text-[#64748B] hover:text-red-600 hover:bg-[#FFF1F2] rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
