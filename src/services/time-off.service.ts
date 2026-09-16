import { apiClient } from '@/lib/api-client';

export type TimeOffStatus = 'pending' | 'approved' | 'denied';

export interface TimeOffRequestItem {
    id: string;
    userId: string;
    locationId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    status: TimeOffStatus;
    reason?: string | null;
    reviewedBy?: string | null;
    createdAt: string;
    user?: {
        id: string;
        fullName: string;
        email: string;
    };
    location?: {
        id: string;
        name: string;
    };
}

export interface CreateTimeOffDto {
    locationId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    reason?: string;
}

export interface ReviewTimeOffDto {
    action: 'approve' | 'deny';
    reason?: string;
}

export const timeOffService = {
    // POST /time-off
    createRequest: async (dto: CreateTimeOffDto): Promise<TimeOffRequestItem> => {
        const { data } = await apiClient.post<TimeOffRequestItem>('/time-off', dto);
        return data;
    },

    // GET /time-off/me
    listMine: async (): Promise<TimeOffRequestItem[]> => {
        const { data } = await apiClient.get<TimeOffRequestItem[]>('/time-off/me');
        return data;
    },

    // DELETE /time-off/:requestId
    cancelRequest: async (requestId: string): Promise<{ success: boolean; message?: string }> => {
        const { data } = await apiClient.delete<{ success: boolean; message?: string }>(
            `/time-off/${requestId}`
        );
        return data;
    },

    // GET /time-off/locations/:locationId/pending
    getPendingForLocation: async (locationId: string): Promise<TimeOffRequestItem[]> => {
        const { data } = await apiClient.get<TimeOffRequestItem[]>(
            `/time-off/locations/${locationId}/pending`
        );
        return data;
    },

    // PUT /time-off/:requestId/review
    reviewRequest: async (
        requestId: string,
        dto: ReviewTimeOffDto
    ): Promise<{ success: boolean; message?: string }> => {
        const { data } = await apiClient.put<{ success: boolean; message?: string }>(
            `/time-off/${requestId}/review`,
            dto
        );
        return data;
    },
};