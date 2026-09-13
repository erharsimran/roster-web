'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import type { UserProfile, LocationSummary } from '@/types';

interface WorkspaceContextType {
  user: UserProfile | null;
  selectedLocation: LocationSummary | null;
  setSelectedLocation: (location: LocationSummary) => void;
  isLoading: boolean;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setIsLoading(false);
        router.replace('/login');
        return;
      }

      const response = await apiClient.get<UserProfile>('/auth/me');
      const profile = response.data;
      setUser(profile);

      const availableLocations = profile.locations || [];
      if (availableLocations.length > 0) {
        const storedLocId = localStorage.getItem('active_location_id');
        const active = availableLocations.find((l) => l.id === storedLocId) || availableLocations[0];
        setSelectedLocation(active);
      }
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLocationChange = (location: LocationSummary) => {
    setSelectedLocation(location);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_location_id', location.id);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    setUser(null);
    setSelectedLocation(null);
    router.replace('/login');
  };

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        selectedLocation,
        setSelectedLocation: handleLocationChange,
        isLoading,
        logout,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}