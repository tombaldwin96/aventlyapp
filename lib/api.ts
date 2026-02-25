import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const API_BASE_KEY = 'avently_api_base';

/** Set before verifyOtp so the first /api/auth/me call (e.g. from AuthContext) includes X-Signup-Role and creates the correct profile. */
let pendingSignupRole: string | null = null;
export function setPendingSignupRole(role: string | null): void {
  pendingSignupRole = role;
}
export function getPendingSignupRole(): string | null {
  return pendingSignupRole;
}

/** When true, AuthContext must not call /api/auth/me on SIGNED_IN so only the login screen's request (with X-Signup-Role) runs. */
let signupInProgress = false;
export function setSignupInProgress(value: boolean): void {
  signupInProgress = value;
}
export function getSignupInProgress(): boolean {
  return signupInProgress;
}

export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_APP_URL ?? '';
  if (__DEV__ && !url) {
    console.warn('[API] EXPO_PUBLIC_APP_URL not set. Web API calls (e.g. /api/auth/me) will fail.');
  }
  return url.replace(/\/$/, '');
}

const SESSION_TIMEOUT_MS = 8000;

export async function getAccessToken(): Promise<string | null> {
  try {
    const sessionPromise = supabase.auth.getSession();
    const session = await Promise.race([
      sessionPromise.then(({ data: { session } }) => session),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Session timeout')), SESSION_TIMEOUT_MS)
      ),
    ]);
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Public GET (no auth). For taxonomy, search, etc. */
export async function fetchPublic<T>(path: string): Promise<{ data?: T; error?: string }> {
  const base = getApiBaseUrl();
  if (!base) return { error: 'API URL not configured' };
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: (data as { error?: string })?.error ?? 'Request failed' };
    return { data: data as T };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' };
  }
}

/** Fetch from the Avently web API with current Supabase access token. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { error: 'API URL not configured', status: 0 };
  }
  const token = await getAccessToken();
  let url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Access-Token'] = token;
  }
  if (path === '/api/auth/me' && pendingSignupRole) {
    headers['X-Signup-Role'] = pendingSignupRole;
    if (pendingSignupRole === 'PERFORMER') {
      headers['X-Signup-Intent'] = 'partner';
      url = url.includes('?') ? `${url}&intent=partner` : `${url}?intent=partner`;
    }
    pendingSignupRole = null;
  }
  if (path === '/api/auth/me' && !token) {
    return { error: 'Not signed in', status: 401 };
  }

  const method =
    options.method ?? (path === '/api/auth/me' ? 'POST' : undefined);
  try {
    let res = await fetch(url, { ...options, method: method ?? 'GET', headers });
    if (res.status === 405 && (method === 'GET' || !options.method)) {
      res = await fetch(url, { ...options, method: 'POST', headers });
    }
    const text = await res.text();
    let data: T | undefined;
    try {
      data = text ? (JSON.parse(text) as T) : undefined;
    } catch {
      // non-JSON response
    }
    if (!res.ok) {
      const err =
        (data as { error?: string })?.error ||
        res.statusText ||
        (res.status ? `Request failed (${res.status})` : 'Request failed');
      if (__DEV__) console.warn('[API]', path, res.status, err);
      return { error: err, data, status: res.status };
    }
    return { data: data as T, status: res.status };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error';
    if (__DEV__) console.warn('[API]', path, message);
    return { error: message, status: 0 };
  }
}

export async function setApiBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(API_BASE_KEY, url);
}

export async function getStoredApiBaseUrl(): Promise<string | null> {
  return AsyncStorage.getItem(API_BASE_KEY);
}

/** Try DELETE /api/auth/me then POST /api/auth/delete-account. Returns first success or last error. */
export async function deleteAccount(): Promise<{ error?: string; status: number }> {
  const tryDelete = async (path: string, method: 'DELETE' | 'POST'): Promise<{ error?: string; status: number }> => {
    const res = await apiFetch<{ ok?: boolean }>(path, { method });
    if (res.status === 404) return { error: 'Not found', status: 404 };
    if (res.error || (res.status >= 400 && res.status !== 404)) {
      return { error: res.error ?? `Request failed (${res.status})`, status: res.status };
    }
    return { status: res.status };
  };
  const del = await tryDelete('/api/auth/me', 'DELETE');
  if (del.status !== 404 && !del.error) return del;
  const post = await tryDelete('/api/auth/delete-account', 'POST');
  if (post.status === 404) {
    return {
      error: "Account deletion isn't available in the app yet. Please delete your account from the website or contact support.",
      status: 404,
    };
  }
  return post;
}
