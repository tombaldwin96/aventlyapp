import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import AppHomeContent from '@/components/AppHomeContent';
import { colors } from '@/lib/theme';

/** App homepage (website-style): header + logo, hero search for performers. Reachable from all dashboards via Home tab. */
export default function AppHomeScreen() {
  return (
    <View style={styles.container}>
      <AppHeader showBack={false} />
      <AppHomeContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
