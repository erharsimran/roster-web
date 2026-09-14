'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useWorkspace } from '@/context/workspace-context';
import {
  schedulingService,
  ScheduleGridPayload,
  ShiftCard as ShiftCardData,
} from '@/services/scheduling.service';
import { employeeService } from '@/services/employee.service';
import { positionService } from '@/services/position.service';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
  X,
  CalendarOff,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Constants & pure helpers                                            */
/* ------------------------------------------------------------------ */

/**
 * Position color palette.
 * IMPORTANT: every entry now carries a LIGHT-mode value plus a `dark:`
 * override, instead of a single fixed shade. The old palette used
 * *-300 text on a *-500/20 background, which only has enough contrast
 * against a near-black page - on a white/light page those same text
 * colors nearly disappear. Each entry below is legible in both themes.
 */
const POSITION_PALETTES: Record<string, { bg: string; border: string; text: string }> = {
  Server: { bg: 'bg-rose-100 dark:bg-rose-500/20', border: 'border-rose-300 dark:border-rose-500/50', text: 'text-rose-700 dark:text-rose-300' },
  'Assistant manager': { bg: 'bg-emerald-100 dark:bg-emerald-500/20', border: 'border-emerald-300 dark:border-emerald-500/50', text: 'text-emerald-700 dark:text-emerald-300' },
  Cook: { bg: 'bg-purple-100 dark:bg-purple-500/20', border: 'border-purple-300 dark:border-purple-500/50', text: 'text-purple-700 dark:text-purple-300' },
  Sommelier: { bg: 'bg-orange-100 dark:bg-orange-500/20', border: 'border-orange-300 dark:border-orange-500/50', text: 'text-orange-700 dark:text-orange-300' },
  Barista: { bg: 'bg-sky-100 dark:bg-sky-500/20', border: 'border-sky-300 dark:border-sky-500/50', text: 'text-sky-700 dark:text-sky-300' },
  Host: { bg: 'bg-teal-100 dark:bg-teal-500/20', border: 'border-teal-300 dark:border-teal-500/50', text: 'text-teal-700 dark:text-teal-300' },
  Busser: { bg: 'bg-amber-100 dark:bg-amber-500/20', border: 'border-amber-300 dark:border-amber-500/50', text: 'text-amber-700 dark:text-amber-300' },
  Bartender: { bg: 'bg-indigo-100 dark:bg-indigo-500/20', border: 'border-indigo-300 dark:border-indigo-500/50', text: 'text-indigo-700 dark:text-indigo-300' },
  default: { bg: 'bg-muted', border: 'border-card-border', text: 'text-muted-foreground' },
};

