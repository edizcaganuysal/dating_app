import { Platform } from 'react-native';

// ─── FONT FAMILIES ──────────────────────────────────────────────
// Inter for UI, Playfair Display for editorial/romantic moments

export const fontFamilies = {
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
  },
  playfair: {
    regular: 'PlayfairDisplay_400Regular',
    medium: 'PlayfairDisplay_500Medium',
    semiBold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
    italic: 'PlayfairDisplay_400Regular_Italic',
    boldItalic: 'PlayfairDisplay_700Bold_Italic',
  },
} as const;

// System font fallback for when custom fonts aren't loaded yet
const systemFont = Platform.select({
  ios: 'System',
  android: 'Roboto',
}) as string;

// ─── COLOR PALETTE ──────────────────────────────────────────────
// Based on Yuni Visual Guidelines: warm, campfire-inspired

export const colors = {
  // Brand — from Yuni Visual Guidelines
  primary: '#C40018',       // Yuni Red — hero color
  primaryLight: '#D4334A',  // Yuni Red lightened
  primaryDark: '#9B0013',   // Yuni Red darkened
  secondary: '#E55A2B',     // Ember
  accent: '#F2B34C',        // Firelight

  // Named brand tokens
  yuniRed: '#C40018',
  ember: '#E55A2B',
  firelight: '#F2B34C',
  coal: '#241C1A',
  cream: '#F7F0E7',

  // Neutrals — warm-toned from Coal
  dark: '#241C1A',          // Coal
  darkSecondary: '#3D302D', // Coal lightened
  gray: '#7D706B',          // Warm gray
  grayLight: '#B8ADA8',     // Warm light gray
  border: '#E5DDD7',        // Warm border
  borderLight: '#EDE6DF',   // Warm border light

  // Surfaces — Cream-based
  surface: '#F7F0E7',       // Cream
  surfaceElevated: '#FFFFFF',
  surfacePressed: '#F0E4D9',
  surfaceSelected: '#FAEDE2',

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
  ownMessage: '#C40018',    // Yuni Red
  otherMessage: '#F7F0E7',  // Cream
  yuniAiBubble: '#F0E4F5',  // Warm purple tint
  yuniAiBorder: '#D4B8DA',  // Warm purple border
  yuniAiPrimary: '#6B2D8B', // Warm purple

  // Gender
  male: '#2196F3',
  female: '#C40018',        // Yuni Red

  // Overlay
  overlay: 'rgba(36, 28, 26, 0.4)',       // Coal-based overlay
  overlayLight: 'rgba(36, 28, 26, 0.15)', // Coal-based light overlay
} as const;

// ─── TYPOGRAPHY ──────────────────────────────────────────────────
// Inter for all UI; Playfair for editorial moments

export const typography = {
  // ── Display ──
  displayLarge: {
    fontFamily: fontFamilies.inter.extraBold,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 28,
    lineHeight: 34,
  },

  // ── Headline ──
  headlineLarge: {
    fontFamily: fontFamilies.inter.bold,
    fontSize: 24,
    lineHeight: 30,
  },
  headlineMedium: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 20,
    lineHeight: 26,
  },
  headlineSmall: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },

  // ── Body ──
  bodyLarge: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 14,
    lineHeight: 19,
  },

  // ── Label ──
  labelLarge: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  labelMedium: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  labelSmall: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },

  // ── Caption ──
  caption: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  captionSmall: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: 10,
    lineHeight: 14,
  },

  // ── Editorial (Playfair Display — romantic/reveal moments) ──
  editorialDisplay: {
    fontFamily: fontFamilies.playfair.bold,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  editorialHeadline: {
    fontFamily: fontFamilies.playfair.semiBold,
    fontSize: 24,
    lineHeight: 32,
  },
  editorialBody: {
    fontFamily: fontFamilies.playfair.regular,
    fontSize: 18,
    lineHeight: 26,
  },
  editorialBodyItalic: {
    fontFamily: fontFamilies.playfair.italic,
    fontSize: 18,
    lineHeight: 26,
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
// Warm-toned shadows using Coal

export const shadows = {
  none: {},
  sm: {
    shadowColor: '#241C1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#241C1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#241C1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: '#C40018',
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
