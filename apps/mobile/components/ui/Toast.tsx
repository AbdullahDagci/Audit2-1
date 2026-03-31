import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ToastMessage, { BaseToastProps } from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';

const toastConfig = {
  success: (props: BaseToastProps) => (
    <View style={[styles.container, styles.success]}>
      <MaterialIcons name="check-circle" size={22} color="#FFFFFF" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.text1}>{props.text1}</Text>
        {props.text2 ? <Text style={styles.text2}>{props.text2}</Text> : null}
      </View>
    </View>
  ),
  error: (props: BaseToastProps) => (
    <View style={[styles.container, styles.error]}>
      <MaterialIcons name="cancel" size={22} color="#FFFFFF" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.text1}>{props.text1}</Text>
        {props.text2 ? <Text style={styles.text2}>{props.text2}</Text> : null}
      </View>
    </View>
  ),
  info: (props: BaseToastProps) => (
    <View style={[styles.container, styles.info]}>
      <MaterialIcons name="info" size={22} color="#FFFFFF" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.text1}>{props.text1}</Text>
        {props.text2 ? <Text style={styles.text2}>{props.text2}</Text> : null}
      </View>
    </View>
  ),
};

export function Toast() {
  return <ToastMessage config={toastConfig} position="top" visibilityTime={3000} swipeable />;
}

export { default as ToastShow } from 'react-native-toast-message';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  success: {
    backgroundColor: '#2E7D32',
  },
  error: {
    backgroundColor: '#F44336',
  },
  info: {
    backgroundColor: '#1565C0',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  text1: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  text2: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
