import { PrismaClient, RiskLevel, PolicyAction } from '@prisma/client';
import { SENSITIVE_PATTERNS } from './sensitive-patterns';

export async function seedDetectionPatterns(prisma: PrismaClient) {
    console.log('🔄 Seeding detection patterns...');

    let totalCreated = 0;

    for (const pattern of SENSITIVE_PATTERNS) {
        // Check if pattern exists
        const existing = await prisma.detectionPattern.findFirst({
            where: {
                name: pattern.name,
            },
        });

        if (!existing) {
            await prisma.detectionPattern.create({
                data: {
                    name: pattern.name,
                    category: pattern.category as string,
                    description: pattern.description,
                    regex: pattern.pattern,
                    severity: pattern.severity as RiskLevel,
                    defaultAction: pattern.defaultAction as PolicyAction,
                    isActive: true,
                    isBuiltIn: true,
                    multiline: false,
                    caseSensitive: pattern.caseSensitive || false,
                },
            });
            totalCreated++;
        }
    }

    console.log(`✅ ${totalCreated} detection patterns seeded`);
}
