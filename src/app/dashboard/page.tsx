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
        <p className="text-xs text-muted-foreground mt-0.5">
          Live branch status, store time synchronization, and quick modules.
        </p>
      </div>

      {/* Context Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-card-border bg-card/40 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-muted text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Company</div>
            <div className="text-sm font-semibold text-foreground truncate">
              {user?.organization?.name || 'Workspace Provisioned'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-card-border bg-card/40 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-muted text-sky-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Active Branch</div>
            <div className="text-sm font-semibold text-foreground truncate">
              {selectedLocation?.name || 'No Branch Selected'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-card-border bg-card/40 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-muted text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Store Timezone</div>
            <div className="text-sm font-semibold text-foreground truncate">
              {selectedLocation?.timezone || 'UTC'}
            </div>
          </div>
        </div>
      </div>

      {/* Core Operational Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          href="/dashboard/schedule"
          className="group p-5 rounded-xl border border-card-border bg-card/20 hover:bg-card/60 hover:border-card-border transition-all flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Schedule Matrix</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Build shifts, balance coverage, and publish weekly rosters.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/positions"
          className="group p-5 rounded-xl border border-card-border bg-card/20 hover:bg-card/60 hover:border-card-border transition-all flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Positions & Pay Rates</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Configure job titles, default wage baselines, and leadership flags.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/employees"
          className="group p-5 rounded-xl border border-card-border bg-card/20 hover:bg-card/60 hover:border-card-border transition-all flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Team Directory</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Onboard staff, assign roles, and map qualified positions.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}