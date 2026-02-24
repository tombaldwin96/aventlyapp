import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type BookingItem = {
  id: string;
  bookingStatus: string;
  eventName: string | null;
  eventDate: string | null;
  customerName: string | null;
  performerStageName: string | null;
  isPerformer: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
};

export default function PerformerBookings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [bookings, setBookings] = React.useState<BookingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const res = await apiFetch<{ bookings: BookingItem[] }>('/api/bookings');
    if (res.data?.bookings) setBookings(res.data.bookings);
    else setBookings([]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const renderItem = ({ item }: { item: BookingItem }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push({ pathname: '/(app)/performer/booking-detail', params: { id: item.id } } as any)}
      activeOpacity={0.7}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{item.customerName ?? 'Customer'}</Text>
        <Text style={styles.rowSub}>
          {item.eventName ?? 'Booking'}
          {item.eventDate ? ` · ${new Date(item.eventDate).toLocaleDateString('en-GB')}` : ''}
        </Text>
      </View>
      <View style={[styles.badge, item.bookingStatus === 'PENDING_ACCEPTANCE' && styles.badgePending]}>
        <Text style={styles.badgeText}>{STATUS_LABEL[item.bookingStatus] ?? item.bookingStatus}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && bookings.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.subtitle}>View and respond to requests</Text>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySub}>When customers book you, they'll appear here.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { ...typography.title, color: colors.foreground },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground, marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: '600', color: colors.foreground },
  rowSub: { ...typography.bodySmall, color: colors.mutedForeground, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm, backgroundColor: colors.muted },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { ...typography.caption, color: colors.foreground },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyTitle: { ...typography.headline, color: colors.foreground },
  emptySub: { ...typography.bodySmall, color: colors.mutedForeground, marginTop: spacing.xs },
});
