/**
 * ValuesStep — This-or-that value cards with animations.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, fontFamilies, spacing, radii } from '../../../theme';
import sounds from '../../../utils/sounds';

const VALUES_CARDS = [
  { left: 'Ambition', right: 'Work-life balance' },
  { left: 'Tradition', right: 'Open-mindedness' },
  { left: 'Independence', right: 'Togetherness' },
  { left: 'Adventure', right: 'Stability' },
  { left: 'Spontaneity', right: 'Planning' },
  { left: 'Brutal honesty', right: 'Kind diplomacy' },
];

interface ValuesStepProps {
  valuesVector: (number | null)[];
  setValuesVector: (v: (number | null)[]) => void;
  onValueSelected: (answeredCount: number) => void;
}

export default function ValuesStep({ valuesVector, setValuesVector, onValueSelected }: ValuesStepProps) {
  const answeredCount = valuesVector.filter(v => v !== null).length;

  const selectValue = (index: number, side: 0 | 1) => {
    const updated = [...valuesVector];
    updated[index] = side;
    setValuesVector(updated);
    sounds.pop();
    onValueSelected(updated.filter(v => v !== null).length);
  };

  return (
    <View style={styles.container}>
      {VALUES_CARDS.map((card, i) => {
        const selected = valuesVector[i];
        return (
          <Animated.View
            key={i}
            entering={FadeInDown.delay(i * 100).springify()}
            style={styles.valueCard}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardNumber}>{i + 1}</Text>
              {selected !== null && (
                <Animated.Text entering={FadeIn.duration(200)} style={styles.checkIcon}>✓</Animated.Text>
              )}
            </View>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[styles.option, selected === 0 && styles.optionSelected]}
                onPress={() => selectValue(i, 0)}
              >
                <Text style={[styles.optionText, selected === 0 && styles.optionTextSelected]}>
                  {card.left}
                </Text>
              </TouchableOpacity>

              <Text style={styles.vs}>or</Text>

              <TouchableOpacity
                style={[styles.option, selected === 1 && styles.optionSelected]}
                onPress={() => selectValue(i, 1)}
              >
                <Text style={[styles.optionText, selected === 1 && styles.optionTextSelected]}>
                  {card.right}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      })}

      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${(answeredCount / 6) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{answeredCount}/6 answered</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, marginTop: spacing.sm },
  valueCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  cardNumber: {
    fontFamily: fontFamilies.inter.bold, fontSize: 12,
    color: colors.grayLight,
  },
  checkIcon: { fontSize: 16, color: colors.success },
  optionsRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  option: {
    flex: 1, paddingVertical: 14,
    borderRadius: radii.md, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center',
    backgroundColor: colors.cream,
  },
  optionSelected: {
    borderColor: colors.primary, backgroundColor: colors.surfaceSelected,
  },
  optionText: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 13,
    color: colors.dark, textAlign: 'center',
  },
  optionTextSelected: { color: colors.primary },
  vs: {
    fontFamily: fontFamilies.inter.regular, fontSize: 13,
    color: colors.grayLight,
  },
  progress: {
    height: 4, backgroundColor: colors.border,
    borderRadius: 2, marginTop: spacing.md, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: fontFamilies.inter.regular, fontSize: 12,
    color: colors.gray, textAlign: 'center',
  },
});
