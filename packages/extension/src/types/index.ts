/**
 * Types for the Onefend extension
 */

// ============================================================================
// API Types (matching backend)
// ============================================================================

export type PolicyAction = 'ALLOW' | 'WARN' | 'SOFT_BLOCK' | 'BLOCK';
export type UserRole = 'ADMIN' | 'ITADMIN' | 'VIEWER';
export type EventAction = 'VISIT' | 'BLOCKED' | 'WARNED' | 'ALLOWED';

export interface Application {
    id: string;
    domain: string;
    name: string;
    category: string;
    riskScore: number;
    action: PolicyAction;
}

export interface Policy {
    id: string;
    applicationId: string;
    domain: string;
    action: PolicyAction;
    priority: number;
    groupId: string | null;
}

export interface ExtensionConfig {
    applications: Application[];
    policies: Policy[];
    patterns: SensitiveDataPattern[];
    defaultAction: PolicyAction;
    syncInterval: number;
    excludedDomains: string[];
    tenantSettings: Record<string, unknown>;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface StoredAuth {
    token: string;
    deviceId: string;
    userId: string;
    enrollmentToken?: string;
    identifier?: string;
}

export interface StoredConfig {
    config: ExtensionConfig;
    lastSync: number;
}

export interface DeviceInfo {
    browser: string;
    version: string;
    os: string;
    extensionVersion: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface RegisterDeviceRequest {
    enrollmentToken: string;
    identifier: string;
    deviceType?: 'EXTENSION' | 'DESKTOP_AGENT';
    deviceInfo: DeviceInfo;
}

export interface RegisterDeviceResponse {
    success: boolean;
    token: string;
    deviceId: string;
    userId: string;
}

export interface EventPayload {
    userId: string;
    applicationId: string | null;
    domain: string;
    action: EventAction;
    metadata?: Record<string, unknown>;
}

export interface RenewTokenResponse {
    renewed: boolean;
    token?: string;
    message: string;
}

// ============================================================================
// Extension Message Types (for internal communication)
// ============================================================================

export type MessageType =
    | 'CHECK_DOMAIN'
    | 'LOG_EVENT'
    | 'GET_CONFIG'
    | 'SYNC_CONFIG'
    | 'GET_AUTH_STATUS'
    | 'IDENTIFY_PLATFORM'
    | 'ANALYZE_TEXT';

export interface ExtensionMessage<T = unknown> {
    type: MessageType;
    payload?: T;
}

export interface CheckDomainRequest {
    domain: string;
    url: string;
}

export interface CheckDomainResponse {
    action: PolicyAction;
    application?: Partial<Application>;
    policy?: Policy;
}

// ============================================================================
// Core Logic Types
// ============================================================================

export interface PlatformConfig {
    id: string;
    name: string;
    domains: string[];
    category: string;
    selectors: Record<string, string[]>;
    features: Record<string, boolean>;
    isOfficial: boolean;
    networkInterception?: {
        endpoints: string[];
        bodyParser: 'json' | 'text';
    };
}

export interface SensitiveDataPattern {
    id: string;
    name: string;
    category: string;
    regex: string;
    severity: string;
    action: string;
    defaultAction?: string; // Legacy fallback
    description?: string;
    isBuiltIn?: boolean;
    caseSensitive?: boolean;
    multiline?: boolean;
}

export interface ActivePatternsResponse {
    patterns: SensitiveDataPattern[];
}

export interface ActiveConfigsResponse {
    configs: PlatformConfig[];
}

// ============================================================================
// Chrome Storage Schema
// ============================================================================

export interface ChromeStorage {
    auth?: StoredAuth;
    config?: StoredConfig;
    eventQueue?: EventPayload[];
    event_queue?: { events: QueuedEvent[] }; // For EventQueueService
    lastEventSync?: number;
    platformConfigs?: StoredPlatformConfigs;
    sensitivePatterns?: StoredSensitivePatterns;
}

export interface QueuedEvent {
    id: string;
    payload: ConversationEventPayload;
    timestamp: number;
    retryCount: number;
}

export interface ConversationEventPayload {
    platform: string;
    url: string;
    conversationId?: string;
    messageCount?: number;
    sensitiveDataDetected: boolean;
    dataTypes?: string[];
    riskLevel?: string;
    action: string;
    userOverride?: boolean;
    justification?: string;
    patternMatches?: any[];
    analysisSource: 'LOCAL_REGEX' | 'AWS_COMPREHEND';
    confidence?: number;
}

export interface StoredPlatformConfigs {
    configs: PlatformConfig[];
    lastSync: number;
}

export interface StoredSensitivePatterns {
    patterns: SensitiveDataPattern[];
    lastSync: number;
}

export interface AiAnalysisResult {
    category: string;
    riskLevel: string;
    confidenceScore: number;
    summary: string;
    isCached?: boolean;
    redactedText?: string;
    dlpTriggered?: boolean;
    originalRisk?: string;
    recommendation?: 'CONFIRM_REDACTION' | 'WARN_CONTEXT' | 'BLOCK' | 'ALLOW' | 'NONE';
    multimodal?: {
        hasImages: boolean;
        hasDocuments: boolean;
        imageCount: number;
        documentCount: number;
    };
    debug?: {
        dlpEnabled: boolean;
        dlpCalled: boolean;
        dlpRedacted: boolean;
        aiCalled: boolean;
        timings: {
            dlpMs?: number;
            dlpImageMs?: number;
            aiMs?: number;
            totalMs: number;
        };
    };
}
