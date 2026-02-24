import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const API_BASE_KEY = 'avently_api_base';

export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_APP_URL ?? '';
  if (__DEV__ && !url) {
    console.warn('[API] EXPO_PUBLIC_APP_URL not set. Web API calls (e.g. /api/auth/me) will fail.');
  }
  return url.replace(/\/$/, '');
}

export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
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
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Access-Token'] = token;
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
