import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentTokenDto } from './dto/create-enrollment-token.dto';
import { UpdateEnrollmentTokenDto } from './dto/update-enrollment-token.dto';
import { EnrollmentTokenResponseDto } from './dto/enrollment-token-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../common/decorators/tenant.decorator';

@ApiTags('Enrollment Tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollment-tokens')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create new enrollment token',
    description: 'Generates a unique token for registering devices/extensions',
  })
  @ApiResponse({
    status: 201,
    description: 'Token created successfully',
    type: EnrollmentTokenResponseDto,
  })
  async create(
    @UserId() userId: string,
    @Body() createDto: CreateEnrollmentTokenDto,
  ) {
    return this.enrollmentService.create(createDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'List enrollment tokens',
    description: 'Gets all enrollment tokens',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of tokens',
    schema: {
      example: {
        data: [
          {
            id: 'clx123',
            token: 'enroll_abc123...',
            name: 'Sales Team',
            maxUses: 100,
            usedCount: 5,
            isActive: true,
          },
        ],
        meta: {
          total: 10,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      },
    },
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.enrollmentService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      isActive: isActive !== undefined ? isActive === true : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get token by ID',
    description: 'Gets the details of a specific token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token found',
    type: EnrollmentTokenResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Token not found',
  })
  async findOne(@Param('id') id: string) {
    return this.enrollmentService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update token',
    description: 'Updates the data of an enrollment token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token updated successfully',
    type: EnrollmentTokenResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Token not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEnrollmentTokenDto,
  ) {
    return this.enrollmentService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete token',
    description: 'Deletes an enrollment token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Enrollment token deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Token not found',
  })
  async remove(@Param('id') id: string) {
    return this.enrollmentService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Deactivate token',
    description: 'Deactivates a token without deleting it',
  })
  @ApiResponse({
    status: 200,
    description: 'Token deactivated successfully',
    type: EnrollmentTokenResponseDto,
  })
  async deactivate(@Param('id') id: string) {
    return this.enrollmentService.deactivate(id);
  }
}
