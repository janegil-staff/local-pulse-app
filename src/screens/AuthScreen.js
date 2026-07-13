// localpulse/app/src/screens/AuthScreen.js
//
// NOTE: colors are read reactively via useStyles(factory) — never capture
// theme.colors at module scope. A static `const C = theme.colors` freezes the
// palette at import time, so the screen would stay dark even in light/system
// mode (the palette swap in applyMode() can't reach a baked StyleSheet).
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, TextInput, Image, Linking, ActivityIndicator, StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { useLang } from '../context/LangContext.js';
import { useThemeMode } from '../theme/ThemeContext.js';
import { theme, useStyles } from '../theme/theme.js';

const APP_VERSION = '1.0.0';
const COMPANY = 'Qup DA';
const EMAIL = 'post@qupda.com';

export default function AuthScreen({ navigation }) {
  const s = useStyles(stylesFactory);
  const { mode } = useThemeMode();
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
      {/* Dark text on light bg, light text on dark bg — otherwise the clock /
          battery vanish against the surface in one of the two modes. */}
      <StatusBar
        barStyle={mode === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <Image source={require('../../assets/images/logo.png')} style={s.logo} resizeMode="cover" />
          </View>

          
          <Text style={s.tagline}>{t.tagline}</Text>

          <View style={{ height: 36 }} />

          {!!error && <Text style={s.error}>{error}</Text>}

          <UnderlineField s={s} placeholder={t.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
          <UnderlineField s={s} placeholder={t.pinCode} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} />

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

// `s` is passed in so the field reads the same reactive stylesheet as the
// screen — it must not reach for a module-level palette.
function UnderlineField({ s, placeholder, value, onChangeText, keyboardType, secureTextEntry, maxLength }) {
  return (
    <View style={{ width: '100%', marginBottom: 24 }}>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDim}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        autoCapitalize="none"
        selectionColor={theme.colors.accent}
      />
      <View style={s.inputLine} />
    </View>
  );
}

const stylesFactory = (({ colors }) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 72, paddingBottom: 40, alignItems: 'center' },
    logoWrap: { width: 120, height: 120, borderRadius: 22, overflow: 'hidden', marginBottom: 16 },
    logo: { width: 120, height: 120 },
    title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
    tagline: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 4, letterSpacing: 1 },
    error: { color: colors.danger, fontSize: 14, marginBottom: 16, width: '100%' },
    input: { color: colors.text, fontSize: 16, fontWeight: '500', paddingVertical: 8, paddingHorizontal: 0 },
    inputLine: { height: 1.5, backgroundColor: colors.border, width: '100%' },
    btn: { width: '100%', height: 54, backgroundColor: colors.accent, borderRadius: 10, justifyContent: 'center', alignItems: 'center', shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
    linkMuted: { color: colors.textDim, fontSize: 14, fontWeight: '500', textAlign: 'center' },
    linkPrimary: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
    footer: { marginTop: 48, alignItems: 'center', gap: 4 },
    footerText: { color: colors.textDim, fontSize: 11, fontWeight: '500', textAlign: 'center' },
    footerLink: { color: colors.accent, fontSize: 11, fontWeight: '500', textAlign: 'center' },
  })
);