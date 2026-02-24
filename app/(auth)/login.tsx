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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

const emailSchema = z.object({ email: z.string().email('Enter a valid email') });

type EmailForm = z.infer<typeof emailSchema>;

const RESEND_COOLDOWN_SEC = 60;

export default function LoginScreen() {
  const router = useRouter();
  const { setUserFromLogin, setError, error } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });
  const otpValueRef = useRef('');
  const [otpInputUpdate, setOtpInputUpdate] = useState(0);

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
      setStep('otp');
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
      if (__DEV__) console.log('[Auth] OTP verified, user:', result.session.user.id);
      const accessToken = result.session.access_token?.trim();
      if (!accessToken) {
        setError('Sign-in succeeded but no token. Try again.');
        setLoading(false);
        return;
      }
      const base = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
      if (!base) {
        setError('App URL not configured. Set EXPO_PUBLIC_APP_URL in .env');
        setLoading(false);
        return;
      }
      const meUrl = `${base}/api/auth/me`;
      const meHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'X-Access-Token': accessToken,
      };
      let meRes: Response;
      try {
        meRes = await fetch(meUrl, { method: 'POST', headers: meHeaders });
      } catch (netErr) {
        setError('Network error. Check that ' + base + ' is reachable.');
        setLoading(false);
        return;
      }
      const meData = await meRes.json().catch(() => null);
      const profile = meData?.user ?? null;
      if (!profile) {
        if (meRes.status === 403) setError('Your account has been suspended.');
        else if (meRes.status === 401) setError(meData?.error ?? 'Invalid or expired token.');
        else if (meRes.status >= 500) setError(meData?.error ?? 'Server error. Try again later.');
        else if (!meRes.ok) setError(meData?.error ?? `Request failed (${meRes.status}).`);
        else setError(meData?.error ?? 'Could not load profile. Try again.');
        setLoading(false);
        return;
      }
      setUserFromLogin(profile);
      router.replace(getRedirectForRole(profile.role));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid or expired code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            {step === 'email' ? 'Sign in or create an account' : 'Enter your code'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'We’ll send a one-time code to your email. No password needed.'
              : `We sent a 6-digit code to ${email}. Enter it below.`}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'email' ? (
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
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
                </Text>
              </TouchableOpacity>
              {resendSuccess ? (
                <Text style={styles.successText}>Code sent again. Check your email.</Text>
              ) : null}
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => { setStep('email'); setError(null); }}
                disabled={loading}
              >
                <Text style={styles.linkText}>Use a different email</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getRedirectForRole(role: string): string {
  if (role === 'ADMIN') return '/(app)/admin';
  if (role === 'PERFORMER') return '/(app)/performer';
  if (role === 'BUSINESS') return '/(app)/business';
  return '/(app)';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', minHeight: '100%' },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.sm },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground, marginBottom: spacing.lg },
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
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
  },
  otpInput: { letterSpacing: 8, textAlign: 'center', fontSize: 20 },
  inputError: { borderColor: '#DC2626' },
  fieldError: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.primaryForeground, fontSize: 16, fontWeight: '600' },
  linkButton: { alignItems: 'center', paddingVertical: spacing.sm },
  backLink: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  linkText: { color: colors.primary, fontSize: 14 },
  successText: { fontSize: 14, color: '#059669', textAlign: 'center', marginTop: 4 },
});
