export const LOGIN_PATH = '/login';

export const RETURN_TO_PARAM = 'returnTo';

/** Set by `src/proxy.ts` so server components know which URL to come back to after login. */
export const RETURN_TO_HEADER = 'x-return-to';

/** Rejects anything that is not a same-origin path, so `returnTo` can't be used as an open redirect. */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  return value;
}

export function buildLoginUrl(returnTo?: string | null): string {
  const target = sanitizeReturnTo(returnTo);
  if (!target) {
    return LOGIN_PATH;
  }
  return `${LOGIN_PATH}?${RETURN_TO_PARAM}=${encodeURIComponent(target)}`;
}
