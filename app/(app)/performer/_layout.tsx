import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { AppHeader } from '@/components/AppHeader';
import { HeaderMessagesIcon } from '@/components/HeaderMessagesIcon';
import { HeaderNotificationsIcon } from '@/components/HeaderNotificationsIcon';
import { colors, spacing, typography } from '@/lib/theme';

const TABS = [
  { name: 'Home', path: '/(app)/performer/home', pathMatch: '/performer/home', icon: 'home' as const },
  { name: 'Dashboard', path: '/(app)/performer', pathMatch: '/performer', icon: 'th-large' as const },
  { name: 'Bookings', path: '/(app)/performer/bookings', pathMatch: '/performer/bookings', icon: 'ticket' as const },
  { name: 'Availability', path: '/(app)/performer/availability', pathMatch: '/performer/availability', icon: 'calendar' as const },
  { name: 'Messages', path: '/(app)/performer/messages', pathMatch: '/performer/messages', icon: 'comment' as const },
  { name: 'Account', path: '/(app)/performer/account', pathMatch: '/performer/account', icon: 'user' as const },
] as const;

function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.tabBarWrap, { paddingBottom: bottomInset }]}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive =
            tab.pathMatch === '/performer/home'
              ? pathname === '/performer/home' || pathname.startsWith('/performer/home')
              : tab.pathMatch === '/performer'
                ? (pathname === '/performer' || pathname.startsWith('/performer/')) && !pathname.includes('home') && !pathname.includes('bookings') && !pathname.includes('booking-detail') && !pathname.includes('messages') && !pathname.includes('conversation') && !pathname.includes('account') && !pathname.includes('profile') && !pathname.includes('earnings') && !pathname.includes('shortlist') && !pathname.includes('reviews') && !pathname.includes('availability')
                : pathname.includes(tab.pathMatch) || (tab.pathMatch === '/performer/bookings' && pathname.includes('booking-detail')) || (tab.pathMatch === '/performer/messages' && pathname.includes('conversation')) || (tab.pathMatch === '/performer/availability' && pathname.includes('availability'));
          return (
            <TouchableOpacity
              key={tab.path}
              style={styles.tab}
              onPress={() => router.push(tab.path as any)}
              activeOpacity={0.6}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <FontAwesome
                  name={tab.icon}
                  size={22}
                  color={isActive ? colors.primary : colors.mutedForeground}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function PerformerLayout() {
  return (
    <View style={styles.container}>
      <AppHeader
        rightElement={
          <View style={styles.headerRight}>
            <HeaderNotificationsIcon
              bookingDetailRoute="/(app)/performer/booking-detail"
              conversationRoute="/(app)/performer/conversation"
              bookingsListRoute="/(app)/performer/bookings"
              messagesListRoute="/(app)/performer/messages"
            />
            <HeaderMessagesIcon messagesRoute="/(app)/performer/messages" />
          </View>
        }
      />
      <View style={styles.stackWrap}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="bookings" />
          <Stack.Screen name="booking-detail" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="conversation" />
          <Stack.Screen name="account" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="earnings" />
          <Stack.Screen name="shortlist" />
          <Stack.Screen name="reviews" />
          <Stack.Screen name="availability" />
        </Stack>
      </View>
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stackWrap: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  tabBarWrap: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapActive: {},
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  tabLabelActive: {
    fontWeight: '600',
    color: colors.primary,
  },
});
