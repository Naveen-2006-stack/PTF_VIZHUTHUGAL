import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
    }

    // Role check: SUPER_ADMIN, SEMI_ADMIN, PTF_SECRETARY
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      (profile.role !== 'SUPER_ADMIN' &&
        profile.role !== 'SEMI_ADMIN' &&
        profile.role !== 'PTF_SECRETARY')
    ) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view admin notification history.' },
        { status: 403 }
      );
    }

    // 1. Fetch campaigns from audit_logs
    const { data: logs, error: logError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'NOTIFICATION_DISPATCH')
      .order('created_at', { ascending: false })
      .limit(50);

    if (logError) {
      console.error('Failed to query audit_logs for notification history:', logError);
    }

    // 2. Fetch all notifications to compute read/unread stats
    // Super Admin and Semi Admin can read all notifications.
    // For Secretary, they can view stats if available, or fall back to logged recipient count.
    const campaigns: any[] = [];

    if (logs && logs.length > 0) {
      for (const log of logs) {
        let meta: any = {};
        try {
          meta = typeof log.new_state === 'string' ? JSON.parse(log.new_state) : log.new_state || {};
        } catch {
          meta = {};
        }

        const campaignId = log.entity_id || meta.campaignId;
        const initialRecipientCount = meta.recipientCount || 0;

        let readCount = 0;
        let unreadCount = initialRecipientCount;
        let actualCount = initialRecipientCount;

        // If user is Admin, query notifications table for live delivery/read statistics
        if (profile.role === 'SUPER_ADMIN' || profile.role === 'SEMI_ADMIN') {
          if (campaignId) {
            const { data: notifRows } = await supabase
              .from('notifications')
              .select('id, read')
              .ilike('link_url', `%cid=${campaignId}%`);

            if (notifRows && notifRows.length > 0) {
              actualCount = notifRows.length;
              readCount = notifRows.filter((r) => r.read).length;
              unreadCount = actualCount - readCount;
            }
          }
        }

        campaigns.push({
          id: log.id,
          campaignId,
          title: meta.title || 'Notification Broadcast',
          message: meta.message || '',
          type: meta.notificationType || meta.category || 'ANNOUNCEMENT',
          category: meta.category || 'ANNOUNCEMENT',
          priority: meta.priority || 'NORMAL',
          recipientScope: meta.recipientType || 'ALL_STUDENTS',
          recipientCount: actualCount,
          readCount,
          unreadCount,
          status: meta.status || 'SENT',
          createdBy: meta.createdBy || profile.full_name || 'Admin',
          createdAt: log.created_at || meta.createdAt,
        });
      }
    }

    return NextResponse.json({
      success: true,
      campaigns,
      canCreate: profile.role === 'SUPER_ADMIN' || profile.role === 'SEMI_ADMIN',
      canDelete: profile.role === 'SUPER_ADMIN',
    });
  } catch (error: any) {
    console.error('Notification history API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ONLY SUPER_ADMIN can delete/archive notifications
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin has authority to delete or archive notifications.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    // Delete recipient notifications
    const { error: delError } = await supabase
      .from('notifications')
      .delete()
      .ilike('link_url', `%cid=${campaignId}%`);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    // Log deletion in audit_logs
    await logAuditEvent(
      {
        actorId: profile.id,
        action: 'ARCHIVE_NOTIFICATION_CAMPAIGN',
        entity: 'notifications',
        entityId: campaignId,
        newState: { campaignId, archivedBy: profile.full_name, archivedAt: new Date().toISOString() },
      },
      supabase
    );

    return NextResponse.json({ success: true, message: 'Notification campaign safely archived.' });
  } catch (error: any) {
    console.error('Delete notification campaign error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
