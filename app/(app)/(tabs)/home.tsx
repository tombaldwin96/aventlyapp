import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

/** Redirects to the app homepage (logo + hero search). Home tab in footer goes here then to (app)/home. */
export default function HomeRedirectScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(app)/home');
  }, [router]);
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
