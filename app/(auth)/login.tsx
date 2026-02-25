import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
const isIOS = Platform.OS === 'ios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { setPendingSignupRole, getPendingSignupRole, setSignupInProgress } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

const emailSchema = z.object({ email: z.string().email('Enter a valid email') });
type EmailForm = z.infer<typeof emailSchema>;
const RESEND_COOLDOWN_SEC = 60;

/** API role for X-Signup-Role header */
type SignupRole = 'END_USER' | 'PERFORMER' | 'BUSINESS';

const SIGNUP_ACCOUNT_OPTIONS: {
  value: SignupRole;
  label: string;
  description: string;
  icon: 'user' | 'music' | 'building';
  iconBg: string;
}[] = [
  {
    value: 'END_USER',
    label: 'Personal account',
    description: 'Book performers for your events. Browse, compare, and manage bookings from one place.',
    icon: 'user',
    iconBg: '#E0E7FF',
  },
  {
    value: 'PERFORMER',
    label: 'Performer account',
    description: 'List your services, set your availability and prices, and get booked for gigs and events.',
    icon: 'music',
    iconBg: '#FCE7F3',
  },
  {
    value: 'BUSINESS',
    label: 'Business / event space',
    description: 'For venues, agencies, and event organisers. Create events and book performers for your clients.',
    icon: 'building',
    iconBg: '#D1FAE5',
  },
];

