import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

export default function BusinessDashboard() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Event host / Business</Text>
      <Text style={styles.subtitle}>Events and bookings (mirror web).</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.sm },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground },
});
