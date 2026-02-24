import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import type { DashboardData } from '@/lib/types';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { useFocusEffect } from 'expo-router';
import { PerformerOnboardingModal } from '@/components/PerformerOnboardingModal';

const APPROVED_BANNER_DISMISSED_KEY = 'avently_performer_approved_banner_dismissed';

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    description: 'Complete your application to submit for review.',
    bg: '#FEF3C7',
    border: '#F59E0B',
    text: '#92400E',
  },
  PENDING_REVIEW: {
    label: 'Under review',
    description: "We're reviewing your profile and will get back to you by email shortly.",
    bg: '#FFFBEB',
    border: '#F59E0B',
    text: '#92400E',
  },
  APPROVED: {
    label: 'Approved',
    description: 'Your profile is live. You can receive and manage bookings.',
    bg: '#ECFDF5',
    border: '#10B981',
    text: '#047857',
  },
} as const;

const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
};

export default function PerformerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [approvedBannerDismissed, setApprovedBannerDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const v = await AsyncStorage.getItem(APPROVED_BANNER_DISMISSED_KEY);
        if (!cancelled) setApprovedBannerDismissed(v === 'true');
      } catch {
        // AsyncStorage unavailable (e.g. native module null on web/simulator)
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const dismissApprovedBanner = useCallback(() => {
    setApprovedBannerDismissed(true);
    try {
      AsyncStorage.setItem(APPROVED_BANNER_DISMISSED_KEY, 'true').catch(() => {});
    } catch {
      // AsyncStorage unavailable
    }
  }, []);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const res = await apiFetch<DashboardData>('/api/dashboard');
    if (res.error || !res.data) {
      setError(res.error ?? 'Failed to load dashboard');
      setData(null);
    } else {
      setData(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = useCallback(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  if (loading && !data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.mutedText}>Loading dashboard…</Text>
      </View>
    );
  }

  const statusKey = (data?.applicationStatus ?? 'DRAFT') as keyof typeof STATUS_CONFIG;
  const statusConfig = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.DRAFT;
  const showOnboarding = statusKey === 'DRAFT';

  return (
    <>
      <PerformerOnboardingModal
        visible={showOnboarding}
        onComplete={() => fetchDashboard()}
      />
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl + 80 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Welcome */}
      <View style={styles.welcome}>
        <Text style={styles.welcomeLabel}>Dashboard</Text>
        <Text style={styles.welcomeTitle}>
          {data?.user?.name ?? user?.name ?? user?.email?.split('@')[0] ?? 'there'}
        </Text>
        <Text style={styles.subtitle}>
          Manage your profile, availability and bookings.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Managed by notice */}
      {data?.managedBy && (
        <View style={styles.managedBy}>
          <Text style={styles.managedByText}>
            You are managed by <Text style={styles.managedByBold}>{data.managedBy}</Text>.
          </Text>
        </View>
      )}

      {/* Status banner (hide approved banner once dismissed forever) */}
      {(statusKey !== 'APPROVED' || !approvedBannerDismissed) && (
        <View
          style={[
            styles.statusBanner,
            statusKey === 'APPROVED' && styles.statusBannerCompact,
            { backgroundColor: statusConfig.bg, borderLeftColor: statusConfig.border },
          ]}
        >
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.border }]} />
            <View style={styles.statusTextBlock}>
              <Text style={[styles.statusLabel, statusKey === 'APPROVED' && styles.statusLabelCompact, { color: statusConfig.text }]}>
                {statusConfig.label}
              </Text>
              <Text style={[styles.statusDescription, statusKey === 'APPROVED' && styles.statusDescriptionCompact]}>
                {statusConfig.description}
              </Text>
            </View>
            {statusKey === 'APPROVED' && (
              <TouchableOpacity
                onPress={dismissApprovedBanner}
                style={styles.statusDismiss}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Dismiss"
              >
                <Text style={[styles.statusDismissText, { color: statusConfig.text }]}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* New booking request */}
      {data && data.pendingBookingCount > 0 && (
        <TouchableOpacity
          style={styles.bookingRequestCard}
          onPress={() => router.push('/(app)/performer/bookings')}
          activeOpacity={0.92}
        >
          <View style={styles.bookingRequestIconWrap}>
            <FontAwesome name="bell" size={20} color="#B45309" />
          </View>
          <Text style={styles.bookingRequestTitle}>New booking request{data.pendingBookingCount === 1 ? '' : 's'}</Text>
          <Text style={styles.bookingRequestDesc}>
            {data.pendingBookingCount} request{data.pendingBookingCount === 1 ? '' : 's'} waiting. Review and respond.
          </Text>
          {data.pendingRequests[0] && (
            <Text style={styles.bookingRequestDetail}>
              {data.pendingRequests[0].customerName} · {data.pendingRequests[0].eventName}
              {data.pendingRequests[0].eventDate ? ` · ${data.pendingRequests[0].eventDate}` : ''}
            </Text>
          )}
          <Text style={styles.bookingRequestCta}>View requests</Text>
        </TouchableOpacity>
      )}

      {/* Your profile card */}
      {data?.profileCardData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your profile</Text>
          <View style={styles.profileCard}>
            {data.profileCardData.profileImageUrl ? (
              <Image
                source={{ uri: data.profileCardData.profileImageUrl }}
                style={styles.profileImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                <Text style={styles.profileImagePlaceholderText}>
                  {(data.profileCardData.stageName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.stageName}>{data.profileCardData.stageName}</Text>
            {data.profileCardData.featuredLabels.length > 0 && (
              <View style={styles.labels}>
                {data.profileCardData.featuredLabels.slice(0, 3).map((l) => (
                  <View key={l} style={styles.labelPill}>
                    <Text style={styles.labelPillText}>{l}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.profileMeta}>
              {data.profileCardData.ratingAvg != null && (
                <Text style={styles.profileMetaText}>
                  ★ {data.profileCardData.ratingAvg.toFixed(1)}
                  {data.profileCardData.ratingCount > 0 && ` (${data.profileCardData.ratingCount})`}
                  {data.profileCardData.isVerified ? ' · Verified' : ''}
                </Text>
              )}
              <Text style={styles.profileMetaText}>📍 {data.profileCardData.locationText}</Text>
              {data.profileCardData.minPricePence != null && (
                <Text style={styles.profileMetaText}>
                  From £{(data.profileCardData.minPricePence / 100).toFixed(0)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => router.push('/(app)/performer/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.editProfileBtnText}>Edit profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActions}>
          {[
            { path: '/(app)/performer/account', icon: 'cog' as const, title: 'Account', desc: 'Name, phone & booking details' },
            { path: '/(app)/performer/messages', icon: 'envelope' as const, title: 'Messages', desc: 'Chat about your bookings' },
            { path: '/(app)/performer/earnings', icon: 'gbp' as const, title: 'Earnings', desc: 'Track income from performances' },
            { path: '/(app)/performer/shortlist', icon: 'star' as const, title: 'Shortlist', desc: 'Saved performers' },
            { path: '/(app)/performer/reviews', icon: 'comment' as const, title: 'Reviews', desc: 'From customers & your own' },
          ].map((item) => (
            <TouchableOpacity
              key={item.path}
              style={styles.quickActionCard}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.92}
            >
              <View style={styles.quickActionIconWrap}>
                <FontAwesome name={item.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.quickActionTitle}>{item.title}</Text>
              <Text style={styles.quickActionDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent bookings */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent bookings</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/performer/bookings')}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bookingsCard}>
          {!data?.recentBookings?.length ? (
            <View style={styles.emptyBookings}>
              <Text style={styles.emptyBookingsTitle}>No bookings yet</Text>
              <Text style={styles.emptyBookingsDesc}>When customers book you, they'll appear here.</Text>
            </View>
          ) : (
            data.recentBookings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingRow}
                onPress={() => router.push({ pathname: '/(app)/performer/booking-detail', params: { id: b.id } } as any)}
                activeOpacity={0.7}
              >
                <View style={styles.bookingRowMain}>
                  <Text style={styles.bookingCustomer}>{b.customerName}</Text>
                  <Text style={styles.bookingEvent}>
                    {b.eventName}{b.eventDate ? ` · ${b.eventDate}` : ''}
                  </Text>
                </View>
                <View style={[styles.bookingBadge, b.bookingStatus === 'PENDING_ACCEPTANCE' && styles.bookingBadgePending]}>
                  <Text style={styles.bookingBadgeText}>
                    {BOOKING_STATUS_LABEL[b.bookingStatus] ?? b.bookingStatus}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </ScrollView>
    </>
  );
}

const CARD_RADIUS = 20;
const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  mutedText: { ...typography.bodySmall, color: colors.mutedForeground },
  welcome: { marginBottom: spacing.xl },
  welcomeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  welcomeTitle: { fontSize: 28, fontWeight: '700', color: colors.foreground, marginBottom: spacing.xs, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
  errorBanner: {
    backgroundColor: '#FFF5F5',
    borderRadius: CARD_RADIUS,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...CARD_SHADOW,
  },
  errorText: { color: '#B91C1C', fontSize: 15 },
  managedBy: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: CARD_RADIUS,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...CARD_SHADOW,
  },
  managedByText: { ...typography.bodySmall, color: colors.foreground },
  managedByBold: { fontWeight: '600' },
  statusBanner: {
    borderRadius: CARD_RADIUS,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...CARD_SHADOW,
  },
  statusBannerCompact: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  statusTextBlock: { flex: 1 },
  statusLabel: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  statusLabelCompact: { fontSize: 17, marginBottom: 1 },
  statusDescription: { ...typography.bodySmall, color: colors.mutedForeground },
  statusDescriptionCompact: { fontSize: 13, lineHeight: 18 },
  statusDismiss: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
    marginRight: -4,
  },
  statusDismissText: { fontSize: 22, fontWeight: '300', lineHeight: 24 },
  bookingRequestCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: CARD_RADIUS,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  bookingRequestIconWrap: { marginBottom: spacing.sm },
  bookingRequestTitle: { fontSize: 17, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  bookingRequestDesc: { fontSize: 15, color: colors.mutedForeground, marginBottom: spacing.sm },
  bookingRequestDetail: { fontSize: 14, color: colors.foreground, marginBottom: spacing.sm },
  bookingRequestCta: { fontSize: 15, fontWeight: '600', color: colors.primary },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAll: { fontSize: 15, fontWeight: '600', color: colors.primary },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    padding: spacing.lg,
    ...CARD_SHADOW,
  },
  profileImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: 12, marginBottom: spacing.md },
  profileImagePlaceholder: { backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center' },
  profileImagePlaceholderText: { fontSize: 48, color: colors.mutedForeground, fontWeight: '600' },
  stageName: { fontSize: 20, fontWeight: '700', color: colors.foreground, marginBottom: spacing.sm },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  labelPill: { backgroundColor: '#E5E5EA', paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: borderRadius.full },
  labelPillText: { ...typography.caption, color: colors.foreground, fontWeight: '500' },
  profileMeta: { gap: 4, marginBottom: spacing.md },
  profileMetaText: { fontSize: 14, color: colors.mutedForeground },
  editProfileBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  editProfileBtnText: { fontSize: 15, fontWeight: '600', color: colors.primaryForeground },
  quickActions: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  quickActionCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.card,
    borderRadius: CARD_RADIUS,
    padding: spacing.lg,
    ...CARD_SHADOW,
  },
  quickActionIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  quickActionTitle: { fontSize: 17, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  quickActionDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  bookingsCard: {
    backgroundColor: colors.card,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  emptyBookings: { padding: spacing.xl * 1.5, alignItems: 'center' },
  emptyBookingsTitle: { fontSize: 17, fontWeight: '600', color: colors.foreground, marginBottom: spacing.xs },
  emptyBookingsDesc: { fontSize: 15, color: colors.mutedForeground },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bookingRowMain: { flex: 1 },
  bookingCustomer: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  bookingEvent: { fontSize: 14, color: colors.mutedForeground, marginTop: 2 },
  bookingBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  bookingBadgePending: { backgroundColor: '#FEF3C7' },
  bookingBadgeText: { fontSize: 12, fontWeight: '600', color: colors.foreground },
});
