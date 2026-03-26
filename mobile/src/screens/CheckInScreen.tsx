import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { submitCheckIn } from '../api/dates';
import { colors, spacing, typography, radii, shadows } from '../theme';
import { PressableScale } from '../components';
import { useFadeIn, useStaggerItem } from '../utils/animations';
import { haptic } from '../utils/haptics';

const CHECK_IN_OPTIONS = [
  {
    key: 'met_again',
    label: 'We met up again!',
    icon: 'heart-circle' as const,
    color: colors.primary,
    bg: '#FFF0EB',
  },
  {
    key: 'still_chatting',
    label: 'Still chatting, good vibes',
    icon: 'chatbubbles' as const,
    color: colors.info,
    bg: '#E3F2FD',
  },
  {
    key: 'fizzled',
    label: 'Conversation fizzled',
    icon: 'water' as const,
    color: colors.gray,
    bg: '#F5F5F5',
  },
  {
    key: 'prefer_not_to_say',
    label: 'Prefer not to say',
    icon: 'ellipsis-horizontal-circle' as const,
    color: colors.darkSecondary,
    bg: '#F5F5F5',
  },
];

function CheckInCard({
  option,
  index,
  onPress,
  disabled,
}: {
  option: typeof CHECK_IN_OPTIONS[0];
  index: number;
  onPress: () => void;
  disabled: boolean;
}) {
  const staggerStyle = useStaggerItem(index, 80, 'up');

  return (
    <Animated.View style={staggerStyle}>
      <PressableScale onPress={onPress} disabled={disabled}>
        <View style={[styles.card, { backgroundColor: option.bg }]}>
          <View style={[styles.iconCircle, { backgroundColor: option.color + '20' }]}>
            <Ionicons name={option.icon} size={28} color={option.color} />
          </View>
          <Text style={styles.cardLabel}>{option.label}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.grayLight} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export default function CheckInScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId, partnerName } = route.params as {
    matchId: string;
    partnerName: string;
  };

  const [submitting, setSubmitting] = useState(false);
  const headerStyle = useFadeIn({ direction: 'down', distance: 16 });

  const handleCheckIn = async (status: string) => {
    setSubmitting(true);
    haptic.light();
    try {
      await submitCheckIn(matchId, status);
      haptic.success();
      Alert.alert('Thanks!', 'Your check-in has been recorded.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      haptic.error();
      Alert.alert('Error', 'Could not submit check-in. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text style={styles.headerTitle}>{partnerName}</Text>
        <Text style={styles.headerSub}>How are things going?</Text>
      </Animated.View>

      <View style={styles.cardList}>
        {CHECK_IN_OPTIONS.map((option, index) => (
          <CheckInCard
            key={option.key}
            option={option}
            index={index}
            onPress={() => handleCheckIn(option.key)}
            disabled={submitting}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  headerTitle: {
    ...typography.displaySmall,
    color: colors.dark,
  },
  headerSub: {
    ...typography.bodyLarge,
    color: colors.darkSecondary,
    marginTop: spacing.sm,
  },
  cardList: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    ...shadows.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  cardLabel: {
    ...typography.labelLarge,
    color: colors.dark,
    flex: 1,
  },
});
