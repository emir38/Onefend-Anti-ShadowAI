import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '../lib/api-config';

const API_URL = API_CONFIG.baseURL;

const fetchWithAuth = (url: string, options: RequestInit = {}) =>
    fetch(url, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });

// ============================================
// DASHBOARD ANALYTICS
// ============================================

export function useAnalyticsHeatmap() {
    return useQuery({
        queryKey: ['analytics-heatmap'],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/analytics/heatmap`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch heatmap');
            return res.json();
        },
    });
}

export function useAnalyticsRiskUsers() {
    return useQuery({
        queryKey: ['analytics-risk-users'],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/analytics/users/risk`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch risk users');
            return res.json();
        },
    });
}

export function useAnalyticsHeroes() {
    return useQuery({
        queryKey: ['analytics-heroes'],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/analytics/users/heroes`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch heroes');
            return res.json();
        },
    });
}
