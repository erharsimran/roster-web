import { apiClient } from '@/lib/api-client';
import type { CreateEmployeeDto, UpdateEmployeeProfileDto, AssignPositionsDto } from '@/types';

export const employeeService = {
    listByOrg: async (orgId: string) => {
        const { data } = await apiClient.get<any[]>(`/organizations/${orgId}/employees`);
        return data;
    },

    onboard: async (orgId: string, dto: CreateEmployeeDto) => {
        const { data } = await apiClient.post(`/organizations/${orgId}/employees`, dto);
        return data;
    },

    updateProfile: async (orgId: string, userId: string, dto: UpdateEmployeeProfileDto) => {
        const { data } = await apiClient.patch(
            `/organizations/${orgId}/employees/${userId}`,
            dto
        );
        return data;
    },

    reassignPositions: async (orgId: string, userId: string, dto: AssignPositionsDto) => {
        const { data } = await apiClient.patch(
            `/organizations/${orgId}/employees/${userId}/positions`,
            dto
        );
        return data;
    },

    offboard: async (orgId: string, userId: string) => {
        const { data } = await apiClient.delete(`/organizations/${orgId}/employees/${userId}`);
        return data;
    },
};