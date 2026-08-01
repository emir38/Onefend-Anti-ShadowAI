import axios from 'axios';
import { API_CONFIG } from './api-config';

const API_BASE_URL = API_CONFIG.baseURL;

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // enviar cookie SSO en cada request
});

/**
 * Interceptor de respuestas:
 * - NO redirigir en 401 — el middleware maneja la protección server-side.
 * - Solo propagar el error para que el caller lo maneje.
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token?: string;
    mustChangePassword?: boolean;
    user?: {
        id: string;
        email: string;
        role: string;
        isMfaEnabled?: boolean;
    };
    requiresMfa?: boolean;
    tempToken?: string;
    isSetupRequired?: boolean;
}

export const authApi = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
        return response.data;
    },
    verifyMfa: async (data: { tempToken: string; code: string }): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>('/auth/mfa/verify-login', data);
        return response.data;
    },
    generateMfaSecret: async (token?: string): Promise<{ secret: string; qrCode: string }> => {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await apiClient.post('/auth/mfa/generate', {}, { headers });
        return response.data;
    },
    enableMfa: async (data: { code: string }, token?: string): Promise<{ success: boolean }> => {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await apiClient.post('/auth/mfa/enable', data, { headers });
        return response.data;
    },
    setupCompleteMfa: async (data: { tempToken: string; code: string }): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>('/auth/mfa/setup-complete', data);
        return response.data;
    },
    disableMfa: async (): Promise<{ success: boolean }> => {
        const response = await apiClient.post('/auth/mfa/disable', {});
        return response.data;
    },
    forgotPassword: async (data: { email: string }): Promise<{ message: string }> => {
        const response = await apiClient.post('/auth/forgot-password', data);
        return response.data;
    },
    resetPassword: async (data: { token: string; newPassword: string }): Promise<{ message: string }> => {
        const response = await apiClient.post('/auth/reset-password', data);
        return response.data;
    },
    changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<{ message: string }> => {
        const response = await apiClient.post('/auth/change-password', data);
        return response.data;
    },
    logout: async (): Promise<void> => {
        await apiClient.post('/auth/logout', {});
    },
    validateSession: async (): Promise<{ user: LoginResponse['user'] } | null> => {
        try {
            const response = await apiClient.get<{
                valid: boolean;
                userId: string;
                role: string;
                email: string;
                isMfaEnabled: boolean;
            }>('/auth/validate-cookie');
            const d = response.data;
            return {
                user: {
                    id: d.userId,
                    email: d.email,
                    role: d.role,
                    isMfaEnabled: d.isMfaEnabled,
                },
            };
        } catch {
            // Sin sesión activa — retornar null sin redirigir
            return null;
        }
    },
};

export const userApi = {
    exportData: async (userId: string): Promise<any> => {
        const response = await apiClient.get(`/users/${userId}/data-export`);
        return response.data;
    }
};
