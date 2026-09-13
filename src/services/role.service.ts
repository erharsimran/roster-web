import { apiClient } from '@/lib/api-client';

export interface PermissionItem {
    id: number;
    key: string;
    description?: string | null;
}

export interface RoleAuditUser {
    id: string;
    fullName: string;
    email: string;
}

export interface RoleDetail {
    id: string;
    orgId: string;
    name: string;
    isSystemRole: boolean;
    userCount: number;
    lastUpdatedBy?: RoleAuditUser | null;
    permissions: PermissionItem[];
}

export interface CreateRoleDto {
    name: string;
    permissionIds?: number[];
}

export interface UpdateRoleDto {
    name?: string;
    permissionIds?: number[];
}

export const roleService = {
    getPermissions: async (orgId: string): Promise<PermissionItem[]> => {
        const { data } = await apiClient.get<PermissionItem[]>(
            `/organizations/${orgId}/roles/permissions`
        );
        return data;
    },

    listByOrg: async (orgId: string): Promise<RoleDetail[]> => {
        const { data } = await apiClient.get<RoleDetail[]>(
            `/organizations/${orgId}/roles`
        );
        return data;
    },

    create: async (orgId: string, dto: CreateRoleDto): Promise<RoleDetail> => {
        const { data } = await apiClient.post<RoleDetail>(
            `/organizations/${orgId}/roles`,
            dto
        );
        return data;
    },

    update: async (
        orgId: string,
        roleId: string,
        dto: UpdateRoleDto
    ): Promise<RoleDetail> => {
        const { data } = await apiClient.patch<RoleDetail>(
            `/organizations/${orgId}/roles/${roleId}`,
            dto
        );
        return data;
    },

    delete: async (orgId: string, roleId: string): Promise<{ success: boolean; message: string }> => {
        const { data } = await apiClient.delete<{ success: boolean; message: string }>(
            `/organizations/${orgId}/roles/${roleId}`
        );
        return data;
    },
};