/**
 * Animation utilities using React Native's built-in Animated API.
 * Replaces react-native-reanimated for Expo Go compatibility.
 */
import { useRef, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

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
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(
    direction === 'up' || direction === 'left' ? -distance : distance
  )).current;

  useEffect(() => {
    const animations = [
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration * 0.6,
        useNativeDriver: true,
      }),
      spring
        ? Animated.spring(translate, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          })
        : Animated.timing(translate, {
            toValue: 0,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
    ];

    if (delay > 0) {
      const timer = setTimeout(() => {
        Animated.parallel(animations).start();
      }, delay);
      return () => clearTimeout(timer);
    } else {
      Animated.parallel(animations).start();
    }
  }, []);

  const isHorizontal = direction === 'right' || direction === 'left';
  const style = {
    opacity,
    transform: direction === 'none'
      ? []
      : isHorizontal
        ? [{ translateX: translate }]
        : [{ translateY: translate }],
  };

  return style;
}

// ─── Stagger: returns a factory for staggered fade-in ──────────

export function useStaggerItem(index: number, staggerMs = 60, direction: Direction = 'down') {
  return useFadeIn({ delay: index * staggerMs, direction });
}

// ─── Press scale (for buttons / cards) ─────────────────────────

export function usePressScale(targetScale = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: targetScale,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  return { scale, onPressIn, onPressOut, animatedStyle: { transform: [{ scale }] } };
}

// ─── Shimmer (for skeleton loading) ────────────────────────────

export function useShimmer() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return { transform: [{ translateX }] };
}

// ─── Bounce (for dots, pulsing elements) ───────────────────────

export function useBounce(delay = 0) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -6,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return { transform: [{ translateY }] };
}

// ─── Pulse (scale in/out loop) ─────────────────────────────────

export function usePulse(minScale = 1.0, maxScale = 1.05, duration = 800, delay = 0) {
  const scale = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: maxScale,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: minScale,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return { transform: [{ scale }] };
}

// ─── Spring pop-in (for FAB, modals) ───────────────────────────

export function useSpringIn(delay = 0) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return { transform: [{ scale }] };
}

// ─── Animated progress bar ─────────────────────────────────────

export function useAnimatedWidth(value: number, max: number) {
  const width = useRef(new Animated.Value(value / max)).current;

  useEffect(() => {
    Animated.spring(width, {
      toValue: value / max,
      friction: 8,
      tension: 40,
      useNativeDriver: false, // width can't use native driver
    }).start();
  }, [value, max]);

  return width;
}

// ─── Sequence animation helper (for MatchReveal etc.) ──────────

export function createSequence(steps: Array<{ value: Animated.Value; toValue: number; delay: number; config?: any }>) {
  return () => {
    steps.forEach(({ value, toValue, delay: d, config }) => {
      setTimeout(() => {
        if (config?.spring) {
          Animated.spring(value, {
            toValue,
            friction: config.friction ?? 6,
            tension: config.tension ?? 80,
            useNativeDriver: config.useNativeDriver ?? true,
          }).start();
        } else {
          Animated.timing(value, {
            toValue,
            duration: config?.duration ?? 300,
            easing: config?.easing ?? Easing.out(Easing.cubic),
            useNativeDriver: config?.useNativeDriver ?? true,
          }).start();
        }
      }, d);
    });
  };
}
