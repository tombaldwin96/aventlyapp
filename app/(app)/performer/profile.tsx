import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type PerformerProfile = {
  stageName: string;
  bio: string | null;
  basePostcode: string;
  travelRadiusMiles: number;
  profileImageUrl: string | null;
  performerTypes: string[];
  eventTypesAccepted: string[];
  status: string;
  ratingAvg: number | null;
  ratingCount: number;
};

export default function PerformerProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = React.useState<PerformerProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<PerformerProfile>('/api/performers/profile');
    setProfile(res.data ?? null);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  if (loading || !profile) {
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
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        {profile.profileImageUrl ? (
          <ExpoImage source={{ uri: profile.profileImageUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarLetter}>{(profile.stageName || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.stageName}>{profile.stageName}</Text>
        {profile.status && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{profile.status.replace('_', ' ')}</Text>
          </View>
        )}
        {(profile.ratingAvg != null || profile.ratingCount > 0) && (
          <Text style={styles.rating}>
            ★ {profile.ratingAvg?.toFixed(1) ?? '—'} ({profile.ratingCount} reviews)
          </Text>
        )}
        <Text style={styles.label}>Location & travel</Text>
        <Text style={styles.value}>
          {profile.basePostcode} · Up to {profile.travelRadiusMiles} miles
        </Text>
        {profile.bio && (
          <>
            <Text style={styles.label}>Bio</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </>
        )}
        {profile.performerTypes?.length > 0 && (
          <>
            <Text style={styles.label}>Performer types</Text>
            <Text style={styles.value}>{profile.performerTypes.join(', ')}</Text>
          </>
        )}
        {profile.eventTypesAccepted?.length > 0 && (
          <>
            <Text style={styles.label}>Event types</Text>
            <Text style={styles.value}>{profile.eventTypesAccepted.join(', ')}</Text>
          </>
        )}
      </View>
      <Text style={styles.editHint}>To edit your profile in full (bio, photos, availability), use the web dashboard.</Text>
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
    alignItems: 'center',
  },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: spacing.md },
  avatarPlaceholder: { backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 48, color: colors.mutedForeground, fontWeight: '600' },
  stageName: { ...typography.title, color: colors.foreground, marginBottom: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm, backgroundColor: colors.muted, marginBottom: spacing.sm },
  statusText: { ...typography.caption, color: colors.foreground },
  rating: { ...typography.bodySmall, color: colors.mutedForeground, marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.mutedForeground, alignSelf: 'flex-start', marginTop: spacing.sm },
  value: { ...typography.body, color: colors.foreground, alignSelf: 'flex-start', marginBottom: spacing.xs },
  bio: { ...typography.bodySmall, color: colors.foreground, alignSelf: 'flex-start', marginBottom: spacing.sm },
  editHint: { ...typography.bodySmall, color: colors.mutedForeground, marginTop: spacing.lg, textAlign: 'center' },
});
