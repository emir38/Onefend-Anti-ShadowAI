import { PrismaClient, RiskLevel, PolicyAction } from '@prisma/client';

/**
 * Default Detection Patterns - Auto-seeded for every new tenant
 * These patterns detect common credentials and secrets
 */
export const DEFAULT_DETECTION_PATTERNS = [
    {
        name: 'AWS Access Key ID',
        category: 'CREDENTIALS',
        pattern: '(AKIA|ASIA)[0-9A-Z]{16}',
        description: 'AWS Access Key ID (AKIA for long-term, ASIA for temporary credentials)',
        severity: 'CRITICAL' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'AWS Secret Access Key',
        category: 'CREDENTIALS',
        pattern: '\\b[A-Za-z0-9/+=]{40}\\b',
        description: 'AWS Secret Access Key (40 characters base64)',
        severity: 'CRITICAL' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'GCP API Key',
        category: 'CREDENTIALS',
        pattern: 'AIza[0-9A-Za-z\\-_]{35}',
        description: 'Google Cloud Platform API Key',
        severity: 'CRITICAL' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'GCP OAuth Token',
        category: 'CREDENTIALS',
        pattern: 'ya29\\.[0-9A-Za-z\\-_]+',
        description: 'Google Cloud Platform OAuth Access Token',
        severity: 'CRITICAL' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'Azure Storage Account Key',
        category: 'CREDENTIALS',
        pattern: 'AccountKey=([0-9a-zA-Z+/=]{88})',
        description: 'Azure Storage Account Connection String Key',
        severity: 'CRITICAL' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'GitHub Personal Access Token',
        category: 'CREDENTIALS',
        pattern: 'ghp_[0-9a-zA-Z]{36}',
        description: 'GitHub Personal Access Token',
        severity: 'HIGH' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'GitLab Personal Access Token',
        category: 'CREDENTIALS',
        pattern: 'glpat-[0-9a-zA-Z\\-_]{20}',
        description: 'GitLab Personal Access Token',
        severity: 'HIGH' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'Stripe Live API Key',
        category: 'CREDENTIALS',
        pattern: 'sk_live_[0-9a-zA-Z]{24,}',
        description: 'Stripe Live Secret Key',
        severity: 'CRITICAL' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'Stripe Publishable Key',
        category: 'CREDENTIALS',
        pattern: 'pk_live_[0-9a-zA-Z]{24,}',
        description: 'Stripe Live Publishable Key',
        severity: 'MEDIUM' as RiskLevel,
        defaultAction: 'WARN' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'Slack Bot Token',
        category: 'CREDENTIALS',
        pattern: 'xoxb-[0-9]{11,}-[0-9]{11,}-[0-9a-zA-Z]{24,}',
        description: 'Slack Bot User OAuth Token',
        severity: 'HIGH' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'Slack Webhook URL',
        category: 'CREDENTIALS',
        pattern: 'https://hooks\\.slack\\.com/services/T[0-9A-Z]+/B[0-9A-Z]+/[0-9a-zA-Z]{24}',
        description: 'Slack Incoming Webhook URL',
        severity: 'MEDIUM' as RiskLevel,
        defaultAction: 'WARN' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'NPM Token',
        category: 'CREDENTIALS',
        pattern: 'npm_[0-9a-zA-Z]{36}',
        description: 'NPM Authentication Token',
        severity: 'HIGH' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'Heroku API Key',
        category: 'CREDENTIALS',
        pattern: '\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b',
        description: 'Heroku API Key (UUID format)',
        severity: 'HIGH' as RiskLevel,
        defaultAction: 'WARN' as PolicyAction,
        caseSensitive: false
    },
    {
        name: 'Azure CosmosDB Key',
        category: 'CREDENTIALS',
        pattern: 'AccountEndpoint=https://[^;]+;AccountKey=([0-9a-zA-Z+/=]{88})',
        description: 'Azure CosmosDB Connection String with Key',
        severity: 'CRITICAL' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'Discord Bot Token',
        category: 'CREDENTIALS',
        pattern: '(mfa\\.[a-z0-9_-]{20,})|([a-z0-9_-]{23,28}\\.[a-z0-9_-]{6,7}\\.[a-z0-9_-]{27})',
        description: 'Discord Bot Token',
        severity: 'HIGH' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: false
    },
    {
        name: 'Discord Webhook URL',
        category: 'CREDENTIALS',
        pattern: 'https://discord\\.com/api/webhooks/[0-9]{17,19}/[A-Za-z0-9_-]{68}',
        description: 'Discord Webhook URL',
        severity: 'MEDIUM' as RiskLevel,
        defaultAction: 'WARN' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'Microsoft Teams Webhook',
        category: 'CREDENTIALS',
        pattern: 'https://[a-z0-9]+\\.webhook\\.office\\.com/webhookb2/[a-z0-9-]+@[a-z0-9-]+/IncomingWebhook/[a-z0-9]+/[a-z0-9-]+',
        description: 'Microsoft Teams Incoming Webhook URL',
        severity: 'MEDIUM' as RiskLevel,
        defaultAction: 'WARN' as PolicyAction,
        caseSensitive: false
    },
    {
        name: 'RSA Private Key',
        category: 'CREDENTIALS',
        pattern: '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
        description: 'RSA, EC, or OpenSSH Private Key Header',
        severity: 'CRITICAL' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    },
    {
        name: 'PGP Private Key',
        category: 'CREDENTIALS',
        pattern: '-----BEGIN PGP PRIVATE KEY BLOCK-----',
        description: 'PGP Private Key Block',
        severity: 'CRITICAL' as RiskLevel,
        defaultAction: 'BLOCK' as PolicyAction,
        caseSensitive: true
    }
];

/**
 * Seeds default detection patterns for the instance
 * This should be called automatically during initial setup
 *
 * @param prisma - Prisma client instance
 * @returns Number of patterns created
 */
export async function seedDefaultPatternsForTenant(
    prisma: PrismaClient,
): Promise<number> {
    let created = 0;

    for (const pattern of DEFAULT_DETECTION_PATTERNS) {
        // Check if pattern already exists
        const existing = await prisma.sensitiveDataPattern.findFirst({
            where: {
                name: pattern.name,
            },
        });

        if (!existing) {
            await prisma.sensitiveDataPattern.create({
                data: {
                    name: pattern.name,
                    category: pattern.category as any, // Cast to DataCategory enum
                    description: pattern.description,
                    pattern: pattern.pattern,
                    severity: pattern.severity,
                    defaultAction: pattern.defaultAction,
                    enabled: true,
                    caseSensitive: pattern.caseSensitive,
                },
            });
            created++;
        }
    }

    return created;
}
