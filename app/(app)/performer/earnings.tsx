import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

function formatPrice(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

type EarningsData = {
  totalEarnedPence: number;
  thisMonthPence: number;
  pendingPence: number;
  totalBookings: number;
  bookings: Array<{
    id: string;
    bookingStatus: string;
    priceTotalPence: number;
    eventName: string | null;
    eventDate: string | null;
    customerName: string | null;
    performerStageName: string | null;
    isManaged?: boolean;
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
};

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = React.useState<EarningsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchEarnings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError(null);
    const res = await apiFetch<EarningsData>('/api/performers/earnings');
    const valid =
      !res.error &&
      res.data != null &&
      typeof (res.data as EarningsData).totalEarnedPence === 'number' &&
      Array.isArray((res.data as EarningsData).bookings);
    setData(valid ? (res.data as EarningsData) : null);
    if (res.error && !valid) setFetchError(res.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEarnings();
    }, [fetchEarnings])
  );

  if (loading && !data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchEarnings(true)} tintColor={colors.primary} />
      }
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Earnings</Text>
      <Text style={styles.subtitle}>Track your bookings and income from performances.</Text>

      {fetchError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity onPress={() => fetchEarnings(true)} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.cardsRow}>
        <View style={[styles.summaryCard, styles.cardPrimary]}>
          <Text style={styles.summaryLabel}>Total earned</Text>
          <Text style={styles.summaryValue}>{data ? formatPrice(data.totalEarnedPence) : '—'}</Text>
        </View>
        <View style={[styles.summaryCard, styles.cardSuccess]}>
          <Text style={styles.summaryLabel}>This month</Text>
          <Text style={[styles.summaryValue, styles.textSuccess]}>{data ? formatPrice(data.thisMonthPence) : '—'}</Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={[styles.summaryCard, styles.cardPending]}>
          <Text style={styles.summaryLabel}>Pending requests</Text>
          <Text style={[styles.summaryValue, styles.textPending]}>{data ? formatPrice(data.pendingPence) : '—'}</Text>
        </View>
        <View style={[styles.summaryCard, styles.cardMuted]}>
          <Text style={styles.summaryLabel}>Total bookings</Text>
          <Text style={styles.summaryValue}>{data?.totalBookings ?? 0}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>All bookings</Text>
      {!data?.bookings?.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyDesc}>When customers book you, your earnings will appear here.</Text>
        </View>
      ) : (
        data.bookings.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.bookingRow}
            onPress={() => router.push({ pathname: '/(app)/performer/booking-detail', params: { id: b.id } } as any)}
            activeOpacity={0.7}
          >
            <View style={styles.bookingMain}>
              <Text style={styles.bookingCustomer}>{b.customerName ?? 'Customer'}</Text>
              <Text style={styles.bookingEvent}>
                {b.eventName ?? 'Booking'}{b.eventDate ? ` · ${new Date(b.eventDate).toLocaleDateString('en-GB')}` : ''}
              </Text>
              {b.isManaged && b.performerStageName ? (
                <Text style={styles.bookingManaged}>For {b.performerStageName}</Text>
              ) : null}
            </View>
            <View style={styles.bookingRight}>
              <View style={[styles.badge, (b.bookingStatus === 'PENDING_ACCEPTANCE' && styles.badgePending) || undefined]}>
                <Text style={styles.badgeText}>{STATUS_LABEL[b.bookingStatus] ?? b.bookingStatus}</Text>
              </View>
              <Text style={styles.bookingPrice}>{formatPrice(b.priceTotalPence)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg },
  back: { marginBottom: spacing.md },
  backText: { ...typography.body, color: colors.primary },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground, marginBottom: spacing.lg },
  cardsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  summaryCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  cardPrimary: { borderColor: 'rgba(87,30,143,0.3)', backgroundColor: 'rgba(87,30,143,0.08)' },
  cardSuccess: { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.08)' },
  cardPending: { borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.08)' },
  cardMuted: { borderColor: colors.border, backgroundColor: colors.muted },
  summaryLabel: { ...typography.caption, color: colors.mutedForeground, marginBottom: 4 },
  summaryValue: { ...typography.headline, color: colors.foreground },
  textSuccess: { color: '#047857' },
  textPending: { color: '#B45309' },
  sectionTitle: { ...typography.headline, color: colors.foreground, marginBottom: spacing.md },
  empty: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    backgroundColor: colors.muted,
    alignItems: 'center',
  },
  emptyTitle: { ...typography.body, fontWeight: '600', color: colors.foreground, marginBottom: spacing.xs },
  emptyDesc: { ...typography.bodySmall, color: colors.mutedForeground },
  errorBanner: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: 14, color: '#DC2626', marginBottom: spacing.sm },
  retryButton: { alignSelf: 'flex-start' },
  retryText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  bookingMain: { flex: 1, minWidth: 0 },
  bookingCustomer: { ...typography.body, fontWeight: '600', color: colors.foreground },
  bookingEvent: { ...typography.bodySmall, color: colors.mutedForeground, marginTop: 2 },
  bookingManaged: { ...typography.caption, color: colors.mutedForeground, marginTop: 2 },
  bookingRight: { alignItems: 'flex-end', marginLeft: spacing.sm },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.muted,
    marginBottom: 4,
  },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { ...typography.caption, color: colors.foreground },
  bookingPrice: { ...typography.body, fontWeight: '600', color: colors.foreground },
});
