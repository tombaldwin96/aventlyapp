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
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Image as ExpoImage } from 'expo-image';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { fetchPublic } from '@/lib/api';
import { filterTrendingDestinations } from '@/lib/trending-destinations';
import { getProfessionImage } from '@/lib/profession-images';

type TrendingDjCard = {
  userId: string;
  profileSlug: string;
  stageName: string;
  profileImageUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  minPricePence: number | null;
};

export type PerformerType = { slug: string; name: string };

const getBaseUrl = () => process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://avently.co.uk';

export function getSearchUrl(params: { location?: string; date?: string; performerTypes?: string; eventType?: string }): string {
  const base = getBaseUrl();
  const searchParams = new URLSearchParams();
  if (params.location?.trim()) searchParams.set('location', params.location.trim());
  if (params.date?.trim()) searchParams.set('date', params.date.trim());
  if (params.performerTypes?.trim() && params.performerTypes !== 'any')
    searchParams.set('performerTypes', params.performerTypes.trim());
  if (params.eventType?.trim()) searchParams.set('eventType', params.eventType.trim());
  return `${base}/search?${searchParams.toString()}`;
}

function getPerformerProfileUrl(profileSlug: string): string {
  return `${getBaseUrl()}/performers/${encodeURIComponent(profileSlug)}`;
}

const WEDDINGS_OPTIONS = [
  { slug: 'dj', name: 'DJ' },
  { slug: 'singer', name: 'Singer' },
  { slug: 'band', name: 'Band' },
  { slug: 'instrumentalist', name: 'Instrumentalist' },
  { slug: 'magician', name: 'Magician' },
  { slug: 'event-host-presenter', name: 'Event Host / Presenter' },
] as const;

const CORPORATE_OPTIONS = [
  { slug: 'dj', name: 'DJ' },
  { slug: 'event-host-presenter', name: 'Event Host / Presenter' },
  { slug: 'singer', name: 'Singer' },
  { slug: 'instrumentalist', name: 'Instrumentalist' },
  { slug: 'band', name: 'Band' },
  { slug: 'comedian', name: 'Comedian' },
] as const;

const TRENDING_LOCATIONS = [
  { name: 'London', image: '/london.jpg' },
  { name: 'Manchester', image: '/manchester.jpg' },
  { name: 'Liverpool', image: '/liverpool.jpg' },
  { name: 'Birmingham', image: '/birmingham.jpg' },
  { name: 'Glasgow', image: '/glasgow.jpg' },
] as const;

