import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { formatDistanceToNow } from 'date-fns';

const READ_IDS_KEY = 'avently_notification_read_ids';
const MAX_READ_IDS = 200;

export type NotificationItem = {
  type: 'booking' | 'message';
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  createdAt: string;
};

function getNotificationKey(item: NotificationItem): string {
  return `${item.type}-${item.id}`;
}

async function loadReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function saveReadIds(ids: Set<string>): Promise<void> {
  const arr = Array.from(ids);
  const trimmed = arr.length > MAX_READ_IDS ? arr.slice(-MAX_READ_IDS) : arr;
  await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(trimmed));
}

/** Parse dashboard href to app navigation: booking id or conversation id */
function parseHref(href: string): { type: 'booking' | 'message'; id: string } | null {
  const norm = href.replace(/^\/+/, '');
  const bookingMatch = norm.match(/dashboard\/bookings\/([^/?]+)/);
  if (bookingMatch) return { type: 'booking', id: bookingMatch[1]! };
  const msgMatch = norm.match(/dashboard\/messages\?.*conversation=([^&]+)/);
  if (msgMatch) return { type: 'message', id: msgMatch[1]! };
  return null;
}

type HeaderNotificationsIconProps = {
  /** Route to booking detail (e.g. '/(app)/performer/booking-detail') - must accept param id */
  bookingDetailRoute: string;
  /** Route to conversation (e.g. '/(app)/performer/conversation') - must accept param id */
  conversationRoute: string;
  /** Route to bookings list (for "Bookings" link in popup) */
  bookingsListRoute: string;
  /** Route to messages list (for "Messages" link in popup) */
  messagesListRoute: string;
};

export function HeaderNotificationsIcon({
  bookingDetailRoute,
  conversationRoute,
  bookingsListRoute,
  messagesListRoute,
}: HeaderNotificationsIconProps) {
  const router = useRouter();
  const { height: winHeight } = useWindowDimensions();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);

  const unreadCount = items.filter((i) => !readIds.has(getNotificationKey(i))).length;

  const fetchNotifications = useCallback(async () => {
    const { data } = await apiFetch<{ count: number; items: NotificationItem[] }>('/api/notifications');
    if (data?.items) setItems(data.items);
    else setItems([]);
  }, []);

  const loadRead = useCallback(async () => {
    const ids = await loadReadIds();
    setReadIds(ids);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRead().then(() => fetchNotifications().finally(() => setLoading(false)));
    }, [loadRead, fetchNotifications])
  );

  useEffect(() => {
    if (popupOpen) fetchNotifications();
  }, [popupOpen, fetchNotifications]);

  const markAsRead = useCallback((key: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(key);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const allKeys = items.map(getNotificationKey);
    if (allKeys.length === 0) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      allKeys.forEach((k) => next.add(k));
      saveReadIds(next);
      return next;
    });
  }, [items]);

  const handleItemPress = useCallback(
    (item: NotificationItem) => {
      markAsRead(getNotificationKey(item));
      setPopupOpen(false);
      const parsed = parseHref(item.href);
      if (parsed?.type === 'booking') {
        router.push({ pathname: bookingDetailRoute as any, params: { id: parsed.id } } as any);
      } else if (parsed?.type === 'message') {
        router.push({ pathname: conversationRoute as any, params: { id: parsed.id } } as any);
      }
    },
    [markAsRead, bookingDetailRoute, conversationRoute, router]
  );

  const badgeLabel = unreadCount > 9 ? '9+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setPopupOpen(true)}
        style={styles.touch}
        activeOpacity={0.7}
        accessibilityLabel="Notifications"
        accessibilityHint={unreadCount > 0 ? `${unreadCount} unread` : undefined}
      >
        <FontAwesome name="bell" size={22} color={colors.primaryForeground} />
        {badgeLabel != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badgeLabel}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={popupOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPopupOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPopupOpen(false)}
        >
          <View style={[styles.popup, { maxHeight: winHeight * 0.6 }]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.popupHeader}>
                <View>
                  <Text style={styles.popupTitle}>Notifications</Text>
                  <Text style={styles.popupSubtitle}>Booking requests and messages</Text>
                </View>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
              >
                {loading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : items.length === 0 ? (
                  <Text style={styles.emptyText}>No new notifications</Text>
                ) : (
                  items.map((item) => {
                    const key = getNotificationKey(item);
                    const isRead = readIds.has(key);
                    return (
                      <TouchableOpacity
                        key={key}
                        style={styles.item}
                        onPress={() => handleItemPress(item)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.itemIcon,
                            item.type === 'booking' ? styles.itemIconBooking : styles.itemIconMessage,
                          ]}
                        >
                          <FontAwesome
                            name={item.type === 'booking' ? 'calendar' : 'envelope'}
                            size={16}
                            color={item.type === 'booking' ? '#92400e' : '#1e40af'}
                          />
                        </View>
                        <View style={styles.itemBody}>
                          <Text style={[styles.itemTitle, isRead && styles.itemTitleRead]}>
                            {item.title}
                          </Text>
                          {item.subtitle ? (
                            <Text style={styles.itemSubtitle} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                          <Text style={styles.itemTime}>
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </Text>
                        </View>
                        {!isRead && <View style={styles.unreadDot} />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
              {items.length > 0 && (
                <View style={styles.popupFooter}>
                  <TouchableOpacity
                    onPress={() => {
                      setPopupOpen(false);
                      router.push(bookingsListRoute as any);
                    }}
                    style={styles.footerLink}
                  >
                    <Text style={styles.footerLinkText}>Bookings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setPopupOpen(false);
                      router.push(messagesListRoute as any);
                    }}
                    style={styles.footerLink}
                  >
                    <Text style={styles.footerLinkText}>Messages</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  popup: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  popupTitle: { ...typography.headline, color: colors.foreground },
  popupSubtitle: { ...typography.caption, color: colors.mutedForeground, marginTop: 2 },
  markAllBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  markAllText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  list: { maxHeight: 320 },
  listContent: { paddingBottom: spacing.md },
  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  itemIconBooking: { backgroundColor: '#fef3c7' },
  itemIconMessage: { backgroundColor: '#dbeafe' },
  itemBody: { flex: 1, minWidth: 0 },
  itemTitle: { ...typography.bodySmall, fontWeight: '600', color: colors.foreground },
  itemTitleRead: { fontWeight: '400' },
  itemSubtitle: { ...typography.caption, color: colors.mutedForeground, marginTop: 2 },
  itemTime: { ...typography.caption, color: colors.mutedForeground, marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  popupFooter: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.muted,
  },
  footerLink: {},
  footerLinkText: { ...typography.bodySmall, fontWeight: '600', color: colors.primary },
});
