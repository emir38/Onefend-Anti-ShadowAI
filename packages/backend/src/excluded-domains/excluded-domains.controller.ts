import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ExcludedDomainsService } from './excluded-domains.service';
import { CreateExcludedDomainDto } from './dto/create-excluded-domain.dto';
import { UserId } from '../common/decorators/user-id.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { SystemAuditService } from '../system-audit/system-audit.service';

@ApiTags('Excluded Domains')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('excluded-domains')
export class ExcludedDomainsController {
    constructor(
        private readonly service: ExcludedDomainsService,
        private readonly auditService: SystemAuditService,
    ) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.ANALYST)
    @ApiOperation({ summary: 'Add a domain to the whitelist' })
    create(
        @UserId() userId: string,
        @IpAddress() ipAddress: string,
        @UserAgent() userAgent: string,
        @Body() dto: CreateExcludedDomainDto,
    ) {
        const result = this.service.create(userId, dto);

        return result.then(async (domain) => {
            await this.auditService.log(
                userId,
                {
                    action: 'EXCLUDED_DOMAIN_CREATION',
                    resourceId: domain.id,
                    resourceType: 'ExcludedDomain',
                    details: {
                        domain: domain.domain,
                    },
                },
                ipAddress,
                userAgent,
            );
            return domain;
        });
    }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    @ApiOperation({ summary: 'List all excluded domains' })
    findAll() {
        return this.service.findAll();
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.ANALYST)
    @ApiOperation({ summary: 'Remove a domain from the whitelist' })
    remove(
        @UserId() userId: string,
        @IpAddress() ipAddress: string,
        @UserAgent() userAgent: string,
        @Param('id') id: string,
    ) {
        return this.service.remove(id).then(async (result) => {
            await this.auditService.log(
                userId,
                {
                    action: 'EXCLUDED_DOMAIN_DELETION',
                    resourceId: id,
                    resourceType: 'ExcludedDomain',
                    details: {},
                },
                ipAddress,
                userAgent,
            );
            return result;
        });
    }
}
