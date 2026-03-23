import React from 'react';
import { Text, TextStyle } from 'react-native';
import { colors, typography } from '../theme';

interface RelativeTimestampProps {
  dateString: string;
  variant?: 'short' | 'medium' | 'long';
  style?: TextStyle;
}

function formatRelative(dateString: string, variant: 'short' | 'medium' | 'long'): string {
  const now = Date.now();
  const date = new Date(dateString);
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (variant === 'long') {
    return date.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  if (diffSec < 60) {
    return variant === 'short' ? 'now' : 'just now';
  }
  if (diffMin < 60) {
    return variant === 'short' ? `${diffMin}m` : `${diffMin} min ago`;
  }
  if (diffHour < 24) {
    return variant === 'short' ? `${diffHour}h` : `${diffHour} hours ago`;
  }
  if (diffDay === 1) {
    return variant === 'short' ? '1d' : 'Yesterday';
  }
  if (diffDay < 7) {
    if (variant === 'short') return `${diffDay}d`;
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  if (variant === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function RelativeTimestamp({ dateString, variant = 'medium', style }: RelativeTimestampProps) {
  return (
    <Text style={[{ ...typography.caption, color: colors.gray }, style]}>
      {formatRelative(dateString, variant)}
    </Text>
  );
}
