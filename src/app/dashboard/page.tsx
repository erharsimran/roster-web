'use client';

import React from 'react';
import Link from 'next/link';
import { useWorkspace } from '../../context/workspace-context';
import {
  Building2,
  MapPin,
  Clock,
  Briefcase,
  Users,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { user, selectedLocation } = useWorkspace();

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">Operations Console</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Live branch status, store time synchronization, and quick modules.
        </p>
      </div>

      {/* Context Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-neutral-800 text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Company</div>
            <div className="text-sm font-semibold text-neutral-100 truncate">
              {user?.organization?.name || 'Workspace Provisioned'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-neutral-800 text-sky-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Active Branch</div>
            <div className="text-sm font-semibold text-neutral-100 truncate">
              {selectedLocation?.name || 'No Branch Selected'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-neutral-800 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Store Timezone</div>
            <div className="text-sm font-semibold text-neutral-100 truncate">
              {selectedLocation?.timezone || 'UTC'}
            </div>
          </div>
        </div>
      </div>

      {/* Core Operational Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          href="/dashboard/schedule"
          className="group p-5 rounded-xl border border-neutral-800 bg-neutral-900/20 hover:bg-neutral-900/60 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 transition-colors" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Schedule Matrix</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Build shifts, balance coverage, and publish weekly rosters.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/positions"
          className="group p-5 rounded-xl border border-neutral-800 bg-neutral-900/20 hover:bg-neutral-900/60 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 transition-colors" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Positions & Pay Rates</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Configure job titles, default wage baselines, and leadership flags.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/employees"
          className="group p-5 rounded-xl border border-neutral-800 bg-neutral-900/20 hover:bg-neutral-900/60 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 transition-colors" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Team Directory</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Onboard staff, assign roles, and map qualified positions[cite: 1, 2].
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}