/**
 * CSRF protection via Origin header validation.
 *
 * All modern browsers send the Origin header on POST requests.
 * We compare it against our known app origins to block cross-site requests.
 */

export function validateCsrfOrigin(request: Request): boolean {
  // Bearer token requests are inherently CSRF-safe — the token
  // cannot be auto-attached by a cross-site attacker like cookies can.
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check Origin header (most reliable, always sent on cross-origin POST)
  const origin = request.headers.get('Origin');
  if (origin) {
    return allowedOrigins.some((allowed) => origin === allowed);
  }

  // Fallback to Referer header
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return allowedOrigins.some((allowed) => refererOrigin === allowed);
    } catch {
      return false;
    }
  }

  // No Origin and no Referer — reject. All modern browsers send Origin on POST.
  return false;
}

function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      origins.push(new URL(appUrl).origin);
    } catch {
      // invalid URL in env var
    }
  }

  // Vercel preview deployments set VERCEL_URL (no protocol)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    origins.push(`https://${vercelUrl}`);
  }

  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:3001');
    origins.push('http://127.0.0.1:3000');
  }

  return origins;
}

export function csrfForbiddenResponse(): Response {
  return Response.json(
    { error: 'Forbidden: invalid request origin' },
    { status: 403 },
  );
}