const MIN_SHIFT_MINUTES = 30;
const WEEKLY_OVERTIME_THRESHOLD_HOURS = 40;
const RESIZE_SNAP_MINUTES = 15;
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 24;
const DEFAULT_HOUR_WIDTH = 80;
const MIN_HOUR_WIDTH = 50;
const MAX_HOUR_WIDTH = 140;
const TIMELINE_SNAP_MINUTES = 15;

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Compares by local calendar date, not by slicing the ISO string
 * (slicing breaks for any user not in UTC, since an ISO timestamp's
 * date component can be a day off from the viewer's local day). */
function isSameLocalDate(isoString: string, date: Date): boolean {
  const d = new Date(isoString);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

function formatSlingTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'P' : 'A';
  hours = hours % 12 || 12;
  const minutesStr = minutes === 0 ? '' : `:${minutes < 10 ? '0' : ''}${minutes}`;
  return `${hours}${minutesStr}${ampm}`;
}

function formatDurationHoursMinutes(durationHours: number): string {
  const h = Math.floor(durationHours);
  const m = Math.round((durationHours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Builds a Date from a calendar day + "HH:mm" in the viewer's local
 * timezone. Replaces the old pattern of appending "Z" to a local time
 * string, which silently misread every non-UTC user's clock. */
function combineDateAndTime(dateIso: string, time: string): Date {
  return new Date(`${dateIso}T${time}:00`);
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/* ------------------------------------------------------------------ */
/* Local types                                                         */
/* ------------------------------------------------------------------ */

interface AvailabilityWindow {
  userId: string;
  date: string; // yyyy-mm-dd, local
  allDay: boolean;
  startTime?: string; // "HH:mm", local
  endTime?: string;
  reason?: string;
}

interface ResizeGesture {
  shiftId: string;
  edge: 'start' | 'end';
  currentStart: Date;
  currentEnd: Date;
}

interface PendingDelete {
  shiftId: string;
  label: string;
}

/** Neither employee.service nor position.service currently export a
 * type for what their list endpoints return (both come back as
 * effectively `any`), so these are defined locally with only the
 * fields this component actually touches. If you add proper response
 * DTOs to those services (recommended), import those instead of
 * these local shapes. */
interface RosterEmployee {
  id: string;
  [key: string]: unknown;
}

function getEmployeeName(employee: RosterEmployee): string {
  const e = employee as any;
  const nested = e.user ?? e.employee ?? e.profile;
  const first = e.firstName ?? e.first_name ?? nested?.firstName ?? nested?.first_name ?? '';
  const last = e.lastName ?? e.last_name ?? nested?.lastName ?? nested?.last_name ?? '';
  const full = e.name ?? e.fullName ?? e.displayName ?? nested?.name ?? nested?.fullName ?? nested?.displayName;

  if (String(full || '').trim()) return String(full).trim();
  const joined = `${String(first).trim()} ${String(last).trim()}`.trim();
  return joined || `Employee ${employee.id.slice(0, 6)}`;
}

function getEmployeePositionId(employee: RosterEmployee): string | undefined {
  const e = employee as any;
  return e.positionId ?? e.position?.id ?? e.primaryPositionId ?? e.primaryPosition?.id;
}

interface RosterPosition {
  id: string;
  name: string;
  hourlyRate?: number;
}

/* ------------------------------------------------------------------ */
/* Small presentational subcomponents                                  */
/* ------------------------------------------------------------------ */

function Toast({ kind, message, onClose }: { kind: 'error' | 'success'; message: string; onClose: () => void }) {
  const isError = kind === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
        isError
          ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
          : 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
      }`}
    >
      <div className="flex items-center gap-2">
        {isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
        <span>{message}</span>
      </div>
      <button onClick={onClose} aria-label="Dismiss" className={isError ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-card border border-card-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
      >
        <h3 id="confirm-dialog-title" className="text-sm font-bold text-foreground">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white ${
              danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShiftBlock({
  shift,
  effectiveStart,
  effectiveEnd,
  locationName,
  isResizing,
  onDragStart,
  onRequestDelete,
  onResizeStart,
}: {
  shift: ShiftCardData;
  effectiveStart: Date;
  effectiveEnd: Date;
  locationName: string;
  isResizing: boolean;
  onDragStart: (e: React.DragEvent, shiftId: string) => void;
  onRequestDelete: (shift: ShiftCardData) => void;
  onResizeStart: (e: React.MouseEvent, shift: ShiftCardData, edge: 'start' | 'end') => void;
}) {
  const posName = shift.position?.name || 'General';
  const palette = POSITION_PALETTES[posName] || POSITION_PALETTES.default;
  const durationH = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);

  return (
    <div
      draggable={!isResizing}
      onDragStart={(e) => onDragStart(e, shift.id)}
      className={`rounded-lg border p-2 text-[11px] shadow-sm relative group/shift cursor-grab active:cursor-grabbing transition-all ${palette.bg} ${palette.border} ${palette.text}`}
    >
      <div
        onMouseDown={(e) => onResizeStart(e, shift, 'start')}
        className="absolute inset-y-0 left-0 w-2 cursor-w-resize hover:bg-foreground/10 rounded-l transition-colors"
        title="Drag to adjust start time"
      />

      <div className="flex items-center justify-between font-bold text-[10px] tracking-tight">
        <span>
          {formatSlingTime(effectiveStart)} - {formatSlingTime(effectiveEnd)} • {formatDurationHoursMinutes(durationH)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(shift);
          }}
          aria-label={`Delete shift for ${posName}`}
          className="opacity-0 group-hover/shift:opacity-100 text-muted-foreground hover:text-rose-500 dark:hover:text-rose-400 transition-opacity ml-1"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="text-[10px] font-medium opacity-90 truncate mt-0.5">
        {posName} • {locationName}
      </div>

      <div
        onMouseDown={(e) => onResizeStart(e, shift, 'end')}
        className="absolute inset-y-0 right-0 w-2 cursor-e-resize hover:bg-foreground/10 rounded-r transition-colors"
        title="Drag to adjust end time"
      />
    </div>
  );
}

function QuickCreateModal({
  dateIso,
  employeeName,
  initialStart,
  initialEnd,
  initialPositionId,
  positions,
  submitting,
  onClose,
  onSubmit,
}: {
  dateIso: string;
  employeeName?: string;
  initialStart?: string;
  initialEnd?: string;
  initialPositionId?: string;
  positions: RosterPosition[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: { positionId: string; start: string; end: string; overnight: boolean }) => Promise<void> | void;
}) {
  const [startInput, setStartInput] = useState(initialStart || '10:00');
  const [endInput, setEndInput] = useState(initialEnd || '17:00');
  const [overnight, setOvernight] = useState(false);
  const [positionInput, setPositionInput] = useState(initialPositionId || positions[0]?.id || '');

  useEffect(() => {
    if (initialPositionId) setPositionInput(initialPositionId);
    else if (!positionInput && positions[0]?.id) setPositionInput(positions[0].id);
  }, [initialPositionId, positions, positionInput]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Auto-suggest "ends next day" the moment the end time is not after the
  // start time, instead of silently producing a negative-duration shift.
  useEffect(() => {
    setOvernight(endInput <= startInput);
  }, [startInput, endInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionInput) {
      setValidationError('Choose a position.');
      return;
    }
    if (!overnight && endInput <= startInput) {
      setValidationError('End time must be after start time (or mark it overnight).');
      return;
    }
    setValidationError(null);
    await onSubmit({ positionId: positionInput, start: startInput, end: endInput, overnight });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-create-title"
        className="bg-card border border-card-border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 id="quick-create-title" className="text-sm font-bold text-foreground">
            {employeeName ? `Schedule ${employeeName}` : 'Create Shift'} ({dateIso})
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="qc-position" className="block text-xs font-medium text-muted-foreground mb-1">
              Qualified Position
            </label>
            {positions.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No positions configured for this org yet.</p>
            ) : (
              <select
                id="qc-position"
                value={positionInput}
                onChange={(e) => setPositionInput(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground"
              >
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.hourlyRate ? `($${p.hourlyRate}/hr)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="qc-start" className="block text-xs font-medium text-muted-foreground mb-1">
                Start Time
              </label>
              <input
                id="qc-start"
                type="time"
                required
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground"
              />
            </div>
            <div>
              <label htmlFor="qc-end" className="block text-xs font-medium text-muted-foreground mb-1">
                End Time
              </label>
              <input
                id="qc-end"
                type="time"
                required
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={overnight}
              onChange={(e) => setOvernight(e.target.checked)}
              className="rounded border-card-border bg-background"
            />
            Ends the next day (overnight shift)
          </label>

          {validationError && <p className="text-[11px] text-rose-600 dark:text-rose-400">{validationError}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || positions.length === 0}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
            >
              {submitting ? 'Creating...' : 'Add Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* Day timeline                                                        */
/* ------------------------------------------------------------------ */

function DayTimeline({
  day,
  rows,
  employees,
  availability,
  resizeGesture,
  hourWidth,
  dragOverRow,
  onDragOver,
  onDragLeave,
  onDrop,
  onResizeStart,
  onDragStart,
  onRequestDelete,
  onEmployeeDragStart,
  onEmployeeDragEnd,
  onEmptyClick,
}: {
  day: Date;
  rows: ScheduleGridPayload['rows'];
  employees: RosterEmployee[];
  availability: AvailabilityWindow[];
  resizeGesture: ResizeGesture | null;
  hourWidth: number;
  dragOverRow: string | null;
  onDragOver: (e: React.DragEvent, userId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, userId: string, dateIso: string) => void;
  onResizeStart: (
    e: React.MouseEvent,
    shift: ShiftCardData,
    edge: 'start' | 'end'
  ) => void;
  onDragStart: (e: React.DragEvent, shiftId: string) => void;
  onRequestDelete: (shift: ShiftCardData) => void;
  onEmployeeDragStart: (e: React.DragEvent, employee: RosterEmployee) => void;
  onEmployeeDragEnd: () => void;
  onEmptyClick: (e: React.MouseEvent, userId: string, dateIso: string) => void;
}) {
  const dateIso = formatDateIso(day);
  const timelineWidth = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * hourWidth;

  const hours = useMemo(
    () => Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR }, (_, i) => TIMELINE_START_HOUR + i),
    []
  );

  const employeesById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);

  return (
    <div className="border border-card-border rounded-xl overflow-hidden bg-background shadow-lg">
      {/* Timeline header */}
      <div className="flex bg-card border-b border-card-border sticky top-0 z-20">
        <div className="sticky left-0 z-30 w-[230px] min-w-[230px] shrink-0 p-3 border-r border-card-border bg-card text-muted-foreground uppercase text-[10px] tracking-wider font-bold flex items-center justify-between">
          <span>EMPLOYEES</span>
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
        </div>

        <div className="relative h-12 shrink-0" style={{ width: timelineWidth }}>
          {hours.map((hour) => {
            const tick = new Date(day);
            tick.setHours(hour, 0, 0, 0);
            const isNoon = hour === 12;

            return (
              <div
                key={hour}
                className="absolute inset-y-0 border-r border-card-border flex items-center px-2 text-[10px] font-mono"
                style={{
                  left: (hour - TIMELINE_START_HOUR) * hourWidth,
                  width: hourWidth,
                }}
              >
                <span className={isNoon ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                  {formatSlingTime(tick)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Employee rows */}
      <div className="divide-y divide-card-border">
        {rows.map((row) => {
          const dayShifts = row.shifts
            .filter((shift) => isSameLocalDate(shift.startTime, day))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

          const userUnavail = availability.find(
            (item) => item.userId === row.id && item.date === dateIso
          );

          const isDragOver = dragOverRow === row.id;
          const initial = row.label.charAt(0).toUpperCase();

          return (
            <div key={row.id} className="flex min-h-[78px] hover:bg-muted/40 transition-colors">
              {/* Employee sidebar / drag source */}
              <div
                draggable={!!employeesById.get(row.id)}
                onDragStart={(e) => {
                  const employee = employeesById.get(row.id);
                  if (employee) onEmployeeDragStart(e, employee);
                }}
                onDragEnd={onEmployeeDragEnd}
                title="Drag employee onto the timeline to add a shift"
                className="sticky left-0 z-20 w-[230px] min-w-[230px] shrink-0 px-3 py-2 border-r border-card-border bg-card flex items-center gap-3 cursor-grab active:cursor-grabbing hover:bg-muted group/employee"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-950/80 dark:border-emerald-700/60 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">{row.label}</div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {formatDurationHoursMinutes(row.totalHours)} · {row.shifts.length} {row.shifts.length === 1 ? 'shift' : 'shifts'}
                  </div>
                </div>
                <div className="opacity-0 group-hover/employee:opacity-100 text-[9px] text-muted-foreground uppercase tracking-wide transition-opacity">Drag</div>
              </div>

              {/* Timeline */}
              <div
                className={`relative h-[78px] shrink-0 transition-colors cursor-crosshair ${
                  isDragOver ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/50' : ''
                }`}
                style={{ width: timelineWidth }}
                onDragOver={(e) => onDragOver(e, row.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, row.id, dateIso)}
                onClick={(e) => onEmptyClick(e, row.id, dateIso)}
              >
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]">
                    <div className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 backdrop-blur-sm">
                      Drop to schedule
                    </div>
                  </div>
                )}

                {/* Hour lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 border-r border-card-border pointer-events-none"
                    style={{ left: (hour - TIMELINE_START_HOUR) * hourWidth }}
                  />
                ))}

                {/* Half-hour lines */}
                {hours.map((hour) => (
                  <div
                    key={`${hour}-30`}
                    className="absolute top-0 bottom-0 border-r border-card-border/50 pointer-events-none"
                    style={{
                      left: (hour - TIMELINE_START_HOUR + 0.5) * hourWidth,
                    }}
                  />
                ))}

                {/* Availability */}
                {userUnavail && (
                  <div
                    className="absolute top-0 bottom-0 bg-muted/70 border-y border-dashed border-card-border pointer-events-none z-[1]"
                    style={{ left: 0, width: timelineWidth }}
                  >
                    <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                      <CalendarOff className="w-3.5 h-3.5 mr-1.5" />
                      {userUnavail.allDay ? 'Unavailable all day' : userUnavail.reason || 'Unavailable'}
                    </div>
                  </div>
                )}

                {/* Drop indicator */}
                {isDragOver && (
                  <div className="absolute inset-y-0 left-0 right-0 border-2 border-dashed border-emerald-500/50 rounded pointer-events-none z-[2]" />
                )}

                {/* Shifts */}
                {dayShifts.length === 0 && !isDragOver && (
                  <div className="absolute inset-y-0 left-3 flex items-center text-[9px] text-muted-foreground/50 pointer-events-none">
                    Click a time or drag this employee here
                  </div>
                )}
                {dayShifts.map((shift) => {
                  const resizing = resizeGesture?.shiftId === shift.id;
                  const effectiveStart = resizing
                    ? resizeGesture!.currentStart
                    : new Date(shift.startTime);
                  const effectiveEnd = resizing
                    ? resizeGesture!.currentEnd
                    : new Date(shift.endTime);

                  return (
                    <TimelineShiftBlock
                      key={shift.id}
                      shift={shift}
                      day={day}
                      hourWidth={hourWidth}
                      effectiveStart={effectiveStart}
                      effectiveEnd={effectiveEnd}
                      isResizing={!!resizeGesture}
                      onDragStart={onDragStart}
                      onRequestDelete={onRequestDelete}
                      onResizeStart={onResizeStart}
                    />
                  );
                })}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineShiftBlock({
  shift,
  day,
  hourWidth,
  effectiveStart,
  effectiveEnd,
  isResizing,
  onDragStart,
  onRequestDelete,
  onResizeStart,
}: {
  shift: ShiftCardData;
  day: Date;
  hourWidth: number;
  effectiveStart: Date;
  effectiveEnd: Date;
  isResizing: boolean;
  onDragStart: (e: React.DragEvent, shiftId: string) => void;
  onRequestDelete: (shift: ShiftCardData) => void;
  onResizeStart: (e: React.MouseEvent, shift: ShiftCardData, edge: 'start' | 'end') => void;
}) {
  const posName = shift.position?.name || 'General';
  const palette = POSITION_PALETTES[posName] || POSITION_PALETTES.default;

  const dayStart = new Date(day);
  dayStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);

  const dayEnd = new Date(day);
  dayEnd.setHours(TIMELINE_END_HOUR, 0, 0, 0);

  const visibleStart = effectiveStart < dayStart ? dayStart : effectiveStart;
  const visibleEnd = effectiveEnd > dayEnd ? dayEnd : effectiveEnd;

  const startMinutes = Math.max(
    0,
    (visibleStart.getTime() - dayStart.getTime()) / 60000
  );
  const durationMinutes = Math.max(
    15,
    (visibleEnd.getTime() - visibleStart.getTime()) / 60000
  );

  const left = (startMinutes / 60) * hourWidth;
  const width = Math.max(46, (durationMinutes / 60) * hourWidth);
  const durationHours =
    (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);

  return (
    <div
      draggable={!isResizing}
      onDragStart={(e) => onDragStart(e, shift.id)}
      className={`absolute top-2 bottom-2 rounded-lg border shadow-sm group/timeline-shift cursor-grab active:cursor-grabbing overflow-hidden z-[5] transition-shadow ${palette.bg} ${palette.border} ${palette.text}`}
      style={{ left, width }}
    >
      {/* Start resize handle */}
      <div
        onMouseDown={(e) => onResizeStart(e, shift, 'start')}
        className="absolute inset-y-0 left-0 w-2.5 cursor-ew-resize hover:bg-foreground/10 rounded-l-lg z-20"
        title="Drag to change start time"
      />

      <div className="h-full px-3 flex flex-col justify-center min-w-0">
        <div className="flex items-center justify-between gap-2 font-bold text-[10px] tracking-tight whitespace-nowrap">
          <span className="truncate">
            {formatSlingTime(effectiveStart)} – {formatSlingTime(effectiveEnd)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(shift);
            }}
            aria-label={`Delete shift for ${posName}`}
            className="opacity-0 group-hover/timeline-shift:opacity-100 opacity-70 hover:!opacity-100 hover:text-rose-600 dark:hover:text-rose-300 transition-opacity shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {width >= 105 && (
          <div className="text-[10px] font-medium opacity-90 truncate mt-0.5">
            {posName}
          </div>
        )}

        {width >= 145 && (
          <div className="text-[9px] opacity-70 truncate">
            {formatDurationHoursMinutes(durationHours)}
          </div>
        )}
      </div>

      {/* End resize handle */}
      <div
        onMouseDown={(e) => onResizeStart(e, shift, 'end')}
        className="absolute inset-y-0 right-0 w-2.5 cursor-ew-resize hover:bg-foreground/10 rounded-r-lg z-20"
        title="Drag to change end time"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function SlingScheduleCanvas() {
  const { user, selectedLocation } = useWorkspace();
  const locationId = selectedLocation?.id;
  const orgId = user?.orgId;
  const locationName = selectedLocation?.name || 'Main Branch';

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [hourWidth, setHourWidth] = useState(DEFAULT_HOUR_WIDTH);
  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [gridData, setGridData] = useState<ScheduleGridPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // NOTE: staffList was fetched in the original component but never
  // actually used anywhere in the render — kept here since a future
  // "filter by employee" control will likely need it, but flagging so
  // it doesn't quietly rot as dead state.
  const [staffList, setStaffList] = useState<RosterEmployee[]>([]);
  const [positionsList, setPositionsList] = useState<RosterPosition[]>([]);

  // Availability is intentionally NOT mocked. Until an availability
  // endpoint exists this stays empty rather than showing fabricated
  // blackout windows as if they were real employee-submitted data.
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);

  const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [resizeGesture, setResizeGesture] = useState<ResizeGesture | null>(null);

  const [quickCreateTarget, setQuickCreateTarget] = useState<{
    userId: string;
    dateIso: string;
    start?: string;
    end?: string;
    employeeName?: string;
    positionId?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [pendingPublishConfirm, setPendingPublishConfirm] = useState(false);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = new Date(currentWeekStart);
        day.setDate(currentWeekStart.getDate() + i);
        return day;
      }),
    [currentWeekStart]
  );

  const startDateIso = formatDateIso(weekDays[0]) + 'T00:00:00Z';
  const endDateIso = formatDateIso(weekDays[6]) + 'T23:59:59Z';

  const loadGrid = useCallback(async () => {
    if (!locationId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await schedulingService.getGrid(locationId, startDateIso, endDateIso, 'employee');
      setGridData(data);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to load schedule matrix.');
    } finally {
      setLoading(false);
    }
  }, [locationId, startDateIso, endDateIso]);

  const loadCatalogs = useCallback(async () => {
    if (!orgId) return;
    try {
      const [staff, positions] = await Promise.all([
        employeeService.listByOrg(orgId),
        positionService.listByOrg(orgId),
      ]);
      setStaffList(staff);
      setPositionsList(positions);
    } catch (err) {
      console.error('Failed to load catalogs', err);
      setErrorMessage('Failed to load staff or position lists.');
    }
  }, [orgId]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // Auto-dismiss the success toast rather than leaving it on screen forever.
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const allShifts = useMemo(() => gridData?.rows.flatMap((r) => r.shifts) ?? [], [gridData?.rows]);

  const findShift = useCallback((shiftId: string) => allShifts.find((s) => s.id === shiftId), [allShifts]);

  // Always render the full roster, even when an employee has no shifts in the
  // returned schedule payload. This makes the day board a true planning
  // surface rather than a list of only currently scheduled people.
  const scheduleRows = useMemo(() => {
    const apiRows = gridData?.rows ?? [];
    const byId = new Map(apiRows.map((row) => [row.id, row]));

    return staffList.map((employee) => {
      const existing = byId.get(employee.id);
      return existing ?? ({
        id: employee.id,
        label: getEmployeeName(employee),
        shifts: [],
        totalHours: 0,
        totalCost: 0,
      } as ScheduleGridPayload['rows'][number]);
    });
  }, [staffList, gridData?.rows]);

  const employeeById = useMemo(() => {
    return new Map(staffList.map((employee) => [employee.id, employee]));
  }, [staffList]);

  /** Client-side overlap check so we can reject an obviously-bad move
   * instantly, instead of round-tripping to the server every time. The
   * backend remains the source of truth and can still reject it too. */
  const wouldConflict = useCallback(
    (userId: string, start: Date, end: Date, ignoreShiftId: string) => {
      const userShifts = scheduleRows.find((r) => r.id === userId)?.shifts ?? [];
      return userShifts.some(
        (s) => s.id !== ignoreShiftId && rangesOverlap(start, end, new Date(s.startTime), new Date(s.endTime))
      );
    },
    [scheduleRows]
  );

  /* ---------------- Drag & drop between cells ---------------- */

  const handleDragStart = (e: React.DragEvent, shiftId: string) => {
    setDraggedShiftId(shiftId);
    e.dataTransfer.setData('text/plain', shiftId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetUserId: string, targetDateIso: string) => {
    e.preventDefault();
    setDragOverCell(null);
    const shiftId = e.dataTransfer.getData('text/plain') || draggedShiftId;
    setDraggedShiftId(null);
    if (!shiftId) return;

    const currentShift = findShift(shiftId);
    if (!currentShift) return;

    const oldStart = new Date(currentShift.startTime);
    const oldEnd = new Date(currentShift.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(`${targetDateIso}T00:00:00`);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    // No-op drop back into the same slot — skip the network round trip.
    if (currentShift.assignedUser?.id === targetUserId && newStart.getTime() === oldStart.getTime()) {
      return;
    }

    if (wouldConflict(targetUserId, newStart, newEnd, shiftId)) {
      setErrorMessage('That employee already has a shift overlapping this time.');
      return;
    }

    try {
      await schedulingService.moveShift(shiftId, {
        targetUserId,
        newStartTime: newStart.toISOString(),
        newEndTime: newEnd.toISOString(),
      });
      await loadGrid();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Shift conflict encountered.');
      await loadGrid();
    }
  };

  /* ---------------- Edge resize ---------------- */
  // Listeners are attached once per drag gesture (on mousedown) and torn
  // down on mouseup, instead of living inside a useEffect keyed on the
  // resize state — the old version re-subscribed two window listeners on
  // every single mousemove frame.

  const handleResizeStart = (
    e: React.MouseEvent,
    shift: ShiftCardData,
    edge: 'start' | 'end'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const initialX = e.clientX;
    const initialStart = new Date(shift.startTime);
    const initialEnd = new Date(shift.endTime);

    let currentStart = initialStart;
    let currentEnd = initialEnd;

    setResizeGesture({
      shiftId: shift.id,
      edge,
      currentStart,
      currentEnd,
    });

    const handleMouseMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - initialX;
      const pxPerMinute = hourWidth / 60;
      const rawMinutes = deltaX / pxPerMinute;
      const snappedMinutes =
        Math.round(rawMinutes / TIMELINE_SNAP_MINUTES) * TIMELINE_SNAP_MINUTES;

      if (edge === 'end') {
        const nextEnd = new Date(
          initialEnd.getTime() + snappedMinutes * 60 * 1000
        );

        if (
          nextEnd.getTime() - initialStart.getTime() >=
          MIN_SHIFT_MINUTES * 60 * 1000
        ) {
          currentEnd = nextEnd;
          setResizeGesture({
            shiftId: shift.id,
            edge,
            currentStart: initialStart,
            currentEnd: nextEnd,
          });
        }
      } else {
        const nextStart = new Date(
          initialStart.getTime() + snappedMinutes * 60 * 1000
        );

        if (
          initialEnd.getTime() - nextStart.getTime() >=
          MIN_SHIFT_MINUTES * 60 * 1000
        ) {
          currentStart = nextStart;
          setResizeGesture({
            shiftId: shift.id,
            edge,
            currentStart: nextStart,
            currentEnd: initialEnd,
          });
        }
      }
    };

    const handleMouseUp = async () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setResizeGesture(null);

      if (
        currentStart.getTime() === initialStart.getTime() &&
        currentEnd.getTime() === initialEnd.getTime()
      ) {
        return;
      }

      const ownerId = shift.assignedUser?.id;
      if (ownerId && wouldConflict(ownerId, currentStart, currentEnd, shift.id)) {
        setErrorMessage('That change would overlap another shift for this employee.');
        return;
      }

      try {
        await schedulingService.moveShift(shift.id, {
          newStartTime: currentStart.toISOString(),
          newEndTime: currentEnd.toISOString(),
        });
        await loadGrid();
      } catch (err: any) {
        setErrorMessage(err?.response?.data?.message || 'Conflict detected resizing shift.');
        await loadGrid();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  /* ---------------- Employee + timeline drag ---------------- */

  const handleEmployeeDragStart = (e: React.DragEvent, employee: RosterEmployee) => {
    setDraggedEmployeeId(employee.id);
    e.dataTransfer.setData('application/x-sling-employee', employee.id);
    e.dataTransfer.setData('text/plain', employee.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleEmployeeDragEnd = () => {
    setDraggedEmployeeId(null);
    setDragOverRow(null);
  };

  const snapTimelineTime = useCallback((clientX: number, element: HTMLElement, dateIso: string) => {
    const rect = element.getBoundingClientRect();
    const localX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const rawMinutes = (localX / hourWidth) * 60 + TIMELINE_START_HOUR * 60;
    const snappedMinutes = Math.round(rawMinutes / TIMELINE_SNAP_MINUTES) * TIMELINE_SNAP_MINUTES;
    const clampedMinutes = Math.max(
      TIMELINE_START_HOUR * 60,
      Math.min(TIMELINE_END_HOUR * 60 - MIN_SHIFT_MINUTES, snappedMinutes)
    );
    const hh = Math.floor(clampedMinutes / 60);
    const mm = clampedMinutes % 60;
    return {
      start: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      startMinutes: clampedMinutes,
      date: combineDateAndTime(dateIso, '00:00'),
    };
  }, [hourWidth]);

  const handleTimelineDragOver = (e: React.DragEvent, userId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-sling-employee') ? 'copy' : 'move';
    setDragOverRow(userId);
  };

  const handleTimelineDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) setDragOverRow(null);
  };

  const handleTimelineDrop = async (
    e: React.DragEvent,
    targetUserId: string,
    targetDateIso: string
  ) => {
    e.preventDefault();
    setDragOverRow(null);

    const employeeId = e.dataTransfer.getData('application/x-sling-employee') || draggedEmployeeId;
    const shiftId = e.dataTransfer.getData('text/plain');

    // Dragging a roster employee into the timeline creates a new shift at the
    // exact drop time. We keep the modal only for the position confirmation;
    // start/end are already pre-filled from the drop location.
    if (employeeId && employeeById.has(employeeId)) {
      const employee = employeeById.get(employeeId)!;
      const targetElement = e.currentTarget as HTMLDivElement;
      const { start, startMinutes } = snapTimelineTime(e.clientX, targetElement, targetDateIso);
      const defaultEndMinutes = Math.min(startMinutes + 240, TIMELINE_END_HOUR * 60);
      const end = `${String(Math.floor(defaultEndMinutes / 60)).padStart(2, '0')}:${String(defaultEndMinutes % 60).padStart(2, '0')}`;

      if (positionsList.length === 0) {
        setErrorMessage('Add at least one position before scheduling employees.');
        return;
      }

      if (wouldConflict(employeeId, combineDateAndTime(targetDateIso, start), combineDateAndTime(targetDateIso, end), '')) {
        setErrorMessage('That employee already has a shift overlapping the selected time.');
        return;
      }

      setQuickCreateTarget({
        userId: employeeId,
        dateIso: targetDateIso,
        start,
        end,
        employeeName: getEmployeeName(employee),
        positionId: getEmployeePositionId(employee),
      });
      setDraggedEmployeeId(null);
      return;
    }

    if (!shiftId) return;

    const currentShift = findShift(shiftId);
    if (!currentShift) return;

    const targetElement = e.currentTarget as HTMLDivElement;
    const { start } = snapTimelineTime(e.clientX, targetElement, targetDateIso);
    const newStart = combineDateAndTime(targetDateIso, start);
    const oldStart = new Date(currentShift.startTime);
    const oldEnd = new Date(currentShift.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    if (currentShift.assignedUser?.id === targetUserId && newStart.getTime() === oldStart.getTime()) return;

    if (wouldConflict(targetUserId, newStart, newEnd, shiftId)) {
      setErrorMessage('That employee already has a shift overlapping this time.');
      return;
    }

    try {
      await schedulingService.moveShift(shiftId, {
        targetUserId,
        newStartTime: newStart.toISOString(),
        newEndTime: newEnd.toISOString(),
      });
      await loadGrid();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Shift conflict encountered.');
      await loadGrid();
    }
  };

  const handleTimelineEmptyClick = (e: React.MouseEvent, userId: string, dateIso: string) => {
    if (e.target !== e.currentTarget || positionsList.length === 0) return;
    const target = e.currentTarget as HTMLDivElement;
    const { start, startMinutes } = snapTimelineTime(e.clientX, target, dateIso);
    const endMinutes = Math.min(startMinutes + 240, TIMELINE_END_HOUR * 60);
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    const employee = employeeById.get(userId);

    setQuickCreateTarget({
      userId,
      dateIso,
      start,
      end,
      employeeName: employee ? getEmployeeName(employee) : undefined,
      positionId: employee ? getEmployeePositionId(employee) : undefined,
    });
  };

  /* ---------------- Create / delete ---------------- */

  const handleCreateShift = async (input: { positionId: string; start: string; end: string; overnight: boolean }) => {
    if (!quickCreateTarget || !locationId) return;
    try {
      setSubmitting(true);
      setErrorMessage(null);

      const start = combineDateAndTime(quickCreateTarget.dateIso, input.start);
      let end = combineDateAndTime(quickCreateTarget.dateIso, input.end);
      if (input.overnight || end.getTime() <= start.getTime()) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      }

      if (wouldConflict(quickCreateTarget.userId, start, end, '')) {
        setErrorMessage('This employee already has a shift overlapping that time.');
        return;
      }

      await schedulingService.createShift({
        locationId,
        assignedUserId: quickCreateTarget.userId || undefined,
        positionId: input.positionId || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });

      setQuickCreateTarget(null);
      await loadGrid();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to create shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await schedulingService.deleteShift(pendingDelete.shiftId);
      await loadGrid();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to delete shift.');
    } finally {
      setPendingDelete(null);
    }
  };

  const confirmPublish = async () => {
    setPendingPublishConfirm(false);
    if (!locationId) return;
    try {
      setPublishing(true);
      setErrorMessage(null);
      await schedulingService.publishRoster(locationId, startDateIso, endDateIso);
      setSuccessMessage('Roster published successfully!');
      await loadGrid();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to publish roster.');
    } finally {
      setPublishing(false);
    }
  };

  /* ---------------- Derived stats ---------------- */

  const daySummaries = useMemo(() => {
    return weekDays.map((day) => {
      let dayHours = 0;
      let dayCost = 0;
      const userSet = new Set<string>();

      scheduleRows.forEach((row) => {
        row.shifts.forEach((s) => {
          if (isSameLocalDate(s.startTime, day)) {
            dayHours += s.durationHours;
            dayCost += s.estimatedCost;
            if (s.assignedUser?.id) userSet.add(s.assignedUser.id);
          }
        });
      });

      return { hours: Math.round(dayHours), people: userSet.size, cost: Math.round(dayCost) };
    });
  }, [weekDays, scheduleRows]);

  // Real overtime figure (over 40h/week per employee) rather than a
  // hardcoded "0h". Note this uses each employee's total scheduled
  // hours for the visible week only.
  const totalOvertimeHours = useMemo(() => {
    if (!scheduleRows.length) return 0;
    return scheduleRows.reduce(
      (sum, row) => sum + Math.max(0, row.totalHours - WEEKLY_OVERTIME_THRESHOLD_HOURS),
      0
    );
  }, [gridData?.rows]);

  const selectedDayIso = formatDateIso(selectedDay);
  const selectedDaySummary = daySummaries.find((_, index) => formatDateIso(weekDays[index]) === selectedDayIso) ?? {
    hours: 0,
    people: 0,
    cost: 0,
  };

  const goToDay = useCallback((offset: number) => {
    setSelectedDay((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + offset);
      setCurrentWeekStart(getMonday(next));
      return next;
    });
  }, []);

  const goToday = useCallback(() => {
    const today = new Date();
    setSelectedDay(today);
    setCurrentWeekStart(getMonday(today));
  }, []);

  const selectedDayLabel = selectedDay.toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-3 max-w-[1720px] mx-auto select-none">
      {/* Header */}
      <div className="bg-card border border-card-border rounded-xl p-3 shadow-sm">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-background border border-card-border rounded-lg p-1">
              <button
                onClick={() => viewMode === 'day' ? goToDay(-1) : setCurrentWeekStart((prev) => new Date(prev.getTime() - 7 * 86400000))}
                aria-label="Previous"
                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs font-bold text-foreground tracking-wider font-mono whitespace-nowrap">
                {viewMode === 'day'
                  ? selectedDay.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase()
                  : `${weekDays[0].toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase()} – ${weekDays[6].toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase()}`}
              </span>

              <button
                onClick={() => viewMode === 'day' ? goToDay(1) : setCurrentWeekStart((prev) => new Date(prev.getTime() + 7 * 86400000))}
                aria-label="Next"
                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-background border border-card-border rounded-lg"
            >
              Today
            </button>

            <div className="flex items-center bg-background border border-card-border rounded-lg p-0.5 text-xs font-semibold">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-md transition-colors ${viewMode === 'day' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-md transition-colors ${viewMode === 'week' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Week
              </button>
            </div>

            {viewMode === 'day' && (
              <div className="hidden lg:flex items-center gap-2 bg-background border border-card-border rounded-lg px-3 py-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Timeline</span>
                <input
                  type="range"
                  min={MIN_HOUR_WIDTH}
                  max={MAX_HOUR_WIDTH}
                  step={10}
                  value={hourWidth}
                  onChange={(e) => setHourWidth(Number(e.target.value))}
                  aria-label="Timeline zoom"
                  className="w-28 accent-emerald-500"
                />
                <span className="text-[10px] text-muted-foreground font-mono w-12 text-right">
                  {hourWidth}px
                </span>
              </div>
            )}

          </div>

          <div className="flex items-center gap-6 text-xs divide-x divide-card-border font-mono overflow-x-auto max-w-full">
            <div className="text-center pl-4">
              <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Scheduled shifts</div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {viewMode === 'day' ? selectedDaySummary.hours > 0 ? (gridData?.rows.reduce((count, row) => count + row.shifts.filter((s) => isSameLocalDate(s.startTime, selectedDay)).length, 0) ?? 0) : 0 : (gridData?.summary?.totalShiftsCount ?? 0)}
              </div>
            </div>
            <div className="text-center pl-6">
              <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Scheduled hours</div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {viewMode === 'day'
                  ? formatDurationHoursMinutes(selectedDaySummary.hours)
                  : formatDurationHoursMinutes(gridData?.summary?.totalHours ?? 0)}
              </div>
            </div>
            <div className="text-center pl-6">
              <div className="text-[10px] text-muted-foreground uppercase tracking-tight">O/T hours</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatDurationHoursMinutes(totalOvertimeHours)}
              </div>
            </div>
            <div className="text-center pl-6">
              <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Est. wages</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                ${(viewMode === 'day' ? selectedDaySummary.cost : gridData?.summary?.estimatedCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="pl-6 flex items-center gap-2">
              <button
                onClick={() => setPendingPublishConfirm(true)}
                disabled={publishing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-emerald-950/30 font-sans"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{publishing ? 'Publishing...' : 'Publish'}</span>
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'day' && (
          <div className="mt-3 pt-3 border-t border-card-border flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-foreground">{selectedDayLabel}</div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {selectedDaySummary.people} employees · {selectedDaySummary.hours} scheduled hours · ${selectedDaySummary.cost.toFixed(2)} labor
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground hidden sm:block">
              Drag employee to schedule · click empty time to add · drag shifts to move · drag either edge to resize · 15 min snap
            </div>
          </div>
        )}
      </div>

      {errorMessage && <Toast kind="error" message={errorMessage} onClose={() => setErrorMessage(null)} />}
      {successMessage && <Toast kind="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}

      {viewMode === 'day' ? (
        <div ref={timelineScrollRef} className="overflow-x-auto overflow-y-hidden rounded-xl">
          {loading ? (
            <div className="border border-card-border rounded-xl p-16 text-center text-xs font-mono text-muted-foreground bg-background">
              LOADING WORKSPACE ROSTER...
            </div>
          ) : staffList.length === 0 ? (
            <div className="border border-card-border rounded-xl p-16 text-center text-xs text-muted-foreground bg-background">
              No employees found in this workspace.
            </div>
          ) : (
            <DayTimeline
              day={selectedDay}
              rows={scheduleRows}
              employees={staffList}
              availability={availability}
              resizeGesture={resizeGesture}
              hourWidth={hourWidth}
              dragOverRow={dragOverRow}
              onDragOver={handleTimelineDragOver}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setDragOverRow(null);
              }}
              onDrop={handleTimelineDrop}
              onResizeStart={handleResizeStart}
              onDragStart={handleDragStart}
              onRequestDelete={(shift) =>
                setPendingDelete({
                  shiftId: shift.id,
                  label: `${shift.position?.name ?? 'shift'} on ${selectedDayIso}`,
                })
              }
              onEmployeeDragStart={handleEmployeeDragStart}
              onEmployeeDragEnd={handleEmployeeDragEnd}
              onEmptyClick={handleTimelineEmptyClick}
            />
          )}
        </div>
      ) : (
        /* Existing weekly matrix */
        <div className="border border-card-border rounded-xl overflow-x-auto bg-background shadow-lg">
          <div className="min-w-[1360px]">
            <div className="grid grid-cols-8 border-b border-card-border bg-card text-xs font-semibold sticky top-0 z-20">
              <div className="p-3 border-r border-card-border text-muted-foreground uppercase text-[10px] tracking-wider flex items-center justify-between">
                <span>EMPLOYEES</span>
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              {weekDays.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedDay(day);
                    setViewMode('day');
                  }}
                  className="p-3 text-center border-r last:border-r-0 border-card-border text-foreground font-mono text-[11px] hover:bg-muted transition-colors"
                >
                  <span className="uppercase text-muted-foreground font-sans font-bold mr-1">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span>{day.getDate()}</span>
                </button>
              ))}
            </div>

            <div className="divide-y divide-card-border">
              {loading ? (
                <div className="p-16 text-center text-xs font-mono text-muted-foreground">LOADING WORKSPACE ROSTER...</div>
              ) : staffList.length === 0 ? (
                <div className="p-16 text-center text-xs text-muted-foreground">
                  No employees found in this workspace.
                </div>
              ) : (
                scheduleRows.map((row) => {
                  const userInitial = row.label.charAt(0).toUpperCase();

                  return (
                    <div key={row.id} className="grid grid-cols-8 hover:bg-muted/30 transition-colors">
                      <div className="p-3 border-r border-card-border bg-card/50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-950/80 dark:border-emerald-700/60 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {userInitial}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-foreground truncate">{row.label}</div>
                          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {formatDurationHoursMinutes(row.totalHours)} · ${row.totalCost.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {weekDays.map((day, dIdx) => {
                        const dayIso = formatDateIso(day);
                        const cellKey = `${row.id}-${dayIso}`;
                        const isDragOver = dragOverCell === cellKey;

                        const dayShifts = row.shifts
                          .filter((s) => isSameLocalDate(s.startTime, day))
                          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

                        const userUnavail = availability.find((a) => a.userId === row.id && a.date === dayIso);

                        return (
                          <div
                            key={dIdx}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverCell(cellKey);
                            }}
                            onDragLeave={() => setDragOverCell(null)}
                            onDrop={(e) => handleDrop(e, row.id, dayIso)}
                            className={`p-1.5 border-r last:border-r-0 border-card-border min-h-[96px] space-y-1.5 relative group/cell transition-colors ${
                              isDragOver ? 'bg-emerald-500/10 border-2 border-emerald-500' : ''
                            }`}
                          >
                            {userUnavail && (
                              <div className="p-2 rounded-lg bg-muted border border-dashed border-card-border text-muted-foreground text-[10px] font-mono flex items-center gap-1.5">
                                <CalendarOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <div className="truncate">
                                  <div className="font-semibold text-foreground">
                                    {userUnavail.allDay
                                      ? 'All day'
                                      : `${formatSlingTime(combineDateAndTime(dayIso, userUnavail.startTime!))} - ${formatSlingTime(combineDateAndTime(dayIso, userUnavail.endTime!))}`}
                                  </div>
                                  <div className="text-muted-foreground truncate">{userUnavail.reason}</div>
                                </div>
                              </div>
                            )}

                            {dayShifts.map((shift) => {
                              const isCurrentlyResizing = resizeGesture?.shiftId === shift.id;
                              const effectiveStart = isCurrentlyResizing ? resizeGesture!.currentStart : new Date(shift.startTime);
                              const effectiveEnd = isCurrentlyResizing ? resizeGesture!.currentEnd : new Date(shift.endTime);

                              return (
                                <ShiftBlock
                                  key={shift.id}
                                  shift={shift}
                                  effectiveStart={effectiveStart}
                                  effectiveEnd={effectiveEnd}
                                  locationName={locationName}
                                  isResizing={!!resizeGesture}
                                  onDragStart={handleDragStart}
                                  onRequestDelete={(s) =>
                                    setPendingDelete({ shiftId: s.id, label: `${s.position?.name ?? 'shift'} on ${dayIso}` })
                                  }
                                  onResizeStart={handleResizeStart}
                                />
                              );
                            })}

                            <button
                              onClick={() => setQuickCreateTarget({ userId: row.id, dateIso: dayIso })}
                              aria-label={`Add shift for ${row.label} on ${dayIso}`}
                              className="w-full py-1 rounded border border-dashed border-card-border text-[10px] text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-600/60 flex items-center justify-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-8 border-t-2 border-card-border bg-card text-xs font-mono">
              <div className="p-3 border-r border-card-border text-muted-foreground text-[10px] font-bold space-y-1">
                <div>SCHEDULED HOURS</div>
                <div>EMPLOYEES</div>
                <div>LABOR COST</div>
              </div>
              {daySummaries.map((summary, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => {
                    setSelectedDay(weekDays[sIdx]);
                    setViewMode('day');
                  }}
                  className="p-3 border-r last:border-r-0 border-card-border text-[11px] space-y-1 text-left hover:bg-muted transition-colors"
                >
                  <div className="text-foreground font-bold">{summary.hours}h</div>
                  <div className="text-muted-foreground text-[10px]">{summary.people} people</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">${summary.cost.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {quickCreateTarget && (
        <QuickCreateModal
          dateIso={quickCreateTarget.dateIso}
          employeeName={quickCreateTarget.employeeName}
          initialStart={quickCreateTarget.start}
          initialEnd={quickCreateTarget.end}
          initialPositionId={quickCreateTarget.positionId}
          positions={positionsList}
          submitting={submitting}
          onClose={() => setQuickCreateTarget(null)}
          onSubmit={handleCreateShift}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete shift?"
          message={`This will permanently remove the ${pendingDelete.label}.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingPublishConfirm && (
        <ConfirmDialog
          title="Publish this week's roster?"
          message="Staff will be notified of their scheduled shifts for this week."
          confirmLabel="Publish"
          onConfirm={confirmPublish}
          onCancel={() => setPendingPublishConfirm(false)}
        />
      )}
    </div>
  );

}