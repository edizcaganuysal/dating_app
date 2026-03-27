import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SecondDateSuggestion } from '../types';
import { colors, fontFamilies, spacing, radii, shadows } from '../theme';
import AnimatedButton from './AnimatedButton';
import { useFadeIn } from '../utils/animations';

const ACTIVITY_EMOJI: Record<string, string> = {
  dinner: '🍽️', bar: '🍸', bowling: '🎳', karaoke: '🎤',
  board_games: '🎲', cooking_class: '👨‍🍳', cooking: '👨‍🍳',
  trivia_night: '🧠', trivia: '🧠', mini_golf: '⛳',
  escape_room: '🔐', hiking: '🥾', art_gallery: '🎨', coffee: '☕',
};

function formatActivity(activity: string): string {
  return activity.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
  suggestion, onPropose, onSkip, loading = false,
}: DateSuggestionCardProps) {
  const fadeStyle = useFadeIn({ direction: 'up', distance: 20 });
  const emoji = ACTIVITY_EMOJI[suggestion.activity] || '🎉';

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
          variant="primary" size="md" fullWidth
          loading={loading} icon="heart-outline"
        />
        <View style={{ height: spacing.sm }} />
        <AnimatedButton
          label="Suggest Something Else"
          onPress={onSkip} variant="ghost" size="sm"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg, padding: spacing.lg,
    marginHorizontal: spacing.md, marginVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.primaryLight,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md,
  },
  emoji: { fontSize: 36, marginRight: spacing.md },
  headerText: { flex: 1 },
  label: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 12, lineHeight: 16,
    color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  activity: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 18, lineHeight: 24,
    color: colors.dark, marginTop: spacing.xxs,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm,
  },
  detailText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 15, lineHeight: 20,
    color: colors.darkSecondary,
  },
  buttons: { marginTop: spacing.md, alignItems: 'center' },
});
