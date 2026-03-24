import React from 'react';
import { Text, ActivityIndicator, StyleSheet, View, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadows } from '../theme';
import { haptic } from '../utils/haptics';
import { usePressScale } from '../utils/animations';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface AnimatedButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconRight?: string;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: '#fff' },
  secondary: { bg: colors.secondary, text: '#fff' },
  outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
  ghost: { bg: 'transparent', text: colors.primary },
  danger: { bg: colors.error, text: '#fff' },
};

const SIZE_STYLES: Record<Size, { paddingV: number; paddingH: number; fontSize: number }> = {
  sm: { paddingV: spacing.sm, paddingH: spacing.lg, fontSize: 13 },
  md: { paddingV: spacing.md + 2, paddingH: spacing.xl, fontSize: 15 },
  lg: { paddingV: spacing.lg, paddingH: spacing.xxl, fontSize: 16 },
};

export default function AnimatedButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  iconRight,
}: AnimatedButtonProps) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale(0.96);
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;
  const showShadow = variant === 'primary' && !isDisabled;

  return (
    <Pressable
      onPress={() => {
        if (isDisabled) return;
        haptic.light();
        onPress();
      }}
      onPressIn={isDisabled ? undefined : onPressIn}
      onPressOut={isDisabled ? undefined : onPressOut}
      disabled={isDisabled}
    >
      <Animated.View
        style={[
          styles.base,
          animatedStyle,
          {
            backgroundColor: isDisabled ? colors.grayLight : v.bg,
            paddingVertical: s.paddingV,
            paddingHorizontal: s.paddingH,
          },
          v.border && !isDisabled ? { borderWidth: 1.5, borderColor: v.border } : undefined,
          fullWidth && styles.fullWidth,
          showShadow ? shadows.md : undefined,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={v.text} />
        ) : (
          <View style={styles.content}>
            {icon && (
              <Ionicons
                name={icon as any}
                size={s.fontSize + 2}
                color={isDisabled ? colors.gray : v.text}
                style={styles.iconLeft}
              />
            )}
            <Text style={[styles.label, { fontSize: s.fontSize, color: isDisabled ? colors.gray : v.text }]}>
              {label}
            </Text>
            {iconRight && (
              <Ionicons
                name={iconRight as any}
                size={s.fontSize + 2}
                color={isDisabled ? colors.gray : v.text}
                style={styles.iconRight}
              />
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
