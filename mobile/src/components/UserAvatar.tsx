import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme';

const SIZE_MAP = { xs: 24, sm: 36, md: 48, lg: 64, xl: 120 } as const;
const FONT_MAP = { xs: 10, sm: 14, md: 18, lg: 24, xl: 44 } as const;
const BADGE_MAP = { xs: 8, sm: 12, md: 14, lg: 18, xl: 28 } as const;

interface UserAvatarProps {
  photoUrl?: string | null;
  firstName: string;
  size: keyof typeof SIZE_MAP;
  showVerificationBadge?: boolean;
  isVerified?: boolean;
  borderColor?: string;
  borderWidth?: number;
  style?: object;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://100.70.69.69:8000';

function resolveUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function UserAvatar({
  photoUrl,
  firstName,
  size,
  showVerificationBadge,
  isVerified,
  borderColor,
  borderWidth,
  style,
}: UserAvatarProps) {
  const dim = SIZE_MAP[size];
  const fontSize = FONT_MAP[size];
  const badgeSize = BADGE_MAP[size];

  const containerStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    ...(borderColor ? { borderColor, borderWidth: borderWidth ?? 2 } : {}),
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {photoUrl ? (
        <Image
          source={{ uri: resolveUrl(photoUrl) }}
          style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
        />
      ) : (
        <View style={[styles.fallback, { width: dim, height: dim, borderRadius: dim / 2 }]}>
          <Text style={[styles.initial, { fontSize }]}>
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {showVerificationBadge && isVerified && (
        <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, bottom: 0, right: 0 }]}>
          <Ionicons name="checkmark" size={badgeSize * 0.6} color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  image: { resizeMode: 'cover' },
  fallback: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#fff',
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
