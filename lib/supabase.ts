import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

if (__DEV__ && (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey.includes('placeholder'))) {
  console.warn('[Supabase] Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env for auth to work.');
}

/** In-memory fallback when native storage is unavailable (e.g. Expo web, native module null). */
const memoryStore = new Map<string, string>();

function getWebStorage(): Storage | null {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as unknown as { localStorage?: Storage }).localStorage === 'object') {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return null;
}

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** Storage: SecureStore (native) with AsyncStorage fallback; localStorage on web; in-memory fallback. Keeps user logged in until they sign out. */
const SupabaseStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        const ls = getWebStorage();
        return ls ? ls.getItem(key) : null;
      } catch {
        return memoryStore.get(key) ?? null;
      }
    }
    if (isNative) {
      try {
        const fromSecure = await SecureStore.getItemAsync(key);
        if (fromSecure != null) return fromSecure;
      } catch {}
      try {
        const fromAsync = await AsyncStorage.getItem(key);
        return fromAsync ?? memoryStore.get(key) ?? null;
      } catch {
        return memoryStore.get(key) ?? null;
      }
    }
    try {
      return await AsyncStorage.getItem(key) ?? memoryStore.get(key) ?? null;
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        const ls = getWebStorage();
        if (ls) ls.setItem(key, value);
        else memoryStore.set(key, value);
      } catch (e) {
        memoryStore.set(key, value);
        if (__DEV__) console.warn('[Supabase] localStorage.setItem failed:', e);
      }
      return;
    }
    if (isNative) {
      try {
        await SecureStore.setItemAsync(key, value);
        try { await AsyncStorage.setItem(key, value); } catch {}
        return;
      } catch (e) {
        if (__DEV__) console.warn('[Supabase] SecureStore.setItem failed (e.g. size limit), using AsyncStorage:', e);
      }
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      memoryStore.set(key, value);
      if (__DEV__) console.warn('[Supabase] AsyncStorage.setItem failed, using memory:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);
    if (Platform.OS === 'web') {
      try {
        const ls = getWebStorage();
        if (ls) ls.removeItem(key);
      } catch {}
      return;
    }
    if (isNative) {
      try { await SecureStore.deleteItemAsync(key); } catch {}
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SupabaseStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
