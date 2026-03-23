import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { Match } from '../types';
import { colors, typography, spacing, radii, shadows, animations } from '../theme';
import { UserAvatar, AnimatedButton } from '../components';
import { haptic } from '../utils/haptics';

const { width: SCREEN_W } = Dimensions.get('window');

export default function MatchRevealScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const match: Match = route.params.match;

  // ── Animation shared values ──
  const bgOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleRotation = useSharedValue(-3);
  const leftPhotoX = useSharedValue(-SCREEN_W * 0.5);
  const leftPhotoOpacity = useSharedValue(0);
  const rightPhotoX = useSharedValue(SCREEN_W * 0.5);
  const rightPhotoOpacity = useSharedValue(0);
  const nameOpacity = useSharedValue(0);
  const buttonsY = useSharedValue(60);
  const buttonsOpacity = useSharedValue(0);
  const ctaPulse = useSharedValue(1);

  useEffect(() => {
    // 0ms — Background fades in
    bgOpacity.value = withTiming(1, { duration: 300 });

    // 300ms — Haptic heavy buzz
    setTimeout(() => haptic.heavy(), 300);

    // 300-600ms — Title bounces in with wiggle
    titleScale.value = withDelay(300,
      withSequence(
        withSpring(1.2, { damping: 8, stiffness: 200, mass: 0.6 }),
        withSpring(1.0, animations.bouncy),
      ),
    );
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));
    titleRotation.value = withDelay(300,
      withSequence(
        withTiming(-3, { duration: 0 }),
        withTiming(3, { duration: 100 }),
        withTiming(-2, { duration: 80 }),
        withTiming(0, { duration: 120 }),
      ),
    );

    // 600ms — Haptic success + Photos slide in from sides
    setTimeout(() => haptic.success(), 600);
    leftPhotoX.value = withDelay(600, withSpring(0, animations.dramatic));
    leftPhotoOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));
    rightPhotoX.value = withDelay(600, withSpring(0, animations.dramatic));
    rightPhotoOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));

    // 900ms — Name + activity text
    nameOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));

    // 1500ms — Buttons slide up
    buttonsY.value = withDelay(1500, withSpring(0, animations.gentle));
    buttonsOpacity.value = withDelay(1500, withTiming(1, { duration: 300 }));

    // Pulsing CTA glow (starts after buttons appear)
    setTimeout(() => {
      ctaPulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }, 1800);
  }, []);

  // ── Animated styles ──
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }, { rotate: `${titleRotation.value}deg` }],
    opacity: titleOpacity.value,
  }));
  const leftPhotoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftPhotoX.value }, { rotate: '-5deg' }],
    opacity: leftPhotoOpacity.value,
  }));
  const rightPhotoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightPhotoX.value }, { rotate: '5deg' }],
    opacity: rightPhotoOpacity.value,
  }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: nameOpacity.value }));
  const buttonsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonsY.value }],
    opacity: buttonsOpacity.value,
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaPulse.value }],
  }));

  const partnerInterests = match.partner.interests || [];

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.secondary, '#FFF5F0']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Blur overlay for depth */}
      <BlurView intensity={20} style={styles.blurOverlay} />

      {/* Confetti — fires at 600ms */}
      <LottieView
        source={require('../../assets/confetti.json')}
        autoPlay
        loop={false}
        speed={0.8}
        style={styles.confetti}
      />

      {/* Title */}
      <Animated.View style={[styles.titleContainer, titleStyle]}>
        <Text style={styles.celebration}>It's a Match!</Text>
      </Animated.View>

      {/* Photos — slide in from opposite sides */}
      <View style={styles.photosRow}>
        <Animated.View style={[styles.photoWrapper, leftPhotoStyle]}>
          <View style={styles.photoRing}>
            <UserAvatar
              photoUrl={match.partner.photo_urls?.[0]}
              firstName={match.partner.first_name}
              size="xl"
              borderColor="#fff"
              borderWidth={3}
            />
          </View>
        </Animated.View>
      </View>

      {/* Name + Activity */}
      <Animated.View style={[styles.nameSection, nameStyle]}>
        <Text style={styles.name}>{match.partner.first_name}</Text>
        {match.partner.program && (
          <Text style={styles.program}>{match.partner.program}</Text>
        )}
        {match.partner.bio && (
          <View style={styles.bioCard}>
            <Text style={styles.bio}>{match.partner.bio}</Text>
          </View>
        )}
      </Animated.View>

      {/* Shared interests — stagger in one by one */}
      {partnerInterests.length > 0 && (
        <View style={styles.interestsRow}>
          {partnerInterests.slice(0, 6).map((interest, i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(1200 + i * 80).springify().damping(14)}
              style={styles.interestChip}
            >
              <Text style={styles.interestText}>{interest}</Text>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Buttons */}
      <Animated.View style={[styles.buttonsSection, buttonsStyle]}>
        <Animated.View style={ctaStyle}>
          <AnimatedButton
            label="Send a Message"
            onPress={() => navigation.replace('ChatDetail', { roomId: match.chat_room_id })}
            variant="primary"
            size="lg"
            fullWidth
            icon="chatbubble-outline"
          />
        </Animated.View>
        <View style={{ height: spacing.md }} />
        <AnimatedButton
          label="Keep Browsing"
          onPress={() => navigation.navigate('Home')}
          variant="ghost"
          size="lg"
          fullWidth
        />
      </Animated.View>
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
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  confetti: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    pointerEvents: 'none',
  },
  titleContainer: {
    marginBottom: spacing.xxl,
    zIndex: 10,
  },
  celebration: {
    ...typography.displayLarge,
    fontSize: 40,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  photosRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    zIndex: 10,
  },
  photoWrapper: {},
  photoRing: {
    borderRadius: 68,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    ...shadows.lg,
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
  bioCard: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  bio: {
    ...typography.bodySmall,
    color: '#fff',
    textAlign: 'center',
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
});
