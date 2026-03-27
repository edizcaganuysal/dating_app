import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../theme';
import { useShimmer } from '../utils/animations';

interface SkeletonLoaderProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width,
  height,
  borderRadius = radii.sm,
  style,
}: SkeletonLoaderProps) {
  const shimmerStyle = useShimmer();

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(247, 240, 231, 0.5)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: 200, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.row}>
        <SkeletonLoader width={48} height={48} borderRadius={24} />
        <View style={skeletonStyles.textCol}>
          <SkeletonLoader width={140} height={16} />
          <SkeletonLoader width={100} height={12} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={14} style={{ marginTop: spacing.md }} />
      <SkeletonLoader width="60%" height={14} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

export function SkeletonRow() {
  return (
    <View style={skeletonStyles.row2}>
      <SkeletonLoader width={48} height={48} borderRadius={24} />
      <View style={skeletonStyles.textCol}>
        <SkeletonLoader width={120} height={16} />
        <SkeletonLoader width={180} height={12} style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  textCol: {
    flex: 1,
  },
});
