/**
 * Chrome Storage API wrapper with type safety
 */

import type { ChromeStorage } from '@/types';
import { STORAGE_KEYS } from '@/config/constants';

// Re-export for convenience
export { STORAGE_KEYS };

/**
 * Get item from chrome.storage.local
 */
export async function getStorageItem<K extends keyof ChromeStorage>(
    key: K
): Promise<ChromeStorage[K] | undefined> {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key] as ChromeStorage[K] | undefined);
        });
    });
}

/**
 * Set item in chrome.storage.local
 */
export async function setStorageItem<K extends keyof ChromeStorage>(
    key: K,
    value: ChromeStorage[K]
): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
            resolve();
        });
    });
}

/**
 * Remove item from chrome.storage.local
 */
export async function removeStorageItem<K extends keyof ChromeStorage>(
    key: K
): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.remove(key, () => {
            resolve();
        });
    });
}

/**
 * Clear all storage
 */
export async function clearStorage(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.clear(() => {
            resolve();
        });
    });
}

/**
 * Get all storage data
 */
export async function getAllStorage(): Promise<ChromeStorage> {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (result) => {
            resolve(result as ChromeStorage);
        });
    });
}

/**
 * Check if extension is registered (has auth token)
 */
export async function isRegistered(): Promise<boolean> {
    const auth = await getStorageItem(STORAGE_KEYS.AUTH);
    return !!auth?.token;
}

/**
 * Get auth token
 */
export async function getAuthToken(): Promise<string | null> {
    const auth = await getStorageItem(STORAGE_KEYS.AUTH);
    return auth?.token || null;
}
