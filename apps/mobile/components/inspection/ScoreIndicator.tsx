import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
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

  const [displayValue, setDisplayValue] = useState(0);
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(percentage, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    // Animate the displayed number
    const target = Math.ceil(percentage);
    const start = displayValue;
    const duration = 800;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      setDisplayValue(current);

      if (progress >= 1) {
        clearInterval(interval);
        setDisplayValue(target);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [percentage]);

  const animatedCircleStyle = useAnimatedStyle(() => {
    const progress = animatedProgress.value / 100;
    return {
      transform: [{ scale: 0.95 + progress * 0.05 }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: dimensions,
            height: dimensions,
            borderRadius: dimensions / 2,
            borderColor: color,
            borderWidth: size === 'lg' ? 6 : 4,
          },
          animatedCircleStyle,
        ]}
      >
        <Text style={[styles.score, { fontSize, color }]}>
          {displayValue}
        </Text>
      </Animated.View>
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
