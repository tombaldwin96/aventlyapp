import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

export default function SearchTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find performers</Text>
      <Text style={styles.subtitle}>Search by location and date (coming soon)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.sm },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground },
});
