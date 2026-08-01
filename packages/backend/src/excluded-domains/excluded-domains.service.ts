import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExcludedDomainDto } from './dto/create-excluded-domain.dto';
import { ConfigService } from '../config/config.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ExcludedDomainsService {
    private readonly logger = new Logger(ExcludedDomainsService.name);

    // Must match the prefix used by AiAnalysisService.isDomainExcluded()
    // so we can wipe the cached list when the admin adds/removes a domain.
    private readonly EXCLUDED_DOMAINS_CACHE_PREFIX = 'excluded_domains:';

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly redis: RedisService,
    ) { }

    private async invalidateExcludedDomainsCache() {
        try {
            await this.redis.del(this.EXCLUDED_DOMAINS_CACHE_PREFIX + 'global');
        } catch (e) {
            // Non-fatal: cache will self-correct via the 5min TTL
            this.logger.warn(`Failed to invalidate excluded_domains cache: ${e.message}`);
        }
    }

    async create(userId: string, dto: CreateExcludedDomainDto) {
        // Check if exists
        const existing = await this.prisma.excludedDomain.findUnique({
            where: {
                domain: dto.domain.toLowerCase(),
            },
        });

        if (existing) {
            return existing;
        }

        const created = await this.prisma.excludedDomain.create({
            data: {
                domain: dto.domain.toLowerCase().trim(),
                reason: dto.reason?.trim(),
                createdBy: userId,
            },
        });

        // Invalidate config cache
        await this.configService.invalidateCache();
        // Invalidate the excluded_domains list used by AiAnalysisService
        await this.invalidateExcludedDomainsCache();

        return created;
    }

    async findAll() {
        return this.prisma.excludedDomain.findMany({
            where: {},
            orderBy: { createdAt: 'desc' },
        });
    }

    async remove(id: string) {
        // Verify ownership
        const exists = await this.prisma.excludedDomain.findFirst({
            where: { id },
        });

        if (!exists) {
            throw new Error('Excluded domain not found');
        }

        const deleted = await this.prisma.excludedDomain.delete({
            where: { id },
        });

        // Invalidate config cache
        await this.configService.invalidateCache();
        // Invalidate the excluded_domains list used by AiAnalysisService
        await this.invalidateExcludedDomainsCache();

        return deleted;
    }
}
