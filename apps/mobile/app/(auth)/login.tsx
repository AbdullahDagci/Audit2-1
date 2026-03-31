import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, ScrollView, Image, StatusBar, Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/auth-store';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn, isLoading, error } = useAuthStore();
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    await signIn(email.trim(), password);
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" />

      {/* Ust yesil gradient alan */}
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#43A047']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.header}
      >
        <View style={S.headerDecor} />
        <View style={S.headerDecor2} />

        <Animated.View entering={FadeInDown.delay(100).springify()} style={S.logoWrap}>
          <View style={S.logoShadow}>
            <Image
              source={require('@/assets/images/ertansa-logo.png')}
              style={S.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={S.headerTextWrap}>
          <Text style={S.headerTitle}>ERTANSA</Text>
          <Text style={S.headerSubtitle}>Denetim Yönetim Sistemi</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={S.headerBadge}>
          <MaterialIcons name="verified-user" size={14} color="#A5D6A7" />
          <Text style={S.headerBadgeText}>Kalite & Gıda Güvenliği</Text>
        </Animated.View>
      </LinearGradient>

      {/* Form alani */}
      <KeyboardAvoidingView style={S.formArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={S.formScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(300).springify()} style={S.card}>
            {error && (
              <View style={S.errorBox}>
                <MaterialIcons name="error-outline" size={18} color="#C62828" />
                <Text style={S.errorText}>{error}</Text>
              </View>
            )}

            {/* E-posta */}
            <View style={[S.inputWrap, focusedField === 'email' && S.inputWrapFocused]}>
              <MaterialIcons name="mail-outline" size={20} color={focusedField === 'email' ? '#2E7D32' : '#999'} />
              <TextInput
                style={S.input}
                placeholder={'E-posta adresiniz'}
                placeholderTextColor="#BDBDBD"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* Sifre */}
            <View style={[S.inputWrap, focusedField === 'password' && S.inputWrapFocused]}>
              <MaterialIcons name="lock-outline" size={20} color={focusedField === 'password' ? '#2E7D32' : '#999'} />
              <TextInput
                ref={passwordRef}
                style={S.input}
                placeholder="Şifreniz"
                placeholderTextColor="#BDBDBD"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Giris butonu */}
            <TouchableOpacity
              style={[S.loginBtn, (!email.trim() || !password.trim()) && S.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoading || !email.trim() || !password.trim()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={(!email.trim() || !password.trim()) ? ['#BDBDBD', '#9E9E9E'] : ['#2E7D32', '#1B5E20']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.loginBtnGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="login" size={20} color="#FFF" />
                    <Text style={S.loginBtnText}>Giriş Yap</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInUp.delay(550).springify()} style={S.footer}>
            <MaterialIcons name="shield" size={14} color="#BDBDBD" />
            <Text style={S.footerText}>Güvenli bağlantı ile korunmaktadır</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerDecor: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerDecor2: {
    position: 'absolute', bottom: -20, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logoWrap: { alignItems: 'center', marginBottom: 12 },
  logoShadow: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12,
    elevation: 8,
  },
  logo: { width: 72, height: 72 },
  headerTextWrap: { alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: 2 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '500' },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    marginTop: 4,
  },
  headerBadgeText: { fontSize: 11, color: '#C8E6C9', fontWeight: '600' },

  // Form
  formArea: { flex: 1 },
  formScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12,
    elevation: 3,
    gap: 14,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', padding: 12, borderRadius: 12,
    borderLeftWidth: 3, borderLeftColor: '#C62828',
  },
  errorText: { color: '#C62828', fontSize: 13, flex: 1, fontWeight: '500' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8F9FA', borderWidth: 1.5, borderColor: '#E8E8E8',
    borderRadius: 14, paddingHorizontal: 14, minHeight: 52,
  },
  inputWrapFocused: { borderColor: '#2E7D32', backgroundColor: '#F1F8E9' },
  input: { flex: 1, fontSize: 15, color: '#212121', paddingVertical: 14 },

  loginBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 32,
  },
  footerText: { fontSize: 11, color: '#BDBDBD' },
});
