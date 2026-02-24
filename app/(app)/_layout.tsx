import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const redirected = useRef(false);

  useEffect(() => {
    if (!user) return;
    const sub = segments[1];
    let target: string | null = null;
    if (user.role === 'ADMIN') target = '/(app)/admin';
    else if (user.role === 'PERFORMER') target = '/(app)/performer';
    else if (user.role === 'BUSINESS') target = '/(app)/business';
    else target = '/(app)/(tabs)';
    const onCorrectRoute =
      (user.role === 'ADMIN' && sub === 'admin') ||
      (user.role === 'PERFORMER' && sub === 'performer') ||
      (user.role === 'BUSINESS' && sub === 'business') ||
      ((user.role === 'END_USER' || !target) && sub === '(tabs)');
    if (target && !onCorrectRoute && !redirected.current) {
      redirected.current = true;
      router.replace(target as any);
    }
  }, [user, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="performer" />
      <Stack.Screen name="business" />
    </Stack>
  );
}
