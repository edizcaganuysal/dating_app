import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  icon?: string;
  fullScreen?: boolean;
}

export default function ErrorState({
  message = 'Could not load this page. Check your connection and try again.',
  onRetry,
  icon = 'alert-circle-outline',
  fullScreen = true,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <Ionicons name={icon as any} size={56} color={colors.grayLight} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      )}
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
    backgroundColor: colors.surface,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.gray,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.xxl,
  },
  buttonText: {
    ...typography.labelMedium,
    color: '#fff',
  },
});
