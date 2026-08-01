import { IsString, IsNotEmpty, IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeviceType } from '@prisma/client';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Enrollment token provided by IT',
    example: 'enroll_abc123xyz',
  })
  @IsString()
  @IsNotEmpty()
  enrollmentToken: string;

  @ApiProperty({
    description: 'User identifier (email or other)',
    example: 'user@company.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    description: 'Device information (browser, OS, version)',
    example: {
      browser: 'Chrome',
      version: '120.0.0',
      os: 'Windows',
      osVersion: '11',
      extensionVersion: '1.0.0',
    },
  })
  @IsObject()
  @IsOptional()
  deviceInfo?: Record<string, any>;

  @ApiProperty({
    description: 'Device type',
    example: 'EXTENSION',
    enum: ['EXTENSION', 'DESKTOP_AGENT'],
    required: false,
  })
  @IsEnum(DeviceType)
  @IsOptional()
  deviceType?: DeviceType;
}
