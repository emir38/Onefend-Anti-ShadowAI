/**
 * Event Queue Service - Robust event logging with batching and offline support
 */

import { getStorageItem, setStorageItem } from '@/utils/storage';
import type { ConversationEventPayload, QueuedEvent } from '@/types';
import { getAuthToken } from '@/utils/storage';
import { API_BASE_URL } from '@/config/constants';

class EventQueueService {
    private queue: QueuedEvent[] = [];
    private flushTimer: number | null = null;
    private readonly BATCH_SIZE = 10;
    private readonly BATCH_INTERVAL = 2000; // 2 seconds (Fast for testing)
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 5000; // 5 seconds
    private readonly MAX_QUEUE_SIZE = 500; // ~500 events * ~1KB ≈ 0.5MB (Limit is 5MB)
    private readonly STORAGE_KEY = 'event_queue';
    private isProcessing = false;

    constructor() {
        this.loadQueueFromStorage();
        this.startBatchTimer();
    }

    /**
     * Add event to queue
     */
    async addEvent(payload: ConversationEventPayload): Promise<void> {
        // Enforce queue size limit (drop oldest)
        if (this.queue.length >= this.MAX_QUEUE_SIZE) {
            console.warn(`[EventQueue] Queue full (${this.MAX_QUEUE_SIZE}), dropping oldest event`);
            this.queue.shift();
        }

        const event: QueuedEvent = {
            id: this.generateEventId(),
            payload,
            timestamp: Date.now(),
            retryCount: 0,
        };

        this.queue.push(event);
        await this.saveQueueToStorage();

        console.log(`[EventQueue] Event added. Queue size: ${this.queue.length}`);

        // Flush if batch size reached
        if (this.queue.length >= this.BATCH_SIZE) {
            this.flush();
        }
    }

    /**
     * Flush queue (send all events to backend)
     */
    async flush(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log(`[EventQueue] Flushing ${this.queue.length} events...`);

        const eventsToSend = [...this.queue];
        this.queue = [];
        await this.saveQueueToStorage();

        try {
            const token = await getAuthToken();
            if (!token) {
                throw new Error('No auth token available');
            }

            // Send batch to backend
            const response = await fetch(`${API_BASE_URL}/conversation-events/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    events: eventsToSend.map(e => e.payload),
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`[EventQueue] ✅ Successfully sent ${eventsToSend.length} events`);
        } catch (error) {
            console.error('[EventQueue] ❌ Failed to send events:', error);

            // Re-queue failed events with retry logic
            for (const event of eventsToSend) {
                if (event.retryCount < this.MAX_RETRIES) {
                    event.retryCount++;
                    this.queue.push(event);
                    console.log(`[EventQueue] Retry ${event.retryCount}/${this.MAX_RETRIES} for event ${event.id}`);
                } else {
                    console.warn(`[EventQueue] Max retries reached for event ${event.id}, discarding`);
                }
            }

            await this.saveQueueToStorage();

            // Schedule retry
            if (this.queue.length > 0) {
                setTimeout(() => this.flush(), this.RETRY_DELAY);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Start automatic batch timer
     */
    private startBatchTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        this.flushTimer = setInterval(() => {
            if (this.queue.length > 0) {
                this.flush();
            }
        }, this.BATCH_INTERVAL) as unknown as number;
    }

    /**
     * Load queue from storage (for offline persistence)
     */
    private async loadQueueFromStorage(): Promise<void> {
        try {
            const stored = await getStorageItem(this.STORAGE_KEY);
            if (stored?.events && Array.isArray(stored.events)) {
                this.queue = stored.events;
                console.log(`[EventQueue] Loaded ${this.queue.length} events from storage`);

                // Flush on startup if there are pending events
                if (this.queue.length > 0) {
                    setTimeout(() => this.flush(), 2000);
                }
            }
        } catch (error) {
            console.error('[EventQueue] Failed to load queue from storage:', error);
        }
    }

    /**
     * Save queue to storage
     */
    private async saveQueueToStorage(): Promise<void> {
        try {
            await setStorageItem(this.STORAGE_KEY, { events: this.queue });
        } catch (error) {
            console.error('[EventQueue] Failed to save queue to storage:', error);
        }
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get queue stats
     */
    getStats() {
        return {
            queueSize: this.queue.length,
            isProcessing: this.isProcessing,
            oldestEvent: this.queue.length > 0 ? this.queue[0].timestamp : null,
        };
    }

    /**
     * Clear queue (for testing/debugging)
     */
    async clear(): Promise<void> {
        this.queue = [];
        await this.saveQueueToStorage();
        console.log('[EventQueue] Queue cleared');
    }
}

// Singleton instance
export const eventQueue = new EventQueueService();
