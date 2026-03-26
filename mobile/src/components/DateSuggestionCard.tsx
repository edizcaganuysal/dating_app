import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SecondDateSuggestion } from '../types';
import { colors, spacing, typography, radii, shadows } from '../theme';
import AnimatedButton from './AnimatedButton';
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
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

interface DateSuggestionCardProps {
  suggestion: SecondDateSuggestion;
  onPropose: (id: string) => void;
  onSkip: () => void;
  loading?: boolean;
}

export default function DateSuggestionCard({
  suggestion,
  onPropose,
  onSkip,
  loading = false,
}: DateSuggestionCardProps) {
  const fadeStyle = useFadeIn({ direction: 'up', distance: 20 });
  const emoji = ACTIVITY_EMOJI[suggestion.activity] || '\u{1F389}';

  return (
    <Animated.View style={[styles.container, fadeStyle]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.headerText}>
          <Text style={styles.label}>Second Date Idea</Text>
          <Text style={styles.activity}>{formatActivity(suggestion.activity)}</Text>
        </View>
      </View>

      {suggestion.venue_name && (
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.darkSecondary} />
          <Text style={styles.detailText}>{suggestion.venue_name}</Text>
        </View>
      )}

      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={16} color={colors.darkSecondary} />
        <Text style={styles.detailText}>
          {formatDate(suggestion.proposed_date)} at {formatTime(suggestion.proposed_time)}
        </Text>
      </View>

      <View style={styles.buttons}>
        <AnimatedButton
          label="Propose This Date"
          onPress={() => onPropose(suggestion.id)}
          variant="primary"
          size="md"
          fullWidth
          loading={loading}
          icon="heart-outline"
        />
        <View style={{ height: spacing.sm }} />
        <AnimatedButton
          label="Suggest Something Else"
          onPress={onSkip}
          variant="ghost"
          size="sm"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emoji: {
    fontSize: 36,
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  label: {
    ...typography.labelSmall,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activity: {
    ...typography.headlineSmall,
    color: colors.dark,
    marginTop: spacing.xxs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailText: {
    ...typography.bodyMedium,
    color: colors.darkSecondary,
  },
  buttons: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
});
