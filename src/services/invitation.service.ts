import { apiClient } from '@/lib/api-client';

export interface CreateMemberInviteDto {
    email: string;
    roleName: string;
    scopeType: 'organization' | 'location';
    scopeId: string;
    positionIds?: string[];
}

export interface MemberInviteResponse {
    id: string;
    email: string;
    inviteLink: string;
    expiresAt: string;
}

export interface ClaimMemberInviteDto {
    token: string;
    fullName: string;
    password: string;
    phone?: string;
}

export const invitationService = {
    /**
     * Dispatches a member invitation from within an organization
     */
    createMemberInvite: async (orgId: string, dto: CreateMemberInviteDto) => {
        const { data } = await apiClient.post<MemberInviteResponse>(
            `/organizations/${orgId}/invitations`,
            dto
        );
        return data;
    },

    /**
     * Validates token status before rendering the claim page
     */
    validateToken: async (token: string) => {
        const { data } = await apiClient.get('/invitations/validate', {
            params: { token },
        });
        return data;
    },

    /**
     * Consumes an invite token, sets password, and signs in
     */
    claimMemberInvite: async (dto: ClaimMemberInviteDto) => {
        const { data } = await apiClient.post('/auth/claim-member-invite', dto);
        return data;
    },
};