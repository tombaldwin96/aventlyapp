import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/lib/theme';

/** Dev-only: auth state and session sanity. Do not link from production UI. */
export default function AuthDebugScreen() {
  const { user } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<{ expiry?: string; userId?: string } | null>(null);

  useEffect(() => {
    if (!__DEV__) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const exp = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : '—';
        setSessionInfo({ expiry: exp, userId: session.user?.id });
      } else {
        setSessionInfo(null);
      }
    });
  }, [user]);

  if (!__DEV__) return null;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const urlSanity = supabaseUrl ? `${supabaseUrl.slice(0, 30)}…` : 'NOT SET';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Auth debug (dev only)</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Current user id (DB)</Text>
        <Text style={styles.value}>{user?.id ?? '—'}</Text>
        <Text style={styles.label}>Profile role</Text>
        <Text style={styles.value}>{user?.role ?? '—'}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? '—'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Session expiry (Supabase)</Text>
        <Text style={styles.value}>{sessionInfo?.expiry ?? '—'}</Text>
        <Text style={styles.label}>Supabase auth user id</Text>
        <Text style={styles.value}>{sessionInfo?.userId ?? '—'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Supabase URL (sanity, no secrets)</Text>
        <Text style={styles.value}>{urlSanity}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 12, color: colors.mutedForeground, marginBottom: 4 },
  value: { fontSize: 14, color: colors.foreground, fontFamily: Platform?.OS === 'ios' ? 'Menlo' : 'monospace' },
});
