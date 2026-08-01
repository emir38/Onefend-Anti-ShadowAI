// API Configuration
// Always use a relative path so that calls are same-origin.
// This is critical because SameSite=Lax blocks Set-Cookie on cross-origin POSTs.
// The Load Balancer routes /api/v1/* to the backend from any subdomain.

export const API_CONFIG = {
    baseURL: '/api/v1',
} as const;

export const getApiUrl = () => API_CONFIG.baseURL;
