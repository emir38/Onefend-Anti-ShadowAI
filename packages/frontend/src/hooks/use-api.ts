import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_CONFIG } from '../lib/api-config';

const API_URL = API_CONFIG.baseURL;

// Cookie onefend_session se envía automáticamente con credentials:'include'
// Ya no se usa localStorage ni Authorization Bearer header
const fetchWithAuth = (url: string, options: RequestInit = {}) =>
    fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

// ============================================
// APPLICATIONS
// ============================================

export function useApplications(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) {
    return useQuery({
        queryKey: ['applications', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.category && params.category !== 'ALL') searchParams.append('category', params.category);
            if (params?.search) searchParams.append('search', params.search);
            if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
            if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

            const res = await fetchWithAuth(`${API_URL}/applications?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch applications');
            const data = await res.json();
            return data; // Return full response including meta
        },
    });
}

export function useCreateApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetchWithAuth(`${API_URL}/applications`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to create application');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });
}

export function useUpdateApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetchWithAuth(`${API_URL}/applications/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to update application');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });
}

export function useDeleteApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/applications/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete application');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });
}

export function useDeleteApplications() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const res = await fetchWithAuth(`${API_URL}/applications/bulk-delete`, {
                method: 'POST',
                body: JSON.stringify({ ids }),
            });
            if (!res.ok) throw new Error('Failed to delete applications');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });
}


// ============================================
// USERS
// ============================================

export function useUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    excludeRole?: string;
    isActive?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) {
    return useQuery({
        queryKey: ['users', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.role && params.role !== 'ALL') searchParams.append('role', params.role);
            if (params?.excludeRole) searchParams.append('excludeRole', params.excludeRole);
            if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
            if (params?.search) searchParams.append('search', params.search);
            if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
            if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

            const res = await fetchWithAuth(`${API_URL}/users?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            return data; // Return full response including meta
        },
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetchWithAuth(`${API_URL}/users`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to create user');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetchWithAuth(`${API_URL}/users/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to update user');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/users/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete user');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useDeleteUsers() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const res = await fetchWithAuth(`${API_URL}/users/bulk-delete`, {
                method: 'POST',
                body: JSON.stringify({ ids }),
            });
            if (!res.ok) throw new Error('Failed to delete users');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// ============================================
// POLICIES
// ============================================

export function usePolicies(params?: {
    page?: number;
    limit?: number;
    applicationId?: string;
    groupId?: string;
    action?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) {
    return useQuery({
        queryKey: ['policies', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.applicationId) searchParams.append('applicationId', params.applicationId);
            if (params?.groupId) searchParams.append('groupId', params.groupId);
            if (params?.action && params.action !== 'ALL') searchParams.append('action', params.action);
            if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
            if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

            const res = await fetchWithAuth(`${API_URL}/policies?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch policies');
            const data = await res.json();
            return data; // Return full response including meta
        },
    });
}

export function useCreatePolicy() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetchWithAuth(`${API_URL}/policies`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to create policy');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
        },
    });
}

export function useUpdatePolicy() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetchWithAuth(`${API_URL}/policies/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to update policy');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
        },
    });
}

export function useDeletePolicy() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/policies/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete policy');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
        },
    });
}

// ============================================
// GROUPS (for future use)
// ============================================

export function useGroups() {
    return useQuery({
        queryKey: ['groups'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/groups`);
            if (!res.ok) throw new Error('Failed to fetch groups');
            const data = await res.json();
            return data.data || data;
        },
    });
}

export function useGroup(id: string) {
    return useQuery({
        queryKey: ['groups', id],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/groups/${id}`);
            if (!res.ok) throw new Error('Failed to fetch group');
            return res.json();
        },
        enabled: !!id,
    });
}

export function useCreateGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetchWithAuth(`${API_URL}/groups`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to create group');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
}

export function useUpdateGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetchWithAuth(`${API_URL}/groups/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to update group');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
}

export function useDeleteGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/groups/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete group');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
}

// Group Members
export function useGroupMembers(groupId: string) {
    return useQuery({
        queryKey: ['group-members', groupId],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/groups/${groupId}/members`);
            if (!res.ok) throw new Error('Failed to fetch group members');
            return res.json();
        },
        enabled: !!groupId,
    });
}

export function useAddGroupMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
            const res = await fetchWithAuth(`${API_URL}/groups/${groupId}/members`, {
                method: 'POST',
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to add member');
            }
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
}

