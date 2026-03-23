import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../theme';

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
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-200, 200]) }],
  }));

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
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: 200, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

/** Pre-composed skeleton for a card with photo + text lines */
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

/** Pre-composed skeleton for a chat room row */
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
