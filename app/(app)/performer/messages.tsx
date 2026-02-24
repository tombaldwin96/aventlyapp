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

type Conversation = {
  id: string;
  bookingId: string | null;
  otherName: string | null;
  eventName: string;
  eventDate: string | null;
  messageCount: number;
  updatedAt: string;
};

export default function PerformerMessages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchConversations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const res = await apiFetch<{ conversations: Conversation[] }>('/api/messages/conversations');
    if (res.data?.conversations) setConversations(res.data.conversations);
    else setConversations([]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push({ pathname: '/(app)/performer/conversation', params: { id: item.id } } as any)}
      activeOpacity={0.7}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{item.otherName ?? 'Customer'}</Text>
        <Text style={styles.rowSub}>
          {item.eventName}
          {item.eventDate ? ` · ${new Date(item.eventDate).toLocaleDateString('en-GB')}` : ''}
        </Text>
      </View>
      {item.messageCount > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{item.messageCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && conversations.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Conversations about your bookings</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>When you have bookings, conversations will appear here.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchConversations(true)} tintColor={colors.primary} />
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
  countBadge: { backgroundColor: colors.primary, borderRadius: 12, minWidth: 24, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  countText: { ...typography.caption, color: colors.primaryForeground, fontWeight: '600' },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyTitle: { ...typography.headline, color: colors.foreground },
  emptySub: { ...typography.bodySmall, color: colors.mutedForeground, marginTop: spacing.xs },
});
