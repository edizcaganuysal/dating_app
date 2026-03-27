import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, spacing } from '../theme';
import { useBounce } from '../utils/animations';

interface BouncingDotsProps {
  color?: string;
  size?: number;
}

function Dot({ delay, color, size }: { delay: number; color: string; size: number }) {
  const bounceStyle = useBounce(delay);

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        bounceStyle,
      ]}
    />
  );
}

export default function BouncingDots({ color = colors.gray, size = 6 }: BouncingDotsProps) {
  return (
    <View style={styles.container}>
      <Dot delay={0} color={color} size={size} />
      <Dot delay={150} color={color} size={size} />
      <Dot delay={300} color={color} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
