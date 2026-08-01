import { NextRequest, NextResponse } from 'next/server';

const SSO_COOKIE_NAME = 'onefend_session';
const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'ANALYST', 'USER', 'VIEWER'];

// ── Session validation cache ──
// Keyed by SHA-256 hash of the full token (not truncated)
// 30-second TTL for security/performance balance
// Max 500 entries to prevent memory leak
const SESSION_CACHE_TTL_MS = 30_000;
const SESSION_CACHE_NEGATIVE_TTL_MS = 5_000;
const SESSION_CACHE_MAX_SIZE = 500;

type SessionResult = { valid: boolean; role?: string; userId?: string };
type CacheEntry = { result: SessionResult; expires: number };
const sessionCache = new Map<string, CacheEntry>();

/** Generate a SHA-256 hash of the token to use as a secure cache key */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Evict expired entries and limit cache size */
function evictCache(): void {
  const now = Date.now();

  // First remove expired entries
  for (const [key, entry] of sessionCache) {
    if (entry.expires <= now) sessionCache.delete(key);
  }

  // If still exceeding the limit, remove the oldest entries
  if (sessionCache.size > SESSION_CACHE_MAX_SIZE) {
    const excess = sessionCache.size - SESSION_CACHE_MAX_SIZE;
    const keys = sessionCache.keys();
    for (let i = 0; i < excess; i++) {
      const next = keys.next();
      if (!next.done) sessionCache.delete(next.value);
    }
  }
}

