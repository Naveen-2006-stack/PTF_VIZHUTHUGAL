'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Campus, Department, Course } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CampusLogo } from '@/components/branding/CampusLogo';
import { InstitutionalLogos } from '@/components/branding/InstitutionalLogos';
import { Building2, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CampusesPage() {
  const { role } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadCampuses();
  }, []);

  async function loadCampuses() {
    try {
      const { data: cData } = await supabase.from('campuses').select('*').order('capacity', { ascending: false });
      if (cData) {
        setCampuses(cData);
        setSelectedCampus(cData[0] || null);
      }
      const { data: dData } = await supabase.from('departments').select('*');
      if (dData) setDepartments(dData);
    } catch (err) {
      console.error('Error loading campuses:', err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            INSTITUTIONAL HIERARCHY
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Campus Architecture &amp; Department Setup
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Campuses supported: SRM KTR (153), SRM BAB (27), and SRM AP (24). Total 204 Capacity.
          </p>
        </div>
        <InstitutionalLogos height={22} className="hidden sm:flex" />
      </div>

      {/* Campuses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {campuses.map((camp) => (
          <div
            key={camp.id}
            onClick={() => setSelectedCampus(camp)}
            className={`institutional-card p-6 cursor-pointer transition-all ${
              selectedCampus?.id === camp.id
                ? 'border-[#0A192F] ring-2 ring-[#D4AF37]'
                : 'hover:border-[#CBD5E1]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <CampusLogo campusCode={camp.code} height={36} useApLogoExplicitly={camp.code === 'SRM_AP'} />
              <Badge variant="gold" size="sm">
                Capacity: {camp.capacity}
              </Badge>
            </div>
            <h3 className="text-base font-bold text-[#0A192F]">{camp.name}</h3>
            <p className="text-xs text-[#64748B] mt-0.5">{camp.location}</p>

            <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
              <span>Campus Code: <strong>{camp.code}</strong></span>
              <span className="text-[#10B981] font-bold">Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Campus Departments */}
      {selectedCampus && (
        <div className="institutional-card p-6">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-[#0A192F]">
                Departments in {selectedCampus.name} ({selectedCampus.code})
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Departments registered for student admissions and faculty advisor mapping.
              </p>
            </div>
            <CampusLogo
              campusCode={selectedCampus.code}
              height={28}
              useApLogoExplicitly={selectedCampus.code === 'SRM_AP'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments
              .filter((d) => d.campus_id === selectedCampus.id)
              .map((dept) => (
                <div key={dept.id} className="p-4 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase">{dept.code}</span>
                  <h4 className="text-sm font-bold text-[#0A192F] mt-0.5">{dept.name}</h4>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    B.Tech 4-Year Undergraduate Program
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
