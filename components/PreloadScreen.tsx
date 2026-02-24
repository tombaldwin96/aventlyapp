import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/lib/theme';

const PRELOAD_DURATION_MS = 3000;

export function PreloadScreen({
  onFinish,
  logoReady,
}: {
  onFinish: () => void;
  logoReady: boolean;
}) {
  const [started, setStarted] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!logoReady) return;
    setStarted(true);
  }, [logoReady]);

  useEffect(() => {
    if (!started) return;
    progress.value = withTiming(
      1,
      { duration: PRELOAD_DURATION_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onFinish)();
      }
    );
  }, [started, progress, onFinish]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 80 },
      { scale: 0.7 + 0.3 * progress.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Avently logo"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({ web: { minHeight: '100vh' } }),
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
});
