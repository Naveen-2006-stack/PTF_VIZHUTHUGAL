import { createClient } from './supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  category: 'ACADEMIC' | 'CT_MARKS' | 'ATTENDANCE' | 'LEAVE' | 'PERMISSION' | 'RENEWAL' | 'ACTIVITY' | 'MAPPING' | 'ANNOUNCEMENT';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  linkUrl?: string;
  emailRecipient?: string;
}

export async function sendNotification(params: CreateNotificationParams, customClient?: SupabaseClient) {
  try {
    const supabase = customClient || createClient();
    
    // 1. Mandatory In-Portal Notification
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      category: params.category,
      priority: params.priority || 'NORMAL',
      link_url: params.linkUrl || null,
      read: false,
    });

    if (notifError) {
      console.error('Failed to create in-portal notification:', notifError);
    }

    // 2. Event queue record for pluggable delivery (Email/SMS/WhatsApp)
    await supabase.from('notification_events').insert({
      event_type: `NOTIFY_${params.category}`,
      target_audience: 'USER',
      target_id: params.userId,
      payload: {
        title: params.title,
        message: params.message,
        emailRecipient: params.emailRecipient,
        linkUrl: params.linkUrl,
      },
      status: 'SENT', // Mark as handled by default in free tier
      processed_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Notification dispatch error:', error);
    return { success: false, error };
  }
}
