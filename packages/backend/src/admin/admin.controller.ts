import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RedisService } from '../redis/redis.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
    constructor(private readonly redis: RedisService) { }

    @Delete('rate-limit/:userId')
    @ApiOperation({
        summary: 'Reset AI Rate Limit for a user',
        description: 'Deletes the Redis counter for AI rate limiting',
    })
    async resetRateLimit(@Param('userId') userId: string) {
        const key = `rate_limit:ai:${userId}`;
        const deleted = await this.redis.del(key);
        return {
            success: deleted > 0,
            message: deleted > 0 ? 'Rate limit reset successfully' : 'No rate limit found',
            key,
        };
    }
}
