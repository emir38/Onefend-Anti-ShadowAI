import { apiClient } from './api-client';

export interface Application {
    id: string;
    domain: string;
    name: string;
    category: string;
    riskScore: number;
    isKnown: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateApplicationDto {
    domain: string;
    name: string;
    category: string;
    riskScore: number;
    isKnown?: boolean;
}

export interface UpdateApplicationDto {
    name?: string;
    category?: string;
    riskScore?: number;
    isKnown?: boolean;
}

export const applicationsApi = {
    getAll: async (): Promise<Application[]> => {
        const response = await apiClient.get<Application[]>('/applications');
        return response.data;
    },

    getById: async (id: string): Promise<Application> => {
        const response = await apiClient.get<Application>(`/applications/${id}`);
        return response.data;
    },

    create: async (data: CreateApplicationDto): Promise<Application> => {
        const response = await apiClient.post<Application>('/applications', data);
        return response.data;
    },

    update: async (id: string, data: UpdateApplicationDto): Promise<Application> => {
        const response = await apiClient.patch<Application>(`/applications/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/applications/${id}`);
    },
};

export interface Policy {
    id: string;
    groupId: string;
    applicationId: string;
    action: 'ALLOW' | 'WARN' | 'SOFT_BLOCK' | 'BLOCK';
    priority: number;
    createdAt: string;
    updatedAt: string;
    group?: {
        id: string;
        name: string;
    };
    application?: {
        id: string;
        name: string;
        domain: string;
    };
}

export interface CreatePolicyDto {
    groupId: string;
    applicationId: string;
    action: 'ALLOW' | 'WARN' | 'SOFT_BLOCK' | 'BLOCK';
    priority?: number;
}

export interface UpdatePolicyDto {
    action?: 'ALLOW' | 'WARN' | 'SOFT_BLOCK' | 'BLOCK';
    priority?: number;
}

export const policiesApi = {
    getAll: async (): Promise<Policy[]> => {
        const response = await apiClient.get<Policy[]>('/policies');
        return response.data;
    },

    getById: async (id: string): Promise<Policy> => {
        const response = await apiClient.get<Policy>(`/policies/${id}`);
        return response.data;
    },

    create: async (data: CreatePolicyDto): Promise<Policy> => {
        const response = await apiClient.post<Policy>('/policies', data);
        return response.data;
    },

    update: async (id: string, data: UpdatePolicyDto): Promise<Policy> => {
        const response = await apiClient.patch<Policy>(`/policies/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/policies/${id}`);
    },
};

export interface Group {
    id: string;
    name: string;
    description?: string;
}

export const groupsApi = {
    getAll: async (): Promise<Group[]> => {
        const response = await apiClient.get<Group[]>('/groups');
        return response.data;
    },
};
