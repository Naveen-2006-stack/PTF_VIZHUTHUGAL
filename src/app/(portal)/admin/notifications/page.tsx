'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  Bell,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Search,
  Trash2,
  Filter,
  CheckSquare,
  Square,
  Radio,
  Building2,
  UserCheck,
  Shield,
  Layers,
} from 'lucide-react';
import { NotificationType, NotificationPriorityInput } from '@/lib/notifications';

interface CampaignItem {
  id: string;
  campaignId: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  recipientScope: string;
  recipientCount: number;
  readCount: number;
  unreadCount: number;
  status: string;
  createdBy: string;
  createdAt: string;
}

interface StudentOption {
  id: string;
  ptf_id: string;
  full_name: string;
  campus_code?: string;
  profile_id?: string;
}

export default function AdminNotificationCenterPage() {
  const { role, profile } = useAuth();
  const supabase = createClient();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isSemiAdmin = role === 'SEMI_ADMIN';
  const isSecretary = role === 'PTF_SECRETARY';
  const canSend = isSuperAdmin || isSemiAdmin;

  // Active Tab: 'COMPOSER' | 'HISTORY'
  const [activeTab, setActiveTab] = useState<'COMPOSER' | 'HISTORY'>(canSend ? 'COMPOSER' : 'HISTORY');

  // Composer Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<NotificationPriorityInput>('Normal');
  const [notificationType, setNotificationType] = useState<NotificationType>('GENERAL');
  const [recipientType, setRecipientType] = useState<'INDIVIDUAL' | 'SELECTED' | 'ALL_STUDENTS' | 'CAMPUS' | 'ROLE'>('ALL_STUDENTS');

  // Recipient selection values
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Available options
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [campuses, setCampuses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Modals & submission state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // History State
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState('ALL');
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);

  // Load students & campuses for targeting
  useEffect(() => {
    async function loadTargetData() {
      try {
        const [studentsRes, campusesRes] = await Promise.all([
          supabase
            .from('students')
            .select('id, ptf_id, profile_id, campus_code, profile:profiles(full_name)')
            .order('ptf_id', { ascending: true }),
          supabase
            .from('campuses')
            .select('id, name, code')
            .order('name', { ascending: true }),
        ]);

        if (studentsRes.data) {
          const mapped: StudentOption[] = studentsRes.data.map((s: any) => ({
            id: s.id,
            ptf_id: s.ptf_id,
            full_name: s.profile?.full_name || s.ptf_id,
            campus_code: s.campus_code,
            profile_id: s.profile_id,
          }));
          setStudents(mapped);
          if (mapped.length > 0 && !selectedStudentId) {
            setSelectedStudentId(mapped[0].id);
          }
        }

        if (campusesRes.data && campusesRes.data.length > 0) {
          setCampuses(campusesRes.data);
          if (!selectedCampusId) {
            setSelectedCampusId(campusesRes.data[0].code || campusesRes.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading targeting data:', err);
      }
    }
    loadTargetData();
  }, []);

  // Load History
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/notifications/history');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Error loading notification history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Compute calculated recipient count for current selection
  const estimatedRecipientCount = useMemo(() => {
    switch (recipientType) {
      case 'INDIVIDUAL':
        return selectedStudentId ? 1 : 0;
      case 'SELECTED':
        return selectedStudentIds.length;
      case 'ALL_STUDENTS':
        return students.length;
      case 'CAMPUS': {
        const filtered = students.filter(
          (s) => s.campus_code === selectedCampusId || selectedCampusId === ''
        );
        return filtered.length;
      }
      case 'ROLE':
        return selectedRole === 'STUDENT' ? students.length : 'All matching users';
      default:
        return 0;
    }
  }, [recipientType, selectedStudentId, selectedStudentIds, students, selectedCampusId, selectedRole]);

  // Handle Send Confirmation
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFeedback({ type: 'error', message: 'Please enter both a title and message.' });
      return;
    }
    if (recipientType === 'INDIVIDUAL' && !selectedStudentId) {
      setFeedback({ type: 'error', message: 'Please select an individual student.' });
      return;
    }
    if (recipientType === 'SELECTED' && selectedStudentIds.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one student.' });
      return;
    }
    setFeedback(null);
    setIsConfirmOpen(true);
  };

  // Perform Send Dispatch
  const handleExecuteSend = async () => {
    setIsSending(true);
    setFeedback(null);
    try {
      const payload: any = {
        title: title.trim(),
        message: message.trim(),
        priority,
        notificationType,
        recipientType,
      };

      if (recipientType === 'INDIVIDUAL') payload.targetStudentId = selectedStudentId;
      if (recipientType === 'SELECTED') payload.targetStudentIds = selectedStudentIds;
      if (recipientType === 'CAMPUS') payload.targetCampusId = selectedCampusId;
      if (recipientType === 'ROLE') payload.targetRole = selectedRole;

      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to dispatch notification.');
      }

      setFeedback({
        type: 'success',
        message: `Notification successfully dispatched to ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'}!`,
      });

      // Reset form
      setTitle('');
      setMessage('');
      setSelectedStudentIds([]);
      setIsConfirmOpen(false);

      // Trigger global update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ptf:notifications-updated'));
      }

      // Reload history & switch to history tab
      loadHistory();
      setActiveTab('HISTORY');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to send notification.' });
      setIsConfirmOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Archive / Delete Campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to archive and remove this notification campaign?')) {
      return;
    }
    setDeletingCampaignId(campaignId);
    try {
      const res = await fetch(`/api/notifications/history?campaignId=${campaignId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to archive notification.');
      }
      setFeedback({ type: 'success', message: 'Notification campaign safely archived.' });
      loadHistory();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setDeletingCampaignId(null);
    }
  };

  // Filtered Students for Selected Mode
  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return students;
    const term = studentSearchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.ptf_id.toLowerCase().includes(term) ||
        s.full_name.toLowerCase().includes(term) ||
        (s.campus_code && s.campus_code.toLowerCase().includes(term))
    );
  }, [students, studentSearchTerm]);

  // Toggle selection
  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all filtered
  const toggleSelectAllFiltered = () => {
    const allFilteredIds = filteredStudents.map((s) => s.id);
    const allSelected = allFilteredIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesType = historyFilterType === 'ALL' || c.type === historyFilterType;
      const matchesSearch =
        !historySearch.trim() ||
        c.title.toLowerCase().includes(historySearch.toLowerCase()) ||
        c.message.toLowerCase().includes(historySearch.toLowerCase()) ||
        c.createdBy.toLowerCase().includes(historySearch.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [campaigns, historyFilterType, historySearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            COMMUNICATIONS &amp; BROADCASTS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Notification Center
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Dispatch official alerts, announcements, and track delivery and read statistics.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
          {canSend && (
            <button
              id="tab-composer-btn"
              onClick={() => setActiveTab('COMPOSER')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'COMPOSER'
                  ? 'bg-[#0A192F] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0A192F]'
              }`}
            >
              Compose Notice
            </button>
          )}
          <button
            id="tab-history-btn"
            onClick={() => {
              setActiveTab('HISTORY');
              loadHistory();
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-[#0A192F] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0A192F]'
            }`}
          >
            Notification History ({campaigns.length})
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border transition-all ${
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
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* TAB 1: NOTIFICATION COMPOSER (Super Admin & Semi Admin) */}
      {activeTab === 'COMPOSER' && canSend && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 institutional-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-sm font-extrabold text-[#0A192F] uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D4AF37]" />
                Compose Institutional Notice
              </h2>
              <span className="text-[11px] font-bold text-[#64748B]">
                Sender: <strong className="text-[#0A192F]">{profile?.full_name || role}</strong>
              </span>
            </div>

            <form onSubmit={handleOpenConfirm} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="composer-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory Abdul Kalam Biometric Session Tomorrow"
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>

              {/* Notification Type & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                    Notification Type
                  </label>
                  <select
                    id="composer-type-select"
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value as NotificationType)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F] font-medium"
                  >
                    <option value="GENERAL">General Notice</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="ACADEMIC">Academic / Marks</option>
                    <option value="ATTENDANCE">Attendance Alert</option>
                    <option value="LEAVE">Leave Request</option>
                    <option value="PERMISSION">Permission Request</option>
                    <option value="SCHOLARSHIP">Scholarship Renewal</option>
                    <option value="SUMMER_ACTIVITY">Summer Activity</option>
                    <option value="SYSTEM">System Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                    Priority
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    {(['Normal', 'Important', 'Urgent'] as NotificationPriorityInput[]).map((p) => (
                      <button
                        type="button"
                        key={p}
                        id={`priority-btn-${p.toLowerCase()}`}
                        onClick={() => setPriority(p)}
                        className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-lg border transition-all ${
                          priority === p
                            ? 'bg-[#0A192F] text-white border-[#0A192F]'
                            : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recipient Scope */}
              <div>
                <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1.5">
                  Recipient Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientType('ALL_STUDENTS')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all ${
                      recipientType === 'ALL_STUDENTS'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#0A192F] font-bold'
                        : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <Users className="w-4 h-4 mb-1 text-[#0A192F]" />
                    <div>All Students</div>
                    <span className="text-[10px] text-[#64748B]">All registered fellows</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientType('CAMPUS')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all ${
                      recipientType === 'CAMPUS'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#0A192F] font-bold'
                        : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mb-1 text-[#0A192F]" />
                    <div>Campus</div>
                    <span className="text-[10px] text-[#64748B]">Target specific campus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientType('INDIVIDUAL')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all ${
                      recipientType === 'INDIVIDUAL'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#0A192F] font-bold'
                        : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 mb-1 text-[#0A192F]" />
                    <div>Individual Student</div>
                    <span className="text-[10px] text-[#64748B]">Single student recipient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientType('SELECTED')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all ${
                      recipientType === 'SELECTED'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#0A192F] font-bold'
                        : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 mb-1 text-[#0A192F]" />
                    <div>Selected Students</div>
                    <span className="text-[10px] text-[#64748B]">Custom student group</span>
                  </button>

                  {/* Super Admin ONLY: Role targeting */}
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setRecipientType('ROLE')}
                      className={`p-3 rounded-lg border text-left text-xs transition-all ${
                        recipientType === 'ROLE'
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#0A192F] font-bold'
                          : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <Shield className="w-4 h-4 mb-1 text-[#0A192F]" />
                      <div>Portal Role</div>
                      <span className="text-[10px] text-[#64748B]">Super Admin privilege</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Target Selection UI */}
              {recipientType === 'CAMPUS' && (
                <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg">
                  <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                    Select Target Campus
                  </label>
                  <select
                    id="composer-campus-select"
                    value={selectedCampusId}
                    onChange={(e) => setSelectedCampusId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
                  >
                    {campuses.map((c) => (
                      <option key={c.id} value={c.code || c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {recipientType === 'INDIVIDUAL' && (
                <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg">
                  <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                    Select Individual Student
                  </label>
                  <select
                    id="composer-student-select"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.ptf_id} - {s.full_name} ({s.campus_code || 'Campus'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {recipientType === 'ROLE' && isSuperAdmin && (
                <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg">
                  <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                    Select User Role
                  </label>
                  <select
                    id="composer-role-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
                  >
                    <option value="ALL">All Portal Users</option>
                    <option value="STUDENT">All Students</option>
                    <option value="STAFF_MENTOR">Staff Mentors</option>
                    <option value="SEMI_ADMIN">Semi Admins</option>
                    <option value="PTF_SECRETARY">PTF Secretary</option>
                  </select>
                </div>
              )}

              {recipientType === 'SELECTED' && (
                <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0A192F] uppercase">
                      Select Students ({selectedStudentIds.length} chosen)
                    </label>
                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      className="text-xs font-bold text-[#D4AF37] hover:underline"
                    >
                      {filteredStudents.every((s) => selectedStudentIds.includes(s.id))
                        ? 'Deselect All'
                        : 'Select All Visible'}
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
                    <input
                      type="text"
                      placeholder="Search by PTF ID, student name, or campus..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border border-[#E2E8F0] rounded-lg bg-white p-2">
                    {filteredStudents.map((s) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleStudentSelection(s.id)}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs ${
                            isSelected ? 'bg-[#D4AF37]/15 font-bold' : 'hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#D4AF37]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#CBD5E1]" />
                            )}
                            <span className="text-[#0A192F]">{s.ptf_id} - {s.full_name}</span>
                          </div>
                          <span className="text-[10px] text-[#64748B] uppercase">{s.campus_code}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="composer-message-textarea"
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter full notice content..."
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  id="btn-preview-notification"
                  leftIcon={<Eye className="w-4 h-4 text-[#64748B]" />}
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={!title.trim() || !message.trim()}
                >
                  Preview Notice
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  id="btn-send-notification"
                  leftIcon={<Send className="w-4 h-4 text-[#D4AF37]" />}
                  disabled={!title.trim() || !message.trim() || isSending}
                >
                  Send Notification
                </Button>
              </div>
            </form>
          </div>

          {/* Quick Summary & Scope Widget */}
          <div className="space-y-4">
            <div className="institutional-card p-5 gold-accent-top space-y-3">
              <h3 className="text-xs font-extrabold text-[#0A192F] uppercase tracking-wider">
                Broadcast Target Summary
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                  <span className="text-[#64748B]">Target Scope:</span>
                  <strong className="text-[#0A192F]">{recipientType.replace('_', ' ')}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                  <span className="text-[#64748B]">Priority Level:</span>
                  <Badge
                    variant={priority === 'Urgent' ? 'error' : priority === 'Important' ? 'warning' : 'neutral'}
                    size="sm"
                  >
                    {priority}
                  </Badge>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                  <span className="text-[#64748B]">Estimated Recipients:</span>
                  <span className="text-base font-extrabold text-[#D4AF37]">
                    {estimatedRecipientCount}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[11px] text-[#64748B] leading-relaxed">
                <p>
                  <strong>Governance Policy:</strong> All broadcast messages are immutably recorded in the institutional audit log and instantly routed to student notification feeds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NOTIFICATION HISTORY & DELIVERY STATS */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search notification history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-[#64748B] whitespace-nowrap">Filter Type:</span>
              <select
                value={historyFilterType}
                onChange={(e) => setHistoryFilterType(e.target.value)}
                className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
              >
                <option value="ALL">All Types</option>
                <option value="GENERAL">General</option>
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="ACADEMIC">Academic</option>
                <option value="ATTENDANCE">Attendance</option>
                <option value="LEAVE">Leave</option>
                <option value="PERMISSION">Permission</option>
                <option value="SCHOLARSHIP">Scholarship</option>
                <option value="SUMMER_ACTIVITY">Summer Activity</option>
              </select>

              <Button variant="outline" size="sm" onClick={loadHistory} isLoading={isLoadingHistory}>
                Refresh
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="institutional-card overflow-hidden">
            {isLoadingHistory ? (
              <div className="p-12 text-center text-xs text-[#64748B]">
                <Clock className="w-6 h-6 mx-auto mb-2 text-[#D4AF37] animate-spin" />
                Loading official notification history...
              </div>
            ) : filteredHistory.length === 0 ? (
              <EmptyState
                title="No Notification History"
                description="No broadcast notifications have been sent yet. Compose a new notice to reach students and faculty."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0A192F] text-white uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Title &amp; Notice</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Created By</th>
                      <th className="py-3 px-3">Date / Time</th>
                      <th className="py-3 px-3 text-center">Recipients</th>
                      <th className="py-3 px-3 text-center">Read</th>
                      <th className="py-3 px-3 text-center">Unread</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-bold text-[#0A192F] truncate">{item.title}</p>
                          <p className="text-[11px] text-[#64748B] truncate mt-0.5">{item.message}</p>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="neutral" size="sm">
                            {item.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              item.priority === 'URGENT'
                                ? 'error'
                                : item.priority === 'HIGH' || item.priority === 'Important'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {item.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-[#475569] font-medium whitespace-nowrap">
                          {item.createdBy}
                        </td>
                        <td className="py-3 px-3 text-[#64748B] text-[11px] whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#0A192F]">
                          {item.recipientCount}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#10B981]">
                          {item.readCount}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#E11D48]">
                          {item.unreadCount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                            {item.status}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteCampaign(item.campaignId)}
                              disabled={deletingCampaignId === item.campaignId}
                              className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-[#FFF1F2] rounded-md transition-colors"
                              title="Archive notice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: PREVIEW NOTICE */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Notice Preview (Student View)"
        subtitle="This is exactly how fellows will see your notification."
      >
        <div className="space-y-4">
          <div className="institutional-card p-5 border border-[#D4AF37]/50 bg-[#FDFCF7]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-extrabold text-[#0A192F]">{title || 'Notice Title'}</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="neutral" size="sm">
                  {notificationType}
                </Badge>
                <Badge
                  variant={priority === 'Urgent' ? 'error' : priority === 'Important' ? 'warning' : 'neutral'}
                  size="sm"
                >
                  {priority}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-[#334155] leading-relaxed whitespace-pre-wrap">
              {message || 'Notice content will appear here...'}
            </p>
            <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-[#94A3B8]">
              <span>Sender: Puthiya Thalaimurai Foundation</span>
              <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="md" onClick={() => setIsPreviewOpen(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: CONFIRMATION MODAL */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isSending && setIsConfirmOpen(false)}
        title="Confirm Notification Dispatch"
        subtitle="Review recipient count before sending."
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs space-y-2">
            <p className="text-[#0A192F] font-semibold text-sm">
              You are about to send this notification to{' '}
              <strong className="text-[#D4AF37] font-extrabold">
                {estimatedRecipientCount}
              </strong>{' '}
              recipient{estimatedRecipientCount === 1 ? '' : 's'}.
            </p>
            <p className="text-[#64748B] text-[11px]">
              Title: <strong className="text-[#0A192F]">{title}</strong>
            </p>
            <p className="text-[#64748B] text-[11px]">
              Priority: <strong className="text-[#0A192F]">{priority}</strong> | Scope:{' '}
              <strong className="text-[#0A192F]">{recipientType.replace('_', ' ')}</strong>
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              size="md"
              id="confirm-cancel-btn"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              id="confirm-send-btn"
              onClick={handleExecuteSend}
              isLoading={isSending}
              leftIcon={<Send className="w-4 h-4 text-[#D4AF37]" />}
            >
              Confirm &amp; Send
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
