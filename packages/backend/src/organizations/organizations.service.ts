import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

import { ConfigService } from '../config/config.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  async findOne() {
    const settings = await this.prisma.settings.findFirst();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async update(dto: UpdateOrganizationDto) {
    // Verify settings exist
    const existingSettings = await this.findOne();

    const result = await this.prisma.settings.update({
      where: { id: existingSettings.id },
      data: {
        name: dto.name,
        enforceMfa: dto.enforceMfa,
        auditLogRetentionDays: dto.auditLogRetentionDays,
        eventRetentionDays: dto.eventRetentionDays,
        interventionMode: dto.interventionMode,
        saveEvidence: dto.saveEvidence,
        aiContextPrompt: dto.aiContextPrompt,
        approvedAiName: dto.approvedAiName,
        approvedAiUrl: dto.approvedAiUrl,
      },
    });

    await this.configService.invalidateCache();

    return result;
  }
}
