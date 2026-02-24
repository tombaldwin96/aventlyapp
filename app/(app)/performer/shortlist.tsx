import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { getShortlist, removeFromShortlist, type ShortlistEntry } from '@/lib/shortlist';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

export default function ShortlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [list, setList] = useState<ShortlistEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const entries = await getShortlist();
    setList(entries);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRemove = useCallback(async (userId: string) => {
    await removeFromShortlist(userId);
    setList(await getShortlist());
  }, []);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
      }
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Shortlist</Text>
      <Text style={styles.subtitle}>
        Performers you've saved. Add more from search or performer profiles using the star icon.
      </Text>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No saved performers</Text>
          <Text style={styles.emptyDesc}>When you save performers from search, they'll appear here.</Text>
        </View>
      ) : (
        list.map((entry) => (
          <View key={entry.userId} style={styles.card}>
            {entry.profileImageUrl ? (
              <ExpoImage source={{ uri: entry.profileImageUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>{(entry.stageName || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cardMain}>
              <Text style={styles.stageName}>{entry.stageName}</Text>
              <Text style={styles.profileSlug}>{entry.profileSlug}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(entry.userId)}
            >
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  back: { marginBottom: spacing.md },
  backText: { ...typography.body, color: colors.primary },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground, marginBottom: spacing.lg },
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.md },
  avatarPlaceholder: { backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '600', color: colors.mutedForeground },
  cardMain: { flex: 1, minWidth: 0 },
  stageName: { ...typography.body, fontWeight: '600', color: colors.foreground },
  profileSlug: { ...typography.caption, color: colors.mutedForeground, marginTop: 2 },
  removeBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  removeBtnText: { ...typography.bodySmall, color: colors.destructive, fontWeight: '600' },
});