type FlowStep = 'split' | 'login-form' | 'signup-account-type' | 'signup-form' | 'otp';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setUserFromLogin, setError, error } = useAuth();

  const [flowStep, setFlowStep] = useState<FlowStep>('split');
  const [email, setEmail] = useState('');
  const [signupRole, setSignupRole] = useState<SignupRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });
  const otpValueRef = useRef('');
  const [, setOtpInputUpdate] = useState(0);

  const isReturningFlow = flowStep === 'login-form' || (flowStep === 'otp' && signupRole === null);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const sendOtp = async (emailValue: string) => {
    const { error: err } = await supabase.auth.signInWithOtp({
      email: emailValue.trim(),
      options: { shouldCreateUser: true },
    });
    if (err) throw err;
    if (__DEV__) console.log('[Auth] OTP sent to', emailValue);
  };

  const onEmailSubmit = async (data: EmailForm) => {
    setError(null);
    setLoading(true);
    try {
      await sendOtp(data.email);
      setEmail(data.email);
      otpValueRef.current = '';
      setFlowStep('otp');
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setResendSuccess(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send code';
      setError(msg);
      emailForm.setError('email', { message: msg });
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      await sendOtp(email);
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setResendSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    setError(null);
    const token = otpValueRef.current.replace(/\D/g, '').trim().slice(0, 6);
    if (token.length < 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    const isSignupWithRole = !!signupRole;
    setPendingSignupRole(signupRole ?? null);
    setSignupInProgress(isSignupWithRole);
    try {
      const { data: result, error: err } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'email',
      });
      if (err) throw err;
      if (!result.session?.user) {
        throw new Error('Verification failed — no session. Try again or use a fresh code.');
      }
      const accessToken = result.session.access_token?.trim();
      if (!accessToken) {
        setPendingSignupRole(null);
        setSignupInProgress(false);
        setError('Sign-in succeeded but no token. Try again.');
        setLoading(false);
        return;
      }
      const base = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
      if (!base) {
        setPendingSignupRole(null);
        setSignupInProgress(false);
        setError('App URL not configured. Set EXPO_PUBLIC_APP_URL in .env');
        setLoading(false);
        return;
      }
      const roleToSend = signupRole ?? getPendingSignupRole();
      const meUrl = `${base}/api/auth/me${roleToSend === 'PERFORMER' ? '?intent=partner' : ''}`;
      const meHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'X-Access-Token': accessToken,
      };
      if (roleToSend) {
        meHeaders['X-Signup-Role'] = roleToSend;
        if (roleToSend === 'PERFORMER') {
          meHeaders['X-Signup-Intent'] = 'partner';
        }
        if (__DEV__) console.log('[Auth] Signup role sent:', roleToSend);
      }
      let meRes: Response;
      try {
        meRes = await fetch(meUrl, { method: 'POST', headers: meHeaders });
      } catch (netErr) {
        setPendingSignupRole(null);
        setSignupInProgress(false);
        setError('Network error. Check that ' + base + ' is reachable.');
        setLoading(false);
        return;
      }
      const meData = await meRes.json().catch(() => null);
      const profile = meData?.user ?? null;
      if (!profile) {
        setPendingSignupRole(null);
        setSignupInProgress(false);
        if (meRes.status === 403) setError('Your account has been suspended.');
        else if (meRes.status === 401) setError(meData?.error ?? 'Invalid or expired token.');
        else if (meRes.status >= 500) setError(meData?.error ?? 'Server error. Try again later.');
        else if (!meRes.ok) setError(meData?.error ?? `Request failed (${meRes.status}).`);
        else setError(meData?.error ?? 'Could not load profile. Try again.');
        setLoading(false);
        return;
      }
      setUserFromLogin(profile);
      setPendingSignupRole(null);
      setSignupInProgress(false);
      router.replace(getRedirectForRole(profile.role) as import('expo-router').Href);
    } catch (e: unknown) {
      setPendingSignupRole(null);
      setSignupInProgress(false);
      const msg = e instanceof Error ? e.message : 'Invalid or expired code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (flowStep === 'otp') {
      setFlowStep(signupRole ? 'signup-form' : 'login-form');
    } else if (flowStep === 'login-form' || flowStep === 'signup-form') {
      setFlowStep('split');
      if (signupRole) setSignupRole(null);
    } else if (flowStep === 'signup-account-type') {
      setFlowStep('split');
      setSignupRole(null);
    }
  };

  const authHeaderStyle = {
    paddingTop: insets.top + 12,
    paddingBottom: 28,
  };

  // —— Split screen (two halves) ——
  if (flowStep === 'split') {
    return (
      <View style={styles.container}>
        <View style={[styles.authHeader, authHeaderStyle]}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.authHeaderLogo}
            resizeMode="contain"
            accessibilityLabel="Avently"
          />
        </View>
        <ScrollView
          contentContainerStyle={[styles.splitScroll, { paddingBottom: insets.bottom + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.splitCard}
            onPress={() => setFlowStep('login-form')}
            activeOpacity={0.92}
          >
            <Text style={styles.splitCardTitle}>Welcome back</Text>
            <Text style={styles.splitCardSubtitle}>Sign in to your account with your email</Text>
            <View style={styles.splitCardCta}>
              <Text style={styles.splitCardCtaText}>Sign in</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.splitCard, styles.splitCardSecondary]}
            onPress={() => setFlowStep('signup-account-type')}
            activeOpacity={0.92}
          >
            <Text style={styles.splitCardTitleSecondary}>New to Avently?</Text>
            <Text style={styles.splitCardSubtitle}>Create an account in seconds</Text>
            <View style={styles.splitCardCtaOutline}>
              <Text style={styles.splitCardCtaOutlineText}>Create account</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // —— Sign up: choose account type ——
  if (flowStep === 'signup-account-type') {
    return (
      <View style={styles.container}>
        <View style={[styles.authHeader, authHeaderStyle]}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.authHeaderLogo}
            resizeMode="contain"
            accessibilityLabel="Avently"
          />
        </View>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <TouchableOpacity onPress={goBack} style={styles.backChevron}>
              <Text style={styles.backChevronText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>What type of account?</Text>
            <Text style={styles.subtitle}>Choose the option that best fits how you’ll use Avently.</Text>
            {SIGNUP_ACCOUNT_OPTIONS.map((opt) => {
              const isSelected = signupRole === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.accountOptionCard, isSelected && styles.accountOptionCardSelected]}
                  onPress={() => setSignupRole(opt.value)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.accountOptionIconWrap, { backgroundColor: opt.iconBg }]}>
                    <FontAwesome name={opt.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={styles.accountOptionContent}>
                    <Text style={[styles.accountOptionTitle, isSelected && styles.accountOptionTitleSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.accountOptionDescription}>{opt.description}</Text>
                  </View>
                  <View style={[styles.accountOptionCheck, isSelected && styles.accountOptionCheckSelected]}>
                    {isSelected ? (
                      <FontAwesome name="check" size={14} color="#fff" />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.button, (!signupRole || loading) && styles.buttonDisabled]}
              onPress={() => signupRole && setFlowStep('signup-form')}
              disabled={!signupRole || loading}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // —— Email + OTP form (login or signup) ——
  const showEmailStep = flowStep === 'login-form' || flowStep === 'signup-form';
  const formTitle = isReturningFlow
    ? 'Sign in or create an account'
    : 'Almost there — enter your email';
  const formSubtitle = showEmailStep
    ? (isReturningFlow
        ? "We'll send a one-time code to your email. No password needed."
        : "We'll send a 6-digit code to confirm it's you.")
    : `We sent a 6-digit code to ${email}. Enter it below.`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={[styles.authHeader, authHeaderStyle]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.authHeaderLogo}
          resizeMode="contain"
          accessibilityLabel="Avently"
        />
      </View>
      <View
        style={[
          styles.formScreenContent,
          {
            paddingBottom: insets.bottom + spacing.lg,
            paddingTop: spacing.lg,
          },
        ]}
      >
        <View style={styles.card}>
          <TouchableOpacity onPress={goBack} style={styles.backChevron}>
            <Text style={styles.backChevronText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {flowStep === 'otp' ? 'Enter your code' : formTitle}
          </Text>
          <Text style={styles.subtitle}>{formSubtitle}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {showEmailStep ? (
            <View style={styles.form}>
              <Controller
                control={emailForm.control}
                name="email"
                render={({ field: { onChange, onBlur, value }, fieldState: { error: fieldError } }) => (
                  <>
                    <Text style={styles.label}>Email address</Text>
                    <TextInput
                      style={[styles.input, fieldError && styles.inputError]}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.mutedForeground}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!loading}
                    />
                    {fieldError ? (
                      <Text style={styles.fieldError}>{fieldError.message}</Text>
                    ) : null}
                  </>
                )}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={emailForm.handleSubmit(onEmailSubmit)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.buttonText}>Send code</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>6-digit code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={colors.mutedForeground}
                value={otpValueRef.current}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '').slice(0, 6);
                  otpValueRef.current = digits;
                  setOtpInputUpdate((n) => n + 1);
                }}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={onOtpSubmit}
                disabled={loading || otpValueRef.current.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.buttonText}>Verify and sign in</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={onResend}
                disabled={loading || resendCooldown > 0}
              >
                <Text style={styles.linkText}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
              {resendSuccess ? (
                <Text style={styles.successText}>Code sent again. Check your email.</Text>
              ) : null}
              <TouchableOpacity style={styles.backLink} onPress={goBack} disabled={loading}>
                <Text style={styles.linkText}>Use a different email</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function getRedirectForRole(role: string): string {
  if (role === 'ADMIN') return '/(app)/admin';
  if (role === 'PERFORMER') return '/(app)/performer';
  if (role === 'BUSINESS') return '/(app)/business';
  return '/(app)';
}

const CARD_SHADOW = isIOS
  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 }
  : { elevation: 4 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  authHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
  },
  authHeaderLogo: { width: 220, height: 44 },
  splitScroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    justifyContent: 'center',
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  splitCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg + 4,
    marginBottom: spacing.md,
    ...CARD_SHADOW,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  splitCardSecondary: {
    backgroundColor: colors.card,
  },
  splitCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  splitCardTitleSecondary: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  splitCardSubtitle: {
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  splitCardCta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...(isIOS ? { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8 } : { elevation: 2 }),
  },
  splitCardCtaText: { color: colors.primaryForeground, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  splitCardCtaOutline: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  splitCardCtaOutlineText: { color: colors.primary, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  scroll: { flexGrow: 1, padding: spacing.lg, minHeight: '100%' },
  formScreenContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg + 4,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    ...CARD_SHADOW,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  backChevron: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  backChevronText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: colors.foreground, letterSpacing: -0.4, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22, marginBottom: spacing.lg },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 14, color: '#DC2626', fontWeight: '500' },
  form: { gap: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFBFC',
  },
  optionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  optionRadioSelected: { borderColor: colors.primary },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionLabel: { fontSize: 15, color: colors.foreground, flex: 1 },
  optionLabelSelected: { fontWeight: '600', color: colors.foreground },
  accountOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#FAFBFC',
  },
  accountOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },
  accountOptionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountOptionContent: { flex: 1, minWidth: 0 },
  accountOptionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  accountOptionTitleSelected: { color: colors.primary },
  accountOptionDescription: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  accountOptionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  accountOptionCheckSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  input: {
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
  },
  otpInput: { letterSpacing: 10, textAlign: 'center', fontSize: 22 },
  inputError: { borderColor: '#DC2626' },
  fieldError: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: spacing.sm,
    ...(isIOS ? { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8 } : { elevation: 2 }),
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.primaryForeground, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  linkButton: { alignItems: 'center', paddingVertical: spacing.sm },
  backLink: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  successText: { fontSize: 14, color: '#059669', textAlign: 'center', marginTop: 4 },
});
