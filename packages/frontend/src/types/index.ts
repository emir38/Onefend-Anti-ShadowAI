export interface User {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
}

export interface Integration {
    id: string;
    name: string;
    type: 'WEBHOOK' | 'SYSLOG' | 'SIEM' | 'DLP';
    config: any;
    webhookUrl?: string; // Legacy
    webhookEvents?: any;
    isActive: boolean;
    lastSyncAt?: string;
    createdAt: string;
    updatedAt: string;
}
