import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface PhaseTransitionProps {
  messages: string[];
  onComplete: () => void;
  phaseNumber: 1 | 2 | 3;
  phaseName: string;
  duration?: number;
}

const PHASE_ICONS = ['📸', '🧠', '✨'];
const PHASE_GRADIENTS: [string, string][] = [
  [colors.primary, colors.secondary],
  ['#7B1FA2', '#E040FB'],
  [colors.primary, '#FFD93D'],
];

export default function PhaseTransitionScreen({
  messages,
  onComplete,
  phaseNumber,
  phaseName,
  duration = 3500,
}: PhaseTransitionProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in screen
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Icon bounce in
    Animated.spring(iconScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();

    // Progress bar fills over duration
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: duration - 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Pulsing dot animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // Cycle through messages
    const messageInterval = Math.floor((duration - 800) / messages.length);
    let msgIndex = 0;

    // First message fade in
    Animated.timing(messageOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    const timer = setInterval(() => {
      msgIndex++;
      if (msgIndex >= messages.length) {
        clearInterval(timer);
        return;
      }
      // Fade out current, change, fade in new
      Animated.timing(messageOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setCurrentMessageIndex(msgIndex);
        Animated.timing(messageOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, messageInterval);

    // Complete after duration
    const completeTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(completeTimer);
    };
  }, []);

  const fillWidth = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const gradientColors = PHASE_GRADIENTS[(phaseNumber - 1) % 3];
  const icon = PHASE_ICONS[(phaseNumber - 1) % 3];

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <LinearGradient
        colors={[gradientColors[0], gradientColors[1], '#FFF5F0']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Phase icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
          <Text style={styles.icon}>{icon}</Text>
        </Animated.View>

        {/* Phase name */}
        <Text style={styles.phaseName}>Phase {phaseNumber}: {phaseName}</Text>

        {/* Cycling message */}
        <Animated.View style={[styles.messageContainer, { opacity: messageOpacity }]}>
          <Animated.View style={[styles.dotIndicator, { transform: [{ scale: dotPulse }] }]} />
          <Text style={styles.message}>{messages[currentMessageIndex]}</Text>
        </Animated.View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: fillWidth }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Step counter */}
        <View style={styles.phaseDotsRow}>
          {[1, 2, 3].map(p => (
            <View key={p} style={[styles.phaseDot, p === phaseNumber && styles.phaseDotActive, p < phaseNumber && styles.phaseDotDone]} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  icon: {
    fontSize: 40,
  },
  phaseName: {
    ...typography.headlineMedium,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    minHeight: 24,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: spacing.sm,
  },
  message: {
    ...typography.bodyLarge,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  progressTrack: {
    width: SCREEN_W * 0.6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginBottom: spacing.xxl,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  phaseDotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  phaseDotActive: {
    backgroundColor: '#fff',
    width: 24,
    borderRadius: 5,
  },
  phaseDotDone: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
