import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, spacing } from '@/lib/theme';

type AppHeaderProps = {
  /** Show back button when stack can go back */
  showBack?: boolean;
  /** Optional title (centred, subtle) */
  title?: string;
  /** Right-side element (e.g. profile icon) */
  rightElement?: React.ReactNode;
};

export function AppHeader({ showBack = true, title, rightElement }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const canGoBack = showBack && router.canGoBack();
  const scale = useSharedValue(1);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onLogoPressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };
  const onLogoPressOut = () => {
    scale.value = withSpring(1);
  };
  const onLogoPress = () => {
    router.push('/(app)/home');
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.shine} />
      <View style={styles.bar}>
        <View style={styles.left}>
          {canGoBack ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backChevron}>‹</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPressIn={onLogoPressIn}
            onPressOut={onLogoPressOut}
            onPress={onLogoPress}
            style={styles.logoTouch}
            activeOpacity={1}
          >
            <Animated.View style={logoAnimatedStyle}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Avently – Home"
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
        {title ? (
          <View style={styles.titleWrap} pointerEvents="none">
            <Animated.Text style={styles.title} numberOfLines={1}>{title}</Animated.Text>
          </View>
        ) : <View style={styles.titleWrap} />}
        <View style={styles.right}>
          {rightElement ?? null}
        </View>
      </View>
      <View style={styles.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.headerBg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  backChevron: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.primaryForeground,
    marginTop: -4,
  },
  logoTouch: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  logo: {
    width: 112,
    height: 22,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.3,
  },
  right: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minWidth: 0,
  },
  accent: {
    height: 3,
    backgroundColor: colors.searchBarBorder,
    opacity: 0.9,
  },
});
