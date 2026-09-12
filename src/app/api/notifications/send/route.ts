import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { mapTypeToCategory, mapPriorityToDb, NotificationType, NotificationPriorityInput } from '@/lib/notifications';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
    }

    // Role verification
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'SUPER_ADMIN' && profile.role !== 'SEMI_ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin and Semi Admin can send portal notifications.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      message,
      priority = 'Normal',
      notificationType = 'GENERAL',
      recipientType, // 'INDIVIDUAL' | 'SELECTED' | 'ALL_STUDENTS' | 'CAMPUS' | 'ROLE'
      targetStudentId,
      targetStudentIds,
      targetCampusId,
      targetRole,
    } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
    }

    // Role restrictions: SEMI_ADMIN can ONLY target students
    if (profile.role === 'SEMI_ADMIN') {
      if (recipientType === 'ROLE' && targetRole && targetRole !== 'STUDENT') {
        return NextResponse.json(
          { error: 'Forbidden: Semi Admin can only target students with notifications.' },
          { status: 403 }
        );
      }
    }

    // Resolve recipient user IDs (profile IDs)
    const recipientUserIds: Set<string> = new Set();

    if (recipientType === 'INDIVIDUAL') {
      if (!targetStudentId) {
        return NextResponse.json({ error: 'targetStudentId is required for INDIVIDUAL recipient type.' }, { status: 400 });
      }
      // Target could be a student ID or profile ID
      const { data: s } = await supabase
        .from('students')
        .select('profile_id')
        .or(`id.eq.${targetStudentId},profile_id.eq.${targetStudentId}`)
        .maybeSingle();

      if (s?.profile_id) {
        recipientUserIds.add(s.profile_id);
      } else {
        recipientUserIds.add(targetStudentId);
      }
    } else if (recipientType === 'SELECTED') {
      if (!Array.isArray(targetStudentIds) || targetStudentIds.length === 0) {
        return NextResponse.json({ error: 'targetStudentIds must be a non-empty array.' }, { status: 400 });
      }
      const { data: students } = await supabase
        .from('students')
        .select('profile_id')
        .in('id', targetStudentIds);

      if (students && students.length > 0) {
        students.forEach((s) => {
          if (s.profile_id) recipientUserIds.add(s.profile_id);
        });
      }
      // Also add any that were already profile IDs directly
      targetStudentIds.forEach((id) => recipientUserIds.add(id));
    } else if (recipientType === 'ALL_STUDENTS') {
      const { data: students } = await supabase
        .from('students')
        .select('profile_id');

      if (students) {
        students.forEach((s) => {
          if (s.profile_id) recipientUserIds.add(s.profile_id);
        });
      }
    } else if (recipientType === 'CAMPUS') {
      if (!targetCampusId) {
        return NextResponse.json({ error: 'targetCampusId is required for CAMPUS recipient type.' }, { status: 400 });
      }
      const { data: students } = await supabase
        .from('students')
        .select('profile_id')
        .or(`campus_id.eq.${targetCampusId},campus_code.eq.${targetCampusId}`);

      if (students) {
        students.forEach((s) => {
          if (s.profile_id) recipientUserIds.add(s.profile_id);
        });
      }
    } else if (recipientType === 'ROLE') {
      if (profile.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Only Super Admin can send by role.' }, { status: 403 });
      }
      let q = supabase.from('profiles').select('id');
      if (targetRole && targetRole !== 'ALL') {
        q = q.eq('role', targetRole);
      }
      const { data: users } = await q;
      if (users) {
        users.forEach((u) => recipientUserIds.add(u.id));
      }
    } else {
      return NextResponse.json({ error: 'Invalid recipientType provided.' }, { status: 400 });
    }

    const uniqueUserIds = Array.from(recipientUserIds);
    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ error: 'No matching recipients found for the selected criteria.' }, { status: 400 });
    }

    const campaignId = crypto.randomUUID();
    const category = mapTypeToCategory(notificationType as NotificationType);
    const dbPriority = mapPriorityToDb(priority as NotificationPriorityInput);
    const trackingLink = `/notifications?cid=${campaignId}`;

    // Batch insert notifications
    const rows = uniqueUserIds.map((uid) => ({
      user_id: uid,
      title: title.trim(),
      message: message.trim(),
      category,
      priority: dbPriority,
      link_url: trackingLink,
      read: false,
    }));

    // Insert in chunks of 50 to avoid request size limits
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: insertErr } = await supabase.from('notifications').insert(chunk);
      if (insertErr) {
        console.error('Batch notification insert error:', insertErr);
        return NextResponse.json({ error: `Failed to insert notification batch: ${insertErr.message}` }, { status: 500 });
      }
    }

    // Record Campaign Dispatch in audit_logs
    await logAuditEvent(
      {
        actorId: profile.id,
        action: 'NOTIFICATION_DISPATCH',
        entity: 'notifications',
        entityId: campaignId,
        newState: {
          campaignId,
          title: title.trim(),
          message: message.trim(),
          category,
          notificationType,
          priority: dbPriority,
          recipientType,
          recipientCount: uniqueUserIds.length,
          targetCampusId: targetCampusId || null,
          targetRole: targetRole || null,
          createdBy: profile.full_name || profile.email,
          senderEmail: profile.email,
          createdAt: new Date().toISOString(),
          status: 'SENT',
        },
      },
      supabase
    );

    return NextResponse.json({
      success: true,
      campaignId,
      recipientCount: uniqueUserIds.length,
      category,
      priority: dbPriority,
      message: `Notification successfully sent to ${uniqueUserIds.length} recipient${uniqueUserIds.length === 1 ? '' : 's'}.`,
    });
  } catch (error: any) {
    console.error('Notification send API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
