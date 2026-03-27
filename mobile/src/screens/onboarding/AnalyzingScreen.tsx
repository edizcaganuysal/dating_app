/**
 * AnalyzingScreen — Full-screen interstitial between onboarding phases.
 * Shows animated "Analyzing your vibe..." text cycling with ember particles.
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { ParticleEffect } from '../../components';
import { colors, fontFamilies, spacing } from '../../theme';
import sounds from '../../utils/sounds';

const { width, height } = Dimensions.get('window');

interface AnalyzingScreenProps {
  messages: string[];         // e.g. ["Analyzing your vibe...", "Almost there...", "Done!"]
  insight?: string;           // Optional personality insight card text
  duration?: number;          // Total duration in ms (default 2500)
  onComplete: () => void;
}

export default function AnalyzingScreen({
  messages,
  insight,
  duration = 2500,
  onComplete,
}: AnalyzingScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const pulseScale = useSharedValue(1);
  const insightOpacity = useSharedValue(0);
  const insightTranslateY = useSharedValue(30);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    sounds.whoosh();

    // Pulse animation for the orb
    pulseScale.value = withSequence(
      withTiming(1.2, { duration: 800 }),
      withTiming(0.9, { duration: 600 }),
      withTiming(1.1, { duration: 500 }),
      withTiming(1.0, { duration: 400 }),
    );

    // Cycle through messages
    const msgInterval = duration / (messages.length + (insight ? 1 : 0));
    const timers: NodeJS.Timeout[] = [];

    messages.forEach((_, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => {
          setCurrentMessageIndex(i);
        }, i * msgInterval));
      }
    });

    // Show insight card
    if (insight) {
      timers.push(setTimeout(() => {
        insightOpacity.value = withSpring(1, { damping: 15 });
        insightTranslateY.value = withSpring(0, { damping: 12 });
      }, (messages.length - 1) * msgInterval + 300));
    }

    // Fade out and complete
    timers.push(setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(onComplete)();
      });
    }, duration));

    return () => timers.forEach(clearTimeout);
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const insightStyle = useAnimatedStyle(() => ({
    opacity: insightOpacity.value,
    transform: [{ translateY: insightTranslateY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <ParticleEffect count={15} intensity="high" />

      {/* Glowing orb */}
      <Animated.View style={[styles.orb, orbStyle]}>
        <View style={styles.orbInner} />
        <View style={styles.orbGlow} />
      </Animated.View>

      {/* Cycling messages */}
      <Animated.Text
        key={currentMessageIndex}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.message}
      >
        {messages[currentMessageIndex]}
      </Animated.Text>

      {/* Insight card */}
      {insight && (
        <Animated.View style={[styles.insightCard, insightStyle]}>
          <Animated.Text style={styles.insightText}>{insight}</Animated.Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.coal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  orbInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.yuniRed,
  },
  orbGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.ember,
    opacity: 0.2,
  },
  message: {
    fontFamily: fontFamilies.playfair.italic,
    fontSize: 22,
    lineHeight: 30,
    color: colors.cream,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  insightCard: {
    marginTop: 32,
    backgroundColor: 'rgba(247, 240, 231, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(247, 240, 231, 0.2)',
  },
  insightText: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.cream,
    textAlign: 'center',
  },
});
