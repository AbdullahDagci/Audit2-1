import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/constants/colors';

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

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? Colors.textLight : bgColor,
          paddingVertical: paddingV,
          borderColor,
          borderWidth: variant === 'outline' ? 2 : 0,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
      )}
    </TouchableOpacity>
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
