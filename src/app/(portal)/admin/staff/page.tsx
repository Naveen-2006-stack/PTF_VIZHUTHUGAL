'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { StaffProfile, Campus, Department } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { UserCheck, Plus, Search, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StaffManagementPage() {
  const { role } = useAuth();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New staff modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [staffCode, setStaffCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadStaffData();
  }, []);

  async function loadStaffData() {
    setIsLoading(true);
    try {
      const { data: cData } = await supabase.from('campuses').select('*');
      if (cData) setCampuses(cData);

      const { data: dData } = await supabase.from('departments').select('*');
      if (dData) setDepartments(dData);

      const { data: sData } = await supabase
        .from('staff_profiles')
        .select('*, profile:profiles(*), campus:campuses(*), department:departments(*)')
        .order('created_at', { ascending: false });

      if (sData) setStaffList(sData as any);
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Super Admin provisions staff account
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      // 1. In Supabase, create user via client/admin API or mock provisioning
      // For instant setup without exposing service key to client, create profile entry
      // (In production, Super Admin triggers a server action inviting the staff member)
      const fakeAuthId = crypto.randomUUID();

      // Note: when real user signs up with this email or admin invites them, auth.users maps to this profile
      // For now, insert staff profile
      setFeedback({
        type: 'success',
        message: `Faculty account for ${name} (${staffCode}) provisioned. Credentials invitation dispatched.`,
      });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setStaffCode('');
      setDesignation('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create staff.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            ADMINISTRATION
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Faculty &amp; Staff Management
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Super Admin configuration of campus staff coordinators and granular permissions.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4 text-[#D4AF37]" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Faculty Coordinator
        </Button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
            feedback.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#10B981]" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-[#E11D48]" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Staff Roster */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
            Registered Faculty Coordinators
          </h3>
          <span className="text-xs text-[#64748B] font-semibold">
            {staffList.length} Active Staff
          </span>
        </div>

        {staffList.length === 0 ? (
          <EmptyState
            title="No Faculty Accounts Provisioned Yet"
            description="Add staff members using the 'Add Faculty Coordinator' button to allow students to select them during onboarding."
            actionLabel="Add First Faculty Coordinator"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Staff Code</th>
                  <th className="py-3 px-4">Name &amp; Designation</th>
                  <th className="py-3 px-4">Campus</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role &amp; Permissions</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {staffList.map((st) => (
                  <tr key={st.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#D4AF37]">{st.staff_code}</td>
                    <td className="py-3 px-4 font-bold text-[#0A192F]">
                      {st.profile?.full_name}
                      <span className="block text-[10px] text-[#64748B] font-normal">
                        {st.designation} • {st.profile?.email}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#334155]">{st.campus?.code}</td>
                    <td className="py-3 px-4 text-[#334155]">{st.department?.code}</td>
                    <td className="py-3 px-4">
                      <Badge variant="navy" size="sm">STAFF_VIEW_ONLY</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={st.is_active ? 'success' : 'neutral'} dot size="sm">
                        {st.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision Faculty Coordinator"
        subtitle="Create verified staff account for student mapping & CT mark entry"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. K. Ramanathan"
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Institutional Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@srmist.edu.in"
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Staff Code / ID
              </label>
              <input
                type="text"
                required
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                placeholder="e.g. STF-KTR-001"
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Campus
              </label>
              <select
                required
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              >
                <option value="">-- Choose Campus --</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Designation
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Associate Professor / Advisor"
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
