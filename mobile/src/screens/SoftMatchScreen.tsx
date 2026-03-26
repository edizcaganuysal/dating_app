import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SoftMatch } from '../types';
import { colors, typography, spacing, radii, shadows } from '../theme';
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
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const teaserOpacity = useRef(new Animated.Value(0)).current;
  const teaserY = useRef(new Animated.Value(20)).current;
  const photoOpacity = useRef(new Animated.Value(0)).current;
  const photoScale = useRef(new Animated.Value(0.8)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(40)).current;

  // Reveal phase animations
  const blurOpacity = useRef(new Animated.Value(1)).current;
  const revealNameOpacity = useRef(new Animated.Value(0)).current;
  const revealNameY = useRef(new Animated.Value(20)).current;
  const connectButtonsOpacity = useRef(new Animated.Value(0)).current;
  const connectButtonsY = useRef(new Animated.Value(40)).current;

  const ctaPulseStyle = usePulse(1, 1.03, 800, 1800);

  const activityLabel = ACTIVITY_LABELS[softMatch.activity] || softMatch.activity;
  const person = softMatch.interested_user;
  const sharedInterests = person.interests || [];

  // Mystery phase entrance animation
  useEffect(() => {
    Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    setTimeout(() => {
      haptic.medium();
      Animated.parallel([
        Animated.timing(iconOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]).start();
    }, 300);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(teaserOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(teaserY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }, 500);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(photoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(photoScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }, 700);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(buttonsY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }, 1000);
  }, []);

  const handleReveal = () => {
    haptic.success();
    setPhase('revealed');

    // Animate blur away and reveal details
    Animated.timing(blurOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start();

    // Fade out mystery buttons
    Animated.timing(buttonsOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(revealNameOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(revealNameY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }, 300);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(connectButtonsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(connectButtonsY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
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

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      <LinearGradient
        colors={['#6C5CE7', '#A29BFE', '#FD79A8', '#FFF5F0']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Mystery icon */}
      <Animated.View style={[styles.iconContainer, {
        opacity: iconOpacity,
        transform: [{ scale: iconScale }],
      }]}>
        <Text style={styles.mysteryIcon}>?</Text>
      </Animated.View>

      {/* Teaser text */}
      <Animated.View style={[styles.teaserSection, {
        opacity: teaserOpacity,
        transform: [{ translateY: teaserY }],
      }]}>
        <Text style={styles.teaserTitle}>Someone is interested!</Text>
        <Text style={styles.teaserSubtitle}>
          A person from your {activityLabel} group{'\n'}wants to see you again
        </Text>
      </Animated.View>

      {/* Photo with blur overlay */}
      <Animated.View style={[styles.photoContainer, {
        opacity: photoOpacity,
        transform: [{ scale: photoScale }],
      }]}>
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
        <Animated.View style={[styles.blurOverlay, { opacity: blurOpacity }]}>
          <LinearGradient
            colors={['rgba(108,92,231,0.85)', 'rgba(162,155,254,0.9)', 'rgba(108,92,231,0.85)']}
            style={styles.blurGradient}
          >
            <Text style={styles.blurQuestion}>?</Text>
          </LinearGradient>
        </Animated.View>
      </Animated.View>

      {/* Revealed name + details (visible after reveal) */}
      {phase === 'revealed' && (
        <Animated.View style={[styles.nameSection, {
          opacity: revealNameOpacity,
          transform: [{ translateY: revealNameY }],
        }]}>
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
        <Animated.View style={[styles.buttonsSection, {
          opacity: buttonsOpacity,
          transform: [{ translateY: buttonsY }],
        }]}>
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
        <Animated.View style={[styles.buttonsSection, {
          opacity: connectButtonsOpacity,
          transform: [{ translateY: connectButtonsY }],
        }]}>
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
    ...typography.displayLarge,
    fontSize: 32,
    color: '#fff',
  },
  teaserSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    zIndex: 10,
  },
  teaserTitle: {
    ...typography.displaySmall,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  teaserSubtitle: {
    ...typography.bodyLarge,
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
    ...typography.displayLarge,
    fontSize: 48,
    color: 'rgba(255,255,255,0.6)',
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    zIndex: 10,
  },
  name: {
    ...typography.displaySmall,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  program: {
    ...typography.bodyLarge,
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
    ...typography.labelSmall,
    color: '#fff',
  },
  buttonsSection: {
    width: '100%',
    paddingHorizontal: spacing.sm,
    zIndex: 10,
  },
  connectPrompt: {
    ...typography.headlineMedium,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
