'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { AuditLog } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldCheck, Search, Clock, FileText, User } from 'lucide-react';

export default function AuditLogsPage() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadAuditLogs() {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('audit_logs')
          .select('*, actor:profiles(*)')
          .order('created_at', { ascending: false })
          .limit(100);

        if (data) setLogs(data as any);
      } catch (err) {
        console.error('Error loading audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      log.actor?.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            SECURITY &amp; COMPLIANCE
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Immutable Audit Logging System
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Tamper-resistant audit trail recording administrative decisions, marks verification, and attendance submissions.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0A192F] text-[#D4AF37] px-3.5 py-1.5 rounded-full text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Append-Only Security Log</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="institutional-card p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by action (e.g. SUBMIT_CT_MARK, STAFF_MAPPING_APPROVED) or actor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
            System Event Records
          </h3>
          <span className="text-xs text-[#64748B] font-semibold">
            {filteredLogs.length} Events Logged
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            title="No Audit Logs Recorded"
            description="As privileged actions, marks verifications, and approvals are executed, their immutable records will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">State Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-[#0A192F]">
                      {log.actor?.full_name || 'System Engine'}
                      {log.actor?.role && (
                        <span className="block text-[10px] text-[#64748B] font-normal">
                          {log.actor.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0A192F]">
                      <Badge variant="navy" size="sm">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[#475569]">
                      {log.entity} {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ''}
                    </td>
                    <td className="py-3 px-4 text-[#64748B] max-w-xs truncate">
                      {log.new_state ? JSON.stringify(log.new_state) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
