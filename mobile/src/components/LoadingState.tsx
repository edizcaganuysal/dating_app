import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fontFamilies, spacing } from '../theme';
import BouncingDots from './BouncingDots';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingState({ message, fullScreen = true }: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <BouncingDots color={colors.primary} size={10} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  message: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 19,
    color: colors.gray,
    marginTop: spacing.md,
  },
});
