'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/context/workspace-context';
import {
  payrollService,
  PayrollSummaryResponse,
  PayrollExportFormat,
} from '@/services/payroll.service';
import {
  DollarSign,
  Clock,
  Download,
  Calendar,
  Users,
  AlertCircle,
  Loader2,
  TrendingUp,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';

export default function PayrollDashboardPage() {
  const { selectedLocation } = useWorkspace();

  // Initialize pay period from 1st of current month to today
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    return firstDay.toISOString().slice(0, 10);
  });

  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

  const [format, setFormat] = useState<PayrollExportFormat>('standard');
  const [summary, setSummary] = useState<PayrollSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayroll = useCallback(async () => {
    if (!selectedLocation?.id) return;
    setLoading(true);
    setError(null);

    try {
      const startIso = new Date(`${startDate}T00:00:00Z`).toISOString();
      const endIso = new Date(`${endDate}T23:59:59Z`).toISOString();

      const data = await payrollService.getSummary(
        selectedLocation.id,
        startIso,
        endIso,
        format
      );
      setSummary(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate pay period summary.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation?.id, startDate, endDate, format]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const handleExport = async (targetFormat: PayrollExportFormat) => {
    if (!selectedLocation?.id) return;
    setExporting(true);
    try {
      const startIso = new Date(`${startDate}T00:00:00Z`).toISOString();
      const endIso = new Date(`${endDate}T23:59:59Z`).toISOString();
      await payrollService.downloadCsv(selectedLocation.id, startIso, endIso, targetFormat);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to export payroll CSV.');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (val?: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val || 0);

  const formatHours = (val?: number) => `${(val || 0).toFixed(2)} hrs`;

  const employees = summary?.employees || [];
  const totals = summary?.totals;

  if (!selectedLocation) {
    return (
      <div className="p-6">
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 flex items-center gap-3 text-xs">
          <Building2 className="w-5 h-5 shrink-0" />
          <span>Please select a store location in the header navigation to calculate payroll.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Payroll & Wage Calculation
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated gross pay, overtime premiums (1.5x over 40h), and export packages.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('standard')}
            disabled={exporting || loading || employees.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors border border-card-border"
          >
            <Download className="w-3.5 h-3.5" />
            Standard CSV
          </button>
          <button
            onClick={() => handleExport('gusto')}
            disabled={exporting || loading || employees.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Gusto
          </button>
          <button
            onClick={() => handleExport('adp')}
            disabled={exporting || loading || employees.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export ADP
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="p-4 bg-white dark:bg-neutral-900/40 border border-card-border rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">Pay Window:</span>
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-card dark:bg-neutral-900 border border-card-border rounded-lg text-xs text-neutral-800 dark:text-neutral-200 outline-none focus:border-emerald-500 font-mono"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-card dark:bg-neutral-900 border border-card-border rounded-lg text-xs text-neutral-800 dark:text-neutral-200 outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-muted-foreground uppercase font-mono tracking-wider">
            Format:
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as PayrollExportFormat)}
            className="px-2.5 py-1.5 bg-card dark:bg-neutral-900 border border-card-border rounded-lg text-xs text-neutral-800 dark:text-neutral-200 outline-none font-mono"
          >
            <option value="standard">Standard Internal</option>
            <option value="gusto">Gusto Payroll</option>
            <option value="adp">ADP Workforce</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-card-border bg-white dark:bg-neutral-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Gross Wages
            </span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900 dark:text-white">
            {formatCurrency(totals?.totalGrossPay)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Reg: {formatCurrency(totals?.totalRegularPay)} | OT:{' '}
            {formatCurrency(totals?.totalOvertimePay)}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-card-border bg-white dark:bg-neutral-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Labor Hours
            </span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900 dark:text-white">
            {formatHours(totals?.totalHours)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {formatHours(totals?.totalRegularHours)} regular hours
          </div>
        </div>

        <div className="p-4 rounded-xl border border-card-border bg-white dark:bg-neutral-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Overtime Hours (1.5x)
            </span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900 dark:text-white">
            {formatHours(totals?.totalOvertimeHours)}
          </div>
          <div className="mt-1 text-[11px] text-amber-500 font-medium">
            Overtime Wages: {formatCurrency(totals?.totalOvertimePay)}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-card-border bg-white dark:bg-neutral-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active Employees
            </span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900 dark:text-white">
            {totals?.totalEmployees ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Calculated in this pay window
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="border border-card-border rounded-xl bg-white dark:bg-neutral-900/40 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-card-border bg-neutral-50/50 dark:bg-neutral-900/60 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
            Employee Pay Period Breakdown
          </h2>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              <span>Calculating wages...</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-muted-foreground border-b border-card-border font-medium">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 text-right">Hourly Rate</th>
                <th className="px-4 py-3 text-right">Regular Hrs</th>
                <th className="px-4 py-3 text-right">Overtime Hrs</th>
                <th className="px-4 py-3 text-right">Regular Pay</th>
                <th className="px-4 py-3 text-right">Overtime Pay</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-white">
                  Gross Pay
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border text-neutral-800 dark:text-neutral-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {loading
                      ? 'Aggregating hours from approved timesheets...'
                      : 'No approved timesheet entries found for this location and pay window.'}
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.userId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/20">
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">
                      <div>{emp.fullName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{emp.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {emp.positionName || 'Staff'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(emp.hourlyRate)}/hr
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {emp.regularHours.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-500 font-semibold">
                      {emp.overtimeHours > 0 ? emp.overtimeHours.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(emp.regularPay)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-500">
                      {emp.overtimePay > 0 ? formatCurrency(emp.overtimePay) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(emp.grossPay)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {employees.length > 0 && totals && (
              <tfoot className="bg-neutral-50/80 dark:bg-neutral-800/60 font-semibold text-neutral-900 dark:text-white border-t border-card-border">
                <tr>
                  <td colSpan={3} className="px-4 py-3 uppercase tracking-wider text-[11px]">
                    Period Totals
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {totals.totalRegularHours.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-500">
                    {totals.totalOvertimeHours.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(totals.totalRegularPay)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-500">
                    {formatCurrency(totals.totalOvertimePay)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {formatCurrency(totals.totalGrossPay)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}