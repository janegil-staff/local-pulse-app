import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, TextInput, Image, Linking, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { useLang } from '../context/LangContext.js';
import { theme } from '../theme/theme.js';

const APP_VERSION = '1.0.0';
const COMPANY = 'Qup DA';
const EMAIL = 'post@qupda.com';
const C = theme.colors;

export default function AuthScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !pin) { setError(t.enterEmailPin); return; }
    if (!/^\d{4}$/.test(pin)) { setError(t.pinFourDigits); return; }
    setLoading(true); setError('');
    try {
      await login(email.trim().toLowerCase(), pin);
    } catch (e) {
      setError(e?.message ?? t.invalidEmailPin);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <Image source={require('../../assets/images/logo.png')} style={s.logo} resizeMode="cover" />
          </View>

          <Text style={s.title}>{t.appName}</Text>
          <Text style={s.tagline}>{t.tagline}</Text>

          <View style={{ height: 36 }} />

          {!!error && <Text style={s.error}>{error}</Text>}

          <UnderlineField placeholder={t.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
          <UnderlineField placeholder={t.pinCode} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} />

          <View style={{ height: 28 }} />

          <TouchableOpacity style={s.btn} onPress={submit} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t.logIn.toUpperCase()}</Text>}
          </TouchableOpacity>

          <View style={{ height: 32 }} />

          <Text style={s.linkMuted}>{t.noAccount}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Onboarding')} style={{ marginTop: 6 }}>
            <Text style={s.linkPrimary}>{t.signUp.toUpperCase()}</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPin')}>
            <Text style={s.linkPrimary}>{t.forgotPin.toUpperCase()}</Text>
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>{COMPANY}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${EMAIL}`)}>
              <Text style={s.footerLink}>{EMAIL}</Text>
            </TouchableOpacity>
            <Text style={s.footerText}>v{APP_VERSION}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function UnderlineField({ placeholder, value, onChangeText, keyboardType, secureTextEntry, maxLength }) {
  return (
    <View style={{ width: '100%', marginBottom: 24 }}>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor={C.textDim}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        autoCapitalize="none"
        selectionColor={C.accent}
      />
      <View style={s.inputLine} />
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 72, paddingBottom: 40, alignItems: 'center' },
  logoWrap: { width: 120, height: 120, borderRadius: 22, overflow: 'hidden', marginBottom: 16 },
  logo: { width: 120, height: 120 },
  title: { color: C.text, fontSize: 22, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
  tagline: { color: C.textDim, fontSize: 12, textAlign: 'center', marginTop: 4, letterSpacing: 1 },
  error: { color: C.danger, fontSize: 14, marginBottom: 16, width: '100%' },
  input: { color: C.text, fontSize: 16, fontWeight: '500', paddingVertical: 8, paddingHorizontal: 0 },
  inputLine: { height: 1.5, backgroundColor: C.border, width: '100%' },
  btn: { width: '100%', height: 54, backgroundColor: C.accent, borderRadius: 10, justifyContent: 'center', alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  linkMuted: { color: C.textDim, fontSize: 14, fontWeight: '500', textAlign: 'center' },
  linkPrimary: { color: C.accent, fontSize: 14, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  footer: { marginTop: 48, alignItems: 'center', gap: 4 },
  footerText: { color: C.textDim, fontSize: 11, fontWeight: '500', textAlign: 'center' },
  footerLink: { color: C.accent, fontSize: 11, fontWeight: '500', textAlign: 'center' },
});