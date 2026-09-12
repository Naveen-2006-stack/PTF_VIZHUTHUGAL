'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { NotificationItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Radio,
  Send,
  Calendar,
  Award,
} from 'lucide-react';
import { logAuditEvent } from '@/lib/audit';

export default function NotificationsPage() {
  const { role, profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Broadcast Modal (Admin)
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState<'ANNOUNCEMENT' | 'ACADEMIC' | 'ATTENDANCE' | 'RENEWAL'>('ANNOUNCEMENT');
  const [broadcastPriority, setBroadcastPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const supabase = createClient();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'SEMI_ADMIN';

  useEffect(() => {
    loadNotifications();
  }, [profile]);

  async function loadNotifications() {
    if (!profile) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) setNotifications(data as any);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!profile) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Admin Broadcast Announcement
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsBroadcasting(true);

    try {
      // 1. Get all active user profiles
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      if (allProfiles && allProfiles.length > 0) {
        const notifPayload = allProfiles.map((p) => ({
          user_id: p.id,
          title: broadcastTitle,
          message: broadcastMessage,
          category: broadcastCategory,
          priority: broadcastPriority,
          read: false,
        }));

        await supabase.from('notifications').insert(notifPayload);
      }

      await logAuditEvent({
        actorId: profile?.id,
        action: 'BROADCAST_NOTIFICATION',
        entity: 'notifications',
        newState: { title: broadcastTitle, category: broadcastCategory },
      });

      setFeedback({ type: 'success', message: 'Broadcast announcement sent to all scholars & faculty.' });
      setBroadcastModalOpen(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      loadNotifications();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Broadcast failed.' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'UNREAD') return !n.read;
    return n.category === filterCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            COMMUNICATIONS
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Notification Center
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Foundation announcements, academic deadlines, CT updates, and attendance alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={notifications.length === 0}
          >
            Mark All as Read
          </Button>

          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Radio className="w-4 h-4 text-[#D4AF37]" />}
              onClick={() => setBroadcastModalOpen(true)}
            >
              Broadcast Notice
            </Button>
          )}
        </div>
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

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-3 text-xs">
        {['ALL', 'UNREAD', 'ACADEMIC', 'ATTENDANCE', 'LEAVE', 'RENEWAL', 'ANNOUNCEMENT'].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-bold transition-colors ${
                filterCategory === cat
                  ? 'bg-[#0A192F] text-white'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              {cat}
            </button>
          )
        )}
      </div>

      {/* Notifications List */}
      <div className="institutional-card p-6">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            title="No Notifications Found"
            description="You're all caught up! When official announcements or academic updates are posted, they will appear here."
          />
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`py-4 flex items-start justify-between gap-4 transition-colors ${
                  !notif.read ? 'bg-[#F8FAFC] -mx-4 px-4 rounded-lg' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      !notif.read ? 'bg-[#D4AF37]' : 'bg-transparent'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#0A192F]">
                        {notif.title}
                      </span>
                      <Badge
                        variant={
                          notif.priority === 'HIGH' || notif.priority === 'URGENT'
                            ? 'error'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {notif.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-[#94A3B8] mt-1 block">
                      {new Date(notif.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {!notif.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notif.id)}
                  >
                    Mark Read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      <Modal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        title="Broadcast Institutional Announcement"
        subtitle="Dispatch notification to all foundation fellows & faculty"
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Notice Title
            </label>
            <input
              type="text"
              required
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="e.g. Mandatory Biometric Compliance for Kalam Sessions"
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Category
              </label>
              <select
                value={broadcastCategory}
                onChange={(e) => setBroadcastCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              >
                <option value="ANNOUNCEMENT">General Announcement</option>
                <option value="ACADEMIC">Academic / CT Marks</option>
                <option value="ATTENDANCE">Abdul Kalam Attendance</option>
                <option value="RENEWAL">Scholarship Renewal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Priority
              </label>
              <select
                value={broadcastPriority}
                onChange={(e) => setBroadcastPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              >
                <option value="NORMAL">Normal Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Alert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Announcement Message
            </label>
            <textarea
              rows={4}
              required
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Enter announcement text..."
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setBroadcastModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isBroadcasting}
              leftIcon={<Send className="w-3.5 h-3.5 text-[#D4AF37]" />}
            >
              Send Broadcast
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
