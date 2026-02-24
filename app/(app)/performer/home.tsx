import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppHomeContent from '@/components/AppHomeContent';
import { colors } from '@/lib/theme';

/** Home content inside performer layout so the bottom tab bar stays visible. */
export default function PerformerHomeScreen() {
  return (
    <View style={styles.container}>
      <AppHomeContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
