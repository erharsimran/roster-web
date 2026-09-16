'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWorkspace } from '@/context/workspace-context';
import {
  locationService,
  LocationItem,
  OperatingHours,
} from '@/services/location.service';
import {
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Navigation,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
} from 'lucide-react';

const DAYS_OF_WEEK: Array<keyof OperatingHours> = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DEFAULT_OPERATING_HOURS: OperatingHours = {
  monday: { isOpen: true, open: '08:00', close: '22:00' },
  tuesday: { isOpen: true, open: '08:00', close: '22:00' },
  wednesday: { isOpen: true, open: '08:00', close: '22:00' },
  thursday: { isOpen: true, open: '08:00', close: '22:00' },
  friday: { isOpen: true, open: '08:00', close: '23:00' },
  saturday: { isOpen: true, open: '09:00', close: '23:00' },
  sunday: { isOpen: true, open: '10:00', close: '20:00' },
};

export default function LocationsPage() {
  const { user, selectedLocation, setSelectedLocation, refreshLocations } = useWorkspace();
  const orgId = user?.orgId;

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Form Fields
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/Toronto');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [geofenceRadius, setGeofenceRadius] = useState<number>(150);
  const [requireLeadership, setRequireLeadership] = useState<boolean>(false);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(DEFAULT_OPERATING_HOURS);

  const loadLocations = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await locationService.listByOrg(orgId);
      setLocations(data);
      if (data.length > 0) {
        setSelectedLocationId((prev) =>
          prev && data.some((l) => l.id === prev) ? prev : selectedLocation?.id || data[0].id
        );
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to fetch store locations.');
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedLocation?.id]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const activeLocation = locations.find((l) => l.id === selectedLocationId) || locations[0];

  const openCreateModal = () => {
    setName('');
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    setAddress('');
    setLatitude('');
    setLongitude('');
    setGeofenceRadius(150);
    setRequireLeadership(false);
    setOperatingHours(DEFAULT_OPERATING_HOURS);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (loc: LocationItem) => {
    setName(loc.name);
    setTimezone(loc.timezone);
    setAddress(loc.address || '');
    setLatitude(loc.latitude !== null && loc.latitude !== undefined ? String(loc.latitude) : '');
    setLongitude(loc.longitude !== null && loc.longitude !== undefined ? String(loc.longitude) : '');
    setGeofenceRadius(loc.geofenceRadiusMeters || 150);
    setRequireLeadership(loc.requireLeadershipOnDuty);
    setOperatingHours(loc.operatingHours || DEFAULT_OPERATING_HOURS);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleDayToggle = (day: keyof OperatingHours) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  const handleTimeChange = (
    day: keyof OperatingHours,
    field: 'open' | 'close',
    value: string
  ) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim()) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const parsedLat = latitude.trim() ? parseFloat(latitude) : undefined;
      const parsedLng = longitude.trim() ? parseFloat(longitude) : undefined;

      if (modalMode === 'create') {
        const created = await locationService.create(orgId, {
          name: name.trim(),
          timezone,
          address: address.trim() || undefined,
          latitude: parsedLat,
          longitude: parsedLng,
          geofenceRadiusMeters: geofenceRadius,
          operatingHours,
          requireLeadershipOnDuty: requireLeadership,
        });
        setSuccessMessage(`Branch "${created.name}" created successfully.`);
        setSelectedLocationId(created.id);
      } else if (modalMode === 'edit' && activeLocation) {
        const updated = await locationService.update(activeLocation.id, {
          name: name.trim(),
          timezone,
          address: address.trim() || undefined,
          latitude: parsedLat,
          longitude: parsedLng,
          geofenceRadiusMeters: geofenceRadius,
          operatingHours,
          requireLeadershipOnDuty: requireLeadership,
        });
        setSuccessMessage(`Branch "${updated.name}" updated successfully.`);
      }

      closeModal();
      await loadLocations();
      await refreshLocations();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save location.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (loc: LocationItem) => {
    if (!confirm(`Delete branch "${loc.name}"? Active shifts and timesheets must be cleared first.`)) {
      return;
    }

    try {
      setErrorMessage(null);
      await locationService.delete(loc.id);
      setSuccessMessage(`Location "${loc.name}" deleted.`);
      
      await loadLocations();
      await refreshLocations();

      const remaining = locations.filter((l) => l.id !== loc.id);
      if (remaining.length > 0) {
        setSelectedLocationId(remaining[0].id);
        if (selectedLocation?.id === loc.id) {
          setSelectedLocation(remaining[0]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete store location.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Store Locations & Operating Hours
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Configure store branches, weekly operating boundaries, and mobile GPS geofences.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-emerald-950"
        >
          <Plus className="w-4 h-4" />
          <span>Add Location</span>
        </button>
      </div>

      {/* Status Banners */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-semibold">
            Dismiss
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
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-neutral-500">
          LOADING STORE LOCATIONS & OPERATING HOURS...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Branch Selector */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-1">
              Store Branches ({locations.length})
            </div>
            <div className="space-y-1.5">
              {locations.map((loc) => {
                const isSelected = loc.id === activeLocation?.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                        : 'bg-white/60 dark:bg-neutral-900/30 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{loc.name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{loc.timezone}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Location Configurations */}
          {activeLocation ? (
            <div className="md:col-span-2 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900/40 p-5 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">{activeLocation.name}</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{activeLocation.address || 'No address specified'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(activeLocation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Branch</span>
                  </button>
                  <button
                    onClick={() => handleDelete(activeLocation)}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-neutral-800 transition-colors"
                    title="Delete Location"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Geofencing and Compliance Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-200">
                    <Navigation className="w-3.5 h-3.5 text-sky-500" />
                    <span>Mobile GPS Geofence</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    {activeLocation.latitude !== null && activeLocation.longitude !== null ? (
                      <span>
                        {Number(activeLocation.latitude).toFixed(4)}, {Number(activeLocation.longitude).toFixed(4)} ({activeLocation.geofenceRadiusMeters}m radius)
                      </span>
                    ) : (
                      <span className="text-amber-500">Coordinates not set</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Leadership Rule</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {activeLocation.requireLeadershipOnDuty ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Active (Alerts if 0 leads are rostered)
                      </span>
                    ) : (
                      <span className="text-neutral-400">Disabled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Operating Hours Table */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider font-mono">
                  Weekly Operating Schedule (Grid Window)
                </div>
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-mono text-neutral-500 uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Day</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Open</th>
                        <th className="px-4 py-2.5">Close</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {DAYS_OF_WEEK.map((day) => {
                        const sched = activeLocation.operatingHours?.[day] || DEFAULT_OPERATING_HOURS[day];
                        return (
                          <tr key={day} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30">
                            <td className="px-4 py-2.5 font-medium capitalize text-neutral-900 dark:text-neutral-200">
                              {day}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                  sched.isOpen
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                                }`}
                              >
                                {sched.isOpen ? 'OPEN' : 'CLOSED'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-neutral-600 dark:text-neutral-400">
                              {sched.isOpen ? sched.open : '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-neutral-600 dark:text-neutral-400">
                              {sched.isOpen ? sched.close : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 p-12 text-center text-xs text-neutral-500 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              No store branches found. Click &quot;Add Location&quot; to establish your first store.
            </div>
          )}
        </div>
      )}

      {/* Modal: Create or Edit Location */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {modalMode === 'create' ? 'Add Store Location' : `Configure: ${name}`}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Set branch credentials, GPS coordinates, and weekly operating windows.
                </p>
              </div>
              <button onClick={closeModal} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. West Village Hub"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Store Timezone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="America/Toronto"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Main St, New York, NY"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* GPS Coordinates & Geofencing */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 space-y-3">
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-200 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-500" />
                  <span>GPS Geofence Tracking</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="43.3616"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="-80.3144"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Radius (Meters)</label>
                    <input
                      type="number"
                      min={20}
                      max={2000}
                      value={geofenceRadius}
                      onChange={(e) => setGeofenceRadius(parseInt(e.target.value) || 150)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Continuous Leadership Staffing Rule Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40">
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-neutral-200">
                    Require Leadership on Duty
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Flags gaps on schedule if no Manager or Lead is rostered during open hours.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireLeadership}
                  onChange={(e) => setRequireLeadership(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Operating Hours Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-200">
                  Operating Hours Schedule
                </div>
                <div className="space-y-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const sched = operatingHours[day];
                    return (
                      <div
                        key={day}
                        className="flex items-center justify-between p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/20 text-xs"
                      >
                        <div className="flex items-center gap-2 w-28">
                          <input
                            type="checkbox"
                            checked={sched.isOpen}
                            onChange={() => handleDayToggle(day)}
                            className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                          />
                          <span className="font-semibold capitalize text-neutral-800 dark:text-neutral-200">
                            {day}
                          </span>
                        </div>
                        {sched.isOpen ? (
                          <div className="flex items-center gap-2 font-mono">
                            <input
                              type="time"
                              value={sched.open}
                              onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                              className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs"
                            />
                            <span className="text-neutral-400">–</span>
                            <input
                              type="time"
                              value={sched.close}
                              onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                              className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-mono italic">Closed all day</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Location' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}