import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { RETURN_TO_HEADER, buildLoginUrl } from '@/lib/authRoutes';

/**
 * Cheap cookie-only gate for authenticated pages: an expired session cookie is dropped by the
 * browser, so this catches the common case without a database round-trip. The cookie is not
 * validated here — `requireSession()` re-checks it server-side for every protected segment.
 */
export default function proxy(request: NextRequest) {
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL(buildLoginUrl(returnTo), request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(RETURN_TO_HEADER, returnTo);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/projects/:path*'],
};
