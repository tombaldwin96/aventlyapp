import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/api';
import { fetchPublic } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type TaxonomyItem = { slug: string; name: string };

type Props = {
  visible: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
};

const STEPS = ['About you', 'Your professions & events', 'Pricing'];

export function PerformerOnboardingModal({ visible, onComplete, onDismiss }: Props) {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [performerTypes, setPerformerTypes] = useState<TaxonomyItem[]>([]);
  const [eventTypes, setEventTypes] = useState<TaxonomyItem[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);

  const nameParts = (user?.name ?? '').trim().split(/\s+/);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const [stageName, setStageName] = useState('');
  const [phone, setPhone] = useState('');
  const [baseAddressLine1, setBaseAddressLine1] = useState('');
  const [basePostcode, setBasePostcode] = useState('');
  const [managementCode, setManagementCode] = useState('');
  const [contractorTermsAccepted, setContractorTermsAccepted] = useState(false);

  const [selectedPerformerTypes, setSelectedPerformerTypes] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [travelRadiusMiles, setTravelRadiusMiles] = useState('30');
  const [minLeadTimeDays, setMinLeadTimeDays] = useState('1');

  const [weekdayPence, setWeekdayPence] = useState('');
  const [weekendPence, setWeekendPence] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTaxonomyLoading(true);
    Promise.all([
      fetchPublic<TaxonomyItem[]>('/api/taxonomy/performer-types'),
      fetchPublic<TaxonomyItem[]>('/api/taxonomy/event-types'),
    ]).then(([pt, et]) => {
      if (pt.data && Array.isArray(pt.data)) setPerformerTypes(pt.data);
      if (et.data && Array.isArray(et.data)) setEventTypes(et.data);
      setTaxonomyLoading(false);
    });
  }, [visible]);

  const togglePerformerType = useCallback((slug: string) => {
    setSelectedPerformerTypes((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }, []);
  const toggleEventType = useCallback((slug: string) => {
    setSelectedEventTypes((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }, []);

  const canProceed = useCallback(() => {
    if (step === 0) {
      return (
        firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        stageName.trim().length > 0 &&
        basePostcode.trim().length > 0 &&
        contractorTermsAccepted
      );
    }
    if (step === 1) {
      return selectedPerformerTypes.length > 0 && selectedEventTypes.length > 0;
    }
    if (step === 2) {
      const w = Math.round(Number(weekdayPence) || 0) * 100;
      const e = Math.round(Number(weekendPence) || 0) * 100;
      return w > 0 || e > 0;
    }
    return true;
  }, [step, firstName, lastName, stageName, basePostcode, contractorTermsAccepted, selectedPerformerTypes, selectedEventTypes, weekdayPence, weekendPence]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  const handleNext = useCallback(() => {
    setError(null);
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }, [step]);

  const handleBack = useCallback(() => {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSubmitLoading(true);
    const base = getApiBaseUrl();
    if (!base) {
      setSubmitLoading(false);
      setError('API URL not configured. Set EXPO_PUBLIC_APP_URL.');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token?.trim();
    if (!token) {
      setSubmitLoading(false);
      setError('Not signed in. Please sign out and sign in again.');
      return;
    }
    const travel = Math.max(1, Math.min(500, Math.round(Number(travelRadiusMiles) || 30)));
    const lead = Math.max(0, Math.round(Number(minLeadTimeDays) ?? 1));
    const weekdayPenceNum = Math.max(0, Math.round(Number(weekdayPence) || 0) * 100);
    const weekendPenceNum = Math.max(0, Math.round(Number(weekendPence) || 0) * 100);
    const body = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      stageName: stageName.trim(),
      email: user?.email ?? undefined,
      phone: phone.trim() || undefined,
      baseAddressLine1: baseAddressLine1.trim() || undefined,
      basePostcode: basePostcode.trim(),
      contractorTermsAccepted: true,
      performerTypes: selectedPerformerTypes,
      eventTypesAccepted: selectedEventTypes,
      travelRadiusMiles: travel,
      minLeadTimeDays: lead,
      defaultPrices: { weekdayPence: weekdayPenceNum, weekendPence: weekendPenceNum },
      managementCode: managementCode.trim() || undefined,
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${base}/api/performers/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Access-Token': token,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          res.status === 401
            ? "Your account isn't set up as a performer. Please sign out and create a performer account."
            : res.status === 504
              ? 'Server took too long to respond. Please try again.'
              : (data as { error?: string }).error ?? `Request failed (${res.status})`;
        setError(msg);
        return;
      }
      onComplete();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === 'AbortError') {
        setError('Request timed out. Check your connection and try again.');
      } else {
        setError(e instanceof Error ? e.message : 'Submission failed');
      }
    } finally {
      setSubmitLoading(false);
    }
  }, [
    user?.email,
    firstName,
    lastName,
    stageName,
    basePostcode,
    phone,
    baseAddressLine1,
    managementCode,
    selectedPerformerTypes,
    selectedEventTypes,
    travelRadiusMiles,
    minLeadTimeDays,
    weekdayPence,
    weekendPence,
    onComplete,
  ]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <View style={styles.stepIndicator}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.stepDot, i <= step && styles.stepDotActive]}
              />
            ))}
          </View>
          <Text style={styles.stepTitle}>{STEPS[step]}</Text>
          <Text style={styles.stepSubtitle}>
            {step === 0 && 'Tell us your name and where you’re based.'}
            {step === 1 && 'What do you do and which events do you cover?'}
            {step === 2 && 'Set default prices (you can change these later).'}
          </Text>
          {onDismiss && (
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeBtnText}>Complete later</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
              <Text style={styles.label}>Stage name</Text>
              <TextInput
                style={styles.input}
                value={stageName}
                onChangeText={setStageName}
                placeholder="Stage or display name"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 07123456789"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
              />
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={baseAddressLine1}
                onChangeText={setBaseAddressLine1}
                placeholder="Street address"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
              <Text style={styles.label}>Postcode (base location)</Text>
              <TextInput
                style={styles.input}
                value={basePostcode}
                onChangeText={setBasePostcode}
                placeholder="e.g. L1 1AA"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
              />
              <Text style={styles.label}>Manager code</Text>
              <TextInput
                style={styles.input}
                value={managementCode}
                onChangeText={setManagementCode}
                placeholder="e.g. ABC123 (if you have one)"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
              />
              <Text style={[styles.hint, { marginBottom: spacing.sm }]}>
                Optional. Enter the code from your manager to link your profile to them.
              </Text>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setContractorTermsAccepted(!contractorTermsAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, contractorTermsAccepted && styles.checkboxChecked]}>
                  {contractorTermsAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>I agree to the Terms of Service</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 1 && (
            <View style={styles.section}>
              {taxonomyLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
              ) : (
                <>
                  <Text style={styles.label}>Your professions</Text>
                  <Text style={styles.hint}>
                    Select all that apply. You'll appear in search under each profession you choose.
                  </Text>
                  <View style={styles.chipRow}>
                    {performerTypes.map((t) => {
                      const selected = selectedPerformerTypes.includes(t.slug);
                      return (
                        <TouchableOpacity
                          key={t.slug}
                          style={[styles.chip, selected && styles.chipSelected]}
                          onPress={() => togglePerformerType(t.slug)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                            {t.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={[styles.label, { marginTop: spacing.lg }]}>Events you cover</Text>
                  <Text style={styles.hint}>
                    Select all event types you're available for.
                  </Text>
                  <View style={styles.chipRow}>
                    {eventTypes.map((t) => {
                      const selected = selectedEventTypes.includes(t.slug);
                      return (
                        <TouchableOpacity
                          key={t.slug}
                          style={[styles.chip, selected && styles.chipSelected]}
                          onPress={() => toggleEventType(t.slug)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                            {t.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.label}>Travel radius (miles)</Text>
                  <Text style={styles.hint}>
                    How far from your base postcode you're willing to travel for bookings.
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={travelRadiusMiles}
                    onChangeText={setTravelRadiusMiles}
                    placeholder="e.g. 30"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.label}>Min lead time (days)</Text>
                  <TextInput
                    style={styles.input}
                    value={minLeadTimeDays}
                    onChangeText={setMinLeadTimeDays}
                    placeholder="e.g. 1"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                  />
                </>
              )}
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.label}>Weekday price (£)</Text>
              <TextInput
                style={styles.input}
                value={weekdayPence}
                onChangeText={setWeekdayPence}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
              <Text style={styles.label}>Weekend price (£)</Text>
              <TextInput
                style={styles.input}
                value={weekendPence}
                onChangeText={setWeekendPence}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
              <Text style={styles.hint}>
                Prices are for a standard 4-hour set. For bookings longer than 4 hours, we use
                this rate to calculate your hourly fee and add it to the booking. You can change
                these defaults later and add more packages after approval.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleBack}
                disabled={step === 0}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Back</Text>
              </TouchableOpacity>
              {step < STEPS.length - 1 ? (
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, !canProceed() && styles.buttonDisabled]}
                  onPress={handleNext}
                  disabled={!canProceed()}
                >
                  <Text style={styles.buttonTextPrimary}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.buttonPrimary,
                    (submitLoading || !canProceed()) && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitLoading || !canProceed()}
                >
                  {submitLoading ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={styles.buttonTextPrimary}>Submit for review</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.muted,
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepTitle: { ...typography.title, color: colors.foreground, marginBottom: spacing.xs },
  stepSubtitle: { ...typography.bodySmall, color: colors.mutedForeground, marginBottom: spacing.md },
  closeBtn: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  closeBtnText: { ...typography.bodySmall, color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl + 80 },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 14, color: '#B91C1C' },
  section: { marginBottom: spacing.xl },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    color: colors.foreground,
    letterSpacing: 0,
    marginBottom: spacing.md,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.primaryForeground, fontSize: 14, fontWeight: '700' },
  checkLabel: { ...typography.body, color: colors.foreground, flex: 1 },
  loader: { marginVertical: spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
  chipText: { ...typography.bodySmall, color: colors.foreground },
  chipTextSelected: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  hint: { ...typography.bodySmall, color: colors.mutedForeground, marginTop: spacing.xs },
  footer: { marginTop: spacing.lg },
  buttonRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...typography.body, fontWeight: '600' },
  buttonTextPrimary: { ...typography.body, fontWeight: '600', color: colors.primaryForeground },
  buttonTextSecondary: { ...typography.body, fontWeight: '600', color: colors.foreground },
});
