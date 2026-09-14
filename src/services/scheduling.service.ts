import { apiClient } from '@/lib/api-client';

export interface PositionSummary {
    id: string;
    name: string;
    hourlyRate?: number | null;
    isLeadership?: boolean;
}

export interface UserSummary {
    id: string;
    fullName: string;
    email: string;
}

export interface ShiftCard {
    id: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    status: 'scheduled' | 'published' | 'cancelled';
    position: PositionSummary | null;
    assignedUser: UserSummary | null;
    estimatedCost: number;
    isProjectedOvertime: boolean;
}

export interface CoverageGap {
    date: string;
    type: 'MISSING_LEADERSHIP' | 'STORE_UNSTAFFED';
    missingFrom: string;
    missingTo: string;
    message: string;
}

export interface ScheduleGridRow {
    id: string;
    label: string;
    subLabel?: string;
    isLeadership?: boolean;
    totalHours: number;
    totalCost: number;
    shifts: ShiftCard[];
}

export interface ScheduleGridPayload {
    metadata: {
        locationId: string;
        locationName: string;
        timezone: string;
        operatingHours: Record<string, { isOpen: boolean; open: string; close: string }> | null;
        requireLeadershipOnDuty: boolean;
        startDate: string;
        endDate: string;
        groupBy: 'employee' | 'position';
    };
    summary: {
        totalHours: number;
        estimatedCost: number;
        totalShiftsCount: number;
        openShiftsCount: number;
        complianceAlertsCount: number;
    };
    complianceAlerts: CoverageGap[];
    openShifts: ShiftCard[];
    rows: ScheduleGridRow[];
}

export interface CreateShiftPayload {
    locationId: string;
    assignedUserId?: string | null;
    positionId?: string;
    startTime: string;
    endTime: string;
    notes?: string;
}

export interface MoveShiftPayload {
    targetUserId?: string | null;
    targetPositionId?: string | null;
    newStartTime: string;
    newEndTime: string;
}

export interface CopyWeekPayload {
    sourceStartDate: string;
    targetStartDate: string;
    skipConflicts?: boolean;
}

export interface QuickDropPayload {
    userId: string;
    date: string;
    positionId?: string;
    durationHours?: number;
}

export const schedulingService = {
    getGrid: async (
        locationId: string,
        startDate: string,
        endDate: string,
        groupBy: 'employee' | 'position' = 'employee'
    ): Promise<ScheduleGridPayload> => {
        const { data } = await apiClient.get<ScheduleGridPayload>(
            `/scheduling/locations/${locationId}/grid`,
            { params: { startDate, endDate, groupBy } }
        );
        return data;
    },

    createShift: async (payload: CreateShiftPayload) => {
        const { data } = await apiClient.post('/scheduling/shifts', payload);
        return data;
    },

    moveShift: async (shiftId: string, payload: MoveShiftPayload) => {
        const { data } = await apiClient.patch(`/scheduling/shifts/${shiftId}/move`, payload);
        return data;
    },

    quickDrop: async (locationId: string, payload: QuickDropPayload) => {
        const { data } = await apiClient.post(
            `/scheduling/locations/${locationId}/quick-drop`,
            payload
        );
        return data;
    },

    copyWeek: async (locationId: string, payload: CopyWeekPayload) => {
        const { data } = await apiClient.post(
            `/scheduling/locations/${locationId}/copy-week`,
            payload
        );
        return data;
    },

    publishRoster: async (
        locationId: string,
        startDate: string,
        endDate: string
    ): Promise<{ success: boolean; publishedCount: number }> => {
        const { data } = await apiClient.post(
            `/scheduling/locations/${locationId}/publish`,
            { startDate, endDate }
        );
        return data;
    },

    deleteShift: async (shiftId: string) => {
        const { data } = await apiClient.delete(`/scheduling/shifts/${shiftId}`);
        return data;
    },
};