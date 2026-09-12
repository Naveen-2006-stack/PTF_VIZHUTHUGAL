import { createClient } from './supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType =
  | 'GENERAL'
  | 'ANNOUNCEMENT'
  | 'ACADEMIC'
  | 'LEAVE'
  | 'PERMISSION'
  | 'SCHOLARSHIP'
  | 'SUMMER_ACTIVITY'
  | 'ATTENDANCE'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationPriorityInput = 'Normal' | 'Important' | 'Urgent' | 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type DbCategory =
  | 'ANNOUNCEMENT'
  | 'ACADEMIC'
  | 'CT_MARKS'
  | 'ATTENDANCE'
  | 'LEAVE'
  | 'PERMISSION'
  | 'RENEWAL'
  | 'ACTIVITY'
  | 'MAPPING';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  category?: DbCategory | NotificationType;
  notificationType?: NotificationType;
  priority?: NotificationPriorityInput;
  linkUrl?: string | null;
  referenceId?: string | null;
  emailRecipient?: string;
}

export interface NotificationPayload {
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriorityInput;
  linkUrl?: string | null;
  referenceId?: string | null;
}

export function mapTypeToCategory(type?: string): DbCategory {
  if (!type) return 'ANNOUNCEMENT';
  const upper = type.toUpperCase();
  switch (upper) {
    case 'GENERAL':
    case 'ANNOUNCEMENT':
    case 'SYSTEM':
      return 'ANNOUNCEMENT';
    case 'ACADEMIC':
    case 'CT_MARKS':
      return 'ACADEMIC';
    case 'ATTENDANCE':
      return 'ATTENDANCE';
    case 'LEAVE':
      return 'LEAVE';
    case 'PERMISSION':
      return 'PERMISSION';
    case 'SCHOLARSHIP':
    case 'RENEWAL':
      return 'RENEWAL';
    case 'SUMMER_ACTIVITY':
    case 'ACTIVITY':
      return 'ACTIVITY';
    case 'MAPPING':
      return 'MAPPING';
    default:
      return 'ANNOUNCEMENT';
  }
}

export function mapPriorityToDb(priority?: string): NotificationPriority {
  if (!priority) return 'NORMAL';
  const upper = priority.toUpperCase();
  if (upper === 'URGENT') return 'URGENT';
  if (upper === 'IMPORTANT' || upper === 'HIGH') return 'HIGH';
  if (upper === 'LOW') return 'LOW';
  return 'NORMAL';
}

/**
 * Dispatches an in-portal notification with duplicate prevention.
 */
export async function sendNotification(
  params: CreateNotificationParams,
  customClient?: SupabaseClient
): Promise<{ success: boolean; id?: string; duplicateSkipped?: boolean; error?: any }> {
  try {
    const supabase = customClient || createClient();
    const category = mapTypeToCategory(params.notificationType || params.category);
    const priority = mapPriorityToDb(params.priority);

    // 1. Duplicate Prevention / Idempotency Check
    if (params.referenceId) {
      const refTag = `ref=${params.referenceId}`;
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', params.userId)
        .ilike('link_url', `%${refTag}%`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return { success: true, id: existing.id, duplicateSkipped: true };
      }
    } else {
      // Check if identical notification was sent to this user in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentDup } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', params.userId)
        .eq('title', params.title)
        .gte('created_at', fiveMinutesAgo)
        .limit(1)
        .maybeSingle();

      if (recentDup) {
        return { success: true, id: recentDup.id, duplicateSkipped: true };
      }
    }

    // Format link_url with reference tag if provided
    let finalLink = params.linkUrl || null;
    if (params.referenceId) {
      const separator = finalLink && finalLink.includes('?') ? '&' : '?';
      finalLink = finalLink ? `${finalLink}${separator}ref=${params.referenceId}` : `/notifications?ref=${params.referenceId}`;
    }

    // 2. Insert into in-portal notifications table
    const { data: inserted, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        category,
        priority,
        link_url: finalLink,
        read: false,
      })
      .select('id')
      .single();

    if (notifError) {
      console.error('Failed to create in-portal notification:', notifError);
      return { success: false, error: notifError };
    }

    // 3. Optional event queue record for pluggable delivery (Email/SMS/WhatsApp)
    try {
      await supabase.from('notification_events').insert({
        event_type: `NOTIFY_${category}`,
        target_audience: 'USER',
        target_id: params.userId,
        payload: {
          title: params.title,
          message: params.message,
          emailRecipient: params.emailRecipient,
          linkUrl: finalLink,
        },
        status: 'SENT',
        processed_at: new Date().toISOString(),
      });
    } catch {
      // Handled gracefully in case notification_events RLS or offline
    }

    return { success: true, id: inserted?.id };
  } catch (error) {
    console.error('Notification dispatch error:', error);
    return { success: false, error };
  }
}

/**
 * Queries the total unread notification count for a specific user.
 */
export async function getUnreadCount(userId: string, customClient?: SupabaseClient): Promise<number> {
  try {
    const supabase = customClient || createClient();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return 0;
  }
}

/**
 * Marks a specific notification as read, ensuring it belongs to the current user.
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
  customClient?: SupabaseClient
): Promise<boolean> {
  try {
    const supabase = customClient || createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('markAsRead error:', err);
    return false;
  }
}

/**
 * Marks all notifications for a specific user as read.
 */
export async function markAllAsRead(userId: string, customClient?: SupabaseClient): Promise<boolean> {
  try {
    const supabase = customClient || createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('markAllAsRead error:', err);
    return false;
  }
}

/**
 * Modular Notification Service
 */
export class NotificationService {
  static async sendNotification(params: CreateNotificationParams, customClient?: SupabaseClient) {
    return sendNotification(params, customClient);
  }

  static async sendToUser(userId: string, payload: NotificationPayload, customClient?: SupabaseClient) {
    return sendNotification(
      {
        userId,
        title: payload.title,
        message: payload.message,
        notificationType: payload.type,
        priority: payload.priority,
        linkUrl: payload.linkUrl,
        referenceId: payload.referenceId,
      },
      customClient
    );
  }

  static async sendToUsers(userIds: string[], payload: NotificationPayload, customClient?: SupabaseClient) {
    let sentCount = 0;
    const errors: any[] = [];

    for (const uid of userIds) {
      const res = await sendNotification(
        {
          userId: uid,
          title: payload.title,
          message: payload.message,
          notificationType: payload.type,
          priority: payload.priority,
          linkUrl: payload.linkUrl,
          referenceId: payload.referenceId,
        },
        customClient
      );
      if (res.success) {
        sentCount++;
      } else {
        errors.push(res.error);
      }
    }

    return {
      success: errors.length === 0,
      count: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  static async getUnreadCount(userId: string, customClient?: SupabaseClient) {
    return getUnreadCount(userId, customClient);
  }

  static async markAsRead(notificationId: string, userId: string, customClient?: SupabaseClient) {
    return markAsRead(notificationId, userId, customClient);
  }

  static async markAllAsRead(userId: string, customClient?: SupabaseClient) {
    return markAllAsRead(userId, customClient);
  }
}
