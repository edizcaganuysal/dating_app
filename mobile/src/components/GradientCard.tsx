import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, shadows, spacing } from '../theme';

interface GradientCardProps {
  gradientColors?: readonly [string, string, ...string[]];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export default function GradientCard({
  gradientColors,
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  children,
  style,
  onPress,
}: GradientCardProps) {
  // Default: flat warm card (no gradient) per brand guidelines "simple over cluttered"
  if (!gradientColors) {
    const card = (
      <View style={[styles.card, styles.warmCard, style]}>
        {children}
      </View>
    );
    if (onPress) {
      return (
        <Pressable onPress={onPress} style={({ pressed }) => pressed ? { opacity: 0.9 } : undefined}>
          {card}
        </Pressable>
      );
    }
    return card;
  }

  // Explicit gradient (for reveal screens etc.)
  const content = (
    <LinearGradient
      colors={gradientColors as unknown as [string, string, ...string[]]}
      start={gradientStart}
      end={gradientEnd}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed ? { opacity: 0.9 } : undefined}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  warmCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
