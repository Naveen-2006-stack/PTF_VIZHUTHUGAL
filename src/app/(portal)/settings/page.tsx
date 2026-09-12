'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Building2, FileText, Bell, Shield, CheckCircle2 } from 'lucide-react';
import { PtfLogo } from '@/components/branding/PtfLogo';

export default function SettingsPage() {
  const { role } = useAuth();
  const [orgName, setOrgName] = useState('Puthiya Thalaimurai Foundation');
  const [tagline, setTagline] = useState('Building Students\' Personality Through Social Service');
  const [renewalDeadline, setRenewalDeadline] = useState('2026-11-30');
  const [slipPrefix, setSlipPrefix] = useState('PTF');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            SYSTEM CONFIGURATION
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Foundation Portal Settings
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Section 45 Compliance: Institutional parameters, PDF slip formats, and scholarship deadlines.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
          <span>System parameters updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Identity Box */}
        <div className="institutional-card p-6">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider mb-4 border-b border-[#E2E8F0] pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#D4AF37]" />
            Foundation Identity &amp; Branding
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Organization Full Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#0A192F]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Official Scheme Tagline / Motto
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0A192F]"
              />
            </div>
          </div>
        </div>

        {/* Operational Policies Box */}
        <div className="institutional-card p-6">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider mb-4 border-b border-[#E2E8F0] pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#D4AF37]" />
            Deadlines &amp; Document Generation
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Scholarship Renewal Deadline
              </label>
              <input
                type="date"
                value={renewalDeadline}
                onChange={(e) => setRenewalDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Official Approval Slip Prefix
              </label>
              <input
                type="text"
                value={slipPrefix}
                onChange={(e) => setSlipPrefix(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-mono font-bold text-[#0A192F]"
              />
              <p className="text-[10px] text-[#64748B] mt-1">
                Slips format: <code>{slipPrefix}-LV-2026-XXXXXX</code>
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg">
            Save System Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
