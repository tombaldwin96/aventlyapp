import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { AppHeader } from '@/components/AppHeader';
import { HeaderNotificationsIcon } from '@/components/HeaderNotificationsIcon';
import { HeaderMessagesIcon } from '@/components/HeaderMessagesIcon';
import AppHomeContent from '@/components/AppHomeContent';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/lib/theme';

function getDashboardRoute(role: string): string {
  if (role === 'ADMIN') return '/(app)/admin';
  if (role === 'PERFORMER') return '/(app)/performer';
  if (role === 'BUSINESS') return '/(app)/business';
  return '/(app)/(tabs)';
}

/** App homepage (website-style): header + logo, hero search for performers. Reachable from all dashboards via Home tab. */
export default function AppHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const dashboardRoute = user ? getDashboardRoute(user.role) : null;
  const isPerformer = user?.role === 'PERFORMER';

  const rightElement = (
    <View style={styles.headerRight}>
      <HeaderNotificationsIcon
        bookingDetailRoute={isPerformer ? '/(app)/performer/booking-detail' : '/(app)/(tabs)/bookings'}
        conversationRoute={isPerformer ? '/(app)/performer/conversation' : '/(app)/(tabs)/messages'}
        bookingsListRoute={isPerformer ? '/(app)/performer/bookings' : '/(app)/(tabs)/bookings'}
        messagesListRoute={isPerformer ? '/(app)/performer/messages' : '/(app)/(tabs)/messages'}
      />
      <HeaderMessagesIcon messagesRoute={isPerformer ? '/(app)/performer/messages' : '/(app)/(tabs)/messages'} />
      {dashboardRoute ? (
        <TouchableOpacity
          onPress={() => router.replace(dashboardRoute as any)}
          style={styles.dashboardIcon}
          activeOpacity={0.7}
          accessibilityLabel="Go to dashboard"
        >
          <FontAwesome name="th-large" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader showBack={false} rightElement={rightElement} />
      <AppHomeContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dashboardIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
