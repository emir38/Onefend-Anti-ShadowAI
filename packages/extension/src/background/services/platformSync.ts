
import { getSensitivePatterns, getPlatformConfigs } from '@/api/client';
import { setStorageItem, getStorageItem, STORAGE_KEYS } from '@/utils/storage';
import type { PlatformConfig } from '@/types';

/**
 * Sync platform configurations and sensitive patterns from backend
 */
export async function syncPlatformData(): Promise<void> {
    console.log('[PlatformSync] Syncing platform data...');

    try {
        // Fetch data in parallel
        const [patternsResponse, configsResponse] = await Promise.all([
            getSensitivePatterns().catch(err => {
                console.error('[PlatformSync] Failed to fetch patterns:', err);
                return null;
            }),
            getPlatformConfigs().catch(err => {
                console.error('[PlatformSync] Failed to fetch platform configs:', err);
                return null;
            }),
        ]);

        console.log('[PlatformSync] Patterns response:', JSON.stringify(patternsResponse ? { count: patternsResponse.patterns?.length, first: patternsResponse.patterns?.[0] } : 'NULL'));

        if (patternsResponse?.patterns) {
            await setStorageItem(STORAGE_KEYS.SENSITIVE_PATTERNS, {
                patterns: patternsResponse.patterns,
                lastSync: Date.now(),
            });
            console.log(`[PlatformSync] Synced ${patternsResponse.patterns.length} patterns`);

            const aws = patternsResponse.patterns.find((p: any) => p.name.includes('AWS'));
            if (aws) {
                console.log(`[PlatformSync] DEBUG: AWS Pattern Action is ${aws.action}`);
            }
        }

        if (configsResponse?.configs) {
            await setStorageItem(STORAGE_KEYS.PLATFORM_CONFIGS, {
                configs: configsResponse.configs,
                lastSync: Date.now(),
            });
            console.log(`[PlatformSync] Synced ${configsResponse.configs.length} platform configs`);
        }

    } catch (error) {
        console.error('[PlatformSync] Fatal error syncing platform data:', error);
        throw error;
    }
}

/**
 * Check if a URL matches a known platform
 */
export async function getPlatformConfigForUrl(url: string): Promise<PlatformConfig | null> {
    try {
        const hostname = new URL(url).hostname;
        const stored = await getStorageItem(STORAGE_KEYS.PLATFORM_CONFIGS);

        if (!stored?.configs) return null;

        return stored.configs.find((config: PlatformConfig) =>
            config.domains.some(domain => hostname === domain || hostname.endsWith('.' + domain))
        ) || null;
    } catch {
        return null;
    }
}