export function useRemoveGroupMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
            const res = await fetchWithAuth(`${API_URL}/groups/${groupId}/members/${userId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to remove member');
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
}

// ============================================
// EVENTS
// ============================================
// ============================================

export function useEvents(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    applicationId?: string;
    action?: string;
    riskLevel?: string;
    platform?: string;
    dataType?: string;
    sensitiveData?: boolean;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) {
    return useQuery({
        queryKey: ['conversation-events', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.userId) searchParams.append('userId', params.userId);
            if (params?.applicationId) searchParams.append('applicationId', params.applicationId);
            if (params?.action && params.action !== 'ALL') searchParams.append('action', params.action);
            if (params?.riskLevel && params.riskLevel !== 'ALL') searchParams.append('riskLevel', params.riskLevel);
            if (params?.platform && params.platform !== 'ALL') searchParams.append('platform', params.platform);
            if (params?.dataType) searchParams.append('dataType', params.dataType);
            if (params?.sensitiveData !== undefined) searchParams.append('sensitiveData', params.sensitiveData.toString());
            if (params?.startDate) searchParams.append('startDate', params.startDate);
            if (params?.endDate) searchParams.append('endDate', params.endDate);
            if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
            if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

            const res = await fetchWithAuth(`${API_URL}/conversation-events?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch events');
            const data = await res.json();
            return data; // Return full response including meta
        },
        staleTime: 1000 * 30, // 30 seconds (events change frequently)
    });
}

// ============================================
// ENROLLMENT TOKENS
// ============================================

export function useEnrollmentTokens(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) {
    return useQuery({
        queryKey: ['enrollment-tokens', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
            if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
            if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

            const res = await fetchWithAuth(`${API_URL}/enrollment-tokens?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch enrollment tokens');
            const data = await res.json();
            return data;
        },
    });
}

export function useCreateEnrollmentToken() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetchWithAuth(`${API_URL}/enrollment-tokens`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to create enrollment token');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollment-tokens'] });
        },
    });
}

export function useDeleteEnrollmentToken() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/enrollment-tokens/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete enrollment token');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollment-tokens'] });
        },
    });
}

// ============================================
// INVITATIONS (Deployment)
// ============================================

export function useInvitations(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}) {
    return useQuery({
        queryKey: ['invitations', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.status) searchParams.append('status', params.status);
            if (params?.search) searchParams.append('search', params.search);

            const res = await fetchWithAuth(`${API_URL}/invitations?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch invitations');
            return res.json();
        },
        refetchInterval: 30000, // Refresh every 30s to update health status
    });
}

export function useDeploymentStats() {
    return useQuery({
        queryKey: ['invitations', 'stats'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/invitations/stats`);
            if (!res.ok) throw new Error('Failed to fetch deployment stats');
            return res.json();
        },
        refetchInterval: 30000,
    });
}

export function useCreateInvitations() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (emails: string[]) => {
            const res = await fetchWithAuth(`${API_URL}/invitations`, {
                method: 'POST',
                body: JSON.stringify({ emails }),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to create invitations');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
        },
    });
}

export function useResendInvitation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/invitations/${id}/resend`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to resend invitation');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
        },
    });
}

export function useRevokeInvitation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/invitations/${id}/revoke`, {
                method: 'PATCH',
            });
            if (!res.ok) throw new Error('Failed to revoke invitation');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
        },
    });
}

// ============================================
// DEVICES
// ============================================

export function useDevicesGrouped(params?: {
    page?: number;
    limit?: number;
    search?: string;
}) {
    return useQuery({
        queryKey: ['devices-grouped', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.search) searchParams.append('search', params.search);

            const res = await fetchWithAuth(`${API_URL}/devices/grouped?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch devices');
            return res.json();
        },
        refetchInterval: 30000,
    });
}

export function useDevices(params?: {
    skip?: number;
    take?: number;
    search?: string;
    isActive?: boolean;
    isRevoked?: boolean;
}) {
    return useQuery({
        queryKey: ['devices', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.skip) searchParams.append('skip', params.skip.toString());
            if (params?.take) searchParams.append('take', params.take.toString());
            if (params?.search) searchParams.append('search', params.search);
            if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
            if (params?.isRevoked !== undefined) searchParams.append('isRevoked', params.isRevoked.toString());

            const res = await fetchWithAuth(`${API_URL}/devices?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch devices');
            const data = await res.json();
            return data;
        },
    });
}

export function useRevokeDevice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/devices/${id}/revoke`, {
                method: 'PATCH',
            });
            if (!res.ok) throw new Error('Failed to revoke device');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
        },
    });
}

export function useDeleteDevice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/devices/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete device');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
        },
    });
}

// ============================================
// ANALYTICS (Conversation Events)
// ============================================

