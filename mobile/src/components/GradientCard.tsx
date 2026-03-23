import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
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
  const finalColors = gradientColors ?? [colors.surfaceElevated, colors.surfaceElevated] as const;

  const content = (
    <LinearGradient
      colors={finalColors as unknown as [string, string, ...string[]]}
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
});
