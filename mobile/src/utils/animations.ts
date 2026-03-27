/**
 * Animation utilities using react-native-reanimated.
 * All hooks return Reanimated shared values and animated styles.
 */
import { useEffect, useCallback } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  SharedValue,
  runOnJS,
} from 'react-native-reanimated';

// ─── Fade-in with directional slide ───────────────────────────

type Direction = 'down' | 'up' | 'right' | 'left' | 'none';

interface FadeInOptions {
  delay?: number;
  direction?: Direction;
  distance?: number;
  duration?: number;
  useSpring?: boolean;
}

export function useFadeIn({
  delay = 0,
  direction = 'down',
  distance = 24,
  duration = 400,
  useSpring: spring = true,
}: FadeInOptions = {}) {
  const opacity = useSharedValue(0);
  const translate = useSharedValue(
    direction === 'up' || direction === 'left' ? -distance : distance
  );

  useEffect(() => {
    const translateTarget = 0;

    if (spring) {
      opacity.value = withDelay(delay, withTiming(1, { duration: duration * 0.6 }));
      translate.value = withDelay(delay, withSpring(translateTarget, { damping: 12, stiffness: 100 }));
    } else {
      opacity.value = withDelay(delay, withTiming(1, { duration: duration * 0.6 }));
      translate.value = withDelay(delay, withTiming(translateTarget, {
        duration,
        easing: Easing.out(Easing.cubic),
      }));
    }
  }, []);

  const isHorizontal = direction === 'right' || direction === 'left';

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: direction === 'none'
      ? []
      : isHorizontal
        ? [{ translateX: translate.value }]
        : [{ translateY: translate.value }],
  }));

  return style;
}

// ─── Stagger: returns animated style for staggered fade-in ──────

export function useStaggerItem(index: number, staggerMs = 60, direction: Direction = 'down') {
  return useFadeIn({ delay: index * staggerMs, direction });
}

// ─── Press scale (for buttons / cards) ─────────────────────────

export function usePressScale(targetScale = 0.96) {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withSpring(targetScale, { damping: 15, stiffness: 300 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}

// ─── Shimmer (for skeleton loading) ────────────────────────────

export function useShimmer() {
  const translateX = useSharedValue(-200);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(200, { duration: 1200, easing: Easing.linear }),
      -1, // infinite
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return style;
}

// ─── Bounce (for dots, pulsing elements) ───────────────────────

export function useBounce(delay = 0) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // infinite
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return style;
}

// ─── Pulse (scale in/out loop) ─────────────────────────────────

export function usePulse(minScale = 1.0, maxScale = 1.05, duration = 800, delay = 0) {
  const scale = useSharedValue(minScale);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(maxScale, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(minScale, { duration, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return style;
}

// ─── Spring pop-in (for FAB, modals) ───────────────────────────

export function useSpringIn(delay = 0) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 100 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return style;
}

// ─── Animated progress bar ─────────────────────────────────────

export function useAnimatedWidth(value: number, max: number) {
  const progress = useSharedValue(value / max);

  useEffect(() => {
    progress.value = withSpring(value / max, { damping: 15, stiffness: 100 });
  }, [value, max]);

  return progress;
}

// ─── Warm glow effect (animated shadow on press) ───────────────

export function useWarmGlow() {
  const glowOpacity = useSharedValue(0);

  const activate = useCallback(() => {
    glowOpacity.value = withSpring(1, { damping: 15, stiffness: 200 });
  }, []);

  const deactivate = useCallback(() => {
    glowOpacity.value = withTiming(0, { duration: 200 });
  }, []);

  const style = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value * 0.3,
    shadowRadius: glowOpacity.value * 12,
    shadowColor: '#C40018',
    shadowOffset: { width: 0, height: 4 },
  }));

  return { activate, deactivate, style };
}
