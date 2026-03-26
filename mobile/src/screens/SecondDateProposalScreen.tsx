import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SecondDateSuggestion, PublicProfile } from '../types';
import { respondToSecondDate } from '../api/dates';
import { colors, spacing, typography, radii, shadows } from '../theme';
import { AnimatedButton, UserAvatar } from '../components';
import { useFadeIn } from '../utils/animations';
import { haptic } from '../utils/haptics';

const ACTIVITY_EMOJI: Record<string, string> = {
  dinner: '\u{1F37D}\u{FE0F}',
  bar: '\u{1F378}',
  bowling: '\u{1F3B3}',
  karaoke: '\u{1F3A4}',
  board_games: '\u{1F3B2}',
  cooking_class: '\u{1F468}\u{200D}\u{1F373}',
  cooking: '\u{1F468}\u{200D}\u{1F373}',
  trivia_night: '\u{1F9E0}',
  trivia: '\u{1F9E0}',
  mini_golf: '\u26F3',
  escape_room: '\u{1F510}',
  hiking: '\u{1F97E}',
  art_gallery: '\u{1F3A8}',
  coffee: '\u2615',
};

function formatActivity(activity: string): string {
  return activity
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

export default function SecondDateProposalScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { suggestion, partnerName, partnerPhoto, roomId } = route.params as {
    suggestion: SecondDateSuggestion;
    partnerName: string;
    partnerPhoto?: string;
    roomId?: string;
  };

  const [loading, setLoading] = useState<string | null>(null);

  const titleStyle = useFadeIn({ delay: 100, direction: 'down', distance: 20 });
  const cardStyle = useFadeIn({ delay: 300, direction: 'up', distance: 30 });
  const buttonsStyle = useFadeIn({ delay: 600, direction: 'up', distance: 24 });

  const emoji = ACTIVITY_EMOJI[suggestion.activity] || '\u{1F389}';

  const handleAccept = async () => {
    setLoading('accept');
    haptic.light();
    try {
      await respondToSecondDate(suggestion.id, true);
      haptic.success();
      Alert.alert('Date Accepted!', `You and ${partnerName} have a date!`, [
        {
          text: 'Go to Chat',
          onPress: () => {
            if (roomId) {
              navigation.replace('ChatDetail', { roomId });
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch {
      haptic.error();
      Alert.alert('Error', 'Could not accept. Try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async () => {
    setLoading('decline');
    haptic.light();
    try {
      await respondToSecondDate(suggestion.id, false);
      Alert.alert('No worries!', "Maybe next week.", [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      haptic.error();
      Alert.alert('Error', 'Could not respond. Try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleSuggestAlternative = () => {
    haptic.light();
    if (roomId) {
      navigation.replace('ChatDetail', { roomId });
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF5F0', '#FFE8E0', '#FFF0EB']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.titleSection, titleStyle]}>
        <UserAvatar
          photoUrl={partnerPhoto}
          firstName={partnerName}
          size="lg"
          borderColor={colors.primary}
          borderWidth={2}
        />
        <Text style={styles.title}>{partnerName} wants to</Text>
        <Text style={styles.titleBold}>go on a second date!</Text>
      </Animated.View>

      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
        <Text style={styles.cardActivity}>{formatActivity(suggestion.activity)}</Text>

        {suggestion.venue_name && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color={colors.darkSecondary} />
            <Text style={styles.detailText}>{suggestion.venue_name}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.darkSecondary} />
          <Text style={styles.detailText}>{formatDate(suggestion.proposed_date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color={colors.darkSecondary} />
          <Text style={styles.detailText}>{formatTime(suggestion.proposed_time)}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.buttonsSection, buttonsStyle]}>
        <AnimatedButton
          label="Accept"
          onPress={handleAccept}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading === 'accept'}
          disabled={loading !== null}
          icon="checkmark-circle-outline"
        />
        <View style={{ height: spacing.md }} />
        <AnimatedButton
          label="Suggest Alternative"
          onPress={handleSuggestAlternative}
          variant="outline"
          size="md"
          fullWidth
          disabled={loading !== null}
          icon="chatbubble-outline"
        />
        <View style={{ height: spacing.sm }} />
        <AnimatedButton
          label="Not This Week"
          onPress={handleDecline}
          variant="ghost"
          size="md"
          fullWidth
          loading={loading === 'decline'}
          disabled={loading !== null}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.darkSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  titleBold: {
    ...typography.headlineLarge,
    color: colors.dark,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    ...shadows.lg,
  },
  cardEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  cardActivity: {
    ...typography.headlineLarge,
    color: colors.dark,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailText: {
    ...typography.bodyLarge,
    color: colors.darkSecondary,
  },
  buttonsSection: {
    width: '100%',
  },
});
