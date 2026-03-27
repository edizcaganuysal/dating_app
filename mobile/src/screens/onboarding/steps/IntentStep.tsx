/**
 * IntentStep — Relationship intent selection with animated cards.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fontFamilies, spacing, radii } from '../../../theme';
import sounds from '../../../utils/sounds';

const INTENTS = [
  { value: 'serious', emoji: '🔥', label: 'Something serious', desc: 'Looking for a real relationship' },
  { value: 'casual', emoji: '✌️', label: 'Keeping it casual', desc: 'Fun dates, no pressure' },
  { value: 'open', emoji: '🌊', label: 'Open to anything', desc: "Let's see where it goes" },
];

interface IntentStepProps {
  intent: string;
  setIntent: (intent: string) => void;
  onSelected: (intent: string) => void;
}

export default function IntentStep({ intent, setIntent, onSelected }: IntentStepProps) {
  return (
    <View style={styles.container}>
      {INTENTS.map((opt, i) => {
        const isSelected = intent === opt.value;
        return (
          <Animated.View key={opt.value} entering={FadeInDown.delay(i * 120 + 200).springify()}>
            <TouchableOpacity
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => {
                setIntent(opt.value);
                onSelected(opt.value);
                sounds.pop();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={[styles.cardDesc, isSelected && styles.cardDescSelected]}>
                  {opt.desc}
                </Text>
              </View>
              {isSelected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, marginTop: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg, padding: spacing.xl,
    borderWidth: 1.5, borderColor: colors.border,
    gap: spacing.lg,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSelected,
  },
  emoji: { fontSize: 32 },
  cardContent: { flex: 1 },
  cardLabel: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 17,
    color: colors.dark, marginBottom: 2,
  },
  cardLabelSelected: { color: colors.primary },
  cardDesc: {
    fontFamily: fontFamilies.inter.regular, fontSize: 13,
    color: colors.gray,
  },
  cardDescSelected: { color: colors.darkSecondary },
  checkmark: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 16, fontFamily: fontFamilies.inter.bold },
});
