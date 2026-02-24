import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

export default function PerformerAccount() {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.name, user?.phone]);

  const handleSave = async () => {
    setSaving(true);
    const res = await apiFetch<{ ok?: boolean }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: name.trim() || undefined, phone: phone.trim() || undefined }),
    });
    setSaving(false);
    if (res.data?.ok || res.status === 200) {
      await refreshProfile();
      Alert.alert('Saved', 'Your details have been updated.');
    } else {
      Alert.alert('Error', res.error ?? 'Could not save');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Update your name and phone</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.email}>{user?.email ?? '—'}</Text>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
        />
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  title: { ...typography.title, color: colors.foreground },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: { ...typography.caption, color: colors.mutedForeground, marginBottom: spacing.xs, marginTop: spacing.sm },
  email: { ...typography.body, color: colors.foreground, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.foreground,
  },
  saveBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveBtnText: { ...typography.body, fontWeight: '600', color: colors.primaryForeground },
});
