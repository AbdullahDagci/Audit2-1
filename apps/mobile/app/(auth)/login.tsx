import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth-store';

const QUICK_USERS = [
  { label: 'Admin', email: 'admin@ertansa.com', password: '123456', color: '#1B5E20' },
  { label: 'Denetçi', email: 'denetci@ertansa.com', password: '123456', color: '#E65100' },
  { label: 'Müdür', email: 'mudur@ertansa.com', password: '123456', color: '#1565C0' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    await signIn(email.trim(), password);
  };

  const quickLogin = async (user: typeof QUICK_USERS[0]) => {
    setEmail(user.email);
    setPassword(user.password);
    await signIn(user.email, user.password);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <Text style={styles.title}>ERTANSA</Text>
          <Text style={styles.subtitle}>Denetim Sistemi</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            placeholder="ornek@ertansa.com"
            placeholderTextColor={Colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            placeholder="Şifrenizi girin"
            placeholderTextColor={Colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button
            title="Giriş Yap"
            onPress={handleLogin}
            loading={isLoading}
            disabled={!email.trim() || !password.trim()}
            size="lg"
            style={{ marginTop: 8 }}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Hızlı Giriş</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.quickButtons}>
            {QUICK_USERS.map((u) => (
              <TouchableOpacity
                key={u.email}
                style={[styles.quickBtn, { backgroundColor: u.color }]}
                onPress={() => quickLogin(u)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.quickBtnTitle}>{u.label}</Text>
                <Text style={styles.quickBtnEmail}>{u.email}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoText: { fontSize: 36, fontWeight: '700', color: Colors.white },
  title: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 4 },
  form: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.text,
  },
  errorBox: {
    backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 8,
  },
  errorText: { color: Colors.danger, fontSize: 14 },
  divider: {
    flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: Colors.textSecondary },
  quickButtons: { gap: 10 },
  quickBtn: {
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
  },
  quickBtnTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  quickBtnEmail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});
