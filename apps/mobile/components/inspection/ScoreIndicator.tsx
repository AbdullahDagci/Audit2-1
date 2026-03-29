import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getScoreColor, getScoreLabel, formatScore } from '@/lib/scoring';

interface ScoreIndicatorProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreIndicator({ percentage, size = 'md', showLabel = true }: ScoreIndicatorProps) {
  const color = getScoreColor(percentage);
  const dimensions = { sm: 60, md: 90, lg: 130 }[size];
  const fontSize = { sm: 16, md: 24, lg: 36 }[size];
  const labelSize = { sm: 10, md: 12, lg: 16 }[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          {
            width: dimensions,
            height: dimensions,
            borderRadius: dimensions / 2,
            borderColor: color,
            borderWidth: size === 'lg' ? 6 : 4,
          },
        ]}
      >
        <Text style={[styles.score, { fontSize, color }]}>
          {formatScore(percentage)}
        </Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, { fontSize: labelSize, color }]}>
          {getScoreLabel(percentage)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  score: {
    fontWeight: '700',
  },
  label: {
    marginTop: 4,
    fontWeight: '600',
  },
});
