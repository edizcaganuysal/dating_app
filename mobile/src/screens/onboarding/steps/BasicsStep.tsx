/**
 * BasicsStep — Program + Year selection with conversational UI.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fontFamilies, spacing, radii } from '../../../theme';
import sounds from '../../../utils/sounds';

const PROGRAMS = [
  'Computer Science', 'Engineering', 'Business', 'Economics', 'Psychology',
  'Biology', 'Pre-Med', 'Math', 'Physics', 'Chemistry', 'English', 'History',
  'Political Science', 'Sociology', 'Art', 'Music', 'Philosophy', 'Nursing',
  'Law', 'Architecture', 'Environmental Science', 'Communications',
  'Kinesiology', 'Education', 'Data Science', 'Neuroscience',
  'International Relations', 'Film Studies', 'Linguistics', 'Anthropology',
  'Other',
];

interface BasicsStepProps {
  phase: 'program' | 'year';
  program: string;
  setProgram: (p: string) => void;
  customProgram: string;
  setCustomProgram: (p: string) => void;
  yearOfStudy: number;
  setYearOfStudy: (y: number) => void;
  onProgramSelected: (program: string) => void;
  onYearSelected: (year: number) => void;
}

export default function BasicsStep({
  phase, program, setProgram, customProgram, setCustomProgram,
  yearOfStudy, setYearOfStudy, onProgramSelected, onYearSelected,
}: BasicsStepProps) {
  if (phase === 'program') {
    return (
      <View style={styles.container}>
        <View style={styles.chipRow}>
          {PROGRAMS.map((p, i) => {
            const isSelected = program === p;
            return (
              <Animated.View key={p} entering={FadeInDown.delay(i * 30).springify()}>
                <TouchableOpacity
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => {
                    setProgram(p);
                    if (p !== 'Other') { setCustomProgram(''); onProgramSelected(p); }
                    sounds.pop();
                  }}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{p}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
        {program === 'Other' && (
          <Animated.View entering={FadeInDown.springify()}>
            <TextInput
              style={styles.otherInput}
              placeholder="Type your program..."
              placeholderTextColor={colors.grayLight}
              value={customProgram}
              onChangeText={setCustomProgram}
              onSubmitEditing={() => { if (customProgram.trim()) onProgramSelected(customProgram.trim()); }}
              maxLength={60}
              autoFocus
              returnKeyType="done"
            />
          </Animated.View>
        )}
      </View>
    );
  }

  // Year selection
  return (
    <View style={styles.container}>
      <View style={styles.yearRow}>
        {['1', '2', '3', '4', '5', '6'].map((y, i) => {
          const isSelected = yearOfStudy === parseInt(y);
          return (
            <Animated.View key={y} entering={FadeInDown.delay(i * 60).springify()}>
              <TouchableOpacity
                style={[styles.yearChip, isSelected && styles.yearChipSelected]}
                onPress={() => {
                  setYearOfStudy(parseInt(y));
                  onYearSelected(parseInt(y));
                  sounds.pop();
                }}
              >
                <Text style={[styles.yearText, isSelected && styles.yearTextSelected]}>Year {y}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radii.xl, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surfaceElevated,
  },
  chipSelected: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamilies.inter.medium, fontSize: 14,
    color: colors.dark,
  },
  chipTextSelected: { color: '#FFFFFF' },
  otherInput: {
    fontFamily: fontFamilies.inter.regular, fontSize: 15,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md,
    padding: spacing.md, backgroundColor: colors.surfaceSelected, marginTop: spacing.md,
    color: colors.dark,
  },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  yearChip: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: radii.lg, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surfaceElevated,
    minWidth: 90, alignItems: 'center',
  },
  yearChipSelected: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  yearText: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 15,
    color: colors.dark,
  },
  yearTextSelected: { color: '#FFFFFF' },
});
