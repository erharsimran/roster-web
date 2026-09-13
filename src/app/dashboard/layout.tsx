'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WorkspaceProvider, useWorkspace } from '@/context/workspace-context';
import { MAIN_NAVIGATION, SETTINGS_NAVIGATION } from '@/config/navigation';
import { canAccessModule } from '@/lib/permissions';
import {
  MapPin,
  ChevronDown,
  LogOut,
  Building2,
  ShieldCheck,
} from 'lucide-react';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, selectedLocation, setSelectedLocation, isLoading, logout } = useWorkspace();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-xs font-mono text-neutral-500">
        INITIALIZING ENTERPRISE CONTEXT...
      </div>
    );
  }

  const accessibleNav = MAIN_NAVIGATION.filter((item) =>
    canAccessModule(user, item.allowedRoles, item.requiredPermissions)
  );

  const accessibleSettings = SETTINGS_NAVIGATION.filter((item) =>
    canAccessModule(user, item.allowedRoles, item.requiredPermissions)
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-900/30 flex flex-col shrink-0">
        <div className="h-16 px-5 border-b border-neutral-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-950">
            R
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold text-white tracking-tight truncate">
              {user?.organization?.name || 'Roster Workspace'}
            </div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
              {user?.role || 'Employee'}
            </div>
          </div>
        </div>

        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          <div>
            <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-medium">
              Operations
            </div>
            <nav className="space-y-1">
              {accessibleNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-neutral-800/80 text-emerald-400 border border-neutral-700/60 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {accessibleSettings.length > 0 && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-medium">
                Administration
              </div>
              <nav className="space-y-1">
                {accessibleSettings.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-neutral-800/80 text-emerald-400 border border-neutral-700/60 shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-neutral-800 flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-xs font-medium text-neutral-200 truncate">{user?.fullName}</div>
            <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{user?.email}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-800 bg-neutral-900/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {user?.locations && user.locations.length > 0 ? (
              <div className="relative flex items-center bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-1.5 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-2 shrink-0" />
                <select
                  value={selectedLocation?.id || ''}
                  onChange={(e) => {
                    const loc = user.locations?.find((l) => l.id === e.target.value);
                    if (loc) setSelectedLocation(loc);
                  }}
                  className="bg-transparent text-xs font-medium text-neutral-200 outline-none pr-6 cursor-pointer appearance-none"
                >
                  {user.locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-neutral-900 text-neutral-200">
                      {loc.name} ({loc.timezone})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/20 px-3 py-1.5 rounded-lg border border-amber-800/40">
                <Building2 className="w-3.5 h-3.5" />
                <span>No branch locations configured</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800">
              TIMEZONE: {selectedLocation?.timezone || 'UTC'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <DashboardShell>{children}</DashboardShell>
    </WorkspaceProvider>
  );
}