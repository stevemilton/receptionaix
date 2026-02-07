import { Platform, TextStyle } from 'react-native';

// Base color: #344532 (deep forest green)
// Derived palette using tint/shade methodology

export const colors = {
  // Primary palette
  primary: '#344532',
  primaryLight: '#4A6347',
  primaryMuted: '#6B8568',
  primaryFaint: '#E8EDE7',
  primaryTint: '#F4F6F4',

  // Backgrounds
  background: '#F8F8F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F0',
  grouped: '#F2F2F7',

  // Text
  label: '#1C1C1E',
  secondaryLabel: '#3C3C43',
  tertiaryLabel: '#7C7C80',
  quaternaryLabel: '#AEAEB2',
  placeholder: '#C7C7CC',

  // Separators
  separator: '#E5E5EA',
  separatorOpaque: '#C6C6C8',

  // Semantic
  success: '#34C759',
  successFaint: '#E8F8ED',
  successDark: '#1B7A34',
  warning: '#FF9500',
  warningFaint: '#FFF3E0',
  warningDark: '#CC7700',
  error: '#FF3B30',
  errorFaint: '#FFEBEE',
  errorDark: '#CC2F26',
  info: '#5AC8FA',
  infoFaint: '#E8F6FE',

  // System
  white: '#FFFFFF',
  black: '#000000',
  clear: 'transparent',
} as const;

// SF Pro system font weights — React Native maps these to SF Pro automatically on iOS
// On Android, this falls back to Roboto which has similar weight support
export const typography = {
  // Large title — used sparingly for main headings
  largeTitle: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: 0.37,
    lineHeight: 41,
    color: colors.label,
  } satisfies TextStyle,

  // Title 1
  title1: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 0.36,
    lineHeight: 34,
    color: colors.label,
  } satisfies TextStyle,

  // Title 2
  title2: {
    fontSize: 22,
    fontWeight: '400',
    letterSpacing: 0.35,
    lineHeight: 28,
    color: colors.label,
  } satisfies TextStyle,

  // Title 3
  title3: {
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 0.38,
    lineHeight: 25,
    color: colors.label,
  } satisfies TextStyle,

  // Headline
  headline: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
    lineHeight: 22,
    color: colors.label,
  } satisfies TextStyle,

  // Body
  body: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
    lineHeight: 22,
    color: colors.label,
  } satisfies TextStyle,

  // Callout
  callout: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.32,
    lineHeight: 21,
    color: colors.label,
  } satisfies TextStyle,

  // Subheadline
  subheadline: {
    fontSize: 15,
    fontWeight: '300',
    letterSpacing: -0.24,
    lineHeight: 20,
    color: colors.secondaryLabel,
  } satisfies TextStyle,

  // Footnote
  footnote: {
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: -0.08,
    lineHeight: 18,
    color: colors.secondaryLabel,
  } satisfies TextStyle,

  // Caption 1
  caption1: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: colors.tertiaryLabel,
  } satisfies TextStyle,

  // Caption 2
  caption2: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.07,
    lineHeight: 13,
    color: colors.tertiaryLabel,
  } satisfies TextStyle,

  // Metric value — ultralight for dashboard stat numbers
  metricValue: {
    fontSize: 36,
    fontWeight: '200',
    lineHeight: 43,
    color: colors.label,
  } satisfies TextStyle,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const gradient = {
  // Eased: holds #344532 longer at top, smooth fade to white
  screen: {
    colors: ['#344532', '#344532', '#5A7A56', '#A3C4A0', '#D4E6D2', '#F0F5EF', '#FFFFFF'],
    height: 400,
  },
  // Auth: full-screen gradient, same palette
  auth: {
    colors: ['#344532', '#344532', '#5A7A56', '#A3C4A0', '#D4E6D2', '#F0F5EF', '#FFFFFF'],
  },
} as const;

export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 1,
    },
    android: {
      elevation: 1,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
  }),
} as const;
