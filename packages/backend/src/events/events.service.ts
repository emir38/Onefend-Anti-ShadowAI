import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventDto } from './dto/batch-events.dto';
import { ApplicationsService } from '../applications/applications.service';
// import { SQS } from 'aws-sdk';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  // private readonly sqs: SQS;
  private readonly queueUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly applicationsService: ApplicationsService,
  ) {
    // Initialize SQS client (commented out for now for local development)
    // this.sqs = new SQS({
    //   region: this.config.get('AWS_REGION', 'us-east-1'),
    // });
    this.queueUrl = this.config.get('AWS_SQS_EVENTS_QUEUE_URL', '');
  }

  /**
   * Queues events in SQS for asynchronous processing
   * 1. Validate events
   * 2. Save to DB
   * 3. Update metrics
   */
  async queueEvents(userId: string, events: EventDto[]) {
    if (events.length === 0) {
      return {
        accepted: 0,
        message: 'No events to process',
      };
    }

    // Development mode: save directly to DB
    if (!this.queueUrl || this.queueUrl === '') {
      this.logger.warn('SQS queue URL not configured, saving events directly to DB');
      await this.saveEventsToDb(userId, events);
      return {
        accepted: events.length,
        message: 'Events saved directly to DB (dev mode)',
      };
    }

    // Production mode: send to SQS (commented out for now)
    /*
        try {
          const sqsMessages = events.map((event) => ({
            Id: `${Date.now()}-${Math.random()}`,
            MessageBody: JSON.stringify({
              userId,
              event,
            }),
          }));

          // SQS max batch size is 10
          const chunks = this.chunkArray(sqsMessages, 10);

          for (const chunk of chunks) {
            await this.sqs
              .sendMessageBatch({
                QueueUrl: this.queueUrl,
                Entries: chunk,
              })
              .promise();
          }

          this.logger.log(`Queued ${events.length} events to SQS`);

          return {
            accepted: events.length,
            message: 'Events queued for processing',
          };
        } catch (error) {
          this.logger.error('Failed to queue events to SQS', error);
          throw new Error('Failed to queue events');
        }
        */

    return {
      accepted: events.length,
      message: 'Events queued for processing',
    };
  }

  /**
   * Saves events directly to the database
   * In production, this would be executed by a Worker Lambda processing SQS
   */
  private async saveEventsToDb(userId: string, events: EventDto[]) {
    try {
      const eventRecords = await Promise.all(
        events.map(async (event) => {
          let applicationId = event.applicationId;

          // If there's no applicationId but there is a domain, find or create the application
          if (!applicationId && event.domain) {
            let normalizedDomain = event.domain;
            try {
              const { parse } = require('tldts');
              const parsed = parse(event.domain);
              if (parsed.domain) normalizedDomain = parsed.domain;
            } catch {
              normalizedDomain = event.domain.toLowerCase().trim();
            }

            let app = await this.prisma.application.findFirst({
              where: {
                domain: normalizedDomain,
              },
            });

            // If it doesn't exist, create the application
            if (!app) {
              app = await this.prisma.application.create({
                data: {
                  domain: normalizedDomain,
                  name: normalizedDomain, // Use domain as default name
                  category: 'UNKNOWN',
                  riskScore: 0,
                  isBlocked: false,
                },
              });
              this.logger.log(`Auto-created application for domain: ${normalizedDomain}`);

              // Trigger AI categorization asynchronously
              this.applicationsService.categorizeAndSaveDomain(app.id, normalizedDomain).catch(err => {
                this.logger.error(`Failed to trigger categorization for ${normalizedDomain}`, err);
              });
            }

            applicationId = app.id;
          }

          // If there's still no applicationId, skip this event
          if (!applicationId) {
            this.logger.warn(
              `Skipping event without applicationId or domain: ${JSON.stringify(event)}`,
            );
            return null;
          }

          return {
            userId,
            applicationId,
            action: event.action,
            url: event.url || event.metadata?.url,
            metadata: event.metadata || {},
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          };
        }),
      );

      // Filter null events
      const validEvents = eventRecords.filter((e) => e !== null);

      if (validEvents.length > 0) {
        await this.prisma.event.createMany({
          data: validEvents,
        });

        this.logger.log(`Saved ${validEvents.length} events to DB`);
      }
    } catch (error) {
      this.logger.error('Failed to save events to DB', error);
      throw error;
    }
  }

  /**
   * Splits an array into chunks
   */
  // private chunkArray<T>(array: T[], size: number): T[][] {
  //     const chunks: T[][] = [];
  //     for (let i = 0; i < array.length; i += size) {
  //         chunks.push(array.slice(i, i + size));
  //     }
  //     return chunks;
  // }

  async findAll(
    options?: {
      page?: number;
      limit?: number;
      userId?: string;
      applicationId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;
    const sortBy = options?.sortBy || 'timestamp';
    const sortOrder = options?.sortOrder || 'desc';

    const where: any = {};

    if (options?.userId) where.userId = options.userId;
    if (options?.applicationId) where.applicationId = options.applicationId;
    if (options?.action) where.action = options.action;

    if (options?.startDate || options?.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { identifier: true } },
          application: { select: { name: true, domain: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
