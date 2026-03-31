import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  animationIndex?: number;
}

export function Card({ children, onPress, style, animationIndex }: CardProps) {
  const entering = animationIndex !== undefined
    ? FadeInDown.delay(animationIndex * 50).springify()
    : FadeInDown.springify();

  if (onPress) {
    return (
      <Animated.View entering={entering}>
        <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={entering} style={[styles.card, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
});
