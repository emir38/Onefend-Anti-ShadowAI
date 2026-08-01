/**
 * Utility functions for the extension
 */

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return '';
    }
}

/**
 * Check if URL is a web URL (http/https)
 */
export function isWebUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Get browser info
 */
export function getBrowserInfo(): { browser: string; version: string } {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Edg/')) {
        const match = userAgent.match(/Edg\/([\d.]+)/);
        return { browser: 'Edge', version: match ? match[1] : 'unknown' };
    } else if (userAgent.includes('Chrome/')) {
        const match = userAgent.match(/Chrome\/([\d.]+)/);
        return { browser: 'Chrome', version: match ? match[1] : 'unknown' };
    } else if (userAgent.includes('Firefox/')) {
        const match = userAgent.match(/Firefox\/([\d.]+)/);
        return { browser: 'Firefox', version: match ? match[1] : 'unknown' };
    }

    return { browser: 'Unknown', version: 'unknown' };
}

/**
 * Get OS info
 */
export function getOSInfo(): string {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Win')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';

    return 'Unknown';
}

/**
 * Decode JWT payload (without verification)
 */
export function decodeJWT(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Check if JWT is expired or expiring soon
 */
export function isTokenExpiringSoon(token: string, bufferMs: number): boolean {
    const payload = decodeJWT(token);
    if (!payload || typeof payload.exp !== 'number') return true;

    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();

    return expirationTime - now < bufferMs;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, i);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Sanitize domain for storage key
 */
export function sanitizeDomain(domain: string): string {
    return domain.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
}

/**
 * Format timestamp for logging
 */
export function formatTimestamp(date: Date = new Date()): string {
    return date.toISOString();
}

/**
 * Generate unique ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
