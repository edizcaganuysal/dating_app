import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SoftMatch } from '../types';
import { colors, typography, spacing, radii, shadows, fontFamilies } from '../theme';
import { UserAvatar, AnimatedButton } from '../components';
import { haptic } from '../utils/haptics';
import { useFadeIn, usePulse } from '../utils/animations';
import { respondToSoftMatch } from '../api/feedback';

const { width: SCREEN_W } = Dimensions.get('window');
const ACTIVITY_LABELS: Record<string, string> = {
  dinner: 'Dinner',
  bar: 'Bar Night',
  bowling: 'Bowling',
  karaoke: 'Karaoke',
  board_games: 'Board Games',
  cooking_class: 'Cooking Class',
  trivia_night: 'Trivia Night',
  mini_golf: 'Mini Golf',
  escape_room: 'Escape Room',
  arcade: 'Arcade',
};

function InterestChip({ label, index }: { label: string; index: number }) {
  const fadeStyle = useFadeIn({ delay: 400 + index * 80, direction: 'down', distance: 16 });
  return (
    <Animated.View style={[styles.interestChip, fadeStyle]}>
      <Text style={styles.interestText}>{label}</Text>
    </Animated.View>
  );
}

export default function SoftMatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const softMatch: SoftMatch = route.params.softMatch;
  const [phase, setPhase] = useState<'mystery' | 'revealed'>('mystery');
  const [submitting, setSubmitting] = useState(false);

  // Mystery phase animations
  const bgOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const teaserOpacity = useSharedValue(0);
  const teaserY = useSharedValue(20);
  const photoOpacity = useSharedValue(0);
  const photoScale = useSharedValue(0.8);
  const buttonsOpacity = useSharedValue(0);
  const buttonsY = useSharedValue(40);

  // Reveal phase animations
  const blurOpacity = useSharedValue(1);
  const revealNameOpacity = useSharedValue(0);
  const revealNameY = useSharedValue(20);
  const connectButtonsOpacity = useSharedValue(0);
  const connectButtonsY = useSharedValue(40);

  const ctaPulseStyle = usePulse(1, 1.03, 800, 1800);

  const activityLabel = ACTIVITY_LABELS[softMatch.activity] || softMatch.activity;
  const person = softMatch.interested_user;
  const sharedInterests = person.interests || [];

  // Mystery phase entrance animation
  useEffect(() => {
    bgOpacity.value = withTiming(1, { duration: 300 });

    setTimeout(() => {
      haptic.medium();
      iconOpacity.value = withTiming(1, { duration: 200 });
      iconScale.value = withSpring(1, { damping: 5, stiffness: 80 });
    }, 300);

    setTimeout(() => {
      teaserOpacity.value = withTiming(1, { duration: 400 });
      teaserY.value = withSpring(0, { damping: 8, stiffness: 40 });
    }, 500);

    setTimeout(() => {
      photoOpacity.value = withTiming(1, { duration: 400 });
      photoScale.value = withSpring(1, { damping: 8, stiffness: 40 });
    }, 700);

    setTimeout(() => {
      buttonsOpacity.value = withTiming(1, { duration: 300 });
      buttonsY.value = withSpring(0, { damping: 8, stiffness: 40 });
    }, 1000);
  }, []);

  const handleReveal = () => {
    haptic.success();
    setPhase('revealed');

    // Animate blur away and reveal details
    blurOpacity.value = withTiming(0, { duration: 500 });

    // Fade out mystery buttons
    buttonsOpacity.value = withTiming(0, { duration: 200 });

    setTimeout(() => {
      revealNameOpacity.value = withTiming(1, { duration: 400 });
      revealNameY.value = withSpring(0, { damping: 8, stiffness: 40 });
    }, 300);

    setTimeout(() => {
      connectButtonsOpacity.value = withTiming(1, { duration: 300 });
      connectButtonsY.value = withSpring(0, { damping: 8, stiffness: 40 });
    }, 800);
  };

  const handleAccept = async () => {
    if (submitting) return;
    setSubmitting(true);
    haptic.success();
    try {
      const result = await respondToSoftMatch(softMatch.id, true);
      if (result.chat_room_id) {
        navigation.replace('ChatDetail', { roomId: result.chat_room_id });
      } else {
        navigation.goBack();
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (submitting) return;
    setSubmitting(true);
    haptic.light();
    try {
      await respondToSoftMatch(softMatch.id, false);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const handleNotNow = () => {
    haptic.light();
    navigation.goBack();
  };

  // Animated styles
  const bgAnimStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const iconAnimStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));
  const teaserAnimStyle = useAnimatedStyle(() => ({
    opacity: teaserOpacity.value,
    transform: [{ translateY: teaserY.value }],
  }));
  const photoAnimStyle = useAnimatedStyle(() => ({
    opacity: photoOpacity.value,
    transform: [{ scale: photoScale.value }],
  }));
  const buttonsAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsY.value }],
  }));
  const blurAnimStyle = useAnimatedStyle(() => ({
    opacity: blurOpacity.value,
  }));
  const revealNameAnimStyle = useAnimatedStyle(() => ({
    opacity: revealNameOpacity.value,
    transform: [{ translateY: revealNameY.value }],
  }));
  const connectButtonsAnimStyle = useAnimatedStyle(() => ({
    opacity: connectButtonsOpacity.value,
    transform: [{ translateY: connectButtonsY.value }],
  }));

  return (
    <Animated.View style={[styles.container, bgAnimStyle]}>
      <LinearGradient
        colors={['#241C1A', '#6B2D5B', '#C40018', '#F7F0E7']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Mystery icon */}
      <Animated.View style={[styles.iconContainer, iconAnimStyle]}>
        <Text style={styles.mysteryIcon}>?</Text>
      </Animated.View>

      {/* Teaser text */}
      <Animated.View style={[styles.teaserSection, teaserAnimStyle]}>
        <Text style={styles.teaserTitle}>Someone is interested!</Text>
        <Text style={styles.teaserSubtitle}>
          A person from your {activityLabel} group{'\n'}wants to see you again
        </Text>
      </Animated.View>

      {/* Photo with blur overlay */}
      <Animated.View style={[styles.photoContainer, photoAnimStyle]}>
        <View style={styles.photoRing}>
          <UserAvatar
            photoUrl={person.photo_urls?.[0]}
            firstName={person.first_name}
            size="xl"
            borderColor="#fff"
            borderWidth={3}
          />
        </View>
        {/* Gradient blur overlay */}
        <Animated.View style={[styles.blurOverlay, blurAnimStyle]}>
          <LinearGradient
            colors={['rgba(36,28,26,0.85)', 'rgba(107,45,91,0.9)', 'rgba(36,28,26,0.85)']}
            style={styles.blurGradient}
          >
            <Text style={styles.blurQuestion}>?</Text>
          </LinearGradient>
        </Animated.View>
      </Animated.View>

      {/* Revealed name + details (visible after reveal) */}
      {phase === 'revealed' && (
        <Animated.View style={[styles.nameSection, revealNameAnimStyle]}>
          <Text style={styles.name}>{person.first_name}</Text>
          {person.program && (
            <Text style={styles.program}>{person.program}</Text>
          )}
        </Animated.View>
      )}

      {/* Shared interests (visible after reveal) */}
      {phase === 'revealed' && sharedInterests.length > 0 && (
        <View style={styles.interestsRow}>
          {sharedInterests.slice(0, 6).map((interest, i) => (
            <InterestChip key={i} label={interest} index={i} />
          ))}
        </View>
      )}

      {/* Mystery buttons (Reveal / Not now) */}
      {phase === 'mystery' && (
        <Animated.View style={[styles.buttonsSection, buttonsAnimStyle]}>
          <Animated.View style={ctaPulseStyle}>
            <AnimatedButton
              label="Reveal"
              onPress={handleReveal}
              variant="primary"
              size="lg"
              fullWidth
              icon="eye-outline"
            />
          </Animated.View>
          <View style={{ height: spacing.md }} />
          <AnimatedButton
            label="Not now"
            onPress={handleNotNow}
            variant="ghost"
            size="lg"
            fullWidth
          />
        </Animated.View>
      )}

      {/* Connect buttons (after reveal) */}
      {phase === 'revealed' && (
        <Animated.View style={[styles.buttonsSection, connectButtonsAnimStyle]}>
          <Text style={styles.connectPrompt}>
            Want to connect with {person.first_name}?
          </Text>
          <View style={{ height: spacing.lg }} />
          <AnimatedButton
            label="Yes, let's chat!"
            onPress={handleAccept}
            variant="primary"
            size="lg"
            fullWidth
            icon="chatbubble-outline"
          />
          <View style={{ height: spacing.md }} />
          <AnimatedButton
            label="No thanks"
            onPress={handleDecline}
            variant="ghost"
            size="lg"
            fullWidth
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    zIndex: 10,
  },
  mysteryIcon: {
    fontFamily: fontFamilies.playfair.bold,
    fontSize: 32,
    lineHeight: 40,
    color: '#fff',
  },
  teaserSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    zIndex: 10,
  },
  teaserTitle: {
    fontFamily: fontFamilies.playfair.bold,
    fontSize: 28,
    lineHeight: 34,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  teaserSubtitle: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  photoContainer: {
    marginBottom: spacing.xl,
    zIndex: 10,
    position: 'relative',
  },
  photoRing: {
    borderRadius: 68,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    ...shadows.lg,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 68,
    overflow: 'hidden',
    zIndex: 5,
  },
  blurGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 68,
  },
  blurQuestion: {
    fontFamily: fontFamilies.playfair.bold,
    fontSize: 48,
    lineHeight: 56,
    color: 'rgba(255,255,255,0.6)',
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    zIndex: 10,
  },
  name: {
    fontFamily: fontFamilies.playfair.semiBold,
    fontSize: 28,
    lineHeight: 34,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  program: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
    zIndex: 10,
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  interestText: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: '#fff',
  },
  buttonsSection: {
    width: '100%',
    paddingHorizontal: spacing.sm,
    zIndex: 10,
  },
  connectPrompt: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 20,
    lineHeight: 26,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
