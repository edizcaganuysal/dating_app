import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { Match } from '../types';
import { colors, typography, spacing, radii, shadows } from '../theme';
import { UserAvatar, AnimatedButton } from '../components';
import { haptic } from '../utils/haptics';
import { useFadeIn, usePulse } from '../utils/animations';

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

  // Animation values
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleRotation = useRef(new Animated.Value(-3)).current;
  const leftPhotoX = useRef(new Animated.Value(-SCREEN_W * 0.5)).current;
  const leftPhotoOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(60)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;

  // Pulsing CTA
  const ctaPulseStyle = usePulse(1, 1.03, 800, 1800);

  useEffect(() => {
    // 0ms — Background fades in
    Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // 300ms — Haptic + Title bounces in
    setTimeout(() => {
      haptic.heavy();
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(titleScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(titleRotation, { toValue: 3, duration: 100, useNativeDriver: true }),
          Animated.timing(titleRotation, { toValue: -2, duration: 80, useNativeDriver: true }),
          Animated.timing(titleRotation, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]),
      ]).start();
    }, 300);

    // 600ms — Haptic + Photos slide in
    setTimeout(() => {
      haptic.success();
      Animated.parallel([
        Animated.spring(leftPhotoX, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(leftPhotoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 600);

    // 900ms — Name + text
    setTimeout(() => {
      Animated.timing(nameOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 900);

    // 1500ms — Buttons slide up
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(buttonsY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 1500);
  }, []);

  const titleRotateDeg = titleRotation.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  const partnerInterests = match.partner.interests || [];

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.secondary, '#FFF5F0']}
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

      {/* Title */}
      <Animated.View style={[styles.titleContainer, {
        opacity: titleOpacity,
        transform: [{ scale: titleScale }, { rotate: titleRotateDeg }],
      }]}>
        <Text style={styles.celebration}>It's a Match!</Text>
      </Animated.View>

      {/* Photo */}
      <View style={styles.photosRow}>
        <Animated.View style={{
          transform: [{ translateX: leftPhotoX }, { rotate: '-5deg' }],
          opacity: leftPhotoOpacity,
        }}>
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
      <Animated.View style={[styles.nameSection, { opacity: nameOpacity }]}>
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
      <Animated.View style={[styles.buttonsSection, {
        opacity: buttonsOpacity,
        transform: [{ translateY: buttonsY }],
      }]}>
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
