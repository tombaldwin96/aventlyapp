import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/lib/theme';

function getDashboardUrl(path: string): string {
  const base = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://avently.co.uk';
  return `${base}/dashboard${path}`;
}

export default function PerformerMessages() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.card}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.desc}>
          View and reply to messages about your bookings. Conversations open on the web dashboard.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Linking.openURL(getDashboardUrl('/messages'))}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Open messages on web</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.sm },
  desc: { ...typography.bodySmall, color: colors.mutedForeground, marginBottom: spacing.lg },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: { ...typography.body, color: colors.primaryForeground, fontWeight: '600' },
});
