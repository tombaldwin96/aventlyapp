import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typography } from '@/lib/theme';

export default function MessagesTab() {
  const { dataUpdatedAt } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => [],
    staleTime: 60 * 1000,
  });
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : null;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>Conversations with performers will appear here.</Text>
      {lastUpdated && (
        <Text style={styles.caption}>Last updated: {lastUpdated}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.sm },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground },
  caption: { ...typography.caption, color: colors.mutedForeground, marginTop: spacing.md },
});
