/**
 * Regex Engine - Core pattern matching for sensitive data detection
 * Runs entirely in the browser for zero-latency detection
 */

import type { SensitiveDataPattern } from '@/types';

export interface PatternMatch {
    patternId: string;
    patternName: string;
    category: string;
    severity: string;
    action?: string;
    defaultAction?: string; // Legacy
    matchedText: string;
    startIndex: number;
    endIndex: number;
}

export interface AnalysisResult {
    hasMatches: boolean;
    matches: PatternMatch[];
    highestSeverity: string | null;
    categories: Set<string>;
}

/**
 * Analyze text against all active patterns
 */
export function analyzeText(
    text: string,
    patterns: SensitiveDataPattern[]
): AnalysisResult {
    const matches: PatternMatch[] = [];
    const categories = new Set<string>();
    let highestSeverity: string | null = null;

    // Severity ranking for comparison
    const severityRank: Record<string, number> = {
        'CRITICAL': 4,
        'HIGH': 3,
        'MEDIUM': 2,
        'LOW': 1,
    };

    for (const pattern of patterns) {
        try {
            let flags = 'g';
            if (!pattern.caseSensitive) flags += 'i';
            if (pattern.multiline) flags += 'm';

            const regex = new RegExp(pattern.regex, flags);
            let match: RegExpExecArray | null;

            while ((match = regex.exec(text)) !== null) {
                const matchedText = match[0];

                // Additional validation for specific patterns
                if (shouldIncludeMatch(pattern, matchedText)) {
                    matches.push({
                        patternId: pattern.id,
                        patternName: pattern.name,
                        category: pattern.category,
                        severity: pattern.severity,
                        action: pattern.action,
                        defaultAction: pattern.defaultAction || pattern.action || 'LOG',
                        matchedText: maskSensitiveData(matchedText),
                        startIndex: match.index,
                        endIndex: match.index + matchedText.length,
                    });

                    categories.add(pattern.category);

                    // Update highest severity
                    if (!highestSeverity ||
                        severityRank[pattern.severity] > severityRank[highestSeverity]) {
                        highestSeverity = pattern.severity;
                    }
                }

                // Prevent infinite loops on zero-width matches
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
        } catch (error) {
            console.error(`[RegexEngine] Error processing pattern ${pattern.name}:`, error);
        }
    }

    return {
        hasMatches: matches.length > 0,
        matches,
        highestSeverity,
        categories,
    };
}

/**
 * Additional validation for specific pattern types
 */
function shouldIncludeMatch(pattern: SensitiveDataPattern, matchedText: string): boolean {
    // Credit Card: Luhn algorithm validation
    if (pattern.name.toLowerCase().includes('credit card')) {
        return validateLuhn(matchedText.replace(/\D/g, ''));
    }

    // Add more specific validations as needed
    return true;
}

/**
 * Luhn algorithm for credit card validation
 */
function validateLuhn(cardNumber: string): boolean {
    if (!/^\d{13,19}$/.test(cardNumber)) {
        return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

/**
 * Mask sensitive data for logging (show first/last chars only)
 */
function maskSensitiveData(text: string): string {
    if (text.length <= 8) {
        return '***';
    }

    const visibleChars = 3;
    const start = text.substring(0, visibleChars);
    const end = text.substring(text.length - visibleChars);

    return `${start}...${end}`;
}

/**
 * Quick pre-check: does text contain any potential patterns?
 * Uses simple heuristics to avoid running all regexes on clean text
 */
export function quickScan(text: string): boolean {
    // Check for common indicators - intentionally broad to avoid false negatives
    const indicators = [
        /@/, // Email
        /\b\d{3}[\s-]?\d{2}[\s-]?\d/, // SSN/ID-like patterns
        /\b\d{4}[\s-]?\d{4}/, // Credit card/ID segments
        /AKIA|ASIA|AIza|ya29/, // Cloud keys
        /-----BEGIN/, // Private keys
        /Bearer|Basic/, // Auth headers
        /eyJ[A-Za-z0-9_-]/, // JWT
        /(ghp|glpat|npm|sk_live|pk_live|xoxb)/, // API key prefixes
        /AccountKey|AccountEndpoint/, // Azure
        /(postgres|mysql|mongodb|redis):\/\//, // DB
        /hooks\.slack\.com|discord\.com|webhook\.office\.com/, // Webhooks
        /0x[a-fA-F0-9]{8,}/, // Crypto addresses
        /\+\d{1,3}[\s-]?\d/, // Phone numbers
        /\b[A-Z]{2}\d{2}/, // IBAN-like
        /\b[A-Z]{4,6}\d{6}/, // Tax IDs (RFC, CURP, etc)
        /\b\d{2,3}[\s.-]\d{3}[\s.-]\d{3}/, // Formatted IDs (CPF, RUT, CNPJ, etc)
        /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IPv4 addresses
        /\b[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}/, // IPv6 addresses
        /\b[0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-]/, // MAC addresses
        /(CONFIDENTIAL|SECRET|PRIVATE|RESTRICTED)/i, // Classification
    ];

    return indicators.some(pattern => pattern.test(text));
}

/**
 * Batch analyze multiple text inputs
 */
export function batchAnalyze(
    inputs: string[],
    patterns: SensitiveDataPattern[]
): AnalysisResult {
    const combinedText = inputs.join('\n');
    return analyzeText(combinedText, patterns);
}
