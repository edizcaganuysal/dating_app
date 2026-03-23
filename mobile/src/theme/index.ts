import { Platform } from 'react-native';

// ─── COLOR PALETTE ──────────────────────────────────────────────

export const colors = {
  // Brand
  primary: '#FF6B6B',
  primaryLight: '#FF8A8A',
  primaryDark: '#E55A5A',
  secondary: '#FFA07A',
  accent: '#FFD93D',

  // Neutrals
  dark: '#2D2D3A',
  darkSecondary: '#4A4A5A',
  gray: '#8888A0',
  grayLight: '#B0B0C0',
  border: '#E8E8F0',
  borderLight: '#F0F0F5',

  // Surfaces
  surface: '#FFF5F0',
  surfaceElevated: '#FFFFFF',
  surfacePressed: '#FFE8E0',
  surfaceSelected: '#FFF0EB',

  // Semantic
  success: '#4CAF50',
  successLight: '#E8F5E9',
  error: '#EF5350',
  errorLight: '#FFEBEE',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  info: '#2196F3',
  infoLight: '#E3F2FD',

  // Chat
  ownMessage: '#FF6B6B',
  otherMessage: '#F5F0EB',
  genieBubble: '#F3E5F5',
  genieBorder: '#E1BEE7',
  geniePrimary: '#7B1FA2',

  // Gender
  male: '#2196F3',
  female: '#FF6B6B',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.15)',
} as const;

// ─── TYPOGRAPHY ──────────────────────────────────────────────────

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
}) as string;

export const typography = {
  displayLarge: {
    fontFamily,
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  headlineLarge: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  headlineMedium: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  headlineSmall: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 19,
  },
  labelLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  labelMedium: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  labelSmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionSmall: {
    fontFamily,
    fontSize: 10,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
} as const;

// ─── SPACING ──────────────────────────────────────────────────

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

// ─── BORDER RADIUS ──────────────────────────────────────────────

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 25,
  full: 9999,
} as const;

// ─── SHADOWS ──────────────────────────────────────────────────

export const shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─── ANIMATION PRESETS (Reanimated spring configs) ──────────────

export const animations = {
  bouncy: { damping: 12, stiffness: 150, mass: 0.8 },
  gentle: { damping: 20, stiffness: 120, mass: 1 },
  snappy: { damping: 15, stiffness: 300, mass: 0.5 },
  dramatic: { damping: 10, stiffness: 80, mass: 1.2 },
  duration: { fast: 150, normal: 300, slow: 500, reveal: 800 },
  stagger: 50,
  press: { scale: 0.96 },
} as const;
