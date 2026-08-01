#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Default detection patterns (inlined to avoid compiled TS dependency)
const DEFAULT_PATTERNS = [
    { name: 'AWS Access Key ID', category: 'CREDENTIALS', pattern: '(AKIA|ASIA)[0-9A-Z]{16}', description: 'AWS Access Key ID', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: true },
    { name: 'AWS Secret Access Key', category: 'CREDENTIALS', pattern: '\\b[A-Za-z0-9/+=]{40}\\b', description: 'AWS Secret Access Key', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: true },
    { name: 'GCP API Key', category: 'CREDENTIALS', pattern: 'AIza[0-9A-Za-z\\-_]{35}', description: 'Google Cloud API Key', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: true },
    { name: 'GitHub Token', category: 'CREDENTIALS', pattern: 'gh[ps]_[A-Za-z0-9_]{36,}', description: 'GitHub Personal Access Token', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: true },
    { name: 'Slack Token', category: 'CREDENTIALS', pattern: 'xox[baprs]-[0-9a-zA-Z-]{10,}', description: 'Slack API Token', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: true },
    { name: 'Stripe Secret Key', category: 'CREDENTIALS', pattern: 'sk_live_[0-9a-zA-Z]{24,}', description: 'Stripe Secret Key', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: true },
    { name: 'RSA Private Key', category: 'CREDENTIALS', pattern: '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----', description: 'Private Key Header', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: true },
    { name: 'JWT Token', category: 'CREDENTIALS', pattern: 'eyJ[A-Za-z0-9-_]+\\.eyJ[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+', description: 'JSON Web Token', severity: 'HIGH', defaultAction: 'WARN', caseSensitive: true },
    { name: 'Email Address', category: 'PII', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', description: 'Email Address', severity: 'MEDIUM', defaultAction: 'WARN', caseSensitive: false },
    { name: 'US Phone Number', category: 'PII', pattern: '\\b(\\+1[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b', description: 'US Phone Number', severity: 'MEDIUM', defaultAction: 'WARN', caseSensitive: false },
    { name: 'US SSN', category: 'PII', pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b', description: 'US Social Security Number', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: false },
    { name: 'Credit Card Number', category: 'FINANCIAL', pattern: '\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b', description: 'Credit/Debit Card Number', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: false },
    { name: 'IBAN', category: 'FINANCIAL', pattern: '\\b[A-Z]{2}\\d{2}[A-Z0-9]{4}\\d{7}([A-Z0-9]?){0,16}\\b', description: 'International Bank Account Number', severity: 'HIGH', defaultAction: 'WARN', caseSensitive: true },
    { name: 'Database Connection String', category: 'CREDENTIALS', pattern: '(mongodb|postgresql|mysql|redis)://[^\\s]+', description: 'Database Connection String', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: false },
    { name: 'Basic Auth Header', category: 'CREDENTIALS', pattern: 'Basic\\s+[A-Za-z0-9+/=]{10,}', description: 'HTTP Basic Authentication Header', severity: 'HIGH', defaultAction: 'WARN', caseSensitive: true },
    { name: 'Bearer Token', category: 'CREDENTIALS', pattern: 'Bearer\\s+[A-Za-z0-9\\-._~+/]+=*', description: 'HTTP Bearer Token', severity: 'HIGH', defaultAction: 'WARN', caseSensitive: true },
    { name: 'NPM Token', category: 'CREDENTIALS', pattern: 'npm_[A-Za-z0-9]{36}', description: 'NPM Access Token', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: true },
    { name: 'Discord Token', category: 'CREDENTIALS', pattern: '[MN][A-Za-z\\d]{23,}\\.[\\w-]{6}\\.[\\w-]{27}', description: 'Discord Bot/User Token', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: true },
    { name: 'Azure Connection String', category: 'CREDENTIALS', pattern: 'DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[^;]+', description: 'Azure Storage Connection String', severity: 'CRITICAL', defaultAction: 'BLOCK', caseSensitive: false },
];

async function seedDefaultPatterns(p) {
    let created = 0;
    for (const pat of DEFAULT_PATTERNS) {
        const existing = await p.detectionPattern.findFirst({ where: { name: pat.name } });
        if (!existing) {
            await p.detectionPattern.create({ data: { name: pat.name, category: pat.category, regex: pat.pattern, description: pat.description, severity: pat.severity, defaultAction: pat.defaultAction, caseSensitive: pat.caseSensitive || false, isBuiltIn: true, isActive: true } });
            created++;
        }
    }
    return created;
}

const SEED_ACTION = process.env.SEED_ACTION || 'CREATE';

async function main() {
    if (SEED_ACTION === 'DEMO_DATA') {
        await seedDemoData();
    } else {
        await createInstance();
    }
}

async function createInstance() {
    console.log('🌱 Starting database seed...\n');

    // Configuration from Environment
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@onefend.local';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123';

    console.log(`🔑 Admin password: ${'*'.repeat(ADMIN_PASSWORD.length)} (${ADMIN_PASSWORD.length} chars)`);

    if (!ADMIN_PASSWORD) {
        console.error('❌ Error: ADMIN_PASSWORD environment variable is required.');
        process.exit(1);
    }

    console.log(`📋 Configuration:`);
    console.log(`   - Admin:       ${ADMIN_EMAIL}`);

    // 1. Create/Update Settings row
    const settings = await prisma.settings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            name: 'Onefend',
            enableRegexBlocking: true,
            interventionMode: 'BLOCKING',
            saveEvidence: false,
        }
    });
    console.log('✅ Settings synced:', settings.id);

    // 2. Seed Detection Patterns
    console.log('🔐 Seeding default detection patterns...');
    const patternsCreated = await seedDefaultPatterns(prisma);
    console.log(`✅ Detection patterns: ${patternsCreated} patterns synced`);

    // 3. Create/Update Admin User
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const adminUser = await prisma.user.upsert({
        where: {
            identifier: ADMIN_EMAIL
        },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true
        },
        create: {
            identifier: ADMIN_EMAIL,
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true
        }
    });
    console.log('✅ Admin user synced:', adminUser.identifier);

    console.log('\n🎉 Seed completed successfully!');
}

// ── Demo Data Seed ──────────────────────────────────────────────────

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(daysBack) {
    const now = Date.now();
    const past = now - daysBack * 24 * 60 * 60 * 1000;
    return new Date(past + Math.random() * (now - past));
}
function miniId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

async function seedDemoData() {
    const DEMO_DAYS = parseInt(process.env.DEMO_DAYS || '30', 10);

    console.log('====================================================');
    console.log('  DEMO DATA SEED');
    console.log('====================================================');
    console.log(`  Days:   ${DEMO_DAYS}\n`);

    // ── Get admin user ──────────────────────────────────────────
    let adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
    });
    if (!adminUser) {
        console.error('No admin user found. Run CREATE first.');
        process.exit(1);
    }
    console.log(`Admin: ${adminUser.identifier}\n`);

    // ── Users ───────────────────────────────────────────────────
    console.log('Creating users...');
    const demoUsers = [
        { identifier: 'sarah.chen@demo.com', role: 'ANALYST' },
        { identifier: 'james.wilson@demo.com', role: 'USER' },
        { identifier: 'maria.garcia@demo.com', role: 'USER' },
        { identifier: 'david.kim@demo.com', role: 'USER' },
        { identifier: 'emily.johnson@demo.com', role: 'VIEWER' },
        { identifier: 'alex.thompson@demo.com', role: 'AUDITOR' },
    ];
    const passwordHash = await bcrypt.hash('demo123', 10);
    const allUsers = [adminUser];

    for (const u of demoUsers) {
        const user = await prisma.user.upsert({
            where: { identifier: u.identifier },
            update: {},
            create: {
                identifier: u.identifier, password: passwordHash,
                role: u.role, isActive: true, lastSeenAt: randomDate(7),
            },
        });
        allUsers.push(user);
    }
    console.log(`  ${allUsers.length} users total\n`);

    // ── Applications ────────────────────────────────────────────
    console.log('Creating applications...');
    const extraApps = [
        { domain: 'huggingface.co', name: 'Hugging Face', category: 'AI_ASSISTANT', riskScore: 72 },
        { domain: 'midjourney.com', name: 'Midjourney', category: 'AI_ASSISTANT', riskScore: 60 },
        { domain: 'notion.so', name: 'Notion AI', category: 'PRODUCTIVITY', riskScore: 45 },
        { domain: 'github.com', name: 'GitHub Copilot', category: 'DEVELOPMENT', riskScore: 68 },
        { domain: 'dropbox.com', name: 'Dropbox', category: 'CLOUD_STORAGE', riskScore: 35 },
        { domain: 'teams.microsoft.com', name: 'Microsoft Teams', category: 'COMMUNICATION', riskScore: 30 },
        { domain: 'linkedin.com', name: 'LinkedIn', category: 'SOCIAL_MEDIA', riskScore: 40 },
        { domain: 'poe.com', name: 'Poe', category: 'AI_ASSISTANT', riskScore: 70 },
        { domain: 'deepseek.com', name: 'DeepSeek', category: 'AI_ASSISTANT', riskScore: 78 },
    ];

    for (const app of extraApps) {
        await prisma.application.upsert({
            where: { domain: app.domain },
            update: {},
            create: { ...app, isKnown: true },
        });
    }
    const allApps = await prisma.application.findMany();
    console.log(`  ${allApps.length} applications total\n`);

    // ── Groups ──────────────────────────────────────────────────
    console.log('Creating groups...');
    const groupDefs = [
        { name: 'Marketing Team', description: 'Marketing and communications department' },
        { name: 'Finance Team', description: 'Finance and accounting department' },
        { name: 'Executive Team', description: 'C-suite and senior leadership' },
    ];
    const existingGroups = await prisma.group.findMany();
    const allGroups = [...existingGroups];

    for (const g of groupDefs) {
        const group = await prisma.group.upsert({
            where: { name: g.name },
            update: {},
            create: { name: g.name, description: g.description },
        });
        if (!allGroups.find(eg => eg.id === group.id)) allGroups.push(group);
    }

    const nonAdminUsers = allUsers.filter(u => u.role !== 'ADMIN');
    for (const user of nonAdminUsers) {
        const group = randomItem(allGroups);
        await prisma.groupMember.upsert({
            where: { groupId_userId: { groupId: group.id, userId: user.id } },
            update: {},
            create: { groupId: group.id, userId: user.id },
        });
    }
    console.log(`  ${allGroups.length} groups\n`);

    // ── Devices ─────────────────────────────────────────────────
    console.log('Creating devices...');
    const browserInfos = [
        { browser: 'Chrome', version: '125.0.6422.112', os: 'Windows 11', arch: 'x86_64' },
        { browser: 'Chrome', version: '125.0.6422.112', os: 'macOS 14.5', arch: 'arm64' },
        { browser: 'Chrome', version: '124.0.6367.201', os: 'Ubuntu 24.04', arch: 'x86_64' },
        { browser: 'Edge', version: '125.0.2535.67', os: 'Windows 11', arch: 'x86_64' },
        { browser: 'Chrome', version: '125.0.6422.60', os: 'macOS 14.4', arch: 'arm64' },
        { browser: 'Firefox', version: '126.0', os: 'Windows 10', arch: 'x86_64' },
        { browser: 'Chrome', version: '125.0.6422.112', os: 'ChromeOS', arch: 'x86_64' },
        { browser: 'Chrome', version: '124.0.6367.201', os: 'macOS 15.0', arch: 'arm64' },
    ];
    const devices = [];

    for (let i = 0; i < Math.min(allUsers.length, browserInfos.length); i++) {
        const user = allUsers[i];
        const info = browserInfos[i];
        const existing = await prisma.device.findFirst({ where: { userId: user.id } });
        if (existing) { devices.push(existing); continue; }
        const device = await prisma.device.create({
            data: {
                userId: user.id, deviceType: 'EXTENSION', deviceInfo: info,
                extensionVersion: `3.${randomInt(1, 5)}.${randomInt(0, 9)}`,
                isActive: true, lastSyncAt: randomDate(3),
            },
        });
        devices.push(device);
    }
    console.log(`  ${devices.length} devices\n`);

    // ── Policies ────────────────────────────────────────────────
    console.log('Creating policies...');
    const policyDefs = [
        { domain: 'deepseek.com', action: 'BLOCK', priority: 30 },
        { domain: 'huggingface.co', action: 'WARN', priority: 15 },
        { domain: 'midjourney.com', action: 'WARN', priority: 15 },
        { domain: 'poe.com', action: 'BLOCK', priority: 25 },
        { domain: 'notion.so', action: 'ALLOW', priority: 5 },
    ];
    let policiesCreated = 0;
    for (const pd of policyDefs) {
        const app = allApps.find(a => a.domain === pd.domain);
        if (!app) continue;
        const policy = await prisma.policy.upsert({
            where: { applicationId: app.id },
            update: {},
            create: { applicationId: app.id, action: pd.action, priority: pd.priority },
        });
        const group = randomItem(allGroups);
        await prisma.policyGroupAssignment.upsert({
            where: { policyId_groupId: { policyId: policy.id, groupId: group.id } },
            update: {},
            create: { policyId: policy.id, groupId: group.id },
        });
        policiesCreated++;
    }
    console.log(`  ${policiesCreated} policies\n`);

    // ── Enrollment Tokens ───────────────────────────────────────
    console.log('Creating enrollment tokens...');
    const tokenDefs = [
        { token: `enroll_marketing_${Date.now()}`, name: 'Marketing Team Token', maxUses: 20, usedCount: 5 },
        { token: `enroll_finance_${Date.now()}`, name: 'Finance Department Token', maxUses: 15, usedCount: 3 },
        { token: `enroll_onboarding_${Date.now()}`, name: 'New Hire Onboarding', maxUses: 50, usedCount: 12 },
    ];
    for (const t of tokenDefs) {
        await prisma.enrollmentToken.create({
            data: { token: t.token, name: t.name, maxUses: t.maxUses, usedCount: t.usedCount, isActive: true, createdBy: adminUser.id },
        });
    }
    console.log(`  ${tokenDefs.length} tokens\n`);

    // ── Excluded Domains ────────────────────────────────────────
    console.log('Creating excluded domains...');
    const domainDefs = [
        { domain: 'internal.company.com', reason: 'Internal tools - not shadow AI' },
        { domain: 'docs.google.com', reason: 'Approved productivity suite' },
        { domain: 'stackoverflow.com', reason: 'Developer reference - no sensitive data risk' },
        { domain: 'jira.atlassian.com', reason: 'Approved project management tool' },
    ];
    for (const d of domainDefs) {
        await prisma.excludedDomain.upsert({
            where: { domain: d.domain },
            update: {},
            create: { domain: d.domain, reason: d.reason, createdBy: adminUser.id },
        });
    }
    console.log(`  ${domainDefs.length} domains\n`);

    // ── Alert Configs ───────────────────────────────────────────
    console.log('Creating alert configs...');
    const alertDefs = [
        { name: 'High Risk Alert', triggerType: 'HIGH_RISK_EVENT', threshold: 3, channel: 'EMAIL', destination: adminUser.identifier },
        { name: 'Bulk Data Exfiltration', triggerType: 'PATTERN_MATCH_THRESHOLD', threshold: 10, channel: 'SLACK_WEBHOOK', destination: 'https://hooks.slack.com/services/DEMO/WEBHOOK' },
        { name: 'Critical Event Notification', triggerType: 'CRITICAL_EVENT', threshold: 1, channel: 'EMAIL', destination: 'security-team@demo.com' },
    ];
    for (const a of alertDefs) {
        const existing = await prisma.alertConfig.findFirst({ where: { name: a.name } });
        if (!existing) {
            await prisma.alertConfig.create({ data: { userId: adminUser.id, ...a, isActive: true } });
        }
    }
    console.log(`  ${alertDefs.length} alerts\n`);

    // ── Conversation Events (the main data!) ────────────────────
    const EVENT_COUNT = 250;
    console.log(`Generating ${EVENT_COUNT} conversation events (${DEMO_DAYS} days)...`);

    const dataTypesPool = [
        ['SSN'], ['CREDIT_CARD'], ['API_KEY'], ['AWS_ACCESS_KEY'],
        ['EMAIL', 'PHONE'], ['SSN', 'CREDIT_CARD'], ['API_KEY', 'AWS_SECRET_KEY'],
        ['IBAN'], ['PASSPORT'], ['GITHUB_TOKEN'], ['GCP_SERVICE_ACCOUNT'],
        ['STRIPE_KEY'], ['PHONE'], ['EMAIL'],
        ['CREDIT_CARD', 'CVV'], ['AWS_ACCESS_KEY', 'AWS_SECRET_KEY'],
    ];

    const evidenceSamples = [
        'User pasted internal API documentation containing endpoint credentials',
        'Message included customer PII (names, email addresses) from CRM export',
        'Code snippet with hardcoded database connection string detected',
        'Financial spreadsheet data with quarterly revenue figures shared',
        'Internal architecture diagram description with IP addresses',
        'Customer support ticket data including phone numbers',
        'Source code with embedded AWS credentials in config file',
        'Meeting notes referencing M&A target company details',
        'HR compensation data for multiple employees pasted',
        'Production database query results with user records',
        'Slack conversation screenshot with confidential project details',
        'Patent application draft shared with external AI tool',
        'Network topology information including internal CIDR ranges',
        'Stripe webhook secret key found in pasted configuration',
        'Employee SSN batch from payroll processing pasted in prompt',
    ];

    const patternMatchesPool = [
        [{ type: 'SSN', position: 45, length: 11, redacted: '***-**-1234' }],
        [{ type: 'CREDIT_CARD', position: 12, length: 16, redacted: '****-****-****-5678' }],
        [{ type: 'API_KEY', position: 0, length: 40, redacted: 'sk-****...****' }],
        [{ type: 'AWS_ACCESS_KEY', position: 23, length: 20, redacted: 'AKIA****...****' }],
        [{ type: 'EMAIL', position: 5, length: 22, redacted: '****@****.com' }, { type: 'PHONE', position: 30, length: 12, redacted: '+1-***-***-****' }],
        [{ type: 'IBAN', position: 67, length: 22, redacted: 'DE89****...****' }],
        [{ type: 'GITHUB_TOKEN', position: 10, length: 40, redacted: 'ghp_****...****' }],
        [{ type: 'STRIPE_KEY', position: 15, length: 32, redacted: 'sk_live_****...****' }],
        [],
    ];

    const aiCategories = ['Financial', 'PII', 'Credentials', 'Infrastructure', 'Intellectual Property', 'Healthcare'];
    const aiSummaries = [
        'Detected personally identifiable information in user prompt',
        'Financial data including account numbers detected',
        'API credentials and access tokens found in message',
        'Internal infrastructure details shared with AI assistant',
        'Proprietary source code shared externally',
        'Employee compensation data detected in prompt',
        'Customer health records shared with unauthorized platform',
        'Confidential business strategy document pasted',
    ];
    const analysisSources = ['regex', 'backend', 'cache'];

    function weightedRisk() {
        const r = Math.random();
        if (r < 0.30) return 'LOW';
        if (r < 0.60) return 'MEDIUM';
        if (r < 0.85) return 'HIGH';
        return 'CRITICAL';
    }

    function weightedAction() {
        const r = Math.random();
        if (r < 0.25) return 'LOG';
        if (r < 0.45) return 'WARN';
        if (r < 0.60) return 'BLOCK';
        if (r < 0.72) return 'ALLOWED';
        if (r < 0.82) return 'SOFT_BLOCK';
        if (r < 0.92) return 'REDACTED_SEND';
        return 'USER_OVERRIDE';
    }

    const eventsData = [];
    for (let i = 0; i < EVENT_COUNT; i++) {
        const user = randomItem(allUsers);
        const device = devices.find(d => d.userId === user.id) || randomItem(devices);
        const app = randomItem(allApps);
        const risk = weightedRisk();
        const action = weightedAction();
        const sensitiveDetected = risk !== 'LOW' || Math.random() > 0.5;
        const dataTypes = sensitiveDetected ? randomItem(dataTypesPool) : [];
        const patternMatches = sensitiveDetected ? randomItem(patternMatchesPool) : [];
        const hasAi = Math.random() > 0.4;

        eventsData.push({
            userId: user.id,
            deviceId: device.id,
            applicationId: app.id,
            platform: app.name || 'Unknown',
            conversationId: `conv_${miniId()}`,
            messageCount: randomInt(1, 15),
            sensitiveDataDetected: sensitiveDetected,
            dataTypes: dataTypes,
            riskLevel: risk,
            action: action,
            userOverride: action === 'USER_OVERRIDE',
            justification: action === 'USER_OVERRIDE' ? 'Business critical - approved by manager' : null,
            inputLength: randomInt(50, 5000),
            patternMatches: patternMatches,
            analysisSource: randomItem(analysisSources),
            confidence: parseFloat((0.5 + Math.random() * 0.5).toFixed(2)),
            evidence: sensitiveDetected && Math.random() > 0.3 ? randomItem(evidenceSamples) : null,
            aiCategory: hasAi ? randomItem(aiCategories) : null,
            aiRiskLevel: hasAi ? risk : null,
            aiSummary: hasAi ? randomItem(aiSummaries) : null,
            timestamp: randomDate(DEMO_DAYS),
        });
    }

    const BATCH = 50;
    let inserted = 0;
    for (let i = 0; i < eventsData.length; i += BATCH) {
        await prisma.conversationEvent.createMany({ data: eventsData.slice(i, i + BATCH) });
        inserted += Math.min(BATCH, eventsData.length - i);
    }
    console.log(`  ${inserted} conversation events\n`);

    // ── System Audit Logs ───────────────────────────────────────
    const AUDIT_COUNT = 40;
    console.log(`Generating ${AUDIT_COUNT} audit logs...`);

    const auditActions = [
        { action: 'USER_LOGIN', resourceType: 'User', details: { method: 'password', success: true } },
        { action: 'USER_CREATION', resourceType: 'User', details: { identifier: 'new.employee@demo.com', role: 'USER' } },
        { action: 'POLICY_UPDATE', resourceType: 'Policy', details: { before: { action: 'WARN' }, after: { action: 'BLOCK' } } },
        { action: 'POLICY_CREATION', resourceType: 'Policy', details: { applicationDomain: 'deepseek.com', action: 'BLOCK' } },
        { action: 'APPLICATION_UPDATE', resourceType: 'Application', details: { field: 'riskScore', before: 50, after: 78 } },
        { action: 'PATTERN_CREATION', resourceType: 'DetectionPattern', details: { name: 'Custom SSN', severity: 'HIGH' } },
        { action: 'PATTERN_UPDATE', resourceType: 'DetectionPattern', details: { field: 'severity', before: 'MEDIUM', after: 'HIGH' } },
        { action: 'GROUP_CREATION', resourceType: 'Group', details: { name: 'New Department', memberCount: 0 } },
        { action: 'SETTINGS_UPDATE', resourceType: 'Settings', details: { field: 'interventionMode', before: 'OBSERVATION', after: 'BLOCKING' } },
        { action: 'REPORT_EXPORT', resourceType: 'Report', details: { format: 'PDF', dateRange: 'Last 30 days' } },
        { action: 'TOKEN_CREATION', resourceType: 'EnrollmentToken', details: { name: 'Q3 Onboarding', maxUses: 25 } },
        { action: 'DEVICE_REVOCATION', resourceType: 'Device', details: { reason: 'Employee offboarding' } },
        { action: 'USER_ROLE_CHANGE', resourceType: 'User', details: { before: 'USER', after: 'ANALYST' } },
        { action: 'DOMAIN_EXCLUSION', resourceType: 'ExcludedDomain', details: { domain: 'internal.tools.com' } },
        { action: 'INTEGRATION_CREATION', resourceType: 'Integration', details: { type: 'WEBHOOK', name: 'Slack Alerts' } },
        { action: 'MFA_ENABLED', resourceType: 'User', details: { method: 'TOTP', success: true } },
    ];

    const auditData = [];
    for (let i = 0; i < AUDIT_COUNT; i++) {
        const user = randomItem(allUsers);
        const def = randomItem(auditActions);
        auditData.push({
            userId: user.id,
            action: def.action, resourceId: miniId(), resourceType: def.resourceType,
            details: def.details,
            ipAddress: `192.168.${randomInt(1, 10)}.${randomInt(1, 254)}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            timestamp: randomDate(DEMO_DAYS),
        });
    }
    await prisma.systemAuditLog.createMany({ data: auditData });
    console.log(`  ${AUDIT_COUNT} audit logs\n`);

    // ── Summary ─────────────────────────────────────────────────
    console.log('====================================================');
    console.log('  DEMO DATA SEED COMPLETE');
    console.log('====================================================');
    console.log(`  Users:               ${allUsers.length}`);
    console.log(`  Applications:        ${allApps.length}`);
    console.log(`  Groups:              ${allGroups.length}`);
    console.log(`  Devices:             ${devices.length}`);
    console.log(`  Policies:            ${policiesCreated}`);
    console.log(`  Enrollment Tokens:   ${tokenDefs.length}`);
    console.log(`  Excluded Domains:    ${domainDefs.length}`);
    console.log(`  Alert Configs:       ${alertDefs.length}`);
    console.log(`  Conversation Events: ${EVENT_COUNT}`);
    console.log(`  Audit Logs:          ${AUDIT_COUNT}`);
    console.log('====================================================');
}

main()
    .catch((e) => {
        console.error('❌ Action failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
