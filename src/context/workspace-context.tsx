'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { locationService, LocationItem } from '@/services/location.service';

export interface WorkspaceUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  orgId: string;
  organization?: {
    id: string;
    name: string;
    timezone: string;
  } | null;
  permissions: string[];
  locations: LocationItem[];
}

interface WorkspaceContextValue {
  user: WorkspaceUser | null;
  selectedLocation: LocationItem | null;
  setSelectedLocation: (location: LocationItem) => void;
  refreshLocations: () => Promise<void>;
  isLoading: boolean;
  logout: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [selectedLocation, setSelectedLocationState] = useState<LocationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setSelectedLocation = (location: LocationItem) => {
    setSelectedLocationState(location);
    if (typeof window !== 'undefined') {
      localStorage.setItem('roster_selected_location_id', location.id);
    }
  };

  const refreshLocations = useCallback(async () => {
    if (!user?.orgId) return;
    try {
      const locations = await locationService.listByOrg(user.orgId);
      setUser((prev) => (prev ? { ...prev, locations } : prev));

      setSelectedLocationState((currentSelected) => {
        const savedLocationId = typeof window !== 'undefined' 
          ? localStorage.getItem('roster_selected_location_id') 
          : null;

        if (currentSelected && locations.some((l) => l.id === currentSelected.id)) {
          return locations.find((l) => l.id === currentSelected.id) || currentSelected;
        }
        if (savedLocationId && locations.some((l) => l.id === savedLocationId)) {
          return locations.find((l) => l.id === savedLocationId) || locations[0];
        }
        return locations[0] || null;
      });
    } catch (error) {
      console.error('Failed to reload organization locations:', error);
    }
  }, [user?.orgId]);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: profile } = await apiClient.get<WorkspaceUser>('/auth/me');

      let userLocations: LocationItem[] = [];
      if (profile.orgId) {
        userLocations = await locationService.listByOrg(profile.orgId);
      }

      const completeUser: WorkspaceUser = {
        ...profile,
        locations: userLocations,
      };

      setUser(completeUser);

      const savedLocationId = typeof window !== 'undefined' 
        ? localStorage.getItem('roster_selected_location_id') 
        : null;

      const initialLocation =
        userLocations.find((l) => l.id === savedLocationId) || userLocations[0] || null;

      setSelectedLocationState(initialLocation);
    } catch (error) {
      console.error('Failed to load workspace session:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('roster_selected_location_id');
    }
    setUser(null);
    setSelectedLocationState(null);
    router.replace('/login');
  };

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        selectedLocation,
        setSelectedLocation,
        refreshLocations,
        isLoading,
        logout,
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