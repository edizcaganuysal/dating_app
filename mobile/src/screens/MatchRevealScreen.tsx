import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { Match } from '../types';
import { colors, typography, spacing, radii, animations } from '../theme';
import { UserAvatar, AnimatedButton } from '../components';
import { haptic } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MatchRevealScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const match: Match = route.params.match;

  // Animation values
  const titleScale = useSharedValue(0.3);
  const titleOpacity = useSharedValue(0);
  const photoTranslateY = useSharedValue(80);
  const photoOpacity = useSharedValue(0);
  const detailsOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    // Title appears with bounce
    titleScale.value = withDelay(300, withSpring(1, animations.bouncy));
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));

    // Photo slides up
    photoTranslateY.value = withDelay(500, withSpring(0, animations.dramatic));
    photoOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));

    // Details fade in
    detailsOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));

    // Buttons fade in
    buttonsOpacity.value = withDelay(1200, withTiming(1, { duration: 300 }));

    // Haptic on title
    setTimeout(() => haptic.success(), 300);
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleOpacity.value,
  }));

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: photoTranslateY.value }],
    opacity: photoOpacity.value,
  }));

  const detailsStyle = useAnimatedStyle(() => ({
    opacity: detailsOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const partnerInterests = match.partner.interests || [];

  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary, '#FFF5F0']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Confetti */}
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

      {/* Photo + Info */}
      <Animated.View style={[styles.profileSection, photoStyle]}>
        <View style={styles.avatarRing}>
          <UserAvatar
            photoUrl={match.partner.photo_urls?.[0]}
            firstName={match.partner.first_name}
            size="xl"
            borderColor="#fff"
            borderWidth={3}
          />
        </View>
        <Text style={styles.name}>{match.partner.first_name}</Text>
        {match.partner.program && (
          <Text style={styles.program}>{match.partner.program}</Text>
        )}
      </Animated.View>

      {/* Shared Interests */}
      <Animated.View style={[styles.detailsSection, detailsStyle]}>
        {match.partner.bio && (
          <Text style={styles.bio}>{match.partner.bio}</Text>
        )}
        {partnerInterests.length > 0 && (
          <View style={styles.interestsRow}>
            {partnerInterests.slice(0, 5).map((interest, i) => (
              <View key={i} style={styles.interestChip}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.buttonsSection, buttonsStyle]}>
        <AnimatedButton
          label="Send a Message"
          onPress={() => navigation.replace('ChatDetail', { roomId: match.chat_room_id })}
          variant="primary"
          size="lg"
          fullWidth
          icon="chatbubble-outline"
        />
        <View style={{ height: spacing.md }} />
        <AnimatedButton
          label="Back to Home"
          onPress={() => navigation.navigate('Home')}
          variant="outline"
          size="lg"
          fullWidth
        />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  confetti: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    pointerEvents: 'none',
  },
  titleContainer: {
    marginBottom: spacing.xxl,
  },
  celebration: {
    ...typography.displayLarge,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarRing: {
    borderRadius: 70,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.headlineLarge,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  program: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  detailsSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    width: '100%',
  },
  bio: {
    ...typography.bodySmall,
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
  },
  interestText: {
    ...typography.labelSmall,
    color: colors.dark,
  },
  buttonsSection: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
});
