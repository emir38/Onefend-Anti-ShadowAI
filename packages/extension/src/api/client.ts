/**
 * API client for communicating with the backend
 */

import type {
    RegisterDeviceRequest,
    RegisterDeviceResponse,
    ExtensionConfig,
    EventPayload,
    RenewTokenResponse,
    ActivePatternsResponse,
    ActiveConfigsResponse,
    AiAnalysisResult,
} from '@/types';
import { API_BASE_URL } from '@/config/constants';
import { getAuthToken } from '@/utils/storage';

/**
 * Custom API Error with status code
 */
export class ApiError extends Error {
    constructor(public message: string, public status: number) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            cache: 'no-store', // Prevent browser caching
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new ApiError(error.message || `HTTP ${response.status}: ${response.statusText}`, response.status);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

/**
 * Authenticated fetch wrapper
 */
async function authenticatedFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();

    if (!token) {
        throw new Error('No authentication token found');
    }

    return apiFetch<T>(endpoint, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Register device with enrollment token
 */
export async function registerDevice(
    data: RegisterDeviceRequest
): Promise<RegisterDeviceResponse> {
    return apiFetch<RegisterDeviceResponse>('/devices/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Get configuration (policies + applications)
 */
export async function getConfig(): Promise<ExtensionConfig> {
    return authenticatedFetch<ExtensionConfig>('/config');
}

/**
 * Get active sensitive data patterns
 */
export async function getSensitivePatterns(): Promise<ActivePatternsResponse> {
    return authenticatedFetch<ActivePatternsResponse>('/patterns/active');
}

/**
 * Get active platform configurations
 */
export async function getPlatformConfigs(): Promise<ActiveConfigsResponse> {
    return authenticatedFetch<ActiveConfigsResponse>('/platform-configs/active');
}

/**
 * Send events to backend
 */
export async function sendEvents(events: EventPayload[]): Promise<void> {
    await authenticatedFetch<void>('/events', {
        method: 'POST',
        body: JSON.stringify({ events }),
    });
}

/**
 * Renew device token
 */
export async function renewToken(): Promise<RenewTokenResponse> {
    return authenticatedFetch<RenewTokenResponse>('/auth/renew-token', {
        method: 'POST',
    });
}

/**
 * Discover unknown domain
 */
export async function discoverDomain(domain: string): Promise<void> {
    await authenticatedFetch<void>('/domain-discovery', {
        method: 'POST',
        body: JSON.stringify({ domain }),
    });
}

/**
 * Analyze text with AI
 */
export async function aiAnalyze(
    text: string,
    context?: string,
    images?: Array<{ mimeType: string; data: string }>,
    documents?: Array<{ mimeType: string; data: string; filename?: string }>
): Promise<AiAnalysisResult> {
    return authenticatedFetch('/ai-analysis', {
        method: 'POST',
        body: JSON.stringify({ text, context, images, documents }),
    });
}
