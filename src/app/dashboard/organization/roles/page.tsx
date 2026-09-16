'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWorkspace } from '@/context/workspace-context';
import {  roleService, RoleDetail, PermissionItem}  from '@/services/role.service';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Check,
  Lock,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Clock,
  X,
  SlidersHorizontal,
} from 'lucide-react';

export default function OrganizationRolesPage() {
  const { user } = useWorkspace();
  const orgId = user?.orgId;

  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [roleNameInput, setRoleNameInput] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setErrorMessage(null);

      const [rolesData, permissionsData] = await Promise.all([
        roleService.listByOrg(orgId),
        roleService.getPermissions(orgId),
      ]);

      setRoles(rolesData);
      setPermissions(permissionsData);

      if (rolesData.length > 0) {
        setSelectedRoleId((prev) =>
          prev && rolesData.some((r) => r.id === prev) ? prev : rolesData[0].id
        );
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load organization roles.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  // Group permissions by resource domain (e.g., shifts:read -> shifts)
  const groupedPermissions = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    permissions.forEach((perm) => {
      const groupKey = perm.key.includes(':') ? perm.key.split(':')[0] : 'general';
      const list = map.get(groupKey) || [];
      list.push(perm);
      map.set(groupKey, list);
    });
    return Array.from(map.entries());
  }, [permissions]);

  const openCreateModal = () => {
    setRoleNameInput('');
    setSelectedPermissionIds([]);
    setErrorMessage(null);
    setModalMode('create');
  };

  const openEditModal = (role: RoleDetail) => {
    setRoleNameInput(role.name);
    setSelectedPermissionIds(role.permissions.map((p) => p.id));
    setErrorMessage(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setRoleNameInput('');
    setSelectedPermissionIds([]);
  };

  const togglePermission = (id: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const toggleAllInGroup = (groupPerms: PermissionItem[]) => {
    const groupIds = groupPerms.map((p) => p.id);
    const allChecked = groupIds.every((id) => selectedPermissionIds.includes(id));

    if (allChecked) {
      setSelectedPermissionIds((prev) =>
        prev.filter((id) => !groupIds.includes(id))
      );
    } else {
      setSelectedPermissionIds((prev) =>
        Array.from(new Set([...prev, ...groupIds]))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !roleNameInput.trim()) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      if (modalMode === 'create') {
        const created = await roleService.create(orgId, {
          name: roleNameInput.trim(),
          permissionIds: selectedPermissionIds,
        });
        await loadData();
        setSelectedRoleId(created.id);
      } else if (modalMode === 'edit' && activeRole) {
        await roleService.update(orgId, activeRole.id, {
          name: activeRole.isSystemRole ? undefined : roleNameInput.trim(),
          permissionIds: selectedPermissionIds,
        });
        await loadData();
      }

      closeModal();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save role.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: RoleDetail) => {
    if (!orgId) return;
    if (role.isSystemRole) {
      alert('System preset roles cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    try {
      setErrorMessage(null);
      await roleService.delete(orgId, role.id);
      const remaining = roles.filter((r) => r.id !== role.id);
      setRoles(remaining);
      if (selectedRoleId === role.id && remaining.length > 0) {
        setSelectedRoleId(remaining[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Organization Roles</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure tenant-specific roles, assign operational boundaries, and trace modification history.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-emerald-950"
        >
          <Plus className="w-4 h-4" />
          <span>New Custom Role</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-muted-foreground">
          LOADING ROLES & CAPABILITIES MATRIX...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Roles Selector Sidebar */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold px-1">
              Organization Roles ({roles.length})
            </div>
            <div className="space-y-1.5">
              {roles.map((role) => {
                const isSelected = role.id === activeRole?.id;
                const isOwner = role.name.toLowerCase() === 'owner';

                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-card border-card-border shadow-md text-white'
                        : 'bg-card/30 border-card-border/80 text-muted-foreground hover:text-foreground hover:bg-card/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isOwner ? <Lock className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate">{role.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                          <Users className="w-2.5 h-2.5" />
                          <span>{role.userCount} members</span>
                        </div>
                      </div>
                    </div>
                    {role.isSystemRole && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-card-border uppercase">
                        System
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Role Detail View */}
          <div className="md:col-span-2 border border-card-border rounded-xl bg-card/30 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-card-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">{activeRole?.name}</h2>
                  {activeRole?.isSystemRole && (
                    <span className="text-[10px] text-amber-400 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                      System Preset
                    </span>
                  )}
                </div>
                {activeRole?.lastUpdatedBy && (
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    Last updated by {activeRole.lastUpdatedBy.fullName} ({activeRole.lastUpdatedBy.email})
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeRole?.name.toLowerCase() !== 'owner' && (
                  <button
                    onClick={() => openEditModal(activeRole)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-card-border bg-muted text-foreground hover:text-white hover:bg-muted text-xs font-medium transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Permissions</span>
                  </button>
                )}

                {!activeRole?.isSystemRole && (
                  <button
                    onClick={() => handleDelete(activeRole)}
                    className="p-1.5 rounded-lg border border-card-border text-muted-foreground hover:text-rose-400 hover:bg-muted transition-colors"
                    title="Delete Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Granted Capabilities List */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Assigned Capabilities ({activeRole?.permissions?.length || 0})
              </div>

              {activeRole?.name.toLowerCase() === 'owner' ? (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Unrestricted Superadmin Authority</div>
                    <div className="text-emerald-400/80 text-[11px] mt-0.5">
                      The Owner role has full administrative clearance across all locations, billing, positions, and staff rosters.
                    </div>
                  </div>
                </div>
              ) : activeRole?.permissions?.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                  NO PERMISSIONS ASSIGNED TO THIS ROLE.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeRole?.permissions?.map((perm) => (
                    <div
                      key={perm.id}
                      className="p-2.5 rounded-lg bg-card border border-card-border flex items-center gap-2.5 text-xs text-muted-foreground"
                    >
                      <div className="w-4 h-4 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center shrink-0 text-emerald-400">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="font-mono text-[11px]">{perm.key}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {modalMode === 'create' ? 'Create Custom Role' : `Edit Role: ${activeRole?.name}`}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set role identity and check permitted capabilities.
                </p>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pr-1">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Role Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit' && activeRole?.isSystemRole}
                  value={roleNameInput}
                  onChange={(e) => setRoleNameInput(e.target.value)}
                  placeholder="e.g. Shift Supervisor, Inventory Auditor"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                {modalMode === 'edit' && activeRole?.isSystemRole && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    System preset role names cannot be altered. You can modify their permission mappings below.
                  </p>
                )}
              </div>

              {/* Module-based Permissions Checkbox Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Permission Capabilities ({selectedPermissionIds.length} selected)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {groupedPermissions.map(([groupName, groupPerms]) => {
                    const allChecked = groupPerms.every((p) =>
                      selectedPermissionIds.includes(p.id)
                    );

                    return (
                      <div
                        key={groupName}
                        className="border border-card-border/80 rounded-xl p-3.5 bg-background/40 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-card-border/60 pb-2">
                          <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase">
                            {groupName} module
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleAllInGroup(groupPerms)}
                            className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300"
                          >
                            {allChecked ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupPerms.map((perm) => {
                            const checked = selectedPermissionIds.includes(perm.id);
                            return (
                              <button
                                type="button"
                                key={perm.id}
                                onClick={() => togglePermission(perm.id)}
                                className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors text-left border ${
                                  checked
                                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                                    : 'bg-card border-card-border text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <div
                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                    checked
                                      ? 'bg-emerald-600 border-emerald-500 text-white'
                                      : 'border-card-border'
                                  }`}
                                >
                                  {checked && <Check className="w-2.5 h-2.5" />}
                                </div>
                                <span className="font-mono text-[10px] truncate">{perm.key}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  {submitting
                    ? 'Saving...'
                    : modalMode === 'create'
                    ? 'Create Role'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}