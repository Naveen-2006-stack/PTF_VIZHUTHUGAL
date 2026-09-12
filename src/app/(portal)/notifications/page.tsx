'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight,
  CheckCheck,
} from 'lucide-react';

export default function NotificationsPage() {
  const { role, profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Detail Modal State
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const supabase = createClient();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'SEMI_ADMIN';

  useEffect(() => {
    loadNotifications();
  }, [profile?.id]);

  async function loadNotifications() {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setNotifications(data as any);
    } catch (err) {
      console.error('Error loading user notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Open notification detail modal & automatically mark as read
  const handleOpenDetail = async (notif: NotificationItem) => {
    setSelectedNotification(notif);
    setIsDetailOpen(true);

    if (!notif.read && profile?.id) {
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notif.id)
          .eq('user_id', profile.id);

        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('ptf:notifications-updated'));
        }
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
  };

  // Mark all current user's notifications as read
  const handleMarkAllAsRead = async () => {
    if (!profile?.id) return;
    setIsMarkingAll(true);
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ptf:notifications-updated'));
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Clean link URL (strip internal tracking params if any)
  const getActionLink = (linkUrl?: string | null) => {
    if (!linkUrl) return null;
    const clean = linkUrl.split('?')[0].split('#')[0];
    if (clean === '/notifications' || clean === '') return null;
    return linkUrl;
  };

  // Map category to user friendly badge
  const formatCategoryBadge = (cat?: string) => {
    if (!cat) return 'GENERAL';
    const upper = cat.toUpperCase();
    if (upper === 'RENEWAL') return 'SCHOLARSHIP';
    if (upper === 'ACTIVITY') return 'SUMMER ACTIVITY';
    if (upper === 'CT_MARKS') return 'ACADEMIC';
    return upper;
  };

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterCategory === 'ALL') return true;
      if (filterCategory === 'UNREAD') return !n.read;
      const mapped = formatCategoryBadge(n.category);
      return mapped === filterCategory || n.category === filterCategory;
    });
  }, [notifications, filterCategory]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            COMMUNICATIONS FEED
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5 flex items-center gap-2">
            Notification Center
            {unreadCount > 0 && (
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#E11D48] text-white">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Official announcements, academic decisions, leave statuses, and attendance notices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            id="mark-all-read-btn"
            leftIcon={<CheckCheck className="w-4 h-4 text-[#10B981]" />}
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
            isLoading={isMarkingAll}
          >
            Mark all as read
          </Button>

          {isAdmin && (
            <Link href="/admin/notifications">
              <Button
                variant="primary"
                size="sm"
                id="open-admin-notification-center-btn"
                leftIcon={<Shield className="w-4 h-4 text-[#D4AF37]" />}
              >
                Notification Center Admin →
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E2E8F0] pb-3 text-xs">
        {[
          { label: 'All', val: 'ALL' },
          { label: `Unread (${unreadCount})`, val: 'UNREAD' },
          { label: 'Announcements', val: 'ANNOUNCEMENT' },
          { label: 'Academics', val: 'ACADEMIC' },
          { label: 'Attendance', val: 'ATTENDANCE' },
          { label: 'Leave', val: 'LEAVE' },
          { label: 'Permission', val: 'PERMISSION' },
          { label: 'Scholarship', val: 'SCHOLARSHIP' },
          { label: 'Summer Activity', val: 'SUMMER ACTIVITY' },
        ].map((f) => (
          <button
            key={f.val}
            onClick={() => setFilterCategory(f.val)}
            className={`px-3 py-1.5 rounded-full font-bold transition-all ${
              filterCategory === f.val
                ? 'bg-[#0A192F] text-white shadow-xs'
                : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="institutional-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            <Clock className="w-6 h-6 mx-auto mb-2 text-[#D4AF37] animate-spin" />
            Loading your notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={filterCategory === 'UNREAD' ? 'No Unread Notifications' : 'No Notifications Found'}
              description={
                filterCategory === 'UNREAD'
                  ? "You have read all incoming notifications. You're all caught up!"
                  : 'Official announcements and institutional updates will appear here.'
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {filteredNotifications.map((notif) => {
              const isUnread = !notif.read;
              const formattedDate = new Date(notif.created_at).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={notif.id}
                  id={`notification-row-${notif.id}`}
                  onClick={() => handleOpenDetail(notif)}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer transition-all ${
                    isUnread
                      ? 'bg-[#FEFCE8]/40 hover:bg-[#FEFCE8]/70 border-l-4 border-[#D4AF37]'
                      : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Read / Unread Visual Indicator */}
                    <div className="pt-0.5 shrink-0">
                      {isUnread ? (
                        <span
                          className="inline-block w-3 h-3 rounded-full bg-[#D4AF37] shadow-xs"
                          title="Unread notification"
                        >
                          <span className="sr-only">●</span>
                        </span>
                      ) : (
                        <span
                          className="inline-block w-3 h-3 rounded-full border-2 border-[#CBD5E1]"
                          title="Read notification"
                        >
                          <span className="sr-only">○</span>
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Top Meta Line: Title + Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-xs sm:text-sm truncate ${
                            isUnread ? 'font-extrabold text-[#0A192F]' : 'font-semibold text-[#334155]'
                          }`}
                        >
                          {notif.title}
                        </span>

                        <Badge variant="neutral" size="sm">
                          {formatCategoryBadge(notif.category)}
                        </Badge>

                        {(notif.priority === 'HIGH' || notif.priority === 'URGENT') && (
                          <Badge
                            variant={notif.priority === 'URGENT' ? 'error' : 'warning'}
                            size="sm"
                          >
                            {notif.priority}
                          </Badge>
                        )}
                      </div>

                      {/* Message Preview */}
                      <p
                        className={`text-xs line-clamp-2 leading-relaxed ${
                          isUnread ? 'text-[#1E293B] font-medium' : 'text-[#64748B]'
                        }`}
                      >
                        {notif.message}
                      </p>

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-[#94A3B8]">
                        <Clock className="w-3 h-3" />
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>Puthiya Thalaimurai Foundation</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-center">
                    <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NOTIFICATION DETAIL MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedNotification?.title || 'Notice Details'}
        subtitle={
          selectedNotification
            ? `${formatCategoryBadge(selectedNotification.category)} • Priority: ${
                selectedNotification.priority || 'NORMAL'
              }`
            : ''
        }
      >
        {selectedNotification && (
          <div className="space-y-4">
            <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] text-[#64748B]">
                <span>
                  Sender: <strong className="text-[#0A192F]">Puthiya Thalaimurai Foundation</strong>
                </span>
                <span>
                  {new Date(selectedNotification.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div>
                <p className="text-xs sm:text-sm text-[#0A192F] font-semibold leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
              {getActionLink(selectedNotification.link_url) ? (
                <Link
                  href={getActionLink(selectedNotification.link_url)!}
                  onClick={() => setIsDetailOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A192F] hover:text-[#D4AF37] transition-colors"
                >
                  Go to Related Section <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div />
              )}

              <Button variant="primary" size="md" onClick={() => setIsDetailOpen(false)}>
                Close Notice
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
