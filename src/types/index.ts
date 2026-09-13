import type { components, paths } from './api';

// Canonical Schema DTOs (Request bodies with schema definitions)[cite: 1]
export type Schemas = components['schemas'];
export type SetupOrgDto = Schemas['SetupOrgDto'];
export type CreatePositionDto = Schemas['CreatePositionDto'];
export type UpdatePositionDto = Schemas['UpdatePositionDto'];
export type CreateEmployeeDto = Schemas['CreateEmployeeDto'];
export type UpdateEmployeeProfileDto = Schemas['UpdateEmployeeProfileDto'];
export type AssignPositionsDto = Schemas['AssignPositionsDto'];
export type CreateShiftDto = Schemas['CreateShiftDto'];
export type MoveShiftDto = Schemas['MoveShiftDto'];
export type DuplicateShiftDto = Schemas['DuplicateShiftDto'];
export type QuickDropShiftDto = Schemas['QuickDropShiftDto'];
export type CopyWeekDto = Schemas['CopyWeekDto'];
export type RequestShiftTradeDto = Schemas['RequestShiftTradeDto'];
export type ReviewTradeDto = Schemas['ReviewTradeDto'];
export type CreateTimeOffRequestDto = Schemas['CreateTimeOffRequestDto'];
export type ReviewTimeOffDto = Schemas['ReviewTimeOffDto'];
export type ClockInDto = Schemas['ClockInDto'];
export type ClockOutDto = Schemas['ClockOutDto'];
export type SetLocationCoordinatesDto = Schemas['SetLocationCoordinatesDto'];
export type UpdateLocationOperatingHoursDto = Schemas['UpdateLocationOperatingHoursDto'];

// Reusable Sub-Models
export interface LocationSummary {
    id: string;
    name: string;
    timezone: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    geofenceRadiusMeters?: number;
}

export interface OrganizationSummary {
    id: string;
    name: string;
    timezone: string;
}

export interface PositionItem {
    id: string;
    name: string;
    hourlyRate?: number | null;
}

// User Profile returned by GET /auth/me[cite: 1, 2]
export interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    role: 'Owner' | 'Admin' | 'Manager' | 'Employee' | string;
    orgId: string | null;
    organization?: OrganizationSummary | null;
    locations?: LocationSummary[];
    positions?: PositionItem[];
    permissions?: string[];
    scopeType?: 'organization' | 'location';
    scopeId?: string;
}

// Schedule Grid returned by GET /scheduling/locations/{locationId}/grid[cite: 1, 2]
export interface ShiftSummary {
    id: string;
    locationId: string;
    positionId?: string | null;
    assignedUserId?: string | null;
    startTime: string;
    endTime: string;
    status: 'scheduled' | 'published' | 'cancelled';
    position?: PositionItem | null;
    assignedUser?: {
        id: string;
        fullName: string;
        email: string;
    } | null;
}

export interface ScheduleGridRow {
    id: string;
    label: string;
    subLabel?: string;
    totalHours: number;
    totalCost: number;
    shifts: ShiftSummary[];
}

export interface ScheduleGridPayload {
    metadata: {
        locationId: string;
        startDate: string;
        endDate: string;
        groupBy: 'employee' | 'position';
    };
    rows: ScheduleGridRow[];
}