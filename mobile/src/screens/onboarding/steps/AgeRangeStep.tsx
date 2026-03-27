/**
 * AgeRangeStep — Age range dual slider with warm styling.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fontFamilies, spacing, radii } from '../../../theme';

interface AgeRangeStepProps {
  ageMin: number;
  setAgeMin: (v: number) => void;
  ageMax: number;
  setAgeMax: (v: number) => void;
}

export default function AgeRangeStep({ ageMin, setAgeMin, ageMax, setAgeMax }: AgeRangeStepProps) {
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.container}>
      <View style={styles.rangeDisplay}>
        <Text style={styles.rangeNumber}>{ageMin}</Text>
        <Text style={styles.rangeDash}>—</Text>
        <Text style={styles.rangeNumber}>{ageMax}</Text>
      </View>

      <View style={styles.sliderGroup}>
        <Text style={styles.sliderLabel}>Min age: {ageMin}</Text>
        <Slider
          style={styles.slider}
          minimumValue={18} maximumValue={35} step={1}
          value={ageMin}
          onValueChange={(v: number) => setAgeMin(Math.min(Math.round(v), ageMax))}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderGroup}>
        <Text style={styles.sliderLabel}>Max age: {ageMax}</Text>
        <Slider
          style={styles.slider}
          minimumValue={18} maximumValue={35} step={1}
          value={ageMax}
          onValueChange={(v: number) => setAgeMax(Math.max(Math.round(v), ageMin))}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
      </View>

      <Text style={styles.privateNote}>🔒 This stays private — only used for matching</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  rangeDisplay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xl, gap: spacing.md,
  },
  rangeNumber: {
    fontFamily: fontFamilies.playfair.bold, fontSize: 40,
    color: colors.primary,
  },
  rangeDash: {
    fontFamily: fontFamilies.inter.regular, fontSize: 24,
    color: colors.grayLight,
  },
  sliderGroup: { marginBottom: spacing.lg },
  sliderLabel: {
    fontFamily: fontFamilies.inter.medium, fontSize: 13,
    color: colors.gray, marginBottom: spacing.xs,
  },
  slider: { width: '100%', height: 40 },
  privateNote: {
    fontFamily: fontFamilies.inter.regular, fontSize: 12,
    color: colors.gray, textAlign: 'center', marginTop: spacing.sm,
  },
});
