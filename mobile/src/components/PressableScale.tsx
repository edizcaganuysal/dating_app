import React from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import { haptic } from '../utils/haptics';
import { usePressScale } from '../utils/animations';

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleValue?: number;
  hapticOnPress?: boolean;
  testID?: string;
}

export default function PressableScale({
  onPress,
  onLongPress,
  children,
  style,
  disabled = false,
  scaleValue = 0.96,
  hapticOnPress = true,
  testID,
}: PressableScaleProps) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale(scaleValue);

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        if (hapticOnPress) haptic.light();
        onPress?.();
      }}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={disabled ? undefined : onPressOut}
      disabled={disabled}
      testID={testID}
    >
      <Animated.View style={[animatedStyle, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