export function useConversationStats(params?: {
    startDate?: Date;
    endDate?: Date;
    platform?: string;
    riskLevel?: string;
    action?: string;
}) {
    return useQuery({
        queryKey: ['conversation-stats', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
            if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
            if (params?.platform) searchParams.append('platform', params.platform);
            if (params?.riskLevel) searchParams.append('riskLevel', params.riskLevel);
            if (params?.action) searchParams.append('action', params.action);

            const res = await fetchWithAuth(`${API_URL}/conversation-events/stats?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch conversation stats');
            return res.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useConversationTrends(params?: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'hour';
}) {
    return useQuery({
        queryKey: ['conversation-trends', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
            if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
            if (params?.groupBy) searchParams.append('groupBy', params.groupBy);

            const res = await fetchWithAuth(`${API_URL}/conversation-events/trends?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch conversation trends');
            return res.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useTopUsers(params?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    platform?: string;
    riskLevel?: string;
    action?: string;
}) {
    return useQuery({
        queryKey: ['top-users', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
            if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.platform) searchParams.append('platform', params.platform);
            if (params?.riskLevel) searchParams.append('riskLevel', params.riskLevel);
            if (params?.action) searchParams.append('action', params.action);

            const res = await fetchWithAuth(`${API_URL}/conversation-events/top-users?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch top users');
            return res.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useTopApps(params?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    platform?: string;
    riskLevel?: string;
    action?: string;
}) {
    return useQuery({
        queryKey: ['top-apps', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
            if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.platform) searchParams.append('platform', params.platform);
            if (params?.riskLevel) searchParams.append('riskLevel', params.riskLevel);
            if (params?.action) searchParams.append('action', params.action);

            const res = await fetchWithAuth(`${API_URL}/conversation-events/top-apps?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch top apps');
            return res.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useTimeline(params?: {
    startDate?: Date;
    endDate?: Date;
    interval?: 'hour' | 'day';
    platform?: string;
    riskLevel?: string;
    action?: string;
}) {
    return useQuery({
        queryKey: ['timeline', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
            if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
            if (params?.interval) searchParams.append('interval', params.interval);
            if (params?.platform) searchParams.append('platform', params.platform);
            if (params?.riskLevel) searchParams.append('riskLevel', params.riskLevel);
            if (params?.action) searchParams.append('action', params.action);

            const res = await fetchWithAuth(`${API_URL}/conversation-events/timeline?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch timeline');
            return res.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================
// DETECTION PATTERNS
// ============================================
//
// Los hooks apuntan al endpoint `/detection-patterns` (modelo DetectionPattern),
// NO al `/patterns` legacy (modelo SensitiveDataPattern). El modelo nuevo
// soporta `regex`, `isBuiltIn`, `caseSensitive`, `multiline` que el UI usa.
//
// El backend tambien aplica el guard de tier sobre este endpoint (solo
// Business+ puede crear/editar custom patterns).

export function usePatterns() {
    return useQuery({
        queryKey: ['patterns'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/detection-patterns`);
            if (!res.ok) throw new Error('Failed to fetch detection patterns');
            // El endpoint devuelve array directo. El UI espera `{ data: [...] }`
            // por compatibilidad con el endpoint legacy; envolvemos aca.
            const arr = await res.json();
            return { data: Array.isArray(arr) ? arr : (arr?.data ?? []) };
        },
    });
}

export function useCreatePattern() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetchWithAuth(`${API_URL}/detection-patterns`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to create detection pattern');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patterns'] });
        },
    });
}

export function useUpdatePattern() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetchWithAuth(`${API_URL}/detection-patterns/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to update detection pattern');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patterns'] });
        },
    });
}

export function useDeletePattern() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/detection-patterns/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete detection pattern');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patterns'] });
        },
    });
}

export function useTestPattern() {
    return useMutation({
        mutationFn: async (data: { regex: string; testString: string; caseSensitive?: boolean; multiline?: boolean }) => {
            const res = await fetchWithAuth(`${API_URL}/detection-patterns/test`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to test regex');
            }
            return res.json();
        },
    });
}

export function useAiAnalysis() {
    return useMutation({
        mutationFn: async (data: { text: string; context?: string }) => {
            const res = await fetchWithAuth(`${API_URL}/ai-analysis`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Analysis failed');
            }
            return res.json();
        },
    });
}

export function usePatternStats(id: string) {
    return useQuery({
        queryKey: ['pattern-stats', id],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/detection-patterns/${id}/stats`);
            if (!res.ok) throw new Error('Failed to fetch pattern stats');
            return res.json();
        },
        enabled: !!id,
    });
}

