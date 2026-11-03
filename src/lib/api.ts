import type { Session } from '../types';

const configured = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE = configured?.replace(/\/$/, '') || '';
export const configurationError = (() => {
  try {
    const url = new URL(API_BASE);
    if (url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/api/customer')) throw Error();
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw Error();
    return '';
  } catch { return 'The customer API is not configured. Set VITE_API_BASE_URL to the complete HTTPS customer API URL.'; }
})();

let session: Session | null = null;
const expiredListeners = new Set<() => void>();
export function setSession(value: Session | null) { session = value; }
export function onExpired(listener: () => void) { expiredListeners.add(listener); return () => { expiredListeners.delete(listener); }; }
export function expireSession() {
  session = null;
  for (const listener of expiredListeners) listener();
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = '', public uncertain = false) { super(message); }
}

function errorMessage(status: number, code: string, message: string) {
  if (status === 401) return code === 'INVALID_CREDENTIALS'
    ? 'We could not sign you in. Check your customer credentials. After repeated attempts, wait 15 minutes before trying again.'
    : 'Your session has ended. Sign in again to continue.';
  if (status === 403) return 'This portal does not have access to that request. Check the configured portal origin or contact your demo administrator.';
  if (status === 404) return 'This submission or document is not available to your account.';
  if (status === 413) return 'This upload is too large. Each PDF must be 10 MB or smaller, with no more than 10 files.';
  if (status === 429) return 'Too many requests. Please wait a moment before trying again.';
  if (status === 426) return 'A secure HTTPS API connection is required. Contact your demo administrator.';
  if (status >= 500) return 'Document processing is temporarily unavailable. The result of an upload may be uncertain; check your submissions or retry the same request.';
  if (status === 409 && code === 'IDEMPOTENCY_CONFLICT') return 'This retry does not match the original upload. Reselect the same files in their original order.';
  if (status === 409 && code === 'ALREADY_ROUTED') return 'This application is already with Operations and cannot be changed.';
  return message || 'The request could not be completed. Please try again.';
}

export async function api<T>(path: string, options: RequestInit & { timeout?: number; anonymous?: boolean } = {}): Promise<T> {
  if (configurationError) throw new ApiError(0, configurationError);
  const { timeout = 30000, anonymous = false, signal, ...init } = options;
  if (!anonymous && (!session || Date.parse(session.expiresAt) <= Date.now())) {
    expireSession(); throw new ApiError(401, 'Your session has ended. Sign in again to continue.');
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = window.setTimeout(() => controller.abort(), timeout);
  const mutation = init.method === 'POST' && init.body instanceof FormData;
  try {
    const headers = new Headers(init.headers);
    if (!anonymous && session) headers.set('Authorization', `Bearer ${session.accessToken}`);
    const response = await fetch(API_BASE + path, { ...init, headers, signal: controller.signal, credentials: 'omit', cache: 'no-store' });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && !anonymous) expireSession();
      throw new ApiError(response.status, errorMessage(response.status, data?.code || '', data?.message || ''), data?.code || '', mutation && response.status >= 500);
    }
    if (response.status !== 204 && data === null) throw new ApiError(502, 'The server returned an unreadable response. Check your submissions before retrying an upload.', '', mutation);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError || signal?.aborted) throw error;
    throw new ApiError(0, controller.signal.aborted
      ? 'The request took too long to confirm. It may still complete. Check your submissions or retry the same files safely.'
      : 'We could not reach the customer API. Check your connection and try again. An upload may still have been received.',
    'CONNECTION_UNCERTAIN', mutation);
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', cancel);
  }
}

export const jsonPost = <T,>(path: string, body: unknown, anonymous = false) => api<T>(path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), anonymous,
});
