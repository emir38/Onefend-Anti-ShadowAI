import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationEvent, Integration, IntegrationType, RiskLevel } from '@prisma/client';
import * as net from 'net';
import * as tls from 'tls';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

function isAllowedWebhookUrl(urlStr: string): boolean {
    try {
        const url = new URL(urlStr);
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        const hostname = url.hostname;
        // Block private/internal IPs
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') return false;
        if (hostname.startsWith('10.')) return false;
        if (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31) return false;
        if (hostname.startsWith('192.168.')) return false;
        if (hostname.startsWith('169.254.')) return false;
        if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return false;
        return true;
    } catch {
        return false;
    }
}

interface SyslogConfig {
    host: string;
    port: number;
    protocol: 'TCP' | 'TLS';
}

@Injectable()
export class LogExporterService {
    private readonly logger = new Logger(LogExporterService.name);

    constructor(private readonly prisma: PrismaService) { }

    async exportEvent(event: ConversationEvent) {
        // Fire-and-forget logic happens at the caller usually, but we ensure we catch everything here.
        try {
            const integrations = await this.prisma.integration.findMany({
                where: {
                    isActive: true,
                },
            });
            this.logger.debug(`Found ${integrations.length} active integrations (Event: ${event.id})`);

            if (integrations.length === 0) return;

            integrations.forEach(i => this.logger.debug(`Found integration: ${i.name} (${i.type})`));

            for (const integration of integrations) {
                this.processExport(integration, event).catch((err) => {
                    this.logger.error(`Failed to export to integration ${integration.name} (${integration.id})`, err);
                });
            }

        } catch (error) {
            this.logger.error(`Error fetching integrations for event ${event.id}`, error);
        }
    }

    private async processExport(integration: Integration, event: ConversationEvent) {
        if (integration.type === IntegrationType.WEBHOOK) {
            await this.sendWebhook(integration, event);
        } else if (integration.type === IntegrationType.SYSLOG || integration.type === IntegrationType.SIEM) {
            await this.sendSyslog(integration, event);
        }
    }

    private async sendWebhook(integration: Integration, event: ConversationEvent) {
        const config = integration.config as any; // { url: string, headers?: Record<string, string> }
        const url = config.url || integration.webhookUrl;

        if (!url) {
            this.logger.warn(`Webhook integration ${integration.id} missing URL`);
            return;
        }

        if (!isAllowedWebhookUrl(url)) {
            this.logger.warn(`Webhook URL blocked (private/internal): ${url}`);
            return;
        }

        const payload = this.formatEventJson(event);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Webhook failed with status ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Webhook fetch error: ${error.message}`);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async sendSyslog(integration: Integration, event: ConversationEvent) {
        const config = integration.config as any as SyslogConfig;
        if (!config.host || !config.port) {
            this.logger.warn(`Syslog integration ${integration.id} missing host/port`);
            return;
        }

        const message = JSON.stringify(this.formatEventJson(event)).replace(/[\r\n]/g, ' ');

        return new Promise<void>((resolve, reject) => {
            let client: net.Socket;

            const safeDestroy = (error?: Error) => {
                if (client && !client.destroyed) {
                    client.destroy(error);
                }
            };

            const socketCallback = () => {
                this.logger.log(`Syslog connected to ${config.host}:${config.port}. Sending message...`);
                // Use callback to ensure write is flushed before ending
                const success = client.write(message + '\n', 'utf8', (err) => {
                    if (err) {
                        this.logger.error('Syslog write error', err);
                        safeDestroy(err);
                        reject(err);
                    } else {
                        this.logger.log('Syslog message sent successfully.');
                        client.end();
                        resolve();
                    }
                });

                if (!success) {
                    this.logger.debug('Syslog write buffered...');
                }
            };

            const errorCallback = (err: Error) => {
                this.logger.error(`Syslog connection error to ${config.host}:${config.port}`, err);
                reject(err);
            };

            if (config.protocol === 'TLS') {
                client = tls.connect(config.port, config.host, { rejectUnauthorized: true }, socketCallback);
            } else {
                client = net.createConnection(config.port, config.host, socketCallback);
            }

            client.on('error', errorCallback);
            client.setTimeout(5000, () => {
                this.logger.warn('Syslog connection timeout');
                safeDestroy(new Error('Syslog connection timeout'));
                reject(new Error('Timeout'));
            });
        });
    }

    private formatEventJson(event: ConversationEvent) {
        return {
            eventId: event.id,
            timestamp: event.timestamp.toISOString(),
            userId: event.userId,
            platform: event.platform,
            riskLevel: event.riskLevel,
            action: event.action,
            sensitiveDataDetected: event.sensitiveDataDetected,
            aiCategory: event.aiCategory,
            aiSummary: event.aiSummary,
            patternMatches: event.patternMatches,
            source: 'Onefend-DLP',
        };
    }
}
