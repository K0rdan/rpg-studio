import { LOGIN_PATH, buildLoginUrl } from '@/lib/authRoutes';

let redirecting = false;

/**
 * `fetch` for the editor's own `/api` routes. When the session has expired mid-session the API
 * answers 401, which cannot be turned into a server-side redirect, so send the browser to the
 * login screen here. Callers still receive the response and handle it as any other failure.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    redirectToLogin();
  }

  return response;
}

function redirectToLogin() {
  if (typeof window === 'undefined' || redirecting) {
    return;
  }

  const { pathname, search } = window.location;
  if (pathname === LOGIN_PATH) {
    return;
  }

  redirecting = true;
  window.location.assign(buildLoginUrl(`${pathname}${search}`));
}
