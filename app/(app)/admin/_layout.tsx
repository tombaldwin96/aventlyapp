import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { colors, spacing, typography } from '@/lib/theme';

const TABS = [
  { name: 'Home', path: '/(app)/home', pathMatch: '/home', icon: '🏠' },
  { name: 'Dashboard', path: '/(app)/admin', pathMatch: '/admin', icon: '◉' },
] as const;

function TabBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive =
          tab.pathMatch === '/home' ? (pathname === '/home' || pathname.startsWith('/home')) : pathname === tab.pathMatch || pathname.startsWith(tab.pathMatch + '/');
        return (
          <TouchableOpacity
            key={tab.path}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => router.push(tab.path as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, isActive && styles.tabTextActive]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, isActive && styles.tabTextActive]} numberOfLines={1}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminLayout() {
  return (
    <View style={styles.container}>
      <AppHeader />
      <View style={styles.stackWrap}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </View>
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stackWrap: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  tabActive: {},
  tabIcon: { fontSize: 18, marginBottom: 2, color: colors.mutedForeground },
  tabLabel: { ...typography.caption, color: colors.mutedForeground },
  tabTextActive: { color: colors.primary },
});
