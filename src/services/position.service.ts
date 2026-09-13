import { apiClient } from '@/lib/api-client';
import type { CreatePositionDto, UpdatePositionDto } from '@/types';

export const positionService = {
    listByOrg: async (orgId: string) => {
        const { data } = await apiClient.get('/positions', { params: { orgId } });
        return data;
    },

    create: async (dto: CreatePositionDto) => {
        const { data } = await apiClient.post('/positions', dto);
        return data;
    },

    update: async (id: string, dto: UpdatePositionDto) => {
        const { data } = await apiClient.patch(`/positions/${id}`, dto);
        return data;
    },

    delete: async (id: string) => {
        const { data } = await apiClient.delete(`/positions/${id}`);
        return data;
    },
};