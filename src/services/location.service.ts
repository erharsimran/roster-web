import { apiClient } from '@/lib/api-client';

export interface DaySchedule {
    isOpen: boolean;
    open: string;
    close: string;
}

export type OperatingHours = Record<
    'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
    DaySchedule
>;

export interface LocationItem {
    id: string;
    orgId: string;
    name: string;
    timezone: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    geofenceRadiusMeters: number;
    operatingHours?: OperatingHours | null;
    requireLeadershipOnDuty: boolean;
    createdAt: string;
    _count?: {
        shifts: number;
        timeEntries: number;
    };
}

export interface CreateLocationDto {
    name: string;
    timezone: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    geofenceRadiusMeters?: number;
    operatingHours?: OperatingHours;
    requireLeadershipOnDuty?: boolean;
}

export interface UpdateLocationDto {
    name?: string;
    timezone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    geofenceRadiusMeters?: number;
    operatingHours?: OperatingHours;
    requireLeadershipOnDuty?: boolean;
}

export const locationService = {
    listByOrg: async (orgId: string): Promise<LocationItem[]> => {
        const { data } = await apiClient.get<LocationItem[]>(`/organizations/${orgId}/locations`);
        return data;
    },

    findById: async (locationId: string): Promise<LocationItem> => {
        const { data } = await apiClient.get<LocationItem>(`/locations/${locationId}`);
        return data;
    },

    create: async (orgId: string, dto: CreateLocationDto): Promise<LocationItem> => {
        const { data } = await apiClient.post<LocationItem>(`/organizations/${orgId}/locations`, dto);
        return data;
    },

    update: async (locationId: string, dto: UpdateLocationDto): Promise<LocationItem> => {
        const { data } = await apiClient.patch<LocationItem>(`/locations/${locationId}`, dto);
        return data;
    },

    delete: async (locationId: string): Promise<{ success: boolean; message: string }> => {
        const { data } = await apiClient.delete<{ success: boolean; message: string }>(
            `/locations/${locationId}`
        );
        return data;
    },
};