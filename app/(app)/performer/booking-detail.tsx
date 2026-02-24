import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type BookingDetail = {
  id: string;
  bookingStatus: string;
  priceTotalPence: number;
  depositPence: number;
  eventName: string | null;
  eventDate: string | null;
  eventPostcode: string | null;
  customerName: string | null;
  performerStageName: string | null;
  isPerformer: boolean;
  canRespond: boolean;
  conversationId: string | null;
};

export default function BookingDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = React.useState<BookingDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [responding, setResponding] = React.useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await apiFetch<BookingDetail>(`/api/bookings/${id}`);
    setBooking(res.data ?? null);
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRespond = useCallback(
    async (action: 'accept' | 'reject') => {
      if (!id || !booking?.canRespond || responding) return;
      setResponding(true);
      const res = await apiFetch<{ ok: boolean; status: string }>(`/api/bookings/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setResponding(false);
      if (res.data?.ok) {
        setBooking((prev) => (prev ? { ...prev, bookingStatus: res.data!.status } : null));
        if (action === 'accept') Alert.alert('Confirmed', 'Booking confirmed. The customer has been notified.');
        else Alert.alert('Declined', 'Booking declined. The customer has been notified.');
      } else {
        Alert.alert('Error', res.error ?? 'Could not update booking');
      }
    },
    [id, booking?.canRespond, responding]
  );

  const openConversation = useCallback(() => {
    if (booking?.conversationId) router.push({ pathname: '/(app)/performer/conversation', params: { id: booking.conversationId } } as any);
  }, [booking?.conversationId, router]);

  if (loading || !booking) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const eventDateStr = booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—';
  const priceStr = booking.priceTotalPence != null ? `£${(booking.priceTotalPence / 100).toFixed(0)}` : '—';

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        <Text style={styles.label}>Customer</Text>
        <Text style={styles.value}>{booking.customerName ?? '—'}</Text>
        <Text style={styles.label}>Event</Text>
        <Text style={styles.value}>{booking.eventName ?? '—'}</Text>
        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{eventDateStr}</Text>
        {booking.eventPostcode && (
          <>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{booking.eventPostcode}</Text>
          </>
        )}
        <Text style={styles.label}>Total</Text>
        <Text style={styles.value}>{priceStr}</Text>
        <View style={[styles.statusBadge, booking.bookingStatus === 'PENDING_ACCEPTANCE' && styles.statusPending]}>
          <Text style={styles.statusText}>{booking.bookingStatus.replace('_', ' ')}</Text>
        </View>
      </View>
      {booking.canRespond && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnAccept]}
            onPress={() => handleRespond('accept')}
            disabled={responding}
          >
            <Text style={styles.btnText}>{responding ? '…' : 'Accept booking'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnDecline]}
            onPress={() => {
              Alert.alert('Decline booking', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Decline', style: 'destructive', onPress: () => handleRespond('reject') },
              ]);
            }}
            disabled={responding}
          >
            <Text style={styles.btnTextDecline}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
      {booking.conversationId && (
        <TouchableOpacity style={styles.messageLink} onPress={openConversation}>
          <Text style={styles.messageLinkText}>Open conversation</Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: { ...typography.caption, color: colors.mutedForeground, marginTop: spacing.sm, marginBottom: 2 },
  value: { ...typography.body, color: colors.foreground },
  statusBadge: { alignSelf: 'flex-start', marginTop: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm, backgroundColor: colors.muted },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { ...typography.caption, color: colors.foreground },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  btn: { paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  btnAccept: { backgroundColor: '#059669' },
  btnDecline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnText: { ...typography.body, fontWeight: '600', color: '#fff' },
  btnTextDecline: { ...typography.body, fontWeight: '600', color: colors.foreground },
  messageLink: { marginTop: spacing.md },
  messageLinkText: { ...typography.body, color: colors.primary },
});
