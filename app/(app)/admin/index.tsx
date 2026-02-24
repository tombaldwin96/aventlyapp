import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, typography } from '@/lib/theme';

export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Admin</Text>
      <Text style={styles.subtitle}>Overview and moderation (mirror web admin).</Text>
      {user && <Text style={styles.muted}>Logged in as {user.email}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.sm },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground, marginBottom: spacing.md },
  muted: { fontSize: 12, color: colors.mutedForeground },
});
