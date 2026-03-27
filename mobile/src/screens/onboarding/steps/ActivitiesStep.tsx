/**
 * ActivitiesStep — Group date activity selection with animated cards.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fontFamilies, spacing, radii } from '../../../theme';
import sounds from '../../../utils/sounds';

const ACTIVITIES = [
  { name: 'Escape Room', emoji: '🔐' },
  { name: 'Cooking Class', emoji: '👨‍🍳' },
  { name: 'Trivia', emoji: '🧠' },
  { name: 'Hiking', emoji: '🥾' },
  { name: 'Karaoke', emoji: '🎤' },
  { name: 'Bowling', emoji: '🎳' },
  { name: 'Board Games', emoji: '🎲' },
  { name: 'Mini Golf', emoji: '⛳' },
  { name: 'Dinner', emoji: '🍽️' },
  { name: 'Bar', emoji: '🍸' },
];

interface ActivitiesStepProps {
  selectedActivities: string[];
  setSelectedActivities: (a: string[]) => void;
  onActivityToggled: (count: number) => void;
}

export default function ActivitiesStep({
  selectedActivities, setSelectedActivities, onActivityToggled,
}: ActivitiesStepProps) {
  const toggle = (name: string) => {
    let updated: string[];
    if (selectedActivities.includes(name)) {
      updated = selectedActivities.filter(a => a !== name);
    } else {
      updated = [...selectedActivities, name];
    }
    setSelectedActivities(updated);
    onActivityToggled(updated.length);
    sounds.pop();
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {ACTIVITIES.map((act, i) => {
          const isSelected = selectedActivities.includes(act.name);
          return (
            <Animated.View
              key={act.name}
              entering={FadeInDown.delay(i * 50).springify()}
              style={styles.cardWrapper}
            >
              <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => toggle(act.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{act.emoji}</Text>
                <Text style={[styles.name, isSelected && styles.nameSelected]}>{act.name}</Text>
                {isSelected && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
      <Text style={styles.countText}>
        {selectedActivities.length} selected {selectedActivities.length < 3 ? `(pick ${3 - selectedActivities.length} more)` : '✓'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm, justifyContent: 'center',
  },
  cardWrapper: { width: '47%' },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg, padding: spacing.lg,
    alignItems: 'center', borderWidth: 1.5,
    borderColor: colors.border, position: 'relative',
  },
  cardSelected: {
    borderColor: colors.primary, backgroundColor: colors.surfaceSelected,
  },
  emoji: { fontSize: 32, marginBottom: spacing.sm },
  name: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 13,
    color: colors.dark, textAlign: 'center',
  },
  nameSelected: { color: colors.primary },
  checkBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 11, fontFamily: fontFamilies.inter.bold },
  countText: {
    fontFamily: fontFamilies.inter.medium, fontSize: 13,
    color: colors.gray, textAlign: 'center', marginTop: spacing.lg,
  },
});
