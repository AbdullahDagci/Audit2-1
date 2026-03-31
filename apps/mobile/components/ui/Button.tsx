import React from 'react';
import { Text, ActivityIndicator, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { haptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style }: ButtonProps) {
  const scale = useSharedValue(1);

  const bgColor = {
    primary: Colors.primary,
    secondary: Colors.primaryLight,
    danger: Colors.danger,
    outline: 'transparent',
  }[variant];

  const textColor = variant === 'outline' ? Colors.primary : Colors.white;
  const borderColor = variant === 'outline' ? Colors.primary : 'transparent';

  const paddingV = { sm: 8, md: 14, lg: 18 }[size];
  const fontSize = { sm: 14, md: 16, lg: 18 }[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    haptic.light();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? Colors.textLight : bgColor,
          paddingVertical: paddingV,
          borderColor,
          borderWidth: variant === 'outline' ? 2 : 0,
          shadowColor: variant !== 'outline' ? Colors.black : 'transparent',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: variant !== 'outline' ? 0.15 : 0,
          shadowRadius: 4,
          elevation: variant !== 'outline' ? 3 : 0,
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: 48,
  },
  text: {
    fontWeight: '600',
  },
});
