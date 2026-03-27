import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, fontFamilies, spacing, radii } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const AnimatedView = Animated.View;

interface WarmInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function WarmInput({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...textInputProps
}: WarmInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
    onBlur?.(e);
  };

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.border, error ? colors.error : colors.primary],
    );
    return {
      borderColor,
      borderWidth: focusProgress.value > 0.5 ? 1.5 : 1,
    };
  });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <AnimatedView style={[styles.inputContainer, animatedBorderStyle, error && styles.errorBorder]}>
        {leftIcon && (
          <Ionicons name={leftIcon} size={20} color={isFocused ? colors.primary : colors.gray} style={styles.leftIcon} />
        )}
        <TextInput
          {...textInputProps}
          style={[styles.input, leftIcon && styles.inputWithLeftIcon, rightIcon && styles.inputWithRightIcon, style]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.grayLight}
          selectionColor={colors.primary}
        />
        {rightIcon && (
          <Ionicons
            name={rightIcon}
            size={20}
            color={colors.gray}
            style={styles.rightIcon}
            onPress={onRightIconPress}
          />
        )}
      </AnimatedView>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.inter.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.dark,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  leftIcon: {
    marginLeft: spacing.lg,
  },
  rightIcon: {
    marginRight: spacing.lg,
  },
  errorText: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
