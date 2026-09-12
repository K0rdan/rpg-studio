import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { RETURN_TO_HEADER, buildLoginUrl } from '@/lib/authRoutes';

export type ServerSession = Awaited<ReturnType<typeof auth.api.getSession>>;

/** Cached per request so nested layouts/pages share a single session lookup. */
export const getServerSession = cache(async (): Promise<ServerSession> => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.error('[Auth] Session lookup failed:', error instanceof Error ? error.message : error);
    return null;
  }
});

/**
 * Returns the current session, or redirects to the login screen when the session is
 * missing, expired or revoked.
 */
export async function requireSession(): Promise<NonNullable<ServerSession>> {
  const session = await getServerSession();

  if (!session?.user?.id) {
    const requestHeaders = await headers();
    redirect(buildLoginUrl(requestHeaders.get(RETURN_TO_HEADER)));
  }

  return session;
}
