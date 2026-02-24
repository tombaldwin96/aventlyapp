import React, { useCallback, useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type ReviewOnYou = {
  id: string;
  rating: number;
  text: string | null;
  performerReply: string | null;
  reviewerName: string;
  eventName: string | null;
  eventDate: string | null;
};

type ReviewYouMade = {
  id: string;
  rating: number;
  text: string | null;
  performerStageName: string | null;
  performerUserId: string | null;
  eventName: string | null;
  eventDate: string | null;
};

type ReviewsData = {
  reviewsOnYou: ReviewOnYou[];
  reviewsYouMade: ReviewYouMade[];
};

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={[styles.star, i <= rating ? styles.starOn : styles.starOff]}>★</Text>
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isPerformer = user?.role === 'PERFORMER';

  const fetchReviews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const res = await apiFetch<ReviewsData>('/api/reviews');
    setData(res.data ?? null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, [fetchReviews])
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
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchReviews(true)} tintColor={colors.primary} />
      }
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Reviews</Text>
      <Text style={styles.subtitle}>
        {isPerformer
          ? 'Reviews from customers about you, and reviews you have written for others.'
          : 'Reviews you have written for performers after completed bookings.'}
      </Text>

      {isPerformer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews on you</Text>
          {!data?.reviewsOnYou?.length ? (
            <Text style={styles.emptyText}>No reviews about you yet.</Text>
          ) : (
            data.reviewsOnYou.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{r.reviewerName}</Text>
                  <Text style={styles.reviewMeta}>
                    {r.eventName}{r.eventDate ? ` · ${new Date(r.eventDate).toLocaleDateString('en-GB')}` : ''}
                  </Text>
                </View>
                <StarRating rating={r.rating} />
                {r.text ? <Text style={styles.reviewBody}>{r.text}</Text> : null}
                {r.performerReply ? (
                  <View style={styles.replyBlock}>
                    <Text style={styles.replyLabel}>Your reply</Text>
                    <Text style={styles.replyText}>{r.performerReply}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isPerformer ? 'Reviews you have made' : 'Reviews you have written'}
        </Text>
        {!data?.reviewsYouMade?.length ? (
          <Text style={styles.emptyText}>You haven't written any reviews yet.</Text>
        ) : (
          data.reviewsYouMade.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{r.performerStageName ?? 'Performer'}</Text>
                <Text style={styles.reviewMeta}>
                  {r.eventName}{r.eventDate ? ` · ${new Date(r.eventDate).toLocaleDateString('en-GB')}` : ''}
                </Text>
              </View>
              <StarRating rating={r.rating} />
              {r.text ? <Text style={styles.reviewBody}>{r.text}</Text> : null}
            </View>
          ))
        )}
      </View>
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
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.headline, color: colors.foreground, marginBottom: spacing.md },
  emptyText: { ...typography.bodySmall, color: colors.mutedForeground },
  reviewCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: spacing.xs },
  reviewerName: { ...typography.body, fontWeight: '600', color: colors.foreground },
  reviewMeta: { ...typography.bodySmall, color: colors.mutedForeground },
  stars: { flexDirection: 'row', gap: 2, marginBottom: spacing.xs },
  star: { fontSize: 14 },
  starOn: { color: '#F59E0B' },
  starOff: { color: colors.muted },
  reviewBody: { ...typography.bodySmall, color: colors.mutedForeground },
  replyBlock: { marginTop: spacing.sm, paddingLeft: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.muted },
  replyLabel: { ...typography.caption, color: colors.mutedForeground, marginBottom: 2 },
  replyText: { ...typography.bodySmall, color: colors.foreground },
});
