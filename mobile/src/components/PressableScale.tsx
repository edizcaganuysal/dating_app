import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { haptic } from '../utils/haptics';
import { animations } from '../theme';

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
  scaleValue?: number;
  hapticOnPress?: boolean;
}

export default function PressableScale({
  onPress,
  onLongPress,
  children,
  style,
  disabled = false,
  scaleValue = 0.96,
  hapticOnPress = true,
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(scaleValue, animations.snappy);
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, animations.bouncy);
    })
    .onEnd(() => {
      if (hapticOnPress) haptic.light();
      onPress?.();
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(!disabled && !!onLongPress)
    .minDuration(500)
    .onStart(() => {
      haptic.medium();
      onLongPress?.();
    });

  const composed = onLongPress
    ? Gesture.Race(gesture, longPressGesture)
    : gesture;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[animatedStyle, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
