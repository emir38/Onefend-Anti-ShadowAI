/**
 * Shared SSO cookie configuration.
 * Used by auth.controller.ts and mfa.controller.ts.
 */
export const SSO_COOKIE_NAME = 'onefend_session';

export const SSO_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: (process.env.COOKIE_SECURE === 'true' ? 'strict' : 'lax') as 'strict' | 'lax',
  // [Security] If COOKIE_DOMAIN is not set in production, cookies may be shared
  // across subdomains. Ensure COOKIE_DOMAIN is configured for production deployments.
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
  maxAge: 1000 * 60 * 60 * 24, // 24 hours in MILLISECONDS (Express uses ms)
};
