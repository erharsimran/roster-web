import { apiClient } from '@/lib/api-client';

export type TimeEntryStatus = 'active' | 'completed' | 'flagged' | 'approved';

export interface TimeEntryItem {
    id: string;
    orgId: string;
    locationId: string;
    userId: string;
    shiftId?: string | null;
    clockIn: string;
    clockOut?: string | null;
    clockInLat: number;
    clockInLng: number;
    clockOutLat?: number | null;
    clockOutLng?: number | null;
    clockInDistance: number;
    clockOutDistance?: number | null;
    status: TimeEntryStatus;
    varianceMinutes: number;
    notes?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
    user?: {
        id: string;
        fullName: string;
        email: string;
    };
    shift?: {
        id: string;
        startTime: string;
        endTime: string;
        position?: {
            id: string;
            name: string;
            hourlyRate?: number;
        } | null;
    } | null;
}

export interface ClockInDto {
    locationId: string;
    latitude: number;
    longitude: number;
    shiftId?: string;
    notes?: string;
}

export interface ClockOutDto {
    latitude: number;
    longitude: number;
    notes?: string;
}

export const timeTrackingService = {
    clockIn: async (dto: ClockInDto): Promise<TimeEntryItem> => {
        const { data } = await apiClient.post<TimeEntryItem>('/time-tracking/clock-in', dto);
        return data;
    },

    clockOut: async (dto: ClockOutDto): Promise<TimeEntryItem> => {
        const { data } = await apiClient.post<TimeEntryItem>('/time-tracking/clock-out', dto);
        return data;
    },

    getTimesheets: async (
        locationId: string,
        startDate: string,
        endDate: string
    ): Promise<TimeEntryItem[]> => {
        const { data } = await apiClient.get<TimeEntryItem[]>(
            `/time-tracking/locations/${locationId}/timesheets`,
            {
                params: { startDate, endDate },
            }
        );
        return data;
    },

    approveEntry: async (id: string): Promise<TimeEntryItem> => {
        const { data } = await apiClient.put<TimeEntryItem>(
            `/time-tracking/entries/${id}/approve`
        );
        return data;
    },
};