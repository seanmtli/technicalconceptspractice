import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200EE',
    secondary: '#03DAC6',
    error: '#B00020',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
  },
};

// Score colors for feedback display
export const SCORE_COLORS = {
  1: '#D32F2F', // Red - needs work
  2: '#F44336', // Light red - partial
  3: '#FF9800', // Orange - adequate
  4: '#8BC34A', // Light green - good
  5: '#4CAF50', // Green - excellent
} as const;

export const getScoreColor = (score: number): string => {
  if (score <= 1) return SCORE_COLORS[1];
  if (score <= 2) return SCORE_COLORS[2];
  if (score <= 3) return SCORE_COLORS[3];
  if (score <= 4) return SCORE_COLORS[4];
  return SCORE_COLORS[5];
};

export const getScoreLabel = (score: number): string => {
  switch (score) {
    case 1:
      return 'Needs Work';
    case 2:
      return 'Partial';
    case 3:
      return 'Adequate';
    case 4:
      return 'Good';
    case 5:
      return 'Excellent';
    default:
      return 'Unknown';
  }
};

// Spacing constants
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// Timer warning threshold (seconds)
export const TIMER_WARNING_THRESHOLD = 60; // Show warning at 1 minute remaining
