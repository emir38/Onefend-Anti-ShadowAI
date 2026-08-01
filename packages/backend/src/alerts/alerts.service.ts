import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: any) {
    // Cast to any to avoid TS error if client not regenerated
    return (this.prisma as any).alertConfig.create({
      data: {
        userId,
        name: data.name,
        triggerType: data.triggerType,
        threshold: data.threshold,
        channel: data.channel,
        destination: data.destination,
      },
    });
  }

  async findAll() {
    return (this.prisma as any).alertConfig.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string) {
    return (this.prisma as any).alertConfig.delete({
      where: { id },
    });
  }

  // Simulation method
  async checkAlerts(event: any) {
    // In a real system, this would query active alerts matching event criteria
    // and send notifications.
    if (event.riskLevel === 'CRITICAL' || event.riskLevel === 'HIGH') {
      console.log(
        `[ALERT SYSTEM] Critical event detected for user ${event.userId}. Checking handlers...`,
      );
      // Simulate sending email
      console.log(`[ALERT SIMULATION] Sending email notification to admin@example.com`);
    }
  }
}
