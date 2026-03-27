import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontFamilies, spacing } from '../theme';

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
  [colors.yuniRed, colors.ember],
  [colors.yuniAiPrimary, colors.ember],
  [colors.yuniRed, colors.firelight],
];

export default function PhaseTransitionScreen({
  messages,
  onComplete,
  phaseNumber,
  phaseName,
  duration = 3500,
}: PhaseTransitionProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const screenOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const messageOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.5);
  const dotPulse = useSharedValue(1);

  useEffect(() => {
    // Fade in
    screenOpacity.value = withTiming(1, { duration: 300 });

    // Icon spring in
    iconScale.value = withSpring(1, { damping: 8, stiffness: 80 });

    // Progress fill
    progressWidth.value = withTiming(1, {
      duration: duration - 500,
      easing: Easing.out(Easing.cubic),
    });

    // Pulsing dot
    dotPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1, true,
    );

    // First message in
    messageOpacity.value = withTiming(1, { duration: 300 });

    // Cycle messages
    const messageInterval = Math.floor((duration - 800) / messages.length);
    let msgIndex = 0;
    const timer = setInterval(() => {
      msgIndex++;
      if (msgIndex >= messages.length) { clearInterval(timer); return; }
      messageOpacity.value = withTiming(0, { duration: 150 }, () => {
        runOnJS(setCurrentMessageIndex)(msgIndex);
        messageOpacity.value = withTiming(1, { duration: 200 });
      });
    }, messageInterval);

    // Complete
    const completeTimer = setTimeout(() => {
      screenOpacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(onComplete)();
      });
    }, duration);

    return () => { clearInterval(timer); clearTimeout(completeTimer); };
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));
  const msgStyle = useAnimatedStyle(() => ({ opacity: messageOpacity.value }));
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dotPulse.value }] }));
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  const gradientColors = PHASE_GRADIENTS[(phaseNumber - 1) % 3];

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <LinearGradient
        colors={[gradientColors[0], gradientColors[1], colors.cream]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <Text style={styles.icon}>{PHASE_ICONS[(phaseNumber - 1) % 3]}</Text>
        </Animated.View>

        <Text style={styles.phaseName}>Phase {phaseNumber}: {phaseName}</Text>

        <Animated.View style={[styles.messageContainer, msgStyle]}>
          <Animated.View style={[styles.dotIndicator, dotStyle]} />
          <Text style={styles.message}>{messages[currentMessageIndex]}</Text>
        </Animated.View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

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
  content: { alignItems: 'center', paddingHorizontal: 40 },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  icon: { fontSize: 40 },
  phaseName: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 20, lineHeight: 26,
    color: '#fff', textAlign: 'center',
    marginBottom: spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  messageContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.xxxl, minHeight: 24,
  },
  dotIndicator: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#fff', marginRight: spacing.sm,
  },
  message: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16, lineHeight: 22,
    color: 'rgba(255,255,255,0.9)', textAlign: 'center',
  },
  progressTrack: {
    width: SCREEN_W * 0.6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden', marginBottom: spacing.xxl,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  phaseDotsRow: { flexDirection: 'row', gap: spacing.sm },
  phaseDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  phaseDotActive: { backgroundColor: '#fff', width: 24, borderRadius: 5 },
  phaseDotDone: { backgroundColor: 'rgba(255,255,255,0.7)' },
});
