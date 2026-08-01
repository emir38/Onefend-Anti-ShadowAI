/**
 * Configuration constants for the extension
 */

// API Configuration
// Use VITE_API_BASE_URL env var if available (injected at build time), otherwise use production backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Sync intervals (in milliseconds)
// Sync intervals (in milliseconds)
export const CONFIG_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
export const EVENT_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const TOKEN_RENEWAL_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

// Event batching
export const MAX_EVENT_BATCH_SIZE = 50;
export const MAX_EVENT_QUEUE_SIZE = 500;

// Token expiration buffer (renew if expiring in less than 7 days)
export const TOKEN_RENEWAL_BUFFER = 7 * 24 * 60 * 60 * 1000; // 7 days

// Extension metadata
export const EXTENSION_VERSION = '1.0.5';

// Storage keys
export const STORAGE_KEYS = {
    AUTH: 'auth',
    CONFIG: 'config',
    EVENT_QUEUE: 'eventQueue',
    LAST_EVENT_SYNC: 'lastEventSync',
    PLATFORM_CONFIGS: 'platformConfigs',
    SENSITIVE_PATTERNS: 'sensitivePatterns',
} as const;

// Alarm names
export const ALARMS = {
    SYNC_CONFIG: 'sync-config',
    SYNC_EVENTS: 'sync-events',
    RENEW_TOKEN: 'renew-token',
} as const;

// Default policy action for unknown domains
export const DEFAULT_UNKNOWN_ACTION = 'ALLOW';

// Overlay z-index (ensure it's above most page content)
// Overlay z-index (ensure it's above most page content)
export const OVERLAY_Z_INDEX = 2147483647;

// Timeouts
export const TIMEOUTS = {
    AI_REQUEST: 30000, // 30s
    REGEX_DEBOUNCE: 300,
    AI_DEBOUNCE: 3000,
} as const;
