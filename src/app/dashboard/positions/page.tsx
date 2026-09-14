'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWorkspace } from '@/context/workspace-context';
import { positionService } from '@/services/position.service';
import {
  Briefcase,
  Plus,
  Trash2,
  Pencil,
  DollarSign,
  AlertCircle,
  Search,
  X,
  Users,
  CalendarDays,
} from 'lucide-react';

interface PositionItem {
  id: string;
  name: string;
  hourlyRate: number | string | null;
  _count?: {
    employeePositions: number;
    shifts: number;
  };
}

export default function PositionsPage() {
  const { user } = useWorkspace();
  const orgId = user?.orgId;

  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activePosition, setActivePosition] = useState<PositionItem | null>(null);
  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPositions = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await positionService.listByOrg(orgId);
      setPositions(data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load positions.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const openCreateModal = () => {
    setName('');
    setHourlyRate('');
    setActivePosition(null);
    setErrorMessage(null);
    setModalMode('create');
  };

  const openEditModal = (pos: PositionItem) => {
    setName(pos.name);
    setHourlyRate(pos.hourlyRate ? String(pos.hourlyRate) : '');
    setActivePosition(pos);
    setErrorMessage(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActivePosition(null);
    setName('');
    setHourlyRate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim()) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const parsedRate = hourlyRate.trim() ? parseFloat(hourlyRate) : undefined;

      if (modalMode === 'create') {
        await positionService.create({
          orgId,
          name: name.trim(),
          hourlyRate: parsedRate,
        });
      } else if (modalMode === 'edit' && activePosition) {
        await positionService.update(activePosition.id, {
          name: name.trim(),
          hourlyRate: parsedRate,
        });
      }

      closeModal();
      await fetchPositions();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save position.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pos: PositionItem) => {
    if (!confirm(`Are you sure you want to delete "${pos.name}"?`)) return;

    try {
      setErrorMessage(null);
      await positionService.delete(pos.id);
      setPositions((prev) => prev.filter((p) => p.id !== pos.id));
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 409) {
        setErrorMessage(
          msg || `Cannot delete "${pos.name}": active shifts or staff assignments depend on it.`
        );
      } else {
        setErrorMessage(msg || 'Failed to delete position.');
      }
    }
  };

  const filteredPositions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return positions;
    return positions.filter((pos) => pos.name.toLowerCase().includes(q));
  }, [positions, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Positions & Pay Rates</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure job titles, baseline hourly wages, and staff qualifications.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-emerald-950"
        >
          <Plus className="w-4 h-4" />
          <span>New Position</span>
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

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-card border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {filteredPositions.length} OF {positions.length} POSITIONS
        </div>
      </div>

      {/* Positions Table */}
      <div className="border border-card-border rounded-xl overflow-hidden bg-card/30">
        <table className="w-full text-left text-xs">
          <thead className="bg-card/80 border-b border-card-border text-muted-foreground uppercase font-mono text-[10px] tracking-wider">
            <tr>
              <th className="px-5 py-3">Position Name</th>
              <th className="px-5 py-3">Base Pay Rate</th>
              <th className="px-5 py-3">Assigned Staff</th>
              <th className="px-5 py-3">Scheduled Shifts</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground font-mono">
                  FETCHING POSITIONS CATALOG...
                </td>
              </tr>
            ) : filteredPositions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                  No positions found. Click &quot;New Position&quot; to establish your job catalog[cite: 1].
                </td>
              </tr>
            ) : (
              filteredPositions.map((pos) => (
                <tr key={pos.id} className="hover:bg-card/60 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-muted text-emerald-400">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <span>{pos.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono">
                    {pos.hourlyRate ? `$${Number(pos.hourlyRate).toFixed(2)}/hr` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span>{pos._count?.employeePositions ?? 0} staff</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3 text-muted-foreground" />
                      <span>{pos._count?.shifts ?? 0} shifts</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(pos)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="Edit Position"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pos)}
                        className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-muted rounded-md transition-colors"
                        title="Delete Position"
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

      {/* Modal Dialog */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {modalMode === 'create' ? 'Create Job Position' : `Edit Position: ${activePosition?.name}`}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure the role label and baseline hourly compensation[cite: 1].
                </p>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Position Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Line Cook, Barista, Shift Lead"
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Default Hourly Rate ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="22.50"
                    className="w-full pl-8 pr-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500"
                  />
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
                    ? 'Create Position'
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