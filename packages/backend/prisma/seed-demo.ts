/**
 * seed-demo.ts
 *
 * Generates realistic demo data so every frontend page has content.
 * Run AFTER the main seed (seed.ts or seed-production.ts) which creates
 * the settings, admin user, apps, patterns, and enrollment token.
 *
 * Usage:
 *   cd packages/backend
 *   npx ts-node prisma/seed-demo.ts
 *
 * Env vars:
 *   DEMO_DAYS   - how many days back to generate events (default: 30)
 */

import {
  PrismaClient,
  UserRole,
  ApplicationCategory,
  PolicyAction,
  RiskLevel,
  DeviceType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Helpers ─────────────────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number): Date {
  const now = Date.now();
  const past = now - daysBack * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

function cuid(): string {
  return (
    'c' +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

// ── Data Definitions ────────────────────────────────────────────────

const DEMO_USERS = [
  { identifier: 'sarah.chen@demo.com', role: UserRole.ANALYST },
  { identifier: 'james.wilson@demo.com', role: UserRole.USER },
  { identifier: 'maria.garcia@demo.com', role: UserRole.USER },
  { identifier: 'david.kim@demo.com', role: UserRole.USER },
  { identifier: 'emily.johnson@demo.com', role: UserRole.VIEWER },
  { identifier: 'alex.thompson@demo.com', role: UserRole.AUDITOR },
];

const EXTRA_APPS = [
  { domain: 'huggingface.co', name: 'Hugging Face', category: ApplicationCategory.AI_ASSISTANT, riskScore: 72 },
  { domain: 'midjourney.com', name: 'Midjourney', category: ApplicationCategory.AI_ASSISTANT, riskScore: 60 },
  { domain: 'notion.so', name: 'Notion AI', category: ApplicationCategory.PRODUCTIVITY, riskScore: 45 },
  { domain: 'github.com', name: 'GitHub Copilot', category: ApplicationCategory.DEVELOPMENT, riskScore: 68 },
  { domain: 'dropbox.com', name: 'Dropbox', category: ApplicationCategory.CLOUD_STORAGE, riskScore: 35 },
  { domain: 'teams.microsoft.com', name: 'Microsoft Teams', category: ApplicationCategory.COMMUNICATION, riskScore: 30 },
  { domain: 'linkedin.com', name: 'LinkedIn', category: ApplicationCategory.SOCIAL_MEDIA, riskScore: 40 },
  { domain: 'poe.com', name: 'Poe', category: ApplicationCategory.AI_ASSISTANT, riskScore: 70 },
  { domain: 'deepseek.com', name: 'DeepSeek', category: ApplicationCategory.AI_ASSISTANT, riskScore: 78 },
];

const GROUPS_DEF = [
  { name: 'Marketing Team', description: 'Marketing and communications department' },
  { name: 'Finance Team', description: 'Finance and accounting department' },
  { name: 'Executive Team', description: 'C-suite and senior leadership' },
];

const PLATFORMS = ['ChatGPT', 'Claude', 'Gemini', 'Copilot', 'Perplexity', 'DeepSeek', 'Poe', 'Hugging Face', 'Midjourney'];

const DATA_TYPES_POOL = [
  ['SSN'], ['CREDIT_CARD'], ['API_KEY'], ['AWS_ACCESS_KEY'],
  ['EMAIL', 'PHONE'], ['SSN', 'CREDIT_CARD'], ['API_KEY', 'AWS_SECRET_KEY'],
  ['IBAN'], ['PASSPORT'], ['GITHUB_TOKEN'], ['GCP_SERVICE_ACCOUNT'],
  ['STRIPE_KEY'], ['PHONE'], ['EMAIL'],
  ['CREDIT_CARD', 'CVV'], ['AWS_ACCESS_KEY', 'AWS_SECRET_KEY'],
];

const EVIDENCE_SAMPLES = [
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

const AI_CATEGORIES = ['Financial', 'PII', 'Credentials', 'Infrastructure', 'Intellectual Property', 'Healthcare'];

const AI_SUMMARIES = [
  'Detected personally identifiable information in user prompt',
  'Financial data including account numbers detected',
  'API credentials and access tokens found in message',
  'Internal infrastructure details shared with AI assistant',
  'Proprietary source code shared externally',
  'Employee compensation data detected in prompt',
  'Customer health records shared with unauthorized platform',
  'Confidential business strategy document pasted',
];

const PATTERN_MATCHES_POOL = [
  [{ type: 'SSN', position: 45, length: 11, redacted: '***-**-1234' }],
  [{ type: 'CREDIT_CARD', position: 12, length: 16, redacted: '****-****-****-5678' }],
  [{ type: 'API_KEY', position: 0, length: 40, redacted: 'sk-****...****' }],
  [{ type: 'AWS_ACCESS_KEY', position: 23, length: 20, redacted: 'AKIA****...****' }],
  [{ type: 'EMAIL', position: 5, length: 22, redacted: '****@****.com' }, { type: 'PHONE', position: 30, length: 12, redacted: '+1-***-***-****' }],
  [{ type: 'IBAN', position: 67, length: 22, redacted: 'DE89****...****' }],
  [{ type: 'GITHUB_TOKEN', position: 10, length: 40, redacted: 'ghp_****...****' }],
  [{ type: 'GCP_SERVICE_ACCOUNT', position: 0, length: 60, redacted: '****@****.iam.gserviceaccount.com' }],
  [{ type: 'STRIPE_KEY', position: 15, length: 32, redacted: 'sk_live_****...****' }],
  [],
];

const AUDIT_ACTIONS = [
  { action: 'USER_LOGIN', resourceType: 'User' },
  { action: 'USER_CREATION', resourceType: 'User' },
  { action: 'POLICY_UPDATE', resourceType: 'Policy' },
  { action: 'POLICY_CREATION', resourceType: 'Policy' },
  { action: 'APPLICATION_UPDATE', resourceType: 'Application' },
  { action: 'PATTERN_CREATION', resourceType: 'DetectionPattern' },
  { action: 'PATTERN_UPDATE', resourceType: 'DetectionPattern' },
  { action: 'GROUP_CREATION', resourceType: 'Group' },
  { action: 'GROUP_UPDATE', resourceType: 'Group' },
  { action: 'SETTINGS_UPDATE', resourceType: 'Settings' },
  { action: 'REPORT_EXPORT', resourceType: 'Report' },
  { action: 'TOKEN_CREATION', resourceType: 'EnrollmentToken' },
  { action: 'DEVICE_REVOCATION', resourceType: 'Device' },
  { action: 'USER_ROLE_CHANGE', resourceType: 'User' },
  { action: 'DOMAIN_EXCLUSION', resourceType: 'ExcludedDomain' },
  { action: 'INTEGRATION_CREATION', resourceType: 'Integration' },
  { action: 'MFA_ENABLED', resourceType: 'User' },
];

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const DEMO_DAYS = parseInt(process.env.DEMO_DAYS || '30', 10);

  console.log('====================================================');
  console.log('  DEMO DATA SEED');
  console.log('====================================================\n');

  // 1. Get or create admin user (needed for audit logs)
  let adminUser = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });
  if (!adminUser) {
    const hash = await bcrypt.hash('admin123', 10);
    adminUser = await prisma.user.create({
      data: { identifier: 'admin@demo.com', password: hash, role: UserRole.ADMIN },
    });
  }
  console.log(`Admin user: ${adminUser.identifier}\n`);

  // ── 2. Create additional users ────────────────────────────────
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('demo123', 10);
  const allUsers = [adminUser];

  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { identifier: u.identifier },
      update: {},
      create: {
        identifier: u.identifier,
        password: passwordHash,
        role: u.role,
        isActive: true,
        lastSeenAt: randomDate(7),
      },
    });
    allUsers.push(user);
  }
  console.log(`  ${allUsers.length} users total\n`);

  // ── 3. Create extra applications ──────────────────────────────
  console.log('Creating applications...');
  for (const app of EXTRA_APPS) {
    await prisma.application.upsert({
      where: { domain: app.domain },
      update: {},
      create: { ...app, isKnown: true },
    });
  }
  const allApps = await prisma.application.findMany();
  console.log(`  ${allApps.length} applications total\n`);

  // ── 4. Create groups & members ────────────────────────────────
  console.log('Creating groups...');
  const allGroups: any[] = [];

  const existingGroups = await prisma.group.findMany();
  allGroups.push(...existingGroups);

  for (const g of GROUPS_DEF) {
    const group = await prisma.group.upsert({
      where: { name: g.name },
      update: {},
      create: { name: g.name, description: g.description },
    });
    allGroups.push(group);
  }

  const nonAdminUsers = allUsers.filter((u) => u.role !== UserRole.ADMIN);
  for (const user of nonAdminUsers) {
    const group = randomItem(allGroups);
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      update: {},
      create: { groupId: group.id, userId: user.id },
    });
  }
  console.log(`  ${allGroups.length} groups, members assigned\n`);

  // ── 5. Create devices ─────────────────────────────────────────
  console.log('Creating devices...');
  const devices: any[] = [];

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

  for (let i = 0; i < Math.min(allUsers.length, browserInfos.length); i++) {
    const user = allUsers[i];
    const info = browserInfos[i];
    const existing = await prisma.device.findFirst({
      where: { userId: user.id },
    });
    if (existing) {
      devices.push(existing);
      continue;
    }
    const device = await prisma.device.create({
      data: {
        userId: user.id,
        deviceType: DeviceType.EXTENSION,
        deviceInfo: info,
        extensionVersion: `3.${randomInt(1, 5)}.${randomInt(0, 9)}`,
        isActive: true,
        lastSyncAt: randomDate(3),
      },
    });
    devices.push(device);
  }
  console.log(`  ${devices.length} devices\n`);

  // ── 6. Create policies ────────────────────────────────────────
  console.log('Creating policies...');
  const policyDefs: { domain: string; action: PolicyAction; priority: number }[] = [
    { domain: 'deepseek.com', action: PolicyAction.BLOCK, priority: 30 },
    { domain: 'huggingface.co', action: PolicyAction.WARN, priority: 15 },
    { domain: 'midjourney.com', action: PolicyAction.WARN, priority: 15 },
    { domain: 'poe.com', action: PolicyAction.BLOCK, priority: 25 },
    { domain: 'notion.so', action: PolicyAction.ALLOW, priority: 5 },
  ];

  let policiesCreated = 0;
  for (const pd of policyDefs) {
    const app = allApps.find((a) => a.domain === pd.domain);
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
  console.log(`  ${policiesCreated} new policies\n`);

  // ── 7. Create enrollment tokens ───────────────────────────────
  console.log('Creating enrollment tokens...');
  const tokenDefs = [
    { token: `enroll_marketing_${Date.now()}`, name: 'Marketing Team Token', maxUses: 20, usedCount: 5 },
    { token: `enroll_finance_${Date.now()}`, name: 'Finance Department Token', maxUses: 15, usedCount: 3 },
    { token: `enroll_onboarding_${Date.now()}`, name: 'New Hire Onboarding', maxUses: 50, usedCount: 12 },
  ];

  for (const t of tokenDefs) {
    await prisma.enrollmentToken.create({
      data: {
        token: t.token,
        name: t.name,
        maxUses: t.maxUses,
        usedCount: t.usedCount,
        isActive: true,
        createdBy: adminUser.id,
      },
    });
  }
  console.log(`  ${tokenDefs.length} tokens\n`);

  // ── 8. Create excluded domains ────────────────────────────────
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

  // ── 9. Create alert configs ──────────────────────────────────
  console.log('Creating alert configs...');
  const alertDefs = [
    { name: 'High Risk Alert', triggerType: 'HIGH_RISK_EVENT', threshold: 3, channel: 'EMAIL', destination: adminUser.identifier },
    { name: 'Bulk Data Exfiltration', triggerType: 'PATTERN_MATCH_THRESHOLD', threshold: 10, channel: 'SLACK_WEBHOOK', destination: 'https://hooks.slack.com/services/DEMO/WEBHOOK' },
    { name: 'Critical Event Notification', triggerType: 'CRITICAL_EVENT', threshold: 1, channel: 'EMAIL', destination: 'security-team@demo.com' },
  ];

  for (const a of alertDefs) {
    const existing = await prisma.alertConfig.findFirst({
      where: { name: a.name },
    });
    if (!existing) {
      await prisma.alertConfig.create({
        data: { userId: adminUser.id, ...a, isActive: true },
      });
    }
  }
  console.log(`  ${alertDefs.length} alerts\n`);

  // ── 10. Generate conversation events (the main data!) ─────────
  console.log(`Generating conversation events (${DEMO_DAYS} days)...`);

  const EVENT_COUNT = 250;
  const analysisSources = ['regex', 'backend', 'cache'];

  function weightedRisk(): RiskLevel {
    const r = Math.random();
    if (r < 0.30) return RiskLevel.LOW;
    if (r < 0.60) return RiskLevel.MEDIUM;
    if (r < 0.85) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  function weightedAction(): PolicyAction {
    const r = Math.random();
    if (r < 0.25) return PolicyAction.LOG;
    if (r < 0.45) return PolicyAction.WARN;
    if (r < 0.60) return PolicyAction.BLOCK;
    if (r < 0.72) return PolicyAction.ALLOWED;
    if (r < 0.82) return PolicyAction.SOFT_BLOCK;
    if (r < 0.92) return PolicyAction.REDACTED_SEND;
    return PolicyAction.USER_OVERRIDE;
  }

  const eventsData: any[] = [];
  for (let i = 0; i < EVENT_COUNT; i++) {
    const user = randomItem(allUsers);
    const device = devices.find((d) => d.userId === user.id) || randomItem(devices);
    const app = randomItem(allApps);
    const risk = weightedRisk();
    const action = weightedAction();
    const sensitiveDetected = risk !== RiskLevel.LOW || Math.random() > 0.5;
    const dataTypes = sensitiveDetected ? randomItem(DATA_TYPES_POOL) : [];
    const patternMatches = sensitiveDetected ? randomItem(PATTERN_MATCHES_POOL) : [];
    const hasAiAnalysis = Math.random() > 0.4;
    const timestamp = randomDate(DEMO_DAYS);

    eventsData.push({
      userId: user.id,
      deviceId: device.id,
      applicationId: app.id,
      platform: app.name || randomItem(PLATFORMS),
      conversationId: `conv_${cuid()}`,
      messageCount: randomInt(1, 15),
      sensitiveDataDetected: sensitiveDetected,
      dataTypes: dataTypes,
      riskLevel: risk,
      action: action,
      userOverride: action === PolicyAction.USER_OVERRIDE,
      justification: action === PolicyAction.USER_OVERRIDE ? 'Business critical - approved by manager' : null,
      inputLength: randomInt(50, 5000),
      patternMatches: patternMatches,
      analysisSource: randomItem(analysisSources),
      confidence: parseFloat((0.5 + Math.random() * 0.5).toFixed(2)),
      evidence: sensitiveDetected && Math.random() > 0.3 ? randomItem(EVIDENCE_SAMPLES) : null,
      aiCategory: hasAiAnalysis ? randomItem(AI_CATEGORIES) : null,
      aiRiskLevel: hasAiAnalysis ? risk : null,
      aiSummary: hasAiAnalysis ? randomItem(AI_SUMMARIES) : null,
      timestamp,
    });
  }

  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < eventsData.length; i += BATCH_SIZE) {
    const batch = eventsData.slice(i, i + BATCH_SIZE);
    await prisma.conversationEvent.createMany({ data: batch });
    inserted += batch.length;
    process.stdout.write(`  ${inserted}/${EVENT_COUNT} events\r`);
  }
  console.log(`  ${inserted} conversation events created\n`);

  // ── 11. Generate system audit logs ────────────────────────────
  console.log('Generating audit logs...');
  const AUDIT_COUNT = 40;
  const auditData: any[] = [];

  for (let i = 0; i < AUDIT_COUNT; i++) {
    const user = randomItem(allUsers);
    const auditDef = randomItem(AUDIT_ACTIONS);
    const timestamp = randomDate(DEMO_DAYS);

    auditData.push({
      userId: user.id,
      action: auditDef.action,
      resourceId: cuid(),
      resourceType: auditDef.resourceType,
      details: generateAuditDetails(auditDef.action),
      ipAddress: `192.168.${randomInt(1, 10)}.${randomInt(1, 254)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp,
    });
  }

  await prisma.systemAuditLog.createMany({ data: auditData });
  console.log(`  ${AUDIT_COUNT} audit logs\n`);

  // ── Summary ───────────────────────────────────────────────────
  console.log('====================================================');
  console.log('  DEMO DATA SEED COMPLETE');
  console.log('====================================================');
  console.log(`  Users:              ${allUsers.length}`);
  console.log(`  Applications:       ${allApps.length}`);
  console.log(`  Groups:             ${allGroups.length}`);
  console.log(`  Devices:            ${devices.length}`);
  console.log(`  Policies:           ${policiesCreated} new`);
  console.log(`  Enrollment Tokens:  ${tokenDefs.length} new`);
  console.log(`  Excluded Domains:   ${domainDefs.length}`);
  console.log(`  Alert Configs:      ${alertDefs.length}`);
  console.log(`  Conversation Events: ${EVENT_COUNT}`);
  console.log(`  Audit Logs:         ${AUDIT_COUNT}`);
  console.log('====================================================\n');
  console.log('The instance is now fully populated with demo data!');
  console.log('Log in and explore all dashboard sections.');
}

function generateAuditDetails(action: string): object {
  switch (action) {
    case 'POLICY_UPDATE':
      return { before: { action: 'WARN' }, after: { action: 'BLOCK' }, reason: 'Escalated policy after security review' };
    case 'POLICY_CREATION':
      return { applicationDomain: 'deepseek.com', action: 'BLOCK', reason: 'Blocked due to data residency concerns' };
    case 'USER_CREATION':
      return { identifier: 'new.employee@demo.com', role: 'USER' };
    case 'USER_LOGIN':
      return { method: 'password', success: true };
    case 'APPLICATION_UPDATE':
      return { field: 'riskScore', before: 50, after: 78, reason: 'Increased after incident' };
    case 'SETTINGS_UPDATE':
      return { field: 'interventionMode', before: 'OBSERVATION', after: 'BLOCKING' };
    case 'REPORT_EXPORT':
      return { format: 'PDF', dateRange: 'Last 30 days', eventCount: 156 };
    case 'GROUP_CREATION':
      return { name: 'New Department', memberCount: 0 };
    case 'GROUP_UPDATE':
      return { field: 'members', added: ['user@demo.com'], removed: [] };
    case 'TOKEN_CREATION':
      return { name: 'Q3 Onboarding', maxUses: 25 };
    case 'DEVICE_REVOCATION':
      return { reason: 'Employee offboarding', deviceType: 'EXTENSION' };
    case 'USER_ROLE_CHANGE':
      return { before: 'USER', after: 'ANALYST', reason: 'Promoted to security team' };
    case 'DOMAIN_EXCLUSION':
      return { domain: 'internal.tools.com', reason: 'Approved internal tool' };
    case 'INTEGRATION_CREATION':
      return { type: 'WEBHOOK', name: 'Slack Alerts' };
    case 'PATTERN_CREATION':
      return { name: 'Custom SSN Pattern', category: 'PII', severity: 'HIGH' };
    case 'PATTERN_UPDATE':
      return { field: 'severity', before: 'MEDIUM', after: 'HIGH' };
    case 'MFA_ENABLED':
      return { method: 'TOTP', success: true };
    default:
      return { note: 'Action performed' };
  }
}

main()
  .catch((e) => {
    console.error('Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
