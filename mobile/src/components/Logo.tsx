import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, fontFamilies } from '../theme';

const SIZE_MAP = {
  sm: { yuni: 28, social: 16, gap: -6 },
  md: { yuni: 44, social: 26, gap: -10 },
  lg: { yuni: 64, social: 38, gap: -14 },
  xl: { yuni: 88, social: 52, gap: -18 },
} as const;

interface LogoProps {
  size?: keyof typeof SIZE_MAP;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Logo({ size = 'md', color, style }: LogoProps) {
  const s = SIZE_MAP[size];
  const textColor = color || colors.yuniRed;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.yuni, { fontSize: s.yuni, lineHeight: s.yuni * 1.1, color: textColor }]}>
        Yuni
      </Text>
      <Text style={[styles.social, { fontSize: s.social, lineHeight: s.social * 1.2, marginTop: s.gap, color: textColor }]}>
        social
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  yuni: {
    fontFamily: fontFamilies.playfair.bold,
    letterSpacing: -1,
  },
  social: {
    fontFamily: fontFamilies.playfair.italic,
    letterSpacing: 2,
  },
});
