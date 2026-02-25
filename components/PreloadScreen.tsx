import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Platform, type ViewStyle, type ImageStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/lib/theme';

const PRELOAD_DURATION_MS = 2500;
const LOGO_REVEAL_MS = 520;
const LOGO_SCALE_START = 0.88;
const GLITCH_DELAY_MS = 420;
const GLITCH_MS = 140;
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_OUT_SHARP = Easing.bezier(0.25, 0.1, 0.25, 1);

export function PreloadScreen({
  onFinish,
  logoReady,
}: {
  onFinish: () => void;
  logoReady: boolean;
}) {
  const [started, setStarted] = useState(false);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(LOGO_SCALE_START);
  const glitchX = useSharedValue(0);

  useEffect(() => {
    if (!logoReady) return;
    setStarted(true);
  }, [logoReady]);

  useEffect(() => {
    if (!started) return;

    logoOpacity.value = withTiming(1, { duration: LOGO_REVEAL_MS * 0.6, easing: EASE_OUT });
    logoScale.value = withTiming(1, { duration: LOGO_REVEAL_MS, easing: EASE_OUT_SHARP });

    glitchX.value = withDelay(
      GLITCH_DELAY_MS,
      withSequence(
        withTiming(-6, { duration: GLITCH_MS * 0.2, easing: Easing.linear }),
        withTiming(5, { duration: GLITCH_MS * 0.25, easing: Easing.linear }),
        withTiming(-2, { duration: GLITCH_MS * 0.2, easing: Easing.linear }),
        withTiming(0, { duration: GLITCH_MS * 0.35, easing: EASE_OUT })
      )
    );

    const finishAt = PRELOAD_DURATION_MS;
    const t = setTimeout(() => {
      onFinish();
    }, finishAt);
    return () => clearTimeout(t);
  }, [started, logoOpacity, logoScale, glitchX, onFinish]);

  const logoStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateX: glitchX.value },
    ],
  }));

  return (
    <View style={styles.container as ViewStyle}>
      <View style={styles.centered}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo as ImageStyle}
            resizeMode="contain"
            accessibilityLabel="Avently logo"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({ web: { minHeight: '100vh' as unknown as number } }),
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 299,
    height: 299,
  },
});
