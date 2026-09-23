'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWorkspace } from '@/context/workspace-context';
import {
  timeTrackingService,
  TimeEntryItem,
  TimeEntryStatus,
} from '@/services/time-tracking.service';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Navigation,
  Calendar,
  RefreshCw,
  X,
} from 'lucide-react';

function getBrowserLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(error.message || 'Unable to retrieve your physical location.'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function formatDuration(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const diffSec = Math.floor(diffMs / 1000);

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function TimesheetsPage() {
  const { user, selectedLocation } = useWorkspace();
  const locationId = selectedLocation?.id;
  const isManagerOrAdmin = ['Owner', 'Admin', 'Manager'].includes(user?.role || '');

  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
    };
  });

  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clock Out Warning/Confirmation Modal State
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);

  // Live timer tick for active shift
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTimesheets = useCallback(async () => {
    if (!locationId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const startIso = `${dateRange.start}T00:00:00Z`;
      const endIso = `${dateRange.end}T23:59:59Z`;
      const data = await timeTrackingService.getTimesheets(locationId, startIso, endIso);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to fetch timesheet entries.');
    } finally {
      setLoading(false);
    }
  }, [locationId, dateRange]);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  // ✅ ACCURATE ACTIVE SHIFT DETECTION:
  // Sort entries newest-first and check ONLY the latest punch for the current user.
  const activeEntry = useMemo(() => {
    if (!user?.id || !entries.length) return null;

    const myEntries = entries
      .filter((e) => e.userId === user.id || (e as any).user?.id === user.id)
      .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

    if (!myEntries.length) return null;

    const latest = myEntries[0];
    const isClockedOut = Boolean(latest.clockOut && latest.clockOut !== 'null' && latest.clockOut !== '');

    // Active ONLY if the latest entry has no clockOut timestamp
    return !isClockedOut ? latest : null;
  }, [entries, user?.id]);

  const handleClockIn = async () => {
    if (!locationId) {
      setErrorMessage('Please select a store location before clocking in.');
      return;
    }
    try {
      setPunching(true);
      setErrorMessage(null);

      const coords = await getBrowserLocation();
      await timeTrackingService.clockIn({
        locationId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        notes: notesInput.trim() || undefined,
      });

      setNotesInput('');
      setSuccessMessage('Clock-in successful! Your shift timer has started.');
      await loadTimesheets();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Clock-in failed.');
    } finally {
      setPunching(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setPunching(true);
      setErrorMessage(null);

      const coords = await getBrowserLocation();
      await timeTrackingService.clockOut({
        timeEntryId: activeEntry?.id,
        id: activeEntry?.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        notes: notesInput.trim() || undefined,
      } as any);

      setNotesInput('');
      setSuccessMessage('Clock-out recorded. Timesheet sent for manager review.');
      setShowClockOutConfirm(false);
      await loadTimesheets();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Clock-out failed.');
    } finally {
      setPunching(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setApprovingId(id);
      setErrorMessage(null);
      await timeTrackingService.approveEntry(id);
      setSuccessMessage('Timesheet entry approved.');
      await loadTimesheets();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to approve punch.');
    } finally {
      setApprovingId(null);
    }
  };

  const renderStatusBadge = (status: TimeEntryStatus, clockOut?: string | null) => {
    const isStillActive = !clockOut || clockOut === 'null' || clockOut === '';

    if (isStillActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-800 animate-pulse">
          Clocked In
        </span>
      );
    }

    const normalized = String(status).toLowerCase();
    if (normalized === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
          Approved
        </span>
      );
    }

    if (normalized === 'flagged') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
          Flagged
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-card dark:bg-neutral-800 text-muted-foreground dark:text-neutral-300 border border-card-border dark:border-neutral-700">
        Completed
      </span>
    );
  };

  const activeCount = entries.filter((e) => !e.clockOut || e.clockOut === 'null' || e.clockOut === '').length;
  const flaggedCount = entries.filter((e) => String(e.status).toLowerCase() === 'flagged').length;
  const totalTrackedHours = useMemo(() => {
    const totalMs = entries.reduce((acc, entry) => {
      const start = new Date(entry.clockIn).getTime();
      const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now();
      return acc + Math.max(0, end - start);
    }, 0);
    return (totalMs / (1000 * 60 * 60)).toFixed(1);
  }, [entries]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            <span>Time & Attendance</span>
          </h1>
          <p className="text-xs text-muted-foreground dark:text-neutral-400 mt-0.5">
            GPS mobile clock-in, geofence radius audit, and manager punch approvals.
          </p>
        </div>

        <button
          onClick={loadTimesheets}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border dark:border-neutral-800 text-xs font-semibold text-muted-foreground dark:text-neutral-300 hover:bg-card dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer">
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
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-semibold cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Punch Clock Widget */}
      <div className="border border-card-border dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900/50 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground dark:text-neutral-400">
            <Navigation className="w-3.5 h-3.5 text-sky-500" />
            <span>GPS Time Clock · {selectedLocation?.name || 'Store Location'}</span>
          </div>

          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-mono font-bold tracking-tight text-neutral-900 dark:text-white">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>

          {activeEntry ? (
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Shift active · Duration: {formatDuration(activeEntry.clockIn)}</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              You are currently clocked out. Coordinates will verify against the store geofence upon punch.
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="Optional punch notes (e.g. Covering register)"
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            className="px-3 py-2 text-xs bg-card dark:bg-neutral-950 border border-card-border dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white outline-none sm:w-64"
          />

          {activeEntry ? (
            <button
              onClick={() => setShowClockOutConfirm(true)}
              disabled={punching}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Clock Out</span>
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={punching}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{punching ? 'Verifying GPS...' : 'Clock In'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-card-border dark:border-neutral-800 bg-white dark:bg-neutral-900/30">
          <div className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">Active On Duty</div>
          <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white mt-1">{activeCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-card-border dark:border-neutral-800 bg-white dark:bg-neutral-900/30">
          <div className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">Flagged Punches</div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">{flaggedCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-card-border dark:border-neutral-800 bg-white dark:bg-neutral-900/30">
          <div className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">Total Hours</div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{totalTrackedHours}h</div>
        </div>
        <div className="p-4 rounded-xl border border-card-border dark:border-neutral-800 bg-white dark:bg-neutral-900/30">
          <div className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">Geofence Radius</div>
          <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
            {selectedLocation?.geofenceRadiusMeters ?? 150}m
          </div>
        </div>
      </div>

      {/* Timesheet Audit Ledger */}
      <div className="border border-card-border dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900/30 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-card-border dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card dark:bg-neutral-900/60">
          <div className="text-xs font-bold uppercase font-mono tracking-wider text-muted-foreground dark:text-neutral-300">
            Attendance Records ({entries.length})
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-950 border border-card-border dark:border-neutral-800 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="bg-transparent text-neutral-800 dark:text-neutral-200 outline-none text-xs font-mono"
              />
              <span className="text-muted-foreground">–</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="bg-transparent text-neutral-800 dark:text-neutral-200 outline-none text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs font-mono text-muted-foreground">
            AUDITING TIMESHEET LEDGER...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-16 text-center text-xs text-muted-foreground">
            No attendance punches recorded in this date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card dark:bg-neutral-900/80 border-b border-card-border dark:border-neutral-800 text-[10px] font-mono text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Clock In</th>
                  <th className="px-4 py-3">Clock Out</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">GPS Proximity</th>
                  <th className="px-4 py-3">Variance</th>
                  <th className="px-4 py-3">Status</th>
                  {isManagerOrAdmin && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono">
                {entries.map((entry) => {
                  const inTime = new Date(entry.clockIn);
                  const hasClockedOut = Boolean(entry.clockOut && entry.clockOut !== 'null' && entry.clockOut !== '');
                  const outTime = hasClockedOut ? new Date(entry.clockOut!) : null;
                  const radius = selectedLocation?.geofenceRadiusMeters ?? 150;
                  const isOutOfBounds = (entry.clockInDistance ?? 0) > radius;

                  return (
                    <tr key={entry.id} className="hover:bg-card dark:hover:bg-neutral-900/20">
                      <td className="px-4 py-3">
                        <div className="font-sans font-bold text-neutral-900 dark:text-white">
                          {entry.user?.fullName || 'Staff'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">{entry.user?.email}</div>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground dark:text-neutral-300">
                        <div>{inTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground dark:text-neutral-300">
                        {outTime ? (
                          <>
                            <div>{outTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        ) : (
                          <span className="text-sky-500 italic">In progress</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                        {formatDuration(entry.clockIn, entry.clockOut)}
                      </td>

                      <td className="px-4 py-3">
                        <div
                          className={`inline-flex items-center gap-1 text-[11px] ${
                            isOutOfBounds ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-muted-foreground'
                          }`}
                        >
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{Math.round(entry.clockInDistance ?? 0)}m from pin</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={
                            (entry.varianceMinutes ?? 0) !== 0
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-muted-foreground'
                          }
                        >
                          {(entry.varianceMinutes ?? 0) > 0
                            ? `+${entry.varianceMinutes}m`
                            : `${entry.varianceMinutes ?? 0}m`}
                        </span>
                      </td>

                      <td className="px-4 py-3">{renderStatusBadge(entry.status, entry.clockOut)}</td>

                      {isManagerOrAdmin && (
                        <td className="px-4 py-3 text-right">
                          {entry.status !== 'approved' && hasClockedOut && (
                            <button
                              onClick={() => handleApprove(entry.id)}
                              disabled={approvingId === entry.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                            >
                              {approvingId === entry.id ? 'Approving...' : 'Approve'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clock-Out Confirmation Dialog */}
      {showClockOutConfirm && activeEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-card-border dark:border-neutral-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Clock Out Confirmation</h3>
                <p className="text-[11px] text-muted-foreground">Conclude active work shift</p>
              </div>
            </div>

            <div className="p-3 bg-card dark:bg-neutral-950/60 rounded-xl border border-card-border dark:border-neutral-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Shift Duration:</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {formatDuration(activeEntry.clockIn)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Clock In Time:</span>
                <span>
                  {new Date(activeEntry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {notesInput.trim() && (
                <div className="pt-1.5 border-t border-card-border dark:border-neutral-800 text-[11px] text-muted-foreground dark:text-neutral-400">
                  <span className="font-sans font-semibold">Notes:</span> &ldquo;{notesInput}&rdquo;
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground dark:text-neutral-400 leading-relaxed">
              Are you sure you want to end your shift? Your GPS departure coordinates will be logged and verified against the store geofence.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClockOutConfirm(false)}
                disabled={punching}
                className="px-3.5 py-1.5 text-xs text-muted-foreground hover:text-neutral-800 dark:hover:text-neutral-200 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClockOut}
                disabled={punching}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {punching ? 'Clocking Out...' : 'Confirm Clock Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}