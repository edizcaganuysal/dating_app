/**
 * OnboardingComplete — Celebration screen after profile creation.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withDelay, withSpring, withTiming,
  FadeInDown, FadeIn,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ParticleEffect, AnimatedButton, Logo } from '../../components';
import { colors, fontFamilies, spacing, radii } from '../../theme';
import sounds from '../../utils/sounds';

const { width, height } = Dimensions.get('window');

interface OnboardingCompleteProps {
  userName: string;
  program: string;
  traits: string[];
  photoUri?: string;
  onContinue: () => void;
}

export default function OnboardingComplete({
  userName, program, traits, photoUri, onContinue,
}: OnboardingCompleteProps) {
  const logoScale = useSharedValue(0);
  const cardTranslateY = useSharedValue(60);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    sounds.celebration();

    logoScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 100 }));
    cardTranslateY.value = withDelay(1200, withSpring(0, { damping: 12 }));
    cardOpacity.value = withDelay(1200, withTiming(1, { duration: 400 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
    opacity: cardOpacity.value,
  }));

  return (
    <LinearGradient
      colors={[colors.coal, '#4A1A15', colors.yuniRed, colors.cream]}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <ParticleEffect count={20} intensity="high" />

      {/* Confetti */}
      <LottieView
        source={require('../../../assets/confetti.json')}
        autoPlay
        loop={false}
        style={styles.confetti}
      />

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Logo size="lg" />
      </Animated.View>

      {/* Welcome text */}
      <Animated.Text
        entering={FadeInDown.delay(600).springify()}
        style={styles.welcomeText}
      >
        Welcome to Yuni
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(800).springify()}
        style={styles.subtitleText}
      >
        Your profile is ready. Time to find your group.
      </Animated.Text>

      {/* Personality card */}
      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.cardName}>{userName}</Text>
        <Text style={styles.cardProgram}>{program}</Text>
        {traits.length > 0 && (
          <View style={styles.traitsRow}>
            {traits.map((trait, i) => (
              <React.Fragment key={trait}>
                {i > 0 && <Text style={styles.traitDot}>•</Text>}
                <Text style={styles.traitText}>{trait}</Text>
              </React.Fragment>
            ))}
          </View>
        )}
      </Animated.View>

      {/* CTA Button */}
      <Animated.View
        entering={FadeIn.delay(1800).duration(400)}
        style={styles.buttonContainer}
      >
        <AnimatedButton label="Let's go! 🔥" variant="primary" size="lg" fullWidth onPress={onContinue} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confetti: {
    position: 'absolute', width: width, height: height,
    top: 0, left: 0,
  },
  logoContainer: { marginBottom: 24, zIndex: 2 },
  welcomeText: {
    fontFamily: fontFamilies.playfair.bold,
    fontSize: 36, lineHeight: 44,
    color: colors.cream, textAlign: 'center',
    zIndex: 2,
  },
  subtitleText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16, lineHeight: 22,
    color: 'rgba(247, 240, 231, 0.8)',
    textAlign: 'center', marginTop: 8,
    zIndex: 2,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radii.xl, padding: spacing.xxl,
    alignItems: 'center', marginTop: 32,
    width: '100%', zIndex: 2,
  },
  cardName: {
    fontFamily: fontFamilies.playfair.bold, fontSize: 24,
    color: colors.coal,
  },
  cardProgram: {
    fontFamily: fontFamilies.inter.regular, fontSize: 14,
    color: colors.gray, marginTop: 4,
  },
  traitsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, flexWrap: 'wrap', justifyContent: 'center',
  },
  traitText: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 13,
    color: colors.primary,
  },
  traitDot: {
    fontSize: 13, color: colors.grayLight, marginHorizontal: 6,
  },
  buttonContainer: {
    width: '100%', marginTop: 32, zIndex: 2,
  },
});
