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
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getApiBaseUrl, getAccessToken } from '@/lib/api';
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
import { PerformerPhotoBioModal } from '@/components/PerformerPhotoBioModal';
import { getVisitedAvailabilityTab, getProgressSectionDismissed, setProgressSectionDismissed } from '@/lib/performer-session-flags';

const VISITED_AVAILABILITY_KEY_PREFIX = 'avently_performer_visited_availability_';
const PROGRESS_SECTION_DISMISSED_KEY_PREFIX = 'avently_performer_progress_section_dismissed_';

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
  const [visitedAvailabilityTab, setVisitedAvailabilityTab] = useState(false);
  const [progressSectionDismissed, setProgressSectionDismissedState] = useState(false);
  const [showPhotoBioModal, setShowPhotoBioModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (getProgressSectionDismissed()) {
      setProgressSectionDismissedState(true);
      return;
    }
    const key = `${PROGRESS_SECTION_DISMISSED_KEY_PREFIX}${user.id}`;
    AsyncStorage.getItem(key)
      .then((v) => setProgressSectionDismissedState(v === 'true'))
      .catch(() => setProgressSectionDismissedState(false));
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      if (getProgressSectionDismissed()) {
        setProgressSectionDismissedState(true);
        return;
      }
      AsyncStorage.getItem(`${PROGRESS_SECTION_DISMISSED_KEY_PREFIX}${user.id}`)
        .then((v) => setProgressSectionDismissedState(v === 'true'))
        .catch(() => setProgressSectionDismissedState(false));
    }, [user?.id])
  );

  const dismissProgressSection = useCallback(() => {
    setProgressSectionDismissedState(true);
    setProgressSectionDismissed();
    const uid = user?.id ?? data?.user?.id;
    if (uid) {
      AsyncStorage.setItem(`${PROGRESS_SECTION_DISMISSED_KEY_PREFIX}${uid}`, 'true').catch(() => {});
    }
  }, [user?.id, data?.user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const fromSession = getVisitedAvailabilityTab();
    if (fromSession) {
      setVisitedAvailabilityTab(true);
      return;
    }
    let cancelled = false;
    const key = `${VISITED_AVAILABILITY_KEY_PREFIX}${user.id}`;
    AsyncStorage.getItem(key)
      .then((v) => {
        if (!cancelled) setVisitedAvailabilityTab(v === 'true');
      })
      .catch(() => {
        if (!cancelled) setVisitedAvailabilityTab(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      const fromSession = getVisitedAvailabilityTab();
      if (fromSession) {
        setVisitedAvailabilityTab(true);
        return;
      }
      AsyncStorage.getItem(`${VISITED_AVAILABILITY_KEY_PREFIX}${user.id}`)
        .then((v) => setVisitedAvailabilityTab(v === 'true'))
        .catch(() => setVisitedAvailabilityTab(false));
    }, [user?.id])
  );

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

  const pickAndUploadProfilePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to pictures to continue upload.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setUploadingPhoto(true);
    try {
      const base = getApiBaseUrl();
      const token = await getAccessToken();
      if (!base || !token) {
        Alert.alert('Error', 'API URL or session not configured.');
        return;
      }
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      const res = await fetch(`${base}/api/upload/profile-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Upload failed', (resData as { error?: string }).error ?? 'Please try again.');
        return;
      }
      const url = (resData as { url?: string }).url;
      if (url) {
        await apiFetch('/api/performers/profile', {
          method: 'PATCH',
          body: JSON.stringify({ profileImageUrl: url }),
        });
      }
      await fetchDashboard(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
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
        onComplete={() => {
          setShowPhotoBioModal(true);
          fetchDashboard();
        }}
      />
      <PerformerPhotoBioModal
        visible={showPhotoBioModal}
        onComplete={() => {
          setShowPhotoBioModal(false);
          fetchDashboard();
        }}
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
        <View style={styles.welcomeTitleRow}>
          <Text style={styles.welcomeTitle}>
            {data?.user?.name ?? user?.name ?? user?.email?.split('@')[0] ?? 'there'}
          </Text>
          <View style={styles.activeBadge}>
            <View style={styles.activeBadgeDot} />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Manage your profile, availability and bookings.
        </Text>
      </View>

      {/* Profile setup progress (only after onboarding submitted; hide forever when dismissed) */}
      {data && statusKey !== 'DRAFT' && !progressSectionDismissed && (() => {
        const fiveDone = 5;
        const completedCount =
          fiveDone +
          (data.profileCardData?.profileImageUrl ? 1 : 0) +
          (data.hasSetAvailability || visitedAvailabilityTab ? 1 : 0);
        const isComplete = completedCount === 7;
        return (
          <View style={styles.progressSection}>
            <TouchableOpacity
              style={styles.progressSectionClose}
              onPress={dismissProgressSection}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close and hide this section"
            >
              <FontAwesome name="times" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={styles.progressBarWrap}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(completedCount * (100 / 7))}%` },
                ]}
              />
            </View>
            {isComplete ? (
              <>
                <View style={styles.progressCompleteHeader}>
                  <FontAwesome name="check-circle" size={22} color="#10B981" />
                  <Text style={styles.progressCompleteTitle}>Profile set up complete</Text>
                </View>
                <Text style={styles.progressCompleteMessage}>
                  You’re all set! Your profile is ready and we can’t wait to help you get your first booking. Sit back and we’ll notify you as soon as someone wants to book you.
                </Text>
              </>
            ) : (
              <Text style={styles.progressLabel}>
                {completedCount}/7 profile setup complete
              </Text>
            )}
            <View style={styles.progressTasks}>
              {[
                { label: 'Set up your profession', done: true },
                { label: 'Enter contact details', done: true },
                { label: 'Enter address', done: true },
                { label: 'Choose default pricing', done: true },
                { label: 'Set travel radius', done: true },
                {
                  label: 'Upload a profile photo',
                  done: !!data.profileCardData?.profileImageUrl,
                },
                {
                  label: 'Set availability in Availability tab',
                  done: !!data.hasSetAvailability || visitedAvailabilityTab,
                },
              ].map((task, i) => (
                <View key={i} style={styles.progressTaskRow}>
                  <View style={[styles.progressTaskIcon, task.done && styles.progressTaskIconDone]}>
                    {task.done ? (
                      <FontAwesome name="check" size={12} color="#fff" />
                    ) : (
                      <View style={styles.progressTaskIconEmpty} />
                    )}
                  </View>
                  <Text style={[styles.progressTaskLabel, task.done && styles.progressTaskLabelDone]}>
                    {task.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })()}

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

      {/* Status banner (Draft / Pending review only; approved message removed) */}
      {statusKey !== 'APPROVED' && (
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: statusConfig.bg, borderLeftColor: statusConfig.border },
          ]}
        >
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.border }]} />
            <View style={styles.statusTextBlock}>
              <Text style={[styles.statusLabel, { color: statusConfig.text }]}>
                {statusConfig.label}
              </Text>
              <Text style={[styles.statusDescription, { color: statusConfig.text }]}>
                {statusConfig.description}
              </Text>
            </View>
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
            <TouchableOpacity
              onPress={pickAndUploadProfilePhoto}
              disabled={uploadingPhoto}
              activeOpacity={0.9}
              style={styles.profileImageTouchable}
            >
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
              {uploadingPhoto && (
                <View style={styles.profileImageOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              {!uploadingPhoto && (
                <View style={styles.profileImageEditBadge}>
                  <FontAwesome name="camera" size={12} color="rgba(255,255,255,0.95)" />
                  <Text style={styles.profileImageEditBadgeText}>Change photo</Text>
                </View>
              )}
            </TouchableOpacity>
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
  welcomeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  welcomeTitle: { fontSize: 28, fontWeight: '700', color: colors.foreground, letterSpacing: -0.5 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
  progressSection: {
    backgroundColor: colors.card,
    borderRadius: CARD_RADIUS,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...CARD_SHADOW,
    position: 'relative',
  },
  progressSectionClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarWrap: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.muted,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  progressCompleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressCompleteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
  },
  progressCompleteMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  progressTasks: { gap: spacing.xs },
  progressTaskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  progressTaskIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTaskIconDone: { backgroundColor: '#10B981' },
  progressTaskIconEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  progressTaskLabel: { fontSize: 14, color: colors.mutedForeground, flex: 1 },
  progressTaskLabelDone: { color: colors.foreground, textDecorationLine: 'line-through' },
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
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  statusTextBlock: { flex: 1 },
  statusLabel: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  statusDescription: { ...typography.bodySmall, color: colors.mutedForeground },
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
  profileImageTouchable: { marginBottom: spacing.md, borderRadius: 12, overflow: 'hidden' },
  profileImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: 12 },
  profileImagePlaceholder: { backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center' },
  profileImagePlaceholderText: { fontSize: 48, color: colors.mutedForeground, fontWeight: '600' },
  profileImageOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageEditBadge: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  profileImageEditBadgeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
  },
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
