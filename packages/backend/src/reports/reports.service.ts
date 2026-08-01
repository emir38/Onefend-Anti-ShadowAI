import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private sanitizeCsvValue(value: string): string {
    if (!value) return value;
    if (/^[=+\-@\t\r]/.test(value)) {
      return "'" + value;
    }
    return value;
  }

  async generateReport(
    format: 'csv' | 'pdf',
    startDate?: Date,
    endDate?: Date,
    platform?: string,
    riskLevel?: string,
    action?: string,
    userId?: string,
    applicationId?: string,
    dataType?: string,
    sensitiveData?: boolean,
  ): Promise<Buffer> {
    const events = await this.fetchEvents(
      startDate,
      endDate,
      platform,
      riskLevel,
      action,
      userId,
      applicationId,
      dataType,
      sensitiveData,
    );

    if (format === 'csv') {
      return this.generateCsv(events);
    } else {
      return this.generatePdf(events, startDate, endDate);
    }
  }

  private async fetchEvents(
    startDate?: Date,
    endDate?: Date,
    platform?: string,
    riskLevel?: string,
    action?: string,
    userId?: string,
    applicationId?: string,
    dataType?: string,
    sensitiveData?: boolean,
  ) {
    const where: any = {};

    // Date Range
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    // Contextual Filters
    if (platform && platform !== 'ALL') where.platform = platform;
    if (riskLevel && riskLevel !== 'ALL') where.riskLevel = riskLevel;
    if (action && action !== 'ALL') where.action = action;
    if (userId) where.userId = userId;
    if (applicationId) where.applicationId = applicationId;
    if (dataType) where.dataTypes = { array_contains: dataType };
    if (sensitiveData !== undefined) where.sensitiveDataDetected = sensitiveData;

    return this.prisma.conversationEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { identifier: true } },
        application: { select: { name: true, domain: true } },
      },
      take: 1000,
    });
  }

  private generateCsv(events: any[]): Buffer {
    const data = events.map((e) => ({
      Date: e.timestamp.toISOString(),
      User: this.sanitizeCsvValue(e.user?.identifier || 'Unknown'),
      Platform: this.sanitizeCsvValue(e.platform),
      Application: this.sanitizeCsvValue(e.application?.name || e.application?.domain || 'N/A'),
      'Risk Level': e.riskLevel,
      Action: e.action,
      'Sensitive Data Detected': e.sensitiveDataDetected ? 'Yes' : 'No',
      'Data Types': this.sanitizeCsvValue(Array.isArray(e.dataTypes) ? e.dataTypes.join(', ') : ''),
      Input: e.inputLength ? `${e.inputLength} chars` : '',
    }));

    const csvString = stringify(data, { header: true });
    return Buffer.from(csvString);
  }

  private async generatePdf(
    events: any[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<Buffer> {
    return new Promise(async (resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width;
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;

      // Header Section
      doc
        .fillColor('#1e40af')
        .fontSize(32)
        .font('Helvetica-Bold')
        .text('Onefend', margin, 60, { align: 'center', width: contentWidth });

      doc
        .fillColor('#64748b')
        .fontSize(16)
        .font('Helvetica')
        .text('Security Analytics Report', margin, 100, { align: 'center', width: contentWidth });

      // Divider line
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(2)
        .moveTo(margin, 130)
        .lineTo(pageWidth - margin, 130)
        .stroke();

      // Report Info
      const startStr = startDate ? startDate.toLocaleDateString() : 'Beginning';
      const endStr = endDate ? endDate.toLocaleDateString() : 'Now';

      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica')
        .text(`Report Period: ${startStr} - ${endStr}`, margin, 145, {
          align: 'center',
          width: contentWidth,
        });
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 160, {
        align: 'center',
        width: contentWidth,
      });

      let yPos = 200;

      // Executive Summary Title
      doc
        .fillColor('#0f172a')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Executive Summary', margin, yPos);

      yPos += 35;

      // Calculate metrics
      const totalEvents = events.length;
      const highRisk = events.filter(
        (e) => e.riskLevel === 'HIGH' || e.riskLevel === 'CRITICAL',
      ).length;
      const criticalRisk = events.filter((e) => e.riskLevel === 'CRITICAL').length;
      const blocked = events.filter((e) => e.action === 'BLOCK').length;
      const sensitive = events.filter((e) => e.sensitiveDataDetected).length;

      // Metric Cards with borders
      const cardWidth = 115;
      const cardHeight = 90;
      const cardGap = 15;

      const metrics = [
        { label: 'Total Events', value: totalEvents, color: '#3b82f6', borderColor: '#2563eb' },
        { label: 'Sensitive Data', value: sensitive, color: '#f59e0b', borderColor: '#d97706' },
        { label: 'High Risk', value: highRisk, color: '#ef4444', borderColor: '#dc2626' },
        { label: 'Blocked', value: blocked, color: '#8b5cf6', borderColor: '#7c3aed' },
      ];

      metrics.forEach((metric, index) => {
        const x = margin + index * (cardWidth + cardGap);

        // Card border
        doc
          .strokeColor(metric.borderColor)
          .lineWidth(2)
          .rect(x, yPos, cardWidth, cardHeight)
          .stroke();

        // Card background (light)
        doc
          .fillColor(metric.color)
          .opacity(0.05)
          .rect(x + 2, yPos + 2, cardWidth - 4, cardHeight - 4)
          .fill();

        // Value
        doc
          .fillColor(metric.color)
          .opacity(1)
          .fontSize(36)
          .font('Helvetica-Bold')
          .text(metric.value.toString(), x, yPos + 20, { width: cardWidth, align: 'center' });

        // Label
        doc
          .fillColor('#64748b')
          .fontSize(10)
          .font('Helvetica')
          .text(metric.label, x, yPos + 65, { width: cardWidth, align: 'center' });
      });

      yPos += cardHeight + 40;

      // Risk Score Section
      doc
        .fillColor('#0f172a')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Security Score', margin, yPos);

      yPos += 30;

      // Calculate risk score
      const totalRiskPoints =
        criticalRisk * 10 +
        highRisk * 5 +
        events.filter((e) => e.riskLevel === 'MEDIUM').length * 2 +
        events.filter((e) => e.riskLevel === 'LOW').length * 1;
      const maxPossiblePoints = totalEvents * 10;
      const riskScore =
        totalEvents > 0 ? Math.round(100 - (totalRiskPoints / maxPossiblePoints) * 100) : 100;

      let riskLabel = 'Secure';
      let riskColor = '#10b981';
      let riskBg = '#d1fae5';
      if (riskScore < 50) {
        riskLabel = 'Critical';
        riskColor = '#ef4444';
        riskBg = '#fee2e2';
      } else if (riskScore < 80) {
        riskLabel = 'Moderate';
        riskColor = '#f59e0b';
        riskBg = '#fef3c7';
      }

      // Score box
      const scoreBoxX = margin + contentWidth / 2 - 100;
      doc.strokeColor(riskColor).lineWidth(3).rect(scoreBoxX, yPos, 200, 100).stroke();

      doc
        .fillColor(riskColor)
        .opacity(0.1)
        .rect(scoreBoxX + 3, yPos + 3, 194, 94)
        .fill();

      doc
        .fillColor(riskColor)
        .opacity(1)
        .fontSize(56)
        .font('Helvetica-Bold')
        .text(riskScore.toString(), scoreBoxX, yPos + 15, { width: 200, align: 'center' });

      doc
        .fillColor('#475569')
        .fontSize(14)
        .font('Helvetica')
        .text(riskLabel, scoreBoxX, yPos + 75, { width: 200, align: 'center' });

      yPos += 130;

      // --- Top Applications Section ---
      const appCounts = new Map<string, { count: number; riskScore: number }>();

      events.forEach((e) => {
        const appName = e.application?.name || e.application?.domain || 'Unknown App';
        const current = appCounts.get(appName) || { count: 0, riskScore: 0 };

        let riskWeight = 1;
        if (e.riskLevel === 'MEDIUM') riskWeight = 2;
        if (e.riskLevel === 'HIGH') riskWeight = 5;
        if (e.riskLevel === 'CRITICAL') riskWeight = 10;

        appCounts.set(appName, {
          count: current.count + 1,
          riskScore: current.riskScore + riskWeight,
        });
      });

      const topApps = Array.from(appCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

      if (topApps.length > 0) {
        if (yPos > 600) {
          doc.addPage();
          yPos = 50;
        }

        doc
          .fillColor('#0f172a')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('Top Applications', margin, yPos);

        yPos += 30;

        const barHeight = 24;
        const maxCount = topApps[0][1].count || 1;
        const maxBarWidth = contentWidth - 200;

        topApps.forEach(([name, stats], i) => {
          const barWidth = (stats.count / maxCount) * maxBarWidth;
          const barY = yPos + i * (barHeight + 15);

          // App Name
          doc
            .fillColor('#334155')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(name, margin, barY + 7);

          // Bar background
          doc
            .fillColor('#f1f5f9')
            .rect(margin + 150, barY, maxBarWidth, barHeight)
            .fill();

          // Bar fill
          doc
            .fillColor('#3b82f6')
            .rect(margin + 150, barY, Math.max(barWidth, 2), barHeight)
            .fill();

          // Count label
          doc
            .fillColor('#1e40af')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${stats.count} events`, margin + 150 + barWidth + 10, barY + 7);

          // Risk info
          doc
            .fillColor('#64748b')
            .fontSize(9)
            .font('Helvetica')
            .text(`Risk Score: ${stats.riskScore}`, margin + 150 + maxBarWidth - 60, barY + 7, {
              align: 'right',
              width: 60,
            });
        });

        yPos += topApps.length * (barHeight + 15) + 40;
      }

      // Critical Incidents Section
      if (criticalRisk > 0 || highRisk > 0) {
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc
          .fillColor('#0f172a')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('Critical Incidents', margin, yPos);

        yPos += 30;

        const criticalEvents = events
          .filter((e) => e.riskLevel === 'HIGH' || e.riskLevel === 'CRITICAL')
          .slice(0, 10);

        criticalEvents.forEach((e, index) => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          const date = new Date(e.timestamp).toLocaleString();
          const isCritical = e.riskLevel === 'CRITICAL';
          const boxColor = isCritical ? '#dc2626' : '#f59e0b';
          const boxBg = isCritical ? '#fee2e2' : '#fef3c7';

          // Incident box with border
          doc.strokeColor(boxColor).lineWidth(1.5).rect(margin, yPos, contentWidth, 60).stroke();

          doc
            .fillColor(boxColor)
            .opacity(0.05)
            .rect(margin + 1.5, yPos + 1.5, contentWidth - 3, 57)
            .fill();

          // Risk badge
          doc
            .fillColor(boxColor)
            .opacity(1)
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(e.riskLevel, margin + 15, yPos + 12);

          // Date
          doc
            .fillColor('#64748b')
            .fontSize(9)
            .font('Helvetica')
            .text(date, margin + 15, yPos + 30);

          // User info
          doc
            .fillColor('#0f172a')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`User: ${e.user?.identifier || 'Unknown'}`, margin + 150, yPos + 12);

          doc
            .fillColor('#475569')
            .fontSize(9)
            .font('Helvetica')
            .text(`Platform: ${e.platform}`, margin + 150, yPos + 30);

          // Detected data types
          if (e.dataTypes && Array.isArray(e.dataTypes) && e.dataTypes.length > 0) {
            const dataTypesStr = e.dataTypes.slice(0, 10).join(', ') + (e.dataTypes.length > 10 ? ` (+${e.dataTypes.length - 10} more)` : '');
            doc
              .fillColor('#dc2626')
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(`${dataTypesStr}`, margin + 150, yPos + 45, {
                width: contentWidth - 165,
              });
          }

          yPos += 70;
        });
      } else {
        doc
          .fillColor('#10b981')
          .fontSize(14)
          .font('Helvetica')
          .text('No critical incidents found in this period.', margin, yPos, {
            align: 'center',
            width: contentWidth,
          });
      }

      // Footer
      doc
        .fillColor('#94a3b8')
        .fontSize(9)
        .font('Helvetica')
        .text('Generated by Onefend', margin, doc.page.height - 40, {
          align: 'center',
          width: contentWidth,
        });

      doc.end();
    });
  }
}