export function useTopPatterns(params?: { startDate?: Date; endDate?: Date; limit?: number }) {
    return useQuery({
        queryKey: ['top-patterns', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
            if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
            if (params?.limit) searchParams.append('limit', params.limit?.toString() || '5');

            const res = await fetchWithAuth(`${API_URL}/conversation-events/top-patterns?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch top patterns');
            return res.json();
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function useRiskScore(params?: { startDate?: Date; endDate?: Date }) {
    return useQuery({
        queryKey: ['risk-score', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
            if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());

            const res = await fetchWithAuth(`${API_URL}/conversation-events/risk-score?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch risk score');
            return res.json();
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function useExportReport() {
    return useMutation({
        mutationFn: async ({ format, startDate, endDate, platform, riskLevel, action }: {
            format: 'csv' | 'pdf',
            startDate: Date,
            endDate: Date,
            platform?: string,
            riskLevel?: string,
            action?: string
        }) => {
            const searchParams = new URLSearchParams();
            searchParams.append('format', format);
            searchParams.append('startDate', startDate.toISOString());
            searchParams.append('endDate', endDate.toISOString());
            if (platform && platform !== 'ALL') searchParams.append('platform', platform);
            if (riskLevel && riskLevel !== 'ALL') searchParams.append('riskLevel', riskLevel);
            if (action && action !== 'ALL') searchParams.append('action', action);

            const res = await fetchWithAuth(`${API_URL}/reports/export?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to export report');

            // Return blob
            return res.blob();
        }
    });
}

export function useAlerts() {
    return useQuery({
        queryKey: ['alerts'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/alerts`);
            if (!res.ok) throw new Error('Failed to fetch alerts');
            return res.json();
        }
    });
}

export function useCreateAlert() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetchWithAuth(`${API_URL}/alerts`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create alert');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    });
}

export function useDeleteAlert() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/alerts/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete alert');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    });
}

// ============================================
// SYSTEM AUDIT LOGS
// ============================================

export function useAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
}) {
    return useQuery({
        queryKey: ['audit-logs', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.append('page', params.page.toString());
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.action) searchParams.append('action', params.action);
            if (params?.userId) searchParams.append('userId', params.userId);
            if (params?.resourceType) searchParams.append('resourceType', params.resourceType);
            if (params?.startDate) searchParams.append('startDate', params.startDate);
            if (params?.endDate) searchParams.append('endDate', params.endDate);

            const res = await fetchWithAuth(`${API_URL}/system-audit?${searchParams.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch audit logs');
            return res.json();
        },
        staleTime: 1000 * 30, // 30 seconds
    });
}

export function useAuditActions() {
    return useQuery({
        queryKey: ['audit-actions'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/system-audit/actions`);
            if (!res.ok) throw new Error('Failed to fetch audit actions');
            return res.json();
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

export function useAuditResourceTypes() {
    return useQuery({
        queryKey: ['audit-resource-types'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/system-audit/resource-types`);
            if (!res.ok) throw new Error('Failed to fetch audit resource types');
            return res.json();
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

// ============================================
// ORGANIZATION
// ============================================

export function useOrganization() {
    return useQuery({
        queryKey: ['organization'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/organizations/me`);
            if (!res.ok) throw new Error('Failed to fetch organization');
            return res.json();
        },
    });
}

export function useUpdateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetchWithAuth(`${API_URL}/organizations/me`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to update organization');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization'] });
        },
    });
}

// ============================================
// REPORT SCHEDULES
// ============================================

export function useReportSchedules() {
    return useQuery({
        queryKey: ['report-schedules'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/reports/schedules`);
            if (!res.ok) throw new Error('Failed to fetch schedules');
            return res.json();
        },
    });
}

export function useCreateReportSchedule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { frequency: string; recipients: string[]; runTime?: string }) => {
            const res = await fetchWithAuth(`${API_URL}/reports/schedules`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to create schedule');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
        },
    });
}

export function useDeleteReportSchedule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/reports/schedules/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to delete schedule');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
        },
    });
}

// ============================================
// EXCLUDED DOMAINS
// ============================================

export function useExcludedDomains() {
    return useQuery({
        queryKey: ['excluded-domains'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/excluded-domains`);
            if (!res.ok) throw new Error('Failed to fetch excluded domains');
            return res.json();
        },
    });
}

export function useCreateExcludedDomain() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { domain: string; reason?: string }) => {
            const res = await fetchWithAuth(`${API_URL}/excluded-domains`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to add excluded domain');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['excluded-domains'] });
        },
    });
}

export function useDeleteExcludedDomain() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/excluded-domains/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete excluded domain');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['excluded-domains'] });
        },
    });
}