/** Decode a JWT payload without verifying signature (Edge Runtime compatible) */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/** Build the API base URL for server-side calls to the backend */
function getApiBase(req: NextRequest): string {
  // In Docker, use internal URL to reach backend directly
  if (process.env.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL;
  }
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'http';
  return forwardedHost
    ? `${forwardedProto}://${forwardedHost}/api/v1`
    : `${req.nextUrl.origin}/api/v1`;
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SECURITY MIDDLEWARE -- Onefend Frontend
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Validation strategy:
 *  1. Decode JWT locally (no signature) -> reject malformed/expired tokens
 *  2. Validate with backend (signature + blacklist) -> result cached for 30s
 *  3. Cache keyed by SHA-256 hash of the full token (not truncated)
 *  4. Cache with short TTL (30s) so token revocation takes effect quickly
 *  5. Max 500 entries with automatic eviction
 *
 *  PUBLIC ROUTES: /login, /forgot-password, /reset-password/*, static assets
 *  PROTECTED ROUTES: /dashboard/*, /docs/*
 * ═══════════════════════════════════════════════════════════════════════
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ══════════════════════════════════════════════
  // 1. STATIC FILES -- full bypass
  // ══════════════════════════════════════════════
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/')
  ) {
    return NextResponse.next();
  }

  // ══════════════════════════════════════════════
  // 2. AUTH PAGES -- public
  // ══════════════════════════════════════════════
  if (
    pathname === '/forgot-password' ||
    pathname.startsWith('/reset-password')
  ) {
    return NextResponse.next();
  }

  // /login -- if coming from docs.onefend.io without ?return, inject ?return=/docs
  if (pathname === '/login') {
    const host = req.headers.get('host') || '';
    const hasReturn = req.nextUrl.searchParams.has('return');

    if (host.startsWith('docs.') && !hasReturn) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('return', '/docs');
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ══════════════════════════════════════════════
  // 3. /docs/login -> redirect to unified login
  // ══════════════════════════════════════════════
  if (pathname === '/docs/login' || pathname === '/docs/login/') {
    return NextResponse.redirect(new URL('/login?return=/docs', req.url));
  }

  // ══════════════════════════════════════════════
  // 4. Helper: validate session (JWT decode + backend validation + cache)
  // ══════════════════════════════════════════════
  const sessionCookie = req.cookies.get(SSO_COOKIE_NAME)?.value;

  const validateSession = async (): Promise<SessionResult> => {
    if (!sessionCookie) return { valid: false };

    // ── Local pre-validation: JWT structure, expiration, type ──
    const payload = decodeJwtPayload(sessionCookie);
    if (!payload) return { valid: false };
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return { valid: false };
    if (payload.type && payload.type !== 'user') return { valid: false };
    if (!payload.userId) return { valid: false };

    // ── Cache lookup by SHA-256 hash of the full token ──
    const cacheKey = await hashToken(sessionCookie);
    const cached = sessionCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }

    // ── Full validation with backend (JWT signature, Redis blacklist, user exists) ──
    try {
      const apiBase = getApiBase(req);
      const res = await fetch(`${apiBase}/auth/validate-cookie`, {
        method: 'GET',
        headers: { Cookie: `${SSO_COOKIE_NAME}=${sessionCookie}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        const failResult: SessionResult = { valid: false };
        sessionCache.set(cacheKey, { result: failResult, expires: Date.now() + SESSION_CACHE_NEGATIVE_TTL_MS });
        evictCache();
        return failResult;
      }

      const data = await res.json();
      const result: SessionResult = data.valid
        ? { valid: true, role: data.role, userId: data.userId }
        : { valid: false };

      sessionCache.set(cacheKey, {
        result,
        expires: Date.now() + (result.valid ? SESSION_CACHE_TTL_MS : SESSION_CACHE_NEGATIVE_TTL_MS),
      });
      evictCache();
      return result;
    } catch {
      // Network error/timeout -- do not cache, allow immediate retry
      return { valid: false };
    }
  };

  // ══════════════════════════════════════════════
  // 5. ROOT ROUTE (/) -- smart redirect based on subdomain
  // ══════════════════════════════════════════════
  if (pathname === '/') {
    const host = req.headers.get('host') || '';
    const isDocs = host.startsWith('docs.');
    const session = await validateSession();

    if (session.valid) {
      return NextResponse.redirect(new URL(isDocs ? '/docs' : '/dashboard', req.url));
    }

    if (isDocs) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('return', '/docs');
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ══════════════════════════════════════════════
  // 6. /dashboard/* -- protect with middleware
  //    On docs.onefend.io, redirect to /docs instead of showing dashboard
  // ══════════════════════════════════════════════
  if (pathname.startsWith('/dashboard')) {
    const host = req.headers.get('host') || '';
    if (host.startsWith('docs.')) {
      return NextResponse.redirect(new URL('/docs', req.url));
    }

    const session = await validateSession();
    if (!session.valid) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Inject data into headers for Server Components
    const headers = new Headers(req.headers);
    headers.set('x-user-id', session.userId || '');
    headers.set('x-user-role', session.role || '');

    return NextResponse.next({ request: { headers } });
  }

  // ══════════════════════════════════════════════
  // 7. /docs/* -- protect with middleware and handle base path
  // ══════════════════════════════════════════════
  if (pathname.startsWith('/docs')) {
    // Redirect /docs to /docs/es
    if (pathname === '/docs' || pathname === '/docs/') {
      return NextResponse.redirect(new URL('/docs/es', req.url));
    }

    const session = await validateSession();
    if (!session.valid) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('return', pathname);
      if (sessionCookie) {
        loginUrl.searchParams.set('expired', '1');
      }
      return NextResponse.redirect(loginUrl);
    }

    if (!ALLOWED_ROLES.includes(session.role || '')) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('return', '/docs');
      loginUrl.searchParams.set('unauthorized', '1');
      return NextResponse.redirect(loginUrl);
    }

    const headers = new Headers(req.headers);
    headers.set('x-user-id', session.userId || '');
    headers.set('x-user-role', session.role || '');

    return NextResponse.next({ request: { headers } });
  }

  // ══════════════════════════════════════════════
  // 8. Any other route -- pass through
  // ══════════════════════════════════════════════
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/forgot-password',
    '/reset-password/:path*',
    '/dashboard/:path*',
    '/docs',
    '/docs/:path*',
  ],
};
