import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) { }

    private readonly VALID_CATEGORIES = [
        'PII',
        'Credentials',
        'Source Code',
        'Network & Infrastructure',
        'Security Vulnerabilities',
        'Financial Data',
        'Internal Strategy',
        'Other',
    ];

    private readonly CATEGORY_MAP: Record<string, string> = {
        'general': 'Other',
        'general info': 'Other',
        'general information': 'Other',
        'general inquiry': 'Other',
        'none': 'Other',
        'unknown': 'Other',
        'technical discussion': 'Other',
        'analysis failed': 'Other',
        'pii': 'PII',
        'credentials': 'Credentials',
        'source code': 'Source Code',
        'proprietary code': 'Source Code',
        'code snippets and configuration': 'Source Code',
        'code snippets': 'Source Code',
        'network configuration': 'Network & Infrastructure',
        'network scan data': 'Network & Infrastructure',
        'network security discussion': 'Network & Infrastructure',
        'infrastructure security': 'Network & Infrastructure',
        'network & infrastructure': 'Network & Infrastructure',
        'security vulnerability': 'Security Vulnerabilities',
        'security vulnerabilities': 'Security Vulnerabilities',
        'financial data': 'Financial Data',
        'internal strategy': 'Internal Strategy',
        'organization name': 'PII',
        'other': 'Other',
    };

    private normalizeCategory(raw: string | null): string {
        if (!raw) return 'Other';
        const key = raw.trim().toLowerCase();
        return this.CATEGORY_MAP[key] ?? 'Other';
    }

    async getHeatmap() {
        const groups = await this.prisma.conversationEvent.groupBy({
            by: ['aiCategory', 'aiRiskLevel'],
            where: {
                aiCategory: { not: null },
            },
            _count: {
                id: true,
            },
        });

        // Normalize and aggregate legacy categories into the canonical set
        const aggregated = new Map<string, Map<string, number>>();
        for (const g of groups) {
            const category = this.normalizeCategory(g.aiCategory);
            const risk = g.aiRiskLevel ?? 'LOW';
            if (!aggregated.has(category)) {
                aggregated.set(category, new Map());
            }
            const riskMap = aggregated.get(category)!;
            riskMap.set(risk, (riskMap.get(risk) ?? 0) + g._count.id);
        }

        // Flatten and sort: canonical order, with "Other" last
        const result: { category: string; risk: string; value: number }[] = [];
        for (const cat of this.VALID_CATEGORIES) {
            const riskMap = aggregated.get(cat);
            if (!riskMap) continue;
            for (const [risk, value] of riskMap) {
                result.push({ category: cat, risk, value });
            }
        }

        return result;
    }

    async getHighRiskUsers() {
        const riskCounts = await this.prisma.conversationEvent.groupBy({
            by: ['userId'],
            where: {
                riskLevel: { in: ['HIGH', 'CRITICAL'] },
            },
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 5,
        });

        const userIds = riskCounts.map(r => r.userId);
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, identifier: true },
        });

        return riskCounts.map(r => {
            const u = users.find(user => user.id === r.userId);
            return {
                userId: r.userId,
                email: u?.identifier || 'Unknown',
                count: r._count.id,
            };
        });
    }

    async getSecurityHeroes() {
        // 1. Find users who have EVER overridden a block
        const usersWithOverrides = await this.prisma.conversationEvent.findMany({
            where: {
                userOverride: true
            },
            select: { userId: true },
            distinct: ['userId'],
        });

        const excludedUserIds = usersWithOverrides.map(u => u.userId);

        // 2. Find top users by event count who are NOT in the excluded list
        const heroCounts = await this.prisma.conversationEvent.groupBy({
            by: ['userId'],
            where: {
                userId: { notIn: excludedUserIds },
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });

        const userIds = heroCounts.map(r => r.userId);
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, identifier: true },
        });

        return heroCounts.map(r => {
            const u = users.find(user => user.id === r.userId);
            return {
                userId: r.userId,
                email: u?.identifier || 'Unknown',
                count: r._count.id,
            };
        });
    }
}
