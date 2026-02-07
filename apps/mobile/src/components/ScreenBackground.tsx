import React from 'react';
import { View, StyleSheet } from 'react-native';
import { gradient } from '../theme';

interface ScreenBackgroundProps {
  variant?: 'screen' | 'auth';
  children: React.ReactNode;
}

/**
 * Pure RN gradient background — no native module needed.
 * Uses stacked Views with opacity to simulate a top-down gradient fade.
 */
export function ScreenBackground({ variant = 'screen', children }: ScreenBackgroundProps) {
  const config = gradient[variant];
  const height = variant === 'screen' ? gradient.screen.height : undefined;

  return (
    <View style={styles.container}>
      {/* Gradient simulation: stacked color bands */}
      <View style={[styles.gradientWrap, height ? { height } : StyleSheet.absoluteFillObject]}>
        <View style={[styles.band, { flex: 1, backgroundColor: config.colors[0] }]} />
        <View style={[styles.band, { flex: 1, backgroundColor: config.colors[1] }]} />
        <View style={[styles.band, { flex: 0.5, backgroundColor: config.colors[2] }]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  gradientWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  band: {
    width: '100%',
  },
});
