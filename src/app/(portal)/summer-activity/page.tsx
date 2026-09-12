'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { SummerActivity, RequestStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { SunMedium, Plus, CheckCircle2, AlertCircle, MapPin, Calendar, FileText } from 'lucide-react';
import { logAuditEvent } from '@/lib/audit';

export default function SummerActivityPage() {
  const { role, profile, student } = useAuth();
  const [activities, setActivities] = useState<SummerActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New activity form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin review
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAct, setSelectedAct] = useState<SummerActivity | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');

  const supabase = createClient();
  const isStudent = role === 'STUDENT';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'SEMI_ADMIN';

  useEffect(() => {
    loadActivities();
  }, [student, role]);

  async function loadActivities() {
    setIsLoading(true);
    try {
      let query = supabase
        .from('summer_activities')
        .select('*, student:students(*, campus:campuses(*), department:departments(*), profile:profiles(*))')
        .order('activity_date', { ascending: false });

      if (isStudent && student) {
        query = query.eq('submitted_by', student.id);
      }

      const { data } = await query;
      if (data) setActivities(data as any);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Student submits Summer Activity
  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!student) {
      setFeedback({ type: 'error', message: 'You must have an active student profile.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Insert activity
      const { data: act, error: actError } = await supabase
        .from('summer_activities')
        .insert({
          title,
          description,
          activity_date: activityDate,
          location,
          submitted_by: student.id,
          status: 'SUBMITTED',
        })
        .select()
        .single();

      if (actError) throw actError;

      // 2. If group project: create activity_groups & group member record
      if (groupName.trim()) {
        const { data: group } = await supabase
          .from('activity_groups')
          .insert({
            activity_id: act.id,
            group_name: groupName.trim(),
          })
          .select()
          .single();

        if (group) {
          await supabase.from('activity_group_members').insert({
            group_id: group.id,
            student_id: student.id,
            role: 'LEADER',
          });
        }
      }

      // 3. Log audit
      await logAuditEvent({
        actorId: profile?.id,
        action: 'SUBMIT_SUMMER_ACTIVITY',
        entity: 'summer_activities',
        entityId: act.id,
        newState: { title, location, activityDate },
      });

      setFeedback({ type: 'success', message: 'Summer activity submitted for foundation review.' });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setGroupName('');
      loadActivities();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit activity.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin decision
  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedAct) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('summer_activities')
        .update({
          status: decision,
          admin_remarks: adminRemarks || null,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedAct.id);

      if (error) throw error;

      await logAuditEvent({
        actorId: profile?.id,
        action: `SUMMER_ACTIVITY_${decision}`,
        entity: 'summer_activities',
        entityId: selectedAct.id,
        newState: { status: decision },
      });

      setReviewModalOpen(false);
      setSelectedAct(null);
      setAdminRemarks('');
      setFeedback({ type: 'success', message: `Activity ${decision.toLowerCase()} successfully.` });
      loadActivities();
    } catch (err: any) {
      alert(`Error updating activity: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            COMMUNITY &amp; SOCIAL IMPACT
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] mt-0.5">
            Summer Social Service Activities
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Motto: &ldquo;Building Students&apos; Personality Through Social Service&rdquo;. Document fieldwork and village outreach projects.
          </p>
        </div>

        {isStudent && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4 text-[#D4AF37]" />}
            onClick={() => setIsModalOpen(true)}
          >
            Submit Activity Report
          </Button>
        )}
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

      {/* Activities Grid */}
      {activities.length === 0 ? (
        <EmptyState
          title="No Summer Activities Recorded Yet"
          description={
            isStudent
              ? 'You have not submitted any summer service activities yet. Click "Submit Activity Report" to record your community initiatives.'
              : 'No student activities have been submitted for review yet.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((act) => (
            <div key={act.id} className="institutional-card p-6 flex flex-col justify-between gold-accent-top">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase">
                    {new Date(act.activity_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <Badge
                    variant={
                      act.status === 'APPROVED' ? 'success' :
                      act.status === 'REJECTED' ? 'error' :
                      'warning'
                    }
                    dot
                  >
                    {act.status}
                  </Badge>
                </div>
                <h4 className="text-base font-bold text-[#0A192F] mb-1">{act.title}</h4>
                <p className="text-xs text-[#64748B] flex items-center gap-1 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{act.location}</span>
                </p>
                <p className="text-xs text-[#475569] line-clamp-3 leading-relaxed">
                  {act.description}
                </p>
                {act.admin_remarks && (
                  <div className="mt-3 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[11px] text-[#334155]">
                    <strong>Foundation Feedback:</strong> {act.admin_remarks}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">
                  By: {act.student?.profile?.full_name || 'Scholar'} ({act.student?.ptf_id})
                </span>
                {isAdmin && act.status === 'SUBMITTED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedAct(act);
                      setReviewModalOpen(true);
                    }}
                  >
                    Review
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Summer Activity Report"
        subtitle="Log village community service, literacy drives, or environmental initiatives"
      >
        <form onSubmit={handleSubmitActivity} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Project / Activity Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rural Digital Literacy Drive"
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Activity Date
              </label>
              <input
                type="date"
                required
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0A192F]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Location / Venue
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Village / District"
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Group / Team Name (Optional for collaborative projects)
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Green Earth Taskforce Team 3"
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
              Detailed Description &amp; Beneficiaries Impacted
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail your fieldwork, number of hours, activities undertaken, and community impact..."
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
            />
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
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      {selectedAct && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title="Review Summer Activity"
          subtitle={`Submitted by: ${selectedAct.student?.profile?.full_name} (${selectedAct.student?.ptf_id})`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0A192F] uppercase mb-1">
                Foundation Verification Remarks
              </label>
              <textarea
                rows={3}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Enter feedback or verification confirmation..."
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0A192F]"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <Button
                variant="danger"
                size="md"
                isLoading={isSubmitting}
                onClick={() => handleDecision('REJECTED')}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                onClick={() => handleDecision('APPROVED')}
              >
                Approve Activity
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
