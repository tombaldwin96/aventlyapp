import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { fetchPublic } from '@/lib/api';
import { filterTrendingDestinations } from '@/lib/trending-destinations';

type PerformerType = { slug: string; name: string };

function getSearchUrl(params: { location?: string; date?: string; performerTypes?: string }): string {
  const base = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://avently.co.uk';
  const searchParams = new URLSearchParams();
  if (params.location?.trim()) searchParams.set('location', params.location.trim());
  if (params.date?.trim()) searchParams.set('date', params.date.trim());
  if (params.performerTypes?.trim() && params.performerTypes !== 'any')
    searchParams.set('performerTypes', params.performerTypes.trim());
  return `${base}/search?${searchParams.toString()}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState('');
  const [performerType, setPerformerType] = useState('');
  const [date, setDate] = useState('');
  const [performerTypes, setPerformerTypes] = useState<PerformerType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [locationSuggestionsVisible, setLocationSuggestionsVisible] = useState(false);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const suggestions = filterTrendingDestinations(location);

  useEffect(() => {
    fetchPublic<{ slug: string; name: string }[]>('/api/taxonomy/performer-types').then((res) => {
      setLoadingTypes(false);
      if (res.data && Array.isArray(res.data)) setPerformerTypes(res.data);
    });
  }, []);

  const handleSearch = useCallback(() => {
    setLocationSuggestionsVisible(false);
    setTypePickerVisible(false);
    setDatePickerVisible(false);
    const url = getSearchUrl({
      location: location.trim() || undefined,
      date: date.trim() || undefined,
      performerTypes: performerType && performerType !== 'any' ? performerType : undefined,
    });
    WebBrowser.openBrowserAsync(url);
  }, [location, date, performerType]);

  const formatDateForInput = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const presetDates = [
    { label: 'Any date', value: '' },
    { label: 'Today', value: formatDateForInput(new Date()) },
    { label: 'Tomorrow', value: formatDateForInput(new Date(Date.now() + 864e5)) },
    { label: 'Next week', value: formatDateForInput(new Date(Date.now() + 7 * 864e5)) },
  ];

  const selectedTypeName = performerType === 'any' || !performerType
    ? "I'd like to book a…"
    : performerTypes.find((t) => t.slug === performerType)?.name ?? performerType;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
          <Text style={styles.heroTitle}>Book unforgettable entertainment for any event.</Text>
          <Text style={styles.heroSubtitle}>
            Discover trusted DJs, singers, bands and more with verified reviews and secure booking.
          </Text>
        </View>

        {/* Hero search bar */}
        <View style={[styles.searchWrap, { marginHorizontal: spacing.md }]}>
          <View style={styles.searchBar}>
            {/* Location */}
            <View style={styles.searchRow}>
              <Text style={styles.searchIcon}>📍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Where is the occasion?"
                placeholderTextColor={colors.mutedForeground}
                value={location}
                onChangeText={setLocation}
                onFocus={() => setLocationSuggestionsVisible(true)}
                onBlur={() => setTimeout(() => setLocationSuggestionsVisible(false), 200)}
              />
            </View>
            {locationSuggestionsVisible && suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                <Text style={styles.suggestionsTitle}>Trending destinations</Text>
                {suggestions.slice(0, 6).map((d) => (
                  <TouchableOpacity
                    key={d.name}
                    style={styles.suggestionRow}
                    onPress={() => {
                      setLocation(d.name);
                      setLocationSuggestionsVisible(false);
                    }}
                  >
                    <Text style={styles.suggestionName}>{d.name}</Text>
                    <Text style={styles.suggestionCountry}>{d.country}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.searchDivider} />
            {/* Performer type */}
            <TouchableOpacity
              style={styles.searchRow}
              onPress={() => setTypePickerVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.searchIcon}>🎤</Text>
              {loadingTypes ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} style={styles.typeLoader} />
              ) : (
                <Text style={[styles.searchInput, styles.searchSelectText]} numberOfLines={1}>
                  {selectedTypeName}
                </Text>
              )}
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            <View style={styles.searchDivider} />
            {/* Date */}
            <TouchableOpacity
              style={styles.searchRow}
              onPress={() => setDatePickerVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.searchIcon}>📅</Text>
              <Text style={[styles.searchInput, styles.searchSelectText]} numberOfLines={1}>
                {date ? date : 'Event date'}
              </Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            {/* Search button */}
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch} activeOpacity={0.9}>
              <Text style={styles.searchButtonIcon}>🔍</Text>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search by profession - quick chips */}
        {performerTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search by performer type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <TouchableOpacity
                style={[styles.chip, !performerType && styles.chipActive]}
                onPress={() => {
                  setPerformerType('');
                  setTypePickerVisible(false);
                }}
              >
                <Text style={[styles.chipText, !performerType && styles.chipTextActive]}>Any</Text>
              </TouchableOpacity>
              {performerTypes.map((t) => (
                <TouchableOpacity
                  key={t.slug}
                  style={[styles.chip, performerType === t.slug && styles.chipActive]}
                  onPress={() => {
                    setPerformerType(t.slug);
                    setTypePickerVisible(false);
                  }}
                >
                  <Text style={[styles.chipText, performerType === t.slug && styles.chipTextActive]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trust line */}
        <View style={styles.trust}>
          <Text style={styles.trustText}>Verified reviews · Secure booking · Trusted performers</Text>
        </View>

        {/* Footer - match website */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} Avently. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Type picker modal */}
      <Modal visible={typePickerVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
        >
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.md }]}>
            <Text style={styles.modalTitle}>Performer type</Text>
            <FlatList
              data={[{ slug: '', name: "I'd like to book a…" }, { slug: 'any', name: 'Any' }, ...performerTypes]}
              keyExtractor={(item) => item.slug ? item.slug : item.name === 'Any' ? 'any' : 'empty'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setPerformerType(item.slug === 'any' ? 'any' : item.slug);
                    setTypePickerVisible(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date picker modal */}
      <Modal visible={datePickerVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.md }]}>
            <Text style={styles.modalTitle}>Event date</Text>
            {presetDates.map((preset) => (
              <TouchableOpacity
                key={preset.value || 'any'}
                style={styles.modalRow}
                onPress={() => {
                  setDate(preset.value);
                  setDatePickerVisible(false);
                }}
              >
                <Text style={styles.modalRowText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  hero: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryForeground,
    marginBottom: spacing.sm,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
  },
  searchWrap: { marginTop: -spacing.lg, zIndex: 20 },
  searchBar: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 3,
    borderColor: colors.searchBarBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 48 },
  searchIcon: { fontSize: 18, marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, color: colors.foreground, paddingVertical: 0 },
  searchSelectText: { color: colors.foreground },
  typeLoader: { marginLeft: spacing.sm },
  chevron: { fontSize: 10, color: colors.mutedForeground, marginLeft: spacing.xs },
  searchDivider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md },
  suggestionsBox: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.xs,
    maxHeight: 220,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  suggestionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  suggestionName: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  suggestionCountry: { fontSize: 12, color: colors.mutedForeground },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.headerBg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchButtonIcon: { fontSize: 20 },
  searchButtonText: { fontSize: 18, fontWeight: '700', color: colors.primaryForeground },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionTitle: { ...typography.headline, color: colors.foreground, marginBottom: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.bodySmall, color: colors.foreground },
  chipTextActive: { color: colors.primaryForeground, fontWeight: '600' },
  trust: { marginTop: spacing.xl, paddingHorizontal: spacing.lg, alignItems: 'center' },
  trustText: { ...typography.bodySmall, color: colors.mutedForeground },
  footer: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.footerBg ?? colors.primaryDark,
    alignItems: 'center',
  },
  footerText: { ...typography.bodySmall, color: 'rgba(255,255,255,0.9)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, maxHeight: '60%', paddingTop: spacing.md },
  modalTitle: { ...typography.headline, color: colors.foreground, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  modalRow: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalRowText: { ...typography.body, color: colors.foreground },
});
