'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWorkspace } from '@/context/workspace-context';
import {
  timeOffService,
  TimeOffRequestItem,
  TimeOffStatus,
} from '@/services/time-off.service';
import {
  CalendarOff,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Calendar,
  User,
  MapPin,
} from 'lucide-react';

export default function TimeOffPage() {
  const { user, selectedLocation } = useWorkspace();
  const locationId = selectedLocation?.id;
  const isManagerOrAdmin = ['Owner', 'Admin', 'Manager'].includes(user?.role || '');

  const [activeTab, setActiveTab] = useState<'pending' | 'my-requests'>(
    isManagerOrAdmin ? 'pending' : 'my-requests'
  );

  const [pendingRequests, setPendingRequests] = useState<TimeOffRequestItem[]>([]);
  const [myRequests, setMyRequests] = useState<TimeOffRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [myReqs, pendingReqs] = await Promise.all([
        timeOffService.listMine(),
        locationId && isManagerOrAdmin
          ? timeOffService.getPendingForLocation(locationId)
          : Promise.resolve([]),
      ]);

      setMyRequests(myReqs);
      setPendingRequests(pendingReqs);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load time-off records.');
    } finally {
      setLoading(false);
    }
  }, [locationId, isManagerOrAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !startDate || !endDate) {
      setErrorMessage('Please select both start and end dates.');
      return;
    }

    if (endDate < startDate) {
      setErrorMessage('End date cannot be earlier than start date.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      await timeOffService.createRequest({
        locationId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });

      setSuccessMessage('Time off request submitted successfully.');
      setIsModalOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit time off request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this time-off request?')) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await timeOffService.cancelRequest(requestId);
      setSuccessMessage('Request cancelled.');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (requestId: string, action: 'approve' | 'deny') => {
    const reasonPrompt = prompt(`Enter optional note for ${action === 'approve' ? 'approval' : 'denial'}:`, '');
    if (reasonPrompt === null) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await timeOffService.reviewRequest(requestId, {
        action,
        reason: reasonPrompt.trim() || undefined,
      });
      setSuccessMessage(`Request successfully ${action === 'approve' ? 'approved' : 'denied'}.`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || `Failed to ${action} request.`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: TimeOffStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            Approved
          </span>
        );
      case 'denied':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
            Denied
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-emerald-500" />
            <span>Time Off & Leave</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit vacation or personal absence requests and review team leave submissions.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Request Time Off</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-semibold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-semibold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-card-border pb-3 text-xs font-medium">
        {isManagerOrAdmin && (
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-emerald-50 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Pending Approvals</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-700 text-foreground font-mono">
              {pendingRequests.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('my-requests')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'my-requests'
              ? 'bg-emerald-50 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>My Requests</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-700 text-foreground font-mono">
            {myRequests.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-muted-foreground">
          LOADING TIME OFF RECORDS...
        </div>
      ) : (
        <>
          {/* TAB 1: MANAGER PENDING APPROVALS */}
          {activeTab === 'pending' && isManagerOrAdmin && (
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground border border-card-border rounded-xl bg-card">
                  No pending time-off requests awaiting review for this location.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-card-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {req.user?.fullName || 'Staff Member'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({req.user?.email})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span>
                            {req.startDate.slice(0, 10)} to {req.endDate.slice(0, 10)}
                          </span>
                        </div>

                        {req.reason && (
                          <p className="text-[11px] text-muted-foreground italic">
                            &ldquo;{req.reason}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleReview(req.id, 'deny')}
                          disabled={submitting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border bg-background text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-neutral-800 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Deny</span>
                        </button>
                        <button
                          onClick={() => handleReview(req.id, 'approve')}
                          disabled={submitting}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY TIME OFF REQUESTS */}
          {activeTab === 'my-requests' && (
            <div className="space-y-3">
              {myRequests.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground border border-card-border rounded-xl bg-card">
                  You have not submitted any time-off requests yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {myRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-card-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(req.status)}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Submitted on {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-foreground font-medium pt-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span>
                            {req.startDate.slice(0, 10)} to {req.endDate.slice(0, 10)}
                          </span>
                        </div>

                        {req.reason && (
                          <p className="text-[11px] text-muted-foreground italic">
                            &ldquo;{req.reason}&rdquo;
                          </p>
                        )}
                      </div>

                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          disabled={submitting}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-rose-500 transition-colors self-end sm:self-center"
                          title="Cancel Request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel Request</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Request Time Off */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-foreground">Request Time Off</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your dates and provide an optional explanation.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  First Day of Absence <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Last Day of Absence <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Reason / Notes
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Vacation, medical appointment, personal matter"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}