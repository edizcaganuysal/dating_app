/**
 * InterestsStep — Category-based interests with recommendations.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fontFamilies, spacing, radii } from '../../../theme';
import sounds from '../../../utils/sounds';

const INTEREST_CATEGORIES = [
  { name: 'Sports & Fitness', emoji: '💪', interests: ['Hiking', 'Running', 'Gym', 'Yoga', 'Swimming'] },
  { name: 'Music', emoji: '🎵', interests: ['Live Music', 'Concerts', 'K-Pop', 'Hip Hop', 'Indie'] },
  { name: 'Creative', emoji: '🎨', interests: ['Photography', 'Art', 'Writing', 'Filmmaking'] },
  { name: 'Food & Drink', emoji: '🍕', interests: ['Cooking', 'Baking', 'Coffee', 'Foodie'] },
  { name: 'Entertainment', emoji: '🎬', interests: ['Movies', 'TV Shows', 'Anime', 'Gaming', 'Board Games'] },
  { name: 'Outdoors & Travel', emoji: '✈️', interests: ['Travel', 'Camping', 'Beach', 'Road Trips', 'Nature'] },
  { name: 'Social', emoji: '🎉', interests: ['Dancing', 'Volunteering', 'Festivals', 'House Parties'] },
  { name: 'Lifestyle', emoji: '✨', interests: ['Fashion', 'Thrifting', 'Meditation', 'Pets', 'Skincare'] },
  { name: 'Intellectual', emoji: '🧠', interests: ['Science', 'Philosophy', 'Languages', 'Technology', 'Psychology'] },
];

const RECOMMENDATIONS: Record<string, string[]> = {
  'Hiking': ['Camping', 'Nature', 'Travel'], 'Running': ['Gym', 'Yoga', 'Swimming'],
  'Gym': ['Running', 'Yoga'], 'Yoga': ['Meditation', 'Gym'], 'Swimming': ['Beach', 'Running'],
  'Live Music': ['Concerts', 'Festivals', 'Dancing'], 'Concerts': ['Live Music', 'Festivals'],
  'K-Pop': ['Dancing', 'Anime'], 'Photography': ['Art', 'Travel', 'Nature'],
  'Art': ['Photography', 'Writing'], 'Cooking': ['Baking', 'Foodie', 'Coffee'],
  'Coffee': ['Baking', 'Cooking'], 'Movies': ['TV Shows', 'Anime'],
  'Anime': ['Gaming', 'K-Pop'], 'Gaming': ['Anime', 'Board Games', 'Technology'],
  'Travel': ['Camping', 'Beach', 'Road Trips'], 'Dancing': ['Live Music', 'Festivals'],
  'Fashion': ['Thrifting', 'Photography'], 'Science': ['Technology', 'Philosophy'],
  'Philosophy': ['Psychology', 'Writing'], 'Technology': ['Science', 'Gaming'],
};

interface InterestsStepProps {
  selectedInterests: string[];
  setSelectedInterests: (i: string[]) => void;
  onInterestToggled: (count: number) => void;
}

export default function InterestsStep({
  selectedInterests, setSelectedInterests, onInterestToggled,
}: InterestsStepProps) {
  const [search, setSearch] = useState('');

  const recommendedInterests = useMemo(() => {
    if (selectedInterests.length === 0) return [];
    const recs = new Set<string>();
    for (const interest of selectedInterests) {
      const related = RECOMMENDATIONS[interest] || [];
      for (const r of related) if (!selectedInterests.includes(r)) recs.add(r);
    }
    return Array.from(recs).slice(0, 6);
  }, [selectedInterests]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return INTEREST_CATEGORIES;
    const q = search.toLowerCase();
    return INTEREST_CATEGORIES.map(cat => ({
      ...cat, interests: cat.interests.filter(i => i.toLowerCase().includes(q)),
    })).filter(cat => cat.interests.length > 0);
  }, [search]);

  const toggle = (interest: string) => {
    let updated: string[];
    if (selectedInterests.includes(interest)) {
      updated = selectedInterests.filter(i => i !== interest);
    } else if (selectedInterests.length < 10) {
      updated = [...selectedInterests, interest];
    } else return;
    setSelectedInterests(updated);
    onInterestToggled(updated.length);
    sounds.pop();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search interests..."
        placeholderTextColor={colors.grayLight}
        value={search}
        onChangeText={setSearch}
      />

      <Text style={styles.countText}>{selectedInterests.length}/10 selected</Text>

      {recommendedInterests.length > 0 && !search && (
        <Animated.View entering={FadeInDown.springify()} style={styles.recSection}>
          <Text style={styles.recTitle}>✨ Recommended for you</Text>
          <View style={styles.chipRow}>
            {recommendedInterests.map(interest => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <TouchableOpacity
                  key={interest}
                  style={[styles.chip, styles.chipRec, isSelected && styles.chipSelected]}
                  onPress={() => toggle(interest)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{interest}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}

      {filteredCategories.map((cat, ci) => (
        <Animated.View key={cat.name} entering={FadeInDown.delay(ci * 60).springify()} style={styles.catSection}>
          <Text style={styles.catTitle}>{cat.emoji} {cat.name}</Text>
          <View style={styles.chipRow}>
            {cat.interests.map(interest => {
              const isSelected = selectedInterests.includes(interest);
              const disabled = selectedInterests.length >= 10 && !isSelected;
              return (
                <TouchableOpacity
                  key={interest}
                  disabled={disabled}
                  style={[styles.chip, isSelected && styles.chipSelected, disabled && styles.chipDisabled]}
                  onPress={() => toggle(interest)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{interest}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  search: {
    fontFamily: fontFamilies.inter.regular, fontSize: 15,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    padding: spacing.md, backgroundColor: colors.cream, color: colors.dark,
    marginBottom: spacing.md,
  },
  countText: {
    fontFamily: fontFamilies.inter.medium, fontSize: 12,
    color: colors.gray, marginBottom: spacing.md,
  },
  recSection: {
    backgroundColor: colors.surfaceSelected, borderRadius: radii.lg,
    padding: spacing.md, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.firelight,
  },
  recTitle: {
    fontFamily: fontFamilies.inter.bold, fontSize: 13,
    color: colors.ember, marginBottom: spacing.sm,
  },
  catSection: { marginBottom: spacing.lg },
  catTitle: {
    fontFamily: fontFamilies.inter.semiBold, fontSize: 15,
    color: colors.dark, marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radii.xl, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surfaceElevated,
  },
  chipRec: { borderColor: colors.firelight, backgroundColor: '#FFF8EE' },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.4 },
  chipText: {
    fontFamily: fontFamilies.inter.medium, fontSize: 13,
    color: colors.dark,
  },
  chipTextSelected: { color: '#FFFFFF' },
});
