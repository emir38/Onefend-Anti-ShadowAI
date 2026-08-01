import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_CONFIG } from '../lib/api-config';

const API_URL = API_CONFIG.baseURL;

/**
 * Helper que garantiza Content-Type: application/json en todos los requests.
 * Sin este header NestJS no parsea el body como JSON y los campos llegan como
 * undefined al DTO, generando errores tipo "name must be a string".
 */
const fetchWithAuth = (url: string, options: RequestInit = {}) =>
    fetch(url, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
    });

export function useIntegrations() {
    return useQuery({
        queryKey: ['integrations'],
        queryFn: async () => {
            const res = await fetchWithAuth(`${API_URL}/integrations`);
            if (!res.ok) throw new Error('Failed to fetch integrations');
            return res.json();
        },
    });
}

export function useCreateIntegration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetchWithAuth(`${API_URL}/integrations`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                // El backend puede devolver message como string o array (ValidationPipe).
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to create integration');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
        },
    });
}

export function useUpdateIntegration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetchWithAuth(`${API_URL}/integrations/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                const msg = Array.isArray(error.message) ? error.message.join(', ') : error.message;
                throw new Error(msg || 'Failed to update integration');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
        },
    });
}

export function useDeleteIntegration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchWithAuth(`${API_URL}/integrations/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete integration');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
        },
    });
}
