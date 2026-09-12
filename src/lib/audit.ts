import { createClient } from './supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditEntry {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAuditEvent(entry: AuditEntry, customClient?: SupabaseClient) {
  try {
    const supabase = customClient || createClient();
    await supabase.from('audit_logs').insert({
      actor_id: entry.actorId || null,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId || null,
      previous_state: entry.previousState ? JSON.stringify(entry.previousState) : null,
      new_state: entry.newState ? JSON.stringify(entry.newState) : null,
      ip_address: entry.ipAddress || null,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
