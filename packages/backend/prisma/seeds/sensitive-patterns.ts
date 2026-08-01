import { PrismaClient, DataCategory, RiskLevel, PolicyAction } from '@prisma/client';

interface PatternDefinition {
    name: string;
    category: DataCategory;
    pattern: string;
    description: string;
    severity: RiskLevel;
    defaultAction: PolicyAction;
    allowOverride: boolean;
    requireJustification: boolean;
    caseSensitive?: boolean;
}

export const SENSITIVE_PATTERNS: PatternDefinition[] = [
    // ========== CLOUD & DEVOPS ==========
    {
        name: 'AWS Access Key ID',
        category: 'CREDENTIALS',
        pattern: '(AKIA|ASIA)[0-9A-Z]{16}',
        description: 'AWS Access Key ID (AKIA for long-term, ASIA for temporary credentials)',
        severity: 'CRITICAL',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'AWS Secret Access Key',
        category: 'CREDENTIALS',
        pattern: '\\b[A-Za-z0-9/+=]{40}\\b',
        description: 'AWS Secret Access Key (40 characters base64)',
        severity: 'CRITICAL',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'GCP API Key',
        category: 'CREDENTIALS',
        pattern: 'AIza[0-9A-Za-z\\-_]{35}',
        description: 'Google Cloud Platform API Key',
        severity: 'CRITICAL',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'GCP OAuth Token',
        category: 'CREDENTIALS',
        pattern: 'ya29\\.[0-9A-Za-z\\-_]+',
        description: 'Google Cloud Platform OAuth Access Token',
        severity: 'CRITICAL',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'Azure Storage Account Key',
        category: 'CREDENTIALS',
        pattern: 'AccountKey=([0-9a-zA-Z+/=]{88})',
        description: 'Azure Storage Account Connection String Key',
        severity: 'CRITICAL',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'GitHub Personal Access Token',
        category: 'CREDENTIALS',
        pattern: 'ghp_[0-9a-zA-Z]{36}',
        description: 'GitHub Personal Access Token',
        severity: 'HIGH',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'GitLab Personal Access Token',
        category: 'CREDENTIALS',
        pattern: 'glpat-[0-9a-zA-Z\\-_]{20}',
        description: 'GitLab Personal Access Token',
        severity: 'HIGH',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'Stripe Live API Key',
        category: 'CREDENTIALS',
        pattern: 'sk_live_[0-9a-zA-Z]{24,}',
        description: 'Stripe Live Secret Key',
        severity: 'CRITICAL',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'Stripe Publishable Key',
        category: 'CREDENTIALS',
        pattern: 'pk_live_[0-9a-zA-Z]{24,}',
        description: 'Stripe Live Publishable Key',
        severity: 'MEDIUM',
        defaultAction: 'WARN',
        allowOverride: true,
        requireJustification: false,
    },
    {
        name: 'Slack Bot Token',
        category: 'CREDENTIALS',
        pattern: 'xoxb-[0-9]{11,}-[0-9]{11,}-[0-9a-zA-Z]{24,}',
        description: 'Slack Bot User OAuth Token',
        severity: 'HIGH',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'Slack Webhook URL',
        category: 'CREDENTIALS',
        pattern: 'https://hooks\\.slack\\.com/services/T[0-9A-Z]+/B[0-9A-Z]+/[0-9a-zA-Z]{24}',
        description: 'Slack Incoming Webhook URL',
        severity: 'MEDIUM',
        defaultAction: 'WARN',
        allowOverride: true,
        requireJustification: false,
    },
    {
        name: 'NPM Token',
        category: 'CREDENTIALS',
        pattern: 'npm_[0-9a-zA-Z]{36}',
        description: 'NPM Authentication Token',
        severity: 'HIGH',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'Heroku API Key',
        category: 'CREDENTIALS',
        pattern: '\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b',
        description: 'Heroku API Key (UUID format)',
        severity: 'HIGH',
        defaultAction: 'WARN',
        allowOverride: true,
        requireJustification: false,
    },
    {
        name: 'Azure CosmosDB Key',
        category: 'CREDENTIALS',
        pattern: 'AccountEndpoint=https://[^;]+;AccountKey=([0-9a-zA-Z+/=]{88})',
        description: 'Azure CosmosDB Connection String with Key',
        severity: 'CRITICAL',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'Discord Bot Token',
        category: 'CREDENTIALS',
        pattern: '(mfa\.[a-z0-9_-]{20,})|([a-z0-9_-]{23,28}\.[a-z0-9_-]{6,7}\.[a-z0-9_-]{27})',
        description: 'Discord Bot Token',
        severity: 'HIGH',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'Discord Webhook URL',
        category: 'CREDENTIALS',
        pattern: 'https://discord\\.com/api/webhooks/[0-9]{17,19}/[A-Za-z0-9_-]{68}',
        description: 'Discord Webhook URL',
        severity: 'MEDIUM',
        defaultAction: 'WARN',
        allowOverride: true,
        requireJustification: false,
    },
    {
        name: 'Microsoft Teams Webhook',
        category: 'CREDENTIALS',
        pattern: 'https://[a-z0-9]+\\.webhook\\.office\\.com/webhookb2/[a-z0-9-]+@[a-z0-9-]+/IncomingWebhook/[a-z0-9]+/[a-z0-9-]+',
        description: 'Microsoft Teams Incoming Webhook URL',
        severity: 'MEDIUM',
        defaultAction: 'WARN',
        allowOverride: true,
        requireJustification: false,
    },

    // ========== CREDENTIALS & AUTHENTICATION ==========
    {
        name: 'RSA Private Key',
        category: 'CREDENTIALS',
        pattern: '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
        description: 'RSA, EC, or OpenSSH Private Key Header',
        severity: 'CRITICAL',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    {
        name: 'PGP Private Key',
        category: 'CREDENTIALS',
        pattern: '-----BEGIN PGP PRIVATE KEY BLOCK-----',
        description: 'PGP Private Key Block',
        severity: 'CRITICAL',
        defaultAction: 'BLOCK',
        allowOverride: false,
        requireJustification: false,
    },
    // Generic Auth (JWT, Bearer, DB Strings) removed to avoid noise. Handled by AI.

    // ========== NETWORK INFRASTRUCTURE - REMOVED (High Noise) ==========


    // ========== FINANCIAL DATA - REMOVED (Use Custom Rules or AI) ==========
    /*
    Financial patterns (CC, IBAN, CBU, Crypto) removed to prevent false positives in default profile.
    */

    // ========== PII / GOV IDs - REMOVED (Use Custom Rules or AI) ==========
    /*
    Government IDs (SSN, Passport, Tax IDs) removed to prevent false positives.
    */

    // ========== DOCUMENT CLASSIFICATION - REMOVED (Handled by AI) ==========
    /*
    Removed to reduce false positives. AI Context Analysis handles these better.
    */
];

export async function seedSensitivePatterns(prisma: PrismaClient) {
    console.log('🔐 Seeding sensitive data patterns...');

    // Delete existing patterns (except custom ones)
    await prisma.sensitiveDataPattern.deleteMany({
        where: {
            // Only delete if name matches our predefined patterns
            name: {
                in: SENSITIVE_PATTERNS.map(p => p.name),
            },
        },
    });

    // Create all patterns
    let createdCount = 0;
    for (const pattern of SENSITIVE_PATTERNS) {
        await prisma.sensitiveDataPattern.create({
            data: {
                ...pattern,
                enabled: true,
            } as any, // Type cast for global patterns (tenantId = null)
        });
        createdCount++;
    }

    console.log(`✅ ${createdCount} sensitive data patterns seeded`);
    console.log(`   - CRITICAL: ${SENSITIVE_PATTERNS.filter(p => p.severity === 'CRITICAL').length}`);
    console.log(`   - HIGH: ${SENSITIVE_PATTERNS.filter(p => p.severity === 'HIGH').length}`);
    console.log(`   - MEDIUM: ${SENSITIVE_PATTERNS.filter(p => p.severity === 'MEDIUM').length}`);
    console.log(`   - LOW: ${SENSITIVE_PATTERNS.filter(p => p.severity === 'LOW').length}`);
}
