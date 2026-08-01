/**
 * Onboarding script - Device registration flow
 */

import { registerDevice } from '@/api/client';
import { setStorageItem, STORAGE_KEYS } from '@/utils/storage';
import { getBrowserInfo, getOSInfo } from '@/utils/helpers';
import { EXTENSION_VERSION } from '@/config/constants';
import type { RegisterDeviceRequest, ExtensionMessage } from '@/types';

// DOM elements
const form = document.getElementById('registration-form') as HTMLFormElement;
const enrollmentTokenInput = document.getElementById('enrollment-token') as HTMLInputElement;
const identifierInput = document.getElementById('identifier') as HTMLInputElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const loadingEl = document.getElementById('loading')!;
const errorEl = document.getElementById('error-message')!;
const successEl = document.getElementById('success-message')!;

// Auto-fill from URL query params (when opened from invitation email link)
const urlParams = new URLSearchParams(window.location.search);
const prefilledToken = urlParams.get('token');
const prefilledIdentifier = urlParams.get('identifier') || urlParams.get('email');

if (prefilledToken && enrollmentTokenInput) {
    enrollmentTokenInput.value = prefilledToken;
}
if (prefilledIdentifier && identifierInput) {
    identifierInput.value = prefilledIdentifier;
}

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const enrollmentToken = enrollmentTokenInput.value.trim();
    const identifier = identifierInput.value.trim();

    if (!enrollmentToken || !identifier) {
        showError('Please fill in all fields');
        return;
    }

    submitBtn.disabled = true;
    await handleRegistration(enrollmentToken, identifier);
    submitBtn.disabled = false;
});

/**
 * Handle device registration
 */
async function handleRegistration(enrollmentToken: string, identifier: string) {
    try {
        // Show loading
        form.style.display = 'none';
        loadingEl.style.display = 'block';
        hideError();
        hideSuccess();

        // Get device info
        const browserInfo = getBrowserInfo();
        const os = getOSInfo();

        const request: RegisterDeviceRequest = {
            enrollmentToken,
            identifier,
            deviceType: 'EXTENSION',
            deviceInfo: {
                browser: browserInfo.browser,
                version: browserInfo.version,
                os,
                extensionVersion: EXTENSION_VERSION,
            },
        };

        // Call registration API
        const response = await registerDevice(request);

        if (!response.success) {
            throw new Error('Registration failed');
        }

        // Store auth data
        await setStorageItem(STORAGE_KEYS.AUTH, {
            token: response.token,
            deviceId: response.deviceId,
            userId: response.userId,
            enrollmentToken,
            identifier,
        });

        // Show success
        showSuccess('Registration successful! Redirecting...');

        // Trigger initial config sync
        await sendMessage({ type: 'SYNC_CONFIG' });

        // Redirect to popup after 2 seconds
        setTimeout(() => {
            window.close();
        }, 2000);

    } catch (error) {
        console.error('[Onboarding] Registration error:', error);

        // Show error
        form.style.display = 'block';
        loadingEl.style.display = 'none';

        const errorMessage = error instanceof Error ? error.message : 'Registration failed';
        showError(errorMessage);
        submitBtn.disabled = false;
    }
}

/**
 * Send message to background script
 */
function sendMessage(message: ExtensionMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

/**
 * Show error message
 */
function showError(message: string) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
    errorEl.style.display = 'none';
}

/**
 * Show success message
 */
function showSuccess(message: string) {
    successEl.textContent = message;
    successEl.style.display = 'block';
}

/**
 * Hide success message
 */
function hideSuccess() {
    successEl.style.display = 'none';
}
