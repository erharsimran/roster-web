'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWorkspace } from '@/context/workspace-context';
import { employeeService } from '@/services/employee.service';
import { positionService } from '@/services/position.service';
import {
  UserPlus,
  Search,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Building,
  Shield,
  AlertCircle,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';

interface PositionItem {
  id: string;
  name: string;
  hourlyRate?: number | string | null;
}

interface NormalizedEmployee {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  roleName: string;
  scopeType: 'organization' | 'location';
  scopeId: string;
  scopeName: string;
  positions: PositionItem[];
  createdAt: string;
}

export default function EmployeesPage() {
  const { user, selectedLocation } = useWorkspace();
  const orgId = user?.orgId;

  const [employees, setEmployees] = useState<NormalizedEmployee[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleName, setRoleName] = useState('Employee');
  const [scopeType, setScopeType] = useState<'organization' | 'location'>('location');
  const [scopeId, setScopeId] = useState('');
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setErrorMessage(null);

      const [rawEmployees, posList] = await Promise.all([
        employeeService.listByOrg(orgId),
        positionService.listByOrg(orgId),
      ]);

      const locationMap = new Map((user?.locations || []).map((loc) => [loc.id, loc.name]));

      const normalized: NormalizedEmployee[] = rawEmployees.map((u: any) => {
        const primaryRole = u.userRoles?.[0];
        const sType = (primaryRole?.scopeType?.toLowerCase() || u.scopeType || 'organization') as
          | 'organization'
          | 'location';
        const sId = primaryRole?.scopeId || u.scopeId || orgId;

        const sName =
          sType === 'organization'
            ? 'All Locations'
            : locationMap.get(sId) || u.scopeName || 'Assigned Branch';

        const rawPositions =
          u.positions || u.employeePositions?.map((ep: any) => ep.position) || [];

        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName || 'Unnamed Member',
          phone: u.phone,
          roleName: primaryRole?.role?.name || u.roleName || 'Employee',
          scopeType: sType,
          scopeId: sId,
          scopeName: sName,
          positions: rawPositions,
          createdAt: u.createdAt,
        };
      });

      setEmployees(normalized);
      setPositions(posList);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to fetch team data.');
    } finally {
      setLoading(false);
    }
  }, [orgId, user?.locations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setRoleName('Employee');
    setScopeType('location');
    setScopeId(selectedLocation?.id || user?.locations?.[0]?.id || '');
    setSelectedPositionIds([]);
    setActiveEmployeeId(null);
    setErrorMessage(null);
    setModalMode('create');
  };

  const openEditModal = (emp: NormalizedEmployee) => {
    setFullName(emp.fullName);
    setEmail(emp.email);
    setPhone(emp.phone || '');
    setRoleName(emp.roleName);
    setScopeType(emp.scopeType);
    setScopeId(emp.scopeId);
    setSelectedPositionIds(emp.positions.map((p) => p.id));
    setActiveEmployeeId(emp.id);
    setErrorMessage(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveEmployeeId(null);
  };

  const togglePosition = (posId: string) => {
    setSelectedPositionIds((prev) =>
      prev.includes(posId) ? prev.filter((id) => id !== posId) : [...prev, posId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !fullName.trim()) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const resolvedScopeId = scopeType === 'organization' ? orgId : scopeId;

      if (modalMode === 'create') {
        await employeeService.onboard(orgId, {
          orgId,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          roleName,
          scopeType,
          scopeId: resolvedScopeId,
          positionIds: selectedPositionIds,
        });
      } else if (modalMode === 'edit' && activeEmployeeId) {
        await Promise.all([
          employeeService.updateProfile(orgId, activeEmployeeId, {
            fullName: fullName.trim(),
            phone: phone.trim() ,
            roleName,
            scopeType,
            scopeId: resolvedScopeId,
          }),
          employeeService.reassignPositions(orgId, activeEmployeeId, {
            positionIds: selectedPositionIds,
          }),
        ]);
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOffboard = async (emp: NormalizedEmployee) => {
    if (!orgId) return;
    if (emp.id === user?.id) {
      alert('You cannot offboard your own account from the workspace.');
      return;
    }
    if (!confirm(`Are you sure you want to offboard ${emp.fullName}? This will revoke their access.`)) {
      return;
    }

    try {
      setErrorMessage(null);
      await employeeService.offboard(orgId, emp.id);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to offboard employee.');
    }
  };

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.roleName.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Team Directory</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage organization staff, role access boundaries, and qualified duties.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-emerald-950"
        >
          <UserPlus className="w-4 h-4" />
          <span>Onboard Employee</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Count Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-neutral-500 font-mono">
          {filteredEmployees.length} OF {employees.length} EMPLOYEES
        </div>
      </div>

      {/* Employees Table */}
      <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/30">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 uppercase font-mono text-[10px] tracking-wider">
            <tr>
              <th className="px-5 py-3">Team Member</th>
              <th className="px-5 py-3">System Role</th>
              <th className="px-5 py-3">Scope</th>
              <th className="px-5 py-3">Assigned Positions</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-neutral-500 font-mono">
                  FETCHING TEAM DIRECTORY...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-neutral-500">
                  No employees found matching current filter.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-neutral-900/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-semibold text-neutral-200 text-xs">
                        {emp.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-neutral-200">{emp.fullName}</div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{emp.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                        emp.roleName === 'Owner' || emp.roleName === 'Admin'
                          ? 'bg-purple-950/40 text-purple-400 border border-purple-800/60'
                          : emp.roleName === 'Manager'
                          ? 'bg-sky-950/40 text-sky-400 border border-sky-800/60'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      <Shield className="w-2.5 h-2.5" />
                      {emp.roleName}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-neutral-300">
                      {emp.scopeType === 'organization' ? (
                        <Building className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{emp.scopeName}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {emp.positions.length > 0 ? (
                        emp.positions.map((pos) => (
                          <span
                            key={pos.id}
                            className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1"
                          >
                            <Briefcase className="w-2.5 h-2.5 text-emerald-400" />
                            {pos.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-neutral-500 text-[11px] italic">No positions</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-400 font-mono text-[11px]">
                    {emp.phone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-neutral-500" />
                        <span>{emp.phone}</span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
                        title="Edit Employee"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOffboard(emp)}
                        disabled={emp.id === user?.id}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-30"
                        title="Offboard Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal Dialog */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {modalMode === 'create' ? 'Onboard Team Member' : 'Update Employee Profile'}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Configure identity, access boundary, and assigned positions[cite: 1].
                </p>
              </div>
              <button onClick={closeModal} className="text-neutral-500 hover:text-neutral-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={modalMode === 'edit'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    System Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Scoping Selection */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Scope Target <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScopeType('organization');
                      setScopeId(orgId || '');
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                      scopeType === 'organization'
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    All Locations (Org)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeType('location');
                      setScopeId(selectedLocation?.id || user?.locations?.[0]?.id || '');
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                      scopeType === 'location'
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Specific Branch
                  </button>
                </div>

                {scopeType === 'location' && (
                  <select
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {user?.locations?.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.timezone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Qualified Positions Selector */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Assigned Qualified Positions[cite: 1]
                </label>
                {positions.length === 0 ? (
                  <p className="text-[11px] text-neutral-500">
                    No positions created yet. Visit Positions & Pay Rates first.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-neutral-950 border border-neutral-800 rounded-lg">
                    {positions.map((pos) => {
                      const isChecked = selectedPositionIds.includes(pos.id);
                      return (
                        <button
                          type="button"
                          key={pos.id}
                          onClick={() => togglePosition(pos.id)}
                          className={`flex items-center gap-2 p-2 rounded text-xs transition-colors text-left ${
                            isChecked
                              ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'border-neutral-700'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span className="truncate">{pos.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
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
                    ? 'Onboard Employee'
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