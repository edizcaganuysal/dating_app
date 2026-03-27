import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme';

interface Particle {
  id: number;
  x: number;        // start x position (0-1 fraction of container width)
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;     // horizontal drift amount
}

interface ParticleEffectProps {
  count?: number;
  style?: any;
  intensity?: 'subtle' | 'medium' | 'high';
}

function EmberParticle({ particle, containerHeight }: { particle: Particle; containerHeight: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Float upward
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(-containerHeight * 0.8, {
          duration: particle.duration,
          easing: Easing.out(Easing.quad),
        }),
        -1, // infinite
        false,
      ),
    );

    // Horizontal drift
    translateX.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(particle.drift, { duration: particle.duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(-particle.drift, { duration: particle.duration / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    // Fade in then out
    opacity.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: particle.duration * 0.2 }),
          withTiming(0.6, { duration: particle.duration * 0.5 }),
          withTiming(0, { duration: particle.duration * 0.3 }),
        ),
        -1,
        false,
      ),
    );

    // Pulse scale
    scale.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: particle.duration * 0.3 }),
          withTiming(0.3, { duration: particle.duration * 0.7 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: `${particle.x * 100}%` as any,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
}

const EMBER_COLORS = [colors.ember, colors.firelight, '#D4473A', '#E8834A', colors.yuniRed];

export default function ParticleEffect({ count = 10, style, intensity = 'medium' }: ParticleEffectProps) {
  const particleCount = intensity === 'subtle' ? Math.ceil(count * 0.5) : intensity === 'high' ? count * 1.5 : count;
  const containerHeight = 400;

  const particles: Particle[] = React.useMemo(() => {
    return Array.from({ length: Math.floor(particleCount) }, (_, i) => ({
      id: i,
      x: Math.random() * 0.9 + 0.05,
      size: Math.random() * 5 + 3,
      color: EMBER_COLORS[i % EMBER_COLORS.length],
      delay: Math.random() * 3000,
      duration: 3000 + Math.random() * 3000,
      drift: (Math.random() - 0.5) * 40,
    }));
  }, [particleCount]);

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {particles.map(particle => (
        <EmberParticle key={particle.id} particle={particle} containerHeight={containerHeight} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
