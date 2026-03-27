import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { Match } from '../types';
import { colors, typography, spacing, radii, shadows, fontFamilies } from '../theme';
import { UserAvatar, AnimatedButton, ParticleEffect } from '../components';
import { haptic } from '../utils/haptics';
import { useFadeIn, usePulse } from '../utils/animations';
import { sounds } from '../utils/sounds';

const { width: SCREEN_W } = Dimensions.get('window');

function InterestChip({ label, index }: { label: string; index: number }) {
  const fadeStyle = useFadeIn({ delay: 1200 + index * 80, direction: 'down', distance: 16 });
  return (
    <Animated.View style={[styles.interestChip, fadeStyle]}>
      <Text style={styles.interestText}>{label}</Text>
    </Animated.View>
  );
}

export default function MatchRevealScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const match: Match = route.params.match;

  // Animation values (Reanimated shared values)
  const bgOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleRotation = useSharedValue(-3);
  const leftPhotoX = useSharedValue(-SCREEN_W * 0.5);
  const leftPhotoOpacity = useSharedValue(0);
  const nameOpacity = useSharedValue(0);
  const buttonsY = useSharedValue(60);
  const buttonsOpacity = useSharedValue(0);

  // Pulsing CTA
  const ctaPulseStyle = usePulse(1, 1.03, 800, 1800);

  useEffect(() => {
    // 0ms — Background fades in
    bgOpacity.value = withTiming(1, { duration: 300 });

    // 300ms — Haptic + Title bounces in
    setTimeout(() => {
      haptic.heavy();
      sounds.celebration();
      titleOpacity.value = withTiming(1, { duration: 200 });
      titleScale.value = withSpring(1, { damping: 5, stiffness: 80 });
      titleRotation.value = withSequence(
        withTiming(3, { duration: 100 }),
        withTiming(-2, { duration: 80 }),
        withTiming(0, { duration: 120 }),
      );
    }, 300);

    // 600ms — Haptic + Photos slide in
    setTimeout(() => {
      haptic.success();
      leftPhotoX.value = withSpring(0, { damping: 8, stiffness: 40 });
      leftPhotoOpacity.value = withTiming(1, { duration: 300 });
    }, 600);

    // 900ms — Name + text
    setTimeout(() => {
      nameOpacity.value = withTiming(1, { duration: 400 });
    }, 900);

    // 1500ms — Buttons slide up
    setTimeout(() => {
      buttonsY.value = withSpring(0, { damping: 8, stiffness: 40 });
      buttonsOpacity.value = withTiming(1, { duration: 300 });
    }, 1500);
  }, []);

  const bgAnimStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      { scale: titleScale.value },
      { rotate: `${interpolate(titleRotation.value, [-10, 10], [-10, 10])}deg` },
    ],
  }));

  const photoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftPhotoX.value }, { rotate: '-5deg' }],
    opacity: leftPhotoOpacity.value,
  }));

  const nameAnimStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
  }));

  const buttonsAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsY.value }],
  }));

  const partnerInterests = match.partner.interests || [];

  return (
    <Animated.View style={[styles.container, bgAnimStyle]}>
      <LinearGradient
        colors={['#241C1A', '#4A1A15', '#C40018', '#F7F0E7']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <BlurView intensity={20} style={styles.blurOverlay} />

      <LottieView
        source={require('../../assets/confetti.json')}
        autoPlay
        loop={false}
        speed={0.8}
        style={styles.confetti}
      />

      <ParticleEffect count={15} intensity="high" />

      {/* Title */}
      <Animated.View style={[styles.titleContainer, titleAnimStyle]}>
        <Text style={styles.celebration}>It's a Match!</Text>
      </Animated.View>

      {/* Photo */}
      <View style={styles.photosRow}>
        <Animated.View style={photoAnimStyle}>
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
      <Animated.View style={[styles.nameSection, nameAnimStyle]}>
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

      {/* Shared interests */}
      {partnerInterests.length > 0 && (
        <View style={styles.interestsRow}>
          {partnerInterests.slice(0, 6).map((interest, i) => (
            <InterestChip key={i} label={interest} index={i} />
          ))}
        </View>
      )}

      {/* Buttons */}
      <Animated.View style={[styles.buttonsSection, buttonsAnimStyle]}>
        <Animated.View style={ctaPulseStyle}>
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
    fontFamily: fontFamilies.playfair.bold,
    fontSize: 40,
    lineHeight: 48,
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
  bioCard: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  bio: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 19,
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
});