export default function AppHomeContent() {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState('');
  const [performerType, setPerformerType] = useState('');
  const [date, setDate] = useState('');
  const [performerTypes, setPerformerTypes] = useState<PerformerType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [trendingDjs, setTrendingDjs] = useState<TrendingDjCard[]>([]);
  const [loadingTrendingDjs, setLoadingTrendingDjs] = useState(true);
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

  useEffect(() => {
    fetchPublic<{ performers: TrendingDjCard[] }>('/api/trending/djs').then((res) => {
      setLoadingTrendingDjs(false);
      if (res.data?.performers && Array.isArray(res.data.performers)) {
        setTrendingDjs(res.data.performers);
      }
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

  const openSearch = useCallback((url: string) => {
    WebBrowser.openBrowserAsync(url);
  }, []);

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
        {/* Hero (logo is in global AppHeader) */}
        <View style={[styles.hero, { paddingTop: spacing.xl }]}>
          <Text style={styles.heroTitle}>Book unforgettable entertainment for any event.</Text>
          <Text style={styles.heroSubtitle}>
            Discover trusted DJs, singers, bands and more with verified reviews and secure booking.
          </Text>
        </View>

        {/* Hero search bar */}
        <View style={[styles.searchWrap, { marginHorizontal: spacing.md }]}>
          <View style={styles.searchBar}>
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

            <TouchableOpacity style={styles.searchButton} onPress={handleSearch} activeOpacity={0.9}>
              <Text style={styles.searchButtonIcon}>🔍</Text>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search by Performer Type - website-style grid */}
        {performerTypes.length > 0 && (
          <View style={[styles.section, styles.sectionBg]}>
            <Text style={styles.sectionTitle}>Search by Performer Type</Text>
            <Text style={styles.sectionSubtitle}>Choose a type to find performers. Tap to search.</Text>
            <View style={styles.grid}>
              {performerTypes.filter((t) => t.slug && t.slug !== 'face-painter').map((t) => (
                <TouchableOpacity
                  key={t.slug}
                  style={styles.card}
                  onPress={() => openSearch(getSearchUrl({ performerTypes: t.slug }))}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardImageWrap}>
                    <Image source={getProfessionImage(t.slug)} style={styles.cardImage} resizeMode="cover" />
                  </View>
                  <Text style={styles.cardLabel} numberOfLines={1}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Trending DJ's */}
        <View style={[styles.section, styles.sectionBg]}>
          <Text style={styles.sectionTitle}>Trending DJ&apos;s</Text>
          <Text style={styles.sectionSubtitle}>Most booked DJ&apos;s with the highest ratings. Book with confidence.</Text>
          {loadingTrendingDjs ? (
            <View style={styles.trendingDjsLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : trendingDjs.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingDjsScroll}
            >
              {trendingDjs.map((dj) => (
                <TouchableOpacity
                  key={dj.userId}
                  style={styles.trendingDjCard}
                  onPress={() => WebBrowser.openBrowserAsync(getPerformerProfileUrl(dj.profileSlug))}
                  activeOpacity={0.9}
                >
                  {dj.profileImageUrl ? (
                    <ExpoImage source={{ uri: dj.profileImageUrl }} style={styles.trendingDjImage} contentFit="cover" />
                  ) : (
                    <Image source={getProfessionImage('dj')} style={styles.trendingDjImage} resizeMode="cover" />
                  )}
                  <Text style={styles.trendingDjName} numberOfLines={1}>{dj.stageName}</Text>
                  <View style={styles.trendingDjMeta}>
                    {dj.ratingAvg != null && (
                      <Text style={styles.trendingDjRating}>★ {dj.ratingAvg.toFixed(1)}{dj.ratingCount > 0 ? ` (${dj.ratingCount})` : ''}</Text>
                    )}
                    {dj.minPricePence != null && dj.minPricePence > 0 && (
                      <Text style={styles.trendingDjPrice}>From £{(dj.minPricePence / 100).toFixed(0)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={styles.ctaCard}
              onPress={() => openSearch(getSearchUrl({ performerTypes: 'dj' }))}
              activeOpacity={0.9}
            >
              <Image source={getProfessionImage('dj')} style={styles.ctaCardImage} resizeMode="cover" />
              <View style={styles.ctaCardOverlay}>
                <Text style={styles.ctaCardText}>Find DJ&apos;s</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Weddings */}
        <View style={[styles.section, styles.sectionBg]}>
          <Text style={styles.sectionTitle}>Weddings</Text>
          <Text style={styles.sectionSubtitle}>DJs, singers, bands, instrumentalists, magicians and event hosts for your big day.</Text>
          <View style={styles.grid}>
            {WEDDINGS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.slug}
                style={styles.card}
                onPress={() => openSearch(getSearchUrl({ performerTypes: opt.slug, eventType: 'weddings' }))}
                activeOpacity={0.9}
              >
                <View style={styles.cardImageWrap}>
                  <Image source={getProfessionImage(opt.slug)} style={styles.cardImage} resizeMode="cover" />
                </View>
                <Text style={styles.cardLabel} numberOfLines={1}>{opt.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => openSearch(getSearchUrl({ eventType: 'weddings' }))} style={styles.viewAllLink}>
            <Text style={styles.viewAllText}>View all Weddings performers →</Text>
          </TouchableOpacity>
        </View>

        {/* Corporate Events / Dinners */}
        <View style={[styles.section, styles.sectionBg]}>
          <Text style={styles.sectionTitle}>Corporate Events / Dinners</Text>
          <Text style={styles.sectionSubtitle}>DJs, presenters, singers, instrumentalists, bands and comedians for corporate events and dinners.</Text>
          <View style={styles.grid}>
            {CORPORATE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.slug}
                style={styles.card}
                onPress={() => openSearch(getSearchUrl({ performerTypes: opt.slug, eventType: 'corporate' }))}
                activeOpacity={0.9}
              >
                <View style={styles.cardImageWrap}>
                  <Image source={getProfessionImage(opt.slug)} style={styles.cardImage} resizeMode="cover" />
                </View>
                <Text style={styles.cardLabel} numberOfLines={1}>{opt.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => openSearch(getSearchUrl({ eventType: 'corporate' }))} style={styles.viewAllLink}>
            <Text style={styles.viewAllText}>View all Corporate Events performers →</Text>
          </TouchableOpacity>
        </View>

        {/* Trending Locations */}
        <View style={[styles.section, styles.sectionBg]}>
          <Text style={styles.sectionTitle}>Trending locations</Text>
          <Text style={styles.sectionSubtitle}>Popular cities for entertainment. Tap to find performers near you.</Text>
          <View style={styles.locationsGrid}>
            {TRENDING_LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc.name}
                style={styles.locationCard}
                onPress={() => openSearch(getSearchUrl({ location: loc.name }))}
                activeOpacity={0.9}
              >
                <ExpoImage
                  source={{ uri: `${getBaseUrl()}${loc.image}` }}
                  style={styles.locationCardImage}
                  contentFit="cover"
                />
                <View style={styles.locationCardOverlay} />
                <View style={styles.locationCardInner}>
                  <Text style={styles.locationCardText}>{loc.name}</Text>
                  <Text style={styles.locationCardCountry}>UK</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.trust}>
          <Text style={styles.trustText}>Verified reviews · Secure booking · Trusted performers</Text>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} Avently. All rights reserved.</Text>
        </View>
      </ScrollView>

      <Modal visible={typePickerVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypePickerVisible(false)}>
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

      <Modal visible={datePickerVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDatePickerVisible(false)}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.md }]}>
            <Text style={styles.modalTitle}>Event date</Text>
            {presetDates.map((preset) => (
              <TouchableOpacity
                key={preset.value || 'any'}
                style={styles.modalRow}
                onPress={() => { setDate(preset.value); setDatePickerVisible(false); }}
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
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', lineHeight: 24 },
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
  sectionBg: { backgroundColor: 'rgba(0,0,0,0.03)', paddingVertical: spacing.lg, marginHorizontal: 0, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { ...typography.headline, color: colors.foreground, marginBottom: spacing.sm },
  sectionSubtitle: { ...typography.bodySmall, color: colors.mutedForeground, marginBottom: spacing.md, maxWidth: 400 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  card: {
    width: (Dimensions.get('window').width - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImageWrap: { aspectRatio: 4 / 3, backgroundColor: colors.muted },
  cardImage: { width: '100%', height: '100%' },
  cardLabel: { ...typography.bodySmall, fontWeight: '600', color: colors.foreground, textAlign: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  trendingDjsLoader: { marginTop: spacing.sm, paddingVertical: spacing.xl, alignItems: 'center' },
  trendingDjsScroll: { paddingVertical: spacing.sm, paddingRight: spacing.lg },
  trendingDjCard: {
    width: 160,
    marginRight: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendingDjImage: { width: '100%', aspectRatio: 1, backgroundColor: colors.muted },
  trendingDjName: { ...typography.bodySmall, fontWeight: '600', color: colors.foreground, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 2 },
  trendingDjMeta: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  trendingDjRating: { fontSize: 12, color: colors.mutedForeground },
  trendingDjPrice: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 2 },
  ctaCard: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    aspectRatio: 2.5,
    backgroundColor: colors.muted,
    maxHeight: 160,
  },
  ctaCardImage: { width: '100%', height: '100%' },
  ctaCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaCardText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  viewAllLink: { marginTop: spacing.md },
  viewAllText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  locationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  locationCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    aspectRatio: 2,
    backgroundColor: colors.muted,
  },
  locationCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  locationCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  locationCardInner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  locationCardText: { ...typography.body, fontWeight: '600', color: '#fff' },
  locationCardCountry: { ...typography.caption, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
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
