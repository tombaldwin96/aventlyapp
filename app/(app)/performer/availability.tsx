import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { setVisitedAvailabilityTab as setVisitedAvailabilitySession } from '@/lib/performer-session-flags';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  getDay,
} from 'date-fns';
import { apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type BlockoutEntry = { id: string; startDatetime: string; endDatetime: string };

function dateToKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function isDayBlocked(date: Date, blockouts: BlockoutEntry[]): boolean {
  const key = dateToKey(date);
  const dayStart = new Date(key + 'T00:00:00.000Z');
  const dayEnd = new Date(key + 'T23:59:59.999Z');
  return blockouts.some((b) => {
    const start = new Date(b.startDatetime);
    const end = new Date(b.endDatetime);
    return start <= dayEnd && end >= dayStart;
  });
}

function isWeekend(date: Date): boolean {
  const d = getDay(date);
  return d === 0 || d === 6;
}

type Defaults = {
  defaultWeekdayPricePence: number;
  defaultWeekendPricePence: number;
  defaultPricePence: number;
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VISITED_AVAILABILITY_KEY_PREFIX = 'avently_performer_visited_availability_';

export default function AvailabilityScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [blockouts, setBlockouts] = useState<BlockoutEntry[]>([]);
  const [dayPrices, setDayPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const monthKey = format(viewDate, 'yyyy-MM');

  useFocusEffect(
    useCallback(() => {
      setVisitedAvailabilitySession();
      if (user?.id) {
        AsyncStorage.setItem(`${VISITED_AVAILABILITY_KEY_PREFIX}${user.id}`, 'true').catch(() => {});
      }
    }, [user?.id])
  );

  const fetchDefaults = useCallback(async () => {
    const { data } = await apiFetch<Defaults>('/api/performers/availability/defaults');
    if (data) setDefaults(data);
  }, []);

  const fetchBlockouts = useCallback(async () => {
    const { data } = await apiFetch<BlockoutEntry[]>(
      `/api/performers/availability/blockouts?month=${monthKey}`
    );
    setBlockouts(Array.isArray(data) ? data : []);
  }, [monthKey]);

  const fetchDayPrices = useCallback(async () => {
    const { data } = await apiFetch<Record<string, number>>(
      `/api/performers/availability/day-prices?month=${monthKey}`
    );
    setDayPrices(typeof data === 'object' && data !== null ? data : {});
  }, [monthKey]);

  const loadMonth = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      if (!defaults) await fetchDefaults();
      await Promise.all([fetchBlockouts(), fetchDayPrices()]);
      setLoading(false);
      setRefreshing(false);
    },
    [defaults, fetchDefaults, fetchBlockouts, fetchDayPrices]
  );

  useFocusEffect(
    useCallback(() => {
      fetchDefaults().then(() => loadMonth());
    }, [fetchDefaults, monthKey])
  );

  useEffect(() => {
    if (defaults) loadMonth();
  }, [monthKey, defaults]);

  const getDefaultPriceForDate = useCallback(
    (date: Date): number => {
      if (!defaults) return 0;
      return isWeekend(date) ? defaults.defaultWeekendPricePence : defaults.defaultWeekdayPricePence;
    },
    [defaults]
  );

  const getPriceForDate = useCallback(
    (date: Date): number => {
      const key = dateToKey(date);
      if (dayPrices[key] != null) return dayPrices[key];
      return getDefaultPriceForDate(date);
    },
    [dayPrices, getDefaultPriceForDate]
  );

  const handleDayPress = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return;
    setSelectedDate(date);
    setSaveError(null);
    const key = dateToKey(date);
    const override = dayPrices[key];
    setPriceInput(override != null ? (override / 100).toFixed(0) : '');
  };

  const handleToggleBlockout = async () => {
    if (!selectedDate) return;
    const key = dateToKey(selectedDate);
    setToggling(key);
    try {
      const blocked = isDayBlocked(selectedDate, blockouts);
      if (blocked) {
        const res = await apiFetch<{ ok?: boolean }>('/api/performers/availability/blockouts', {
          method: 'DELETE',
          body: JSON.stringify({ date: key }),
        });
        if (res.error) throw new Error(res.error);
      } else {
        const res = await apiFetch<{ ok?: boolean }>('/api/performers/availability/blockouts', {
          method: 'POST',
          body: JSON.stringify({ date: key }),
        });
        if (res.error) throw new Error(res.error);
      }
      await fetchBlockouts();
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setToggling(null);
    }
  };

  const handleSavePrice = async () => {
    if (!selectedDate) return;
    setSavingPrice(true);
    setSaveError(null);
    const key = dateToKey(selectedDate);
    try {
      const raw = priceInput.trim();
      const priceGbpPence =
        raw === '' ? null : Math.round(parseFloat(raw) * 100);
      if (
        raw !== '' &&
        (priceGbpPence == null || Number.isNaN(priceGbpPence) || priceGbpPence < 0)
      ) {
        setSaveError('Enter a valid price (0 or more).');
        setSavingPrice(false);
        return;
      }
      const res = await apiFetch<{ ok?: boolean; error?: string }>(
        '/api/performers/availability/day-prices',
        {
          method: 'PUT',
          body: JSON.stringify({
            date: key,
            priceGbpPence: priceGbpPence == null ? null : priceGbpPence,
          }),
        }
      );
      if (res.error || (res.data && 'error' in res.data && res.data.error)) {
        setSaveError(res.error || (res.data as { error: string }).error);
        setSavingPrice(false);
        return;
      }
      await fetchDayPrices();
      setSelectedDate(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSavingPrice(false);
    }
  };

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const today = startOfDay(new Date());

  if (loading && !defaults && blockouts.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMonth(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Availability</Text>
          <Text style={styles.subtitle}>
            Tap a day to set price or mark available/unavailable. You’ll appear in search on available days.
          </Text>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, styles.availableSwatch]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, styles.unavailableSwatch]} />
            <Text style={styles.legendText}>Unavailable</Text>
          </View>
        </View>

        <View style={styles.monthBar}>
          <TouchableOpacity
            style={styles.monthBtn}
            onPress={() => setViewDate(subMonths(viewDate, 1))}
            hitSlop={12}
          >
            <Text style={styles.monthBtnText}>← Previous</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{format(viewDate, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            style={styles.monthBtn}
            onPress={() => setViewDate(addMonths(viewDate, 1))}
            hitSlop={12}
          >
            <Text style={styles.monthBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendar}>
          {WEEKDAY_LABELS.map((day) => (
            <View key={day} style={styles.weekdayHead}>
              <Text style={styles.weekdayLabel}>{day}</Text>
            </View>
          ))}
          {days.map((day) => {
            const key = dateToKey(day);
            const inMonth = isSameMonth(day, viewDate);
            const blocked = isDayBlocked(day, blockouts);
            const isPast = isBefore(day, today);
            const isToday = isSameDay(day, today);
            const busy = toggling === key;
            const pricePence = getPriceForDate(day);
            const isSelected = selectedDate && dateToKey(day) === dateToKey(selectedDate);

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dayCell,
                  !inMonth && styles.dayCellOtherMonth,
                  blocked ? styles.dayCellUnavailable : styles.dayCellAvailable,
                  isToday && styles.dayCellToday,
                  isSelected && styles.dayCellSelected,
                ]}
                disabled={isPast || busy}
                onPress={() => handleDayPress(day)}
                activeOpacity={0.7}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.dayNum,
                        !inMonth && styles.dayNumOther,
                        blocked ? styles.dayNumUnavailable : styles.dayNumAvailable,
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                    <Text
                      style={[
                        styles.dayPrice,
                        blocked ? styles.dayPriceUnavailable : styles.dayPriceAvailable,
                      ]}
                    >
                      £{(pricePence / 100).toFixed(0)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedDate}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDate(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedDate(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}
            >
              <Text style={styles.modalTitle}>
                {selectedDate ? format(selectedDate, 'EEEE, d MMM yyyy') : ''}
              </Text>
              {saveError ? (
                <Text style={styles.modalError}>{saveError}</Text>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  selectedDate && isDayBlocked(selectedDate, blockouts)
                    ? styles.modalButtonPrimary
                    : styles.modalButtonOutline,
                ]}
                onPress={handleToggleBlockout}
                disabled={!!toggling}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    selectedDate && isDayBlocked(selectedDate, blockouts)
                      ? styles.modalButtonTextPrimary
                      : styles.modalButtonTextOutline,
                  ]}
                >
                  {selectedDate && isDayBlocked(selectedDate, blockouts)
                    ? 'Mark available'
                    : 'Mark unavailable'}
                </Text>
              </TouchableOpacity>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>£</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceInput}
                  onChangeText={setPriceInput}
                  placeholder={
                    selectedDate
                      ? (getDefaultPriceForDate(selectedDate) / 100).toFixed(0)
                      : '0'
                  }
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSavePrice}
                disabled={savingPrice}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  {savingPrice ? 'Saving…' : 'Save price'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => setSelectedDate(null)}
              >
                <Text style={styles.modalButtonTextOutline}>Done</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: spacing.md },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendSwatch: { width: 20, height: 20, borderRadius: borderRadius.sm },
  availableSwatch: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  unavailableSwatch: { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
  legendText: { ...typography.caption, color: colors.foreground },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  monthBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  monthTitle: { ...typography.headline, color: colors.foreground },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekdayHead: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayLabel: { ...typography.caption, color: colors.mutedForeground, fontWeight: '600' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxWidth: 48,
    maxHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    margin: 2,
    paddingVertical: 4,
  },
  dayCellOtherMonth: { opacity: 0.45 },
  dayCellAvailable: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  dayCellUnavailable: { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
  dayCellToday: { borderWidth: 2, borderColor: colors.primary },
  dayCellSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.accent },
  dayNum: { fontSize: 15, fontWeight: '600' },
  dayNumOther: { color: colors.mutedForeground },
  dayNumAvailable: { color: '#166534' },
  dayNumUnavailable: { color: colors.mutedForeground },
  dayPrice: { fontSize: 10, marginTop: 2 },
  dayPriceAvailable: { color: '#166534' },
  dayPriceUnavailable: { color: colors.mutedForeground },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContentWrap: { alignItems: 'stretch' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalTitle: { ...typography.headline, color: colors.foreground, marginBottom: spacing.md },
  modalError: { ...typography.caption, color: colors.destructive, marginBottom: spacing.sm },
  modalButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalButtonPrimary: { backgroundColor: colors.primary },
  modalButtonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  modalButtonSave: { backgroundColor: '#16a34a' },
  modalButtonText: {},
  modalButtonTextPrimary: { color: colors.primaryForeground, fontWeight: '600' },
  modalButtonTextOutline: { color: colors.foreground },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  priceLabel: { ...typography.body, color: colors.mutedForeground, marginRight: spacing.xs },
  priceInput: {
    flex: 1,
    ...typography.body,
    color: colors.foreground,
    paddingVertical: spacing.sm,
  },
});
