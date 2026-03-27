/**
 * DealbreakersStep — Dealbreaker chip selection.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fontFamilies, spacing, radii } from '../../../theme';
import sounds from '../../../utils/sounds';

const DEALBREAKERS = [
  'Smoking', 'Heavy drinking', 'Different religion', 'Long distance', 'Rude to others',
];

interface DealbreakersStepProps {
  dealbreakers: string[];
  setDealbreakers: (d: string[]) => void;
  onDone: () => void;
}

export default function DealbreakersStep({ dealbreakers, setDealbreakers, onDone }: DealbreakersStepProps) {
  const toggle = (item: string) => {
    if (dealbreakers.includes(item)) {
      setDealbreakers(dealbreakers.filter(d => d !== item));
    } else if (dealbreakers.length < 3) {
      setDealbreakers([...dealbreakers, item]);
    }
    sounds.pop();
  };

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        {DEALBREAKERS.map((d, i) => {
          const isSelected = dealbreakers.includes(d);
          return (
            <Animated.View key={d} entering={FadeInDown.delay(i * 80).springify()}>
              <TouchableOpacity
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggle(d)}
                disabled={dealbreakers.length >= 3 && !isSelected}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {isSelected ? '✕ ' : ''}{d}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <Text style={styles.countText}>
        {dealbreakers.length}/3 selected
      </Text>

      <Animated.View entering={FadeInDown.delay(500).springify()}>
        <TouchableOpacity style={styles.continueBtn} onPress={onDone}>
          <Text style={styles.continueBtnText}>
            {dealbreakers.length === 0 ? "No dealbreakers — continue" : "Continue"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: radii.xl, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surfaceElevated,
  },
  chipSelected: {
    borderColor: colors.error, backgroundColor: colors.errorLight,
  },
  chipText: {
    fontFamily: fontFamilies.inter.medium, fontSize: 14,
    color: colors.dark,
  },
  chipTextSelected: { color: colors.error },
  countText: {
    fontFamily: fontFamilies.inter.regular, fontSize: 12,
    color: colors.gray, marginTop: spacing.md, textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14, borderRadius: radii.md,
    alignItems: 'center', marginTop: spacing.xl,
  },
  continueBtnText: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 15,
    color: '#FFFFFF',
  },
});
