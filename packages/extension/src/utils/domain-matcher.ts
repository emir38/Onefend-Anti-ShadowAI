/**
 * Domain Matching Utilities for Extension
 * Handles intelligent domain matching including subdomains
 */

/**
 * Normalizes a domain by removing www. prefix if present
 */
export function normalizeDomain(domain: string): string {
    return domain.toLowerCase().replace(/^www\./, '');
}

/**
 * Checks if a domain matches a pattern
 * Supports exact matches and subdomain matching
 * 
 * Examples:
 * - matchDomain('youtube.com', 'youtube.com') => true
 * - matchDomain('www.youtube.com', 'youtube.com') => true
 * - matchDomain('m.youtube.com', 'youtube.com') => true
 * - matchDomain('youtube.com', 'www.youtube.com') => false (pattern is more specific)
 * - matchDomain('google.com', 'youtube.com') => false
 */
export function matchDomain(actualDomain: string, patternDomain: string): boolean {
    const normalizedActual = actualDomain.toLowerCase();
    const normalizedPattern = patternDomain.toLowerCase();

    // Exact match
    if (normalizedActual === normalizedPattern) {
        return true;
    }

    // If pattern doesn't have www, check if actual is a subdomain of pattern
    if (!normalizedPattern.startsWith('www.')) {
        const basePattern = normalizedPattern;
        const normalizedActualWithoutWww = normalizedActual.replace(/^www\./, '');

        // Check if it's the same domain
        if (normalizedActualWithoutWww === basePattern) {
            return true;
        }

        // Check if it's a subdomain (e.g., m.youtube.com matches youtube.com)
        if (normalizedActualWithoutWww.endsWith('.' + basePattern)) {
            return true;
        }
    }

    return false;
}

/**
 * Finds the best matching domain from a list of patterns
 * Returns the most specific match (exact > subdomain)
 * 
 * @param actualDomain The domain to match against
 * @param patterns Array of objects with domain property
 * @returns The best matching object, or null if no match
 */
export function findBestDomainMatch<T extends { domain: string }>(
    actualDomain: string,
    patterns: T[]
): T | null {
    const matches: Array<{ item: T; specificity: number }> = [];

    for (const item of patterns) {
        if (matchDomain(actualDomain, item.domain)) {
            // Calculate specificity score
            // Exact match = 1000
            // Same domain with/without www = 100
            // Subdomain match = 10
            let specificity = 10;

            if (actualDomain.toLowerCase() === item.domain.toLowerCase()) {
                specificity = 1000; // Exact match
            } else if (normalizeDomain(actualDomain) === normalizeDomain(item.domain)) {
                specificity = 100; // Same domain, different www
            }

            matches.push({ item, specificity });
        }
    }

    if (matches.length === 0) {
        return null;
    }

    // Sort by specificity (highest first) and return the best match
    matches.sort((a, b) => b.specificity - a.specificity);
    return matches[0].item;
}
