import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { gradient } from '../theme';

interface ScreenBackgroundProps {
  variant?: 'screen' | 'auth';
  children: React.ReactNode;
}

// Interpolate between two hex colors at ratio t (0–1)
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 0xff) * (1 - t) + ((pb >> 16) & 0xff) * t);
  const g = Math.round(((pa >> 8) & 0xff) * (1 - t) + ((pb >> 8) & 0xff) * t);
  const bl = Math.round((pa & 0xff) * (1 - t) + (pb & 0xff) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

// Color stop positions (0–1) matching the eased distribution
const STOPS = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
const BAND_COUNT = 64;

function buildBands(colors: readonly string[]): string[] {
  const bands: string[] = [];
  for (let i = 0; i < BAND_COUNT; i++) {
    const t = i / (BAND_COUNT - 1); // 0 to 1
    // Find which two stops we're between
    let segIdx = 0;
    for (let s = 0; s < STOPS.length - 1; s++) {
      if (t >= STOPS[s]) segIdx = s;
    }
    const segStart = STOPS[segIdx];
    const segEnd = STOPS[segIdx + 1];
    const segT = segEnd > segStart ? (t - segStart) / (segEnd - segStart) : 0;
    bands.push(lerpColor(colors[segIdx], colors[segIdx + 1], segT));
  }
  return bands;
}

export function ScreenBackground({ variant = 'screen', children }: ScreenBackgroundProps) {
  const config = gradient[variant];
  const { height: windowHeight } = useWindowDimensions();
  const height = variant === 'screen' ? gradient.screen.height : windowHeight;

  const bands = useMemo(() => buildBands(config.colors), [config.colors]);

  return (
    <View style={styles.container}>
      <View style={[styles.gradientWrap, { height }]}>
        {bands.map((color, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
});
