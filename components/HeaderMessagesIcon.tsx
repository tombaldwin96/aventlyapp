import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiFetch } from '@/lib/api';
import { colors, spacing } from '@/lib/theme';

type HeaderMessagesIconProps = {
  /** Route to open when the icon is pressed (e.g. '/(app)/performer/messages' or '/(app)/(tabs)/messages') */
  messagesRoute: string;
};

export function HeaderMessagesIcon({ messagesRoute }: HeaderMessagesIconProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    const { data } = await apiFetch<{ unreadCount: number }>('/api/messages/unread-count');
    if (data != null) setUnreadCount(data.unreadCount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnread();
    }, [fetchUnread])
  );

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  const onPress = () => {
    router.push(messagesRoute as any);
  };

  const badgeLabel = unreadCount > 9 ? '9+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.touch}
      activeOpacity={0.7}
      accessibilityLabel="Messages"
      accessibilityHint={unreadCount > 0 ? `${unreadCount} unread` : undefined}
    >
      <FontAwesome name="envelope" size={22} color={colors.primaryForeground} />
      {badgeLabel != null && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>{badgeLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
