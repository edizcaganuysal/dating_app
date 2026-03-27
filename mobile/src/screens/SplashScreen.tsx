import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  runOnJS,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, fontFamilies } from '../theme';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

// Ember particle for the splash (inline, no separate component for tighter control)
function SplashEmber({ delay, x, size, color, duration }: {
  delay: number; x: number; size: number; color: string; duration: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay,
      withRepeat(withTiming(-height * 0.5, { duration, easing: Easing.out(Easing.quad) }), -1, false));
    opacity.value = withDelay(delay,
      withRepeat(withSequence(
        withTiming(0.7, { duration: duration * 0.15 }),
        withTiming(0.4, { duration: duration * 0.5 }),
        withTiming(0, { duration: duration * 0.35 }),
      ), -1, false));
    translateX.value = withDelay(delay,
      withRepeat(withSequence(
        withTiming((Math.random() - 0.5) * 30, { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
        withTiming((Math.random() - 0.5) * 30, { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[{
      position: 'absolute', bottom: height * 0.3,
      left: x, width: size, height: size,
      borderRadius: size / 2, backgroundColor: color,
    }, style]} />
  );
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  // ── Phase 1: Background warmth ──
  const bgProgress = useSharedValue(0);

  // ── Phase 2: Logo reveal ──
  const yuniOpacity = useSharedValue(0);
  const yuniTranslateY = useSharedValue(30);
  const socialOpacity = useSharedValue(0);
  const socialTranslateX = useSharedValue(-20);

  // ── Phase 3: Decorative line ──
  const lineWidth = useSharedValue(0);
  const lineOpacity = useSharedValue(0);

  // ── Phase 4: Glow pulse ──
  const glowScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  // ── Phase 5: Particles ──
  const particlesOpacity = useSharedValue(0);

  // ── Phase 6: Tagline ──
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(15);

  // ── Phase 7: Breathing pulse on logo ──
  const logoPulse = useSharedValue(1);

  // ── Fade out ──
  const screenOpacity = useSharedValue(1);

  const triggerHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const doFadeOut = () => {
    screenOpacity.value = withTiming(0, { duration: 600, easing: Easing.inOut(Easing.quad) }, () => {
      runOnJS(onFinish)();
    });
  };

  useEffect(() => {
    // Phase 1: Background warms from coal to cream (0-800ms)
    bgProgress.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });

    // Phase 2a: "Yuni" text rises in (400-900ms)
    yuniOpacity.value = withDelay(400, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    yuniTranslateY.value = withDelay(400, withSpring(0, { damping: 14, stiffness: 90, mass: 1 }));

    // Phase 2b: "social" slides in from left (800-1200ms)
    socialOpacity.value = withDelay(800, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    socialTranslateX.value = withDelay(800, withSpring(0, { damping: 16, stiffness: 100 }));

    // Phase 3: Decorative line extends (1100-1600ms)
    lineOpacity.value = withDelay(1100, withTiming(0.3, { duration: 300 }));
    lineWidth.value = withDelay(1100, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));

    // Phase 4: Warm glow blooms behind logo (1300-2000ms)
    glowScale.value = withDelay(1300, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    glowOpacity.value = withDelay(1300, withSequence(
      withTiming(0.12, { duration: 600 }),
      withTiming(0.06, { duration: 400 }),
    ));

    // Phase 5: Ember particles fade in (1600ms)
    particlesOpacity.value = withDelay(1600, withTiming(1, { duration: 600 }));

    // Phase 6: Tagline appears (2200-2600ms)
    taglineOpacity.value = withDelay(2200, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    taglineTranslateY.value = withDelay(2200, withSpring(0, { damping: 18, stiffness: 80 }));

    // Phase 7: Gentle breathing pulse on logo (2800ms+)
    logoPulse.value = withDelay(2800,
      withRepeat(withSequence(
        withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ), 2, true),
    );

    // Haptic at the "reveal" moment
    const hapticTimer1 = setTimeout(triggerHaptic, 900);
    // Second gentle haptic when tagline appears
    const hapticTimer2 = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 2400);

    // Fade out at 4500ms (longer, more premium feel)
    const fadeTimer = setTimeout(doFadeOut, 4500);

    return () => {
      clearTimeout(hapticTimer1);
      clearTimeout(hapticTimer2);
      clearTimeout(fadeTimer);
    };
  }, []);

  // ── Animated styles ──

  const bgStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      bgProgress.value,
      [0, 0.4, 1],
      [colors.coal, '#3D1A15', colors.cream],
    );
    return { backgroundColor };
  });

  const yuniStyle = useAnimatedStyle(() => ({
    opacity: yuniOpacity.value,
    transform: [{ translateY: yuniTranslateY.value }, { scale: logoPulse.value }],
  }));

  const socialStyle = useAnimatedStyle(() => ({
    opacity: socialOpacity.value,
    transform: [{ translateX: socialTranslateX.value }, { scale: logoPulse.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
    width: lineWidth.value * 120,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const particlesStyle = useAnimatedStyle(() => ({
    opacity: particlesOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  // Ember data
  const embers = [
    { delay: 1800, x: width * 0.15, size: 4, color: colors.ember, duration: 4000 },
    { delay: 2000, x: width * 0.35, size: 6, color: colors.firelight, duration: 3500 },
    { delay: 2200, x: width * 0.55, size: 3, color: '#D4473A', duration: 4500 },
    { delay: 1900, x: width * 0.7, size: 5, color: colors.ember, duration: 3800 },
    { delay: 2400, x: width * 0.85, size: 4, color: colors.firelight, duration: 4200 },
    { delay: 2100, x: width * 0.25, size: 3, color: colors.yuniRed, duration: 5000 },
    { delay: 2300, x: width * 0.6, size: 5, color: '#E8834A', duration: 3600 },
    { delay: 2500, x: width * 0.45, size: 4, color: colors.firelight, duration: 4800 },
    { delay: 2600, x: width * 0.1, size: 3, color: colors.ember, duration: 4400 },
    { delay: 2700, x: width * 0.8, size: 5, color: '#D4473A', duration: 3900 },
  ];

  return (
    <Animated.View style={[styles.container, bgStyle, screenStyle]}>
      {/* Warm glow behind logo */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* Ember particles */}
      <Animated.View style={[StyleSheet.absoluteFill, particlesStyle]} pointerEvents="none">
        {embers.map((e, i) => (
          <SplashEmber key={i} {...e} />
        ))}
      </Animated.View>

      {/* Logo: "Yuni" */}
      <Animated.View style={[styles.logoContainer, yuniStyle]}>
        <Text style={styles.yuniText}>Yuni</Text>
      </Animated.View>

      {/* Decorative line */}
      <Animated.View style={[styles.decorLine, lineStyle]} />

      {/* Logo: "social" */}
      <Animated.View style={socialStyle}>
        <Text style={styles.socialText}>social</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineContainer, taglineStyle]}>
        <Text style={styles.tagline}>
          The group dating app{'\n'}for university students
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: colors.yuniRed,
  },
  logoContainer: {
    zIndex: 2,
  },
  yuniText: {
    fontFamily: fontFamilies.playfair.bold,
    fontSize: 80,
    lineHeight: 88,
    color: colors.yuniRed,
    letterSpacing: -2,
    zIndex: 2,
  },
  decorLine: {
    height: 1.5,
    backgroundColor: colors.yuniRed,
    marginVertical: 4,
    zIndex: 2,
  },
  socialText: {
    fontFamily: fontFamilies.playfair.italic,
    fontSize: 42,
    lineHeight: 50,
    color: colors.yuniRed,
    letterSpacing: 4,
    zIndex: 2,
  },
  taglineContainer: {
    marginTop: 40,
    zIndex: 2,
  },
  tagline: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.coal,
    textAlign: 'center',
    opacity: 0.5,
    letterSpacing: 0.5,
  },
});
