'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InstitutionalLogos } from '@/components/branding/InstitutionalLogos';
import { UserCheck, Shield, Key, Mail, Phone, MapPin, Building2, GraduationCap } from 'lucide-react';

export default function ProfilePage() {
  const { role, profile, student, staff, campusCode, signOut } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            SCHOLAR IDENTITY
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            My Institutional Profile
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Verified academic identity records maintained by Puthiya Thalaimurai Foundation.
          </p>
        </div>

        <Link href="/change-password">
          <Button variant="outline" size="sm" leftIcon={<Key className="w-3.5 h-3.5 text-[#D4AF37]" />}>
            Change Password
          </Button>
        </Link>
      </div>

      {/* Main Profile Card */}
      <div className="institutional-card p-6 sm:p-8 gold-accent-top">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0A192F] text-[#D4AF37] font-extrabold text-2xl flex items-center justify-center border-2 border-[#D4AF37] shadow-md">
              {profile?.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#0A192F]">
                  {profile?.full_name || 'Scholar Fellow'}
                </h3>
                <Badge variant="success" size="sm" dot>
                  Active Scholar
                </Badge>
              </div>
              <p className="text-xs font-bold text-[#D4AF37] mt-0.5">
                Scholar ID: {student?.ptf_id || staff?.staff_code || 'PTF-FELLOW'}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                Registered Email: {profile?.email}
              </p>
            </div>
          </div>

          <InstitutionalLogos height={24} className="shrink-0" />
        </div>

        {/* Particulars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 text-xs">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#0A192F] uppercase tracking-wider pb-1 border-b border-[#F1F5F9]">
              Academic Affiliation
            </h4>

            <div>
              <span className="text-[#64748B] block mb-0.5">University Register Number</span>
              <span className="font-bold text-[#0A192F] text-sm font-mono">
                {student?.register_number || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block mb-0.5">Campus</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#0A192F]">
                  {student?.campus?.name || campusCode}
                </span>
                {(campusCode === 'SRM_AP' || student?.campus?.code === 'SRM_AP') && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-[10px] font-semibold text-[#0A192F]">
                    <img
                      src="/logos/srm-university-ap.png"
                      alt="SRM University AP"
                      className="h-3.5 w-auto object-contain"
                    />
                    Official AP Campus
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[#64748B] block mb-0.5">Department &amp; Degree</span>
              <span className="font-semibold text-[#0A192F]">
                {student?.department?.name} ({student?.department?.code})
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block mb-0.5">Enrolled Course</span>
              <span className="font-semibold text-[#0A192F]">
                {student?.course?.name || 'Bachelor of Technology'}
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block mb-0.5">Current Standing</span>
              <span className="font-semibold text-[#0A192F]">
                Year {student?.current_year || 1} • Academic Session {student?.academic_year || '2026-2027'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#0A192F] uppercase tracking-wider pb-1 border-b border-[#F1F5F9]">
              Parent &amp; Advisory Records
            </h4>

            <div>
              <span className="text-[#64748B] block mb-0.5">Parent / Guardian Name</span>
              <span className="font-semibold text-[#0A192F]">
                {student?.parent_name || 'Recorded with Administration'}
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block mb-0.5">Emergency Contact Phone</span>
              <span className="font-semibold text-[#0A192F]">
                {student?.parent_phone || 'Recorded with Administration'}
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block mb-0.5">Assigned Staff Advisor</span>
              <span className="font-semibold text-[#10B981]">
                {student?.assigned_staff?.profile?.full_name || 'Awaiting Staff Mapping Request'}
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block mb-0.5">Foundation Scheme</span>
              <span className="font-bold text-[#0A192F]">
                Vizhuthugal Personality Building &amp; Scholarship Scheme
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block mb-0.5">Identity Verification Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10B981]">
                <Shield className="w-4 h-4" /> Government &amp; Institution Verified
              </span>
            </div>
          </div>
        </div>

        {/* Immutability Notice (Section 15 of prompt) */}
        <div className="mt-8 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
          <p className="font-bold text-[#0A192F]">Identity Security Policy:</p>
          <p className="mt-0.5">
            Critical identity fields (Name, Scholar ID, Register Number, Campus, and Department) are verified by Foundation Administration and cannot be edited by scholars. If a correction is necessary, contact your campus coordinator.
          </p>
        </div>
      </div>
    </div>
  );
}
