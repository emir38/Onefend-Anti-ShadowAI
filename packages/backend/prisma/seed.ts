import { PrismaClient, ApplicationCategory, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedPlatformConfigs } from './seeds/platform-configs';
import { seedDetectionPatterns } from './seeds/detection-patterns';
import { seedSensitivePatterns } from './seeds/sensitive-patterns';

const prisma = new PrismaClient();


async function main() {
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ Refusing to run generic development seed in production environment.');
        process.exit(1);
    }

    console.log('🌱 Seeding database...');

    const passwordHash = await bcrypt.hash('admin123', 10);

    // 1. Create settings
    await prisma.settings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            defaultPolicyAction: 'ALLOW',
            enableRegexBlocking: true,
            interventionMode: 'BLOCKING',
            saveEvidence: false,
            aiRateLimit: 25,
        },
    });

    console.log('✅ Settings created');

    // 2. Create test users
    const adminUser = await prisma.user.upsert({
        where: {
            identifier: 'admin@demo.com',
        },
        update: {
            password: passwordHash,
        },
        create: {
            identifier: 'admin@demo.com',
            password: passwordHash,
            role: UserRole.ADMIN,
            isActive: true,
        },
    });

    const regularUser = await prisma.user.upsert({
        where: {
            identifier: 'user@demo.com',
        },
        update: {},
        create: {
            identifier: 'user@demo.com',
            role: UserRole.VIEWER,
            isActive: true,
        },
    });

    console.log('✅ Users created:', adminUser.identifier, regularUser.identifier);

    // 3. Create known applications
    const applications = [
        {
            domain: 'chat.openai.com',
            name: 'ChatGPT',
            category: ApplicationCategory.AI_ASSISTANT,
            riskScore: 75,
            isKnown: true,
        },
        {
            domain: 'gemini.google.com',
            name: 'Google Gemini',
            category: ApplicationCategory.AI_ASSISTANT,
            riskScore: 70,
            isKnown: true,
        },
        {
            domain: 'claude.ai',
            name: 'Claude',
            category: ApplicationCategory.AI_ASSISTANT,
            riskScore: 70,
            isKnown: true,
        },
        {
            domain: 'copilot.microsoft.com',
            name: 'Microsoft Copilot',
            category: ApplicationCategory.AI_ASSISTANT,
            riskScore: 65,
            isKnown: true,
        },
        {
            domain: 'perplexity.ai',
            name: 'Perplexity',
            category: ApplicationCategory.AI_ASSISTANT,
            riskScore: 65,
            isKnown: true,
        },
        {
            domain: 'drive.google.com',
            name: 'Google Drive',
            category: ApplicationCategory.CLOUD_STORAGE,
            riskScore: 40,
            isKnown: true,
        },
        {
            domain: 'slack.com',
            name: 'Slack',
            category: ApplicationCategory.COMMUNICATION,
            riskScore: 50,
            isKnown: true,
        },
    ];

    for (const app of applications) {
        await prisma.application.upsert({
            where: {
                domain: app.domain,
            },
            update: {},
            create: {
                ...app,
            },
        });
    }

    console.log(`✅ ${applications.length} applications created`);

    // 4. Create test group
    const group = await prisma.group.upsert({
        where: {
            name: 'Engineering Team',
        },
        update: {},
        create: {
            name: 'Engineering Team',
            description: 'Engineering team members',
        },
    });

    // Add user to group
    await prisma.groupMember.upsert({
        where: {
            groupId_userId: {
                groupId: group.id,
                userId: regularUser.id,
            },
        },
        update: {},
        create: {
            groupId: group.id,
            userId: regularUser.id,
        },
    });

    console.log('✅ Group created:', group.name);

    // 5. Create example policies
    const chatgptApp = await prisma.application.findUnique({
        where: {
            domain: 'chat.openai.com',
        },
    });

    if (chatgptApp) {
        const chatgptPolicy = await prisma.policy.upsert({
            where: {
                applicationId: chatgptApp.id,
            },
            update: {},
            create: {
                applicationId: chatgptApp.id,
                action: 'WARN',
                priority: 10,
            },
        });

        await prisma.policyGroupAssignment.upsert({
            where: {
                policyId_groupId: {
                    policyId: chatgptPolicy.id,
                    groupId: group.id,
                },
            },
            update: {},
            create: {
                policyId: chatgptPolicy.id,
                groupId: group.id,
            },
        });
        console.log('✅ Policy created: ChatGPT -> WARN (Engineering Team)');
    }

    const claudeApp = await prisma.application.findUnique({
        where: {
            domain: 'claude.ai',
        },
    });

    if (claudeApp) {
        const claudePolicy = await prisma.policy.upsert({
            where: {
                applicationId: claudeApp.id,
            },
            update: {},
            create: {
                applicationId: claudeApp.id,
                action: 'BLOCK',
                priority: 20,
            },
        });

        await prisma.policyGroupAssignment.upsert({
            where: {
                policyId_groupId: {
                    policyId: claudePolicy.id,
                    groupId: group.id,
                },
            },
            update: {},
            create: {
                policyId: claudePolicy.id,
                groupId: group.id,
            },
        });
        console.log('✅ Policy created: Claude -> BLOCK (Engineering Team)');
    }

    // Create enrollment token
    const enrollmentToken = await prisma.enrollmentToken.upsert({
        where: {
            token: 'enroll_demo_token_123',
        },
        update: {},
        create: {
            token: 'enroll_demo_token_123',
            name: 'Demo Enrollment Token',
            maxUses: null,
            usedCount: 0,
            isActive: true,
            expiresAt: null,
        },
    });
    console.log('✅ Enrollment token created:', enrollmentToken.token);

    // 6. Seed official platform configurations
    await seedPlatformConfigs(prisma);

    // 7. Seed detection patterns
    await seedDetectionPatterns(prisma);

    // 8. Seed sensitive data patterns
    await seedSensitivePatterns(prisma);

    console.log('\n✨ Seeding completed successfully!');
    console.log('\n📋 Demo credentials:');
    console.log('   Enrollment Token: enroll_demo_token_123');
    console.log('   Admin User: admin@demo.com');
    console.log('   Regular User: user@demo.com');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
