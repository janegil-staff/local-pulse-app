// localpulse/app/src/screens/ForgotPinScreen.js
//
// Two panes in one screen: request a code, then enter it with a new PIN.
// The server always answers the request step with 200, so the second pane
// appears whether or not the email exists — it can't be used to probe for
// registered addresses.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { useLang } from '../context/LangContext.js';
import { api } from '../api/client.js';
import { theme } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';

const C = theme.colors;

export default function ForgotPinScreen({ navigation }) {
  const { t } = useLang();
  const { adoptSession } = useAuth();

  const [stage, setStage] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function requestCode() {
    const addr = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) { setError(t.emailInvalid); return; }
    setLoading(true); setError('');
    try {
      await api.requestPinReset(addr);
      setStage('reset');
    } catch (e) {
      setError(e?.message ?? t.couldNotFinish);
    } finally {
      setLoading(false);
    }
  }

  async function submitReset() {
    if (!/^\d{4}$/.test(code)) { setError(t.resetCodeFourDigits); return; }
    if (!/^\d{4}$/.test(pin)) { setError(t.pinFourDigits); return; }
    if (pin !== confirmPin) { setError(t.pinMismatch); return; }
    setLoading(true); setError('');
    try {
      const { token, user } = await api.resetPin(email.trim().toLowerCase(), code, pin);
      // The server logs us in on success. Hand the session to AuthContext
      // rather than bouncing back to the login screen.
      await adoptSession(token, user);
    } catch (e) {
      setError(e?.message ?? t.couldNotFinish);
      // The code is destroyed after 5 wrong tries; clear the field so a stale
      // value isn't resubmitted.
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.bg}>
      <ScreenHeader title={t.forgotPin} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {stage === 'request' ? (
            <>
              <Text style={s.explain}>{t.forgotPinExplain}</Text>
              {!!error && <Text style={s.error}>{error}</Text>}

              <Field
                placeholder={t.email}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoFocus
              />

              <View style={{ height: 20 }} />
              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={!loading ? requestCode : undefined} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t.sendCode.toUpperCase()}</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.explain}>{t.resetCodeSent}</Text>
              {!!error && <Text style={s.error}>{error}</Text>}

              <Field
                placeholder={t.resetCode}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
              />
              <Field
                placeholder={t.newPin}
                value={pin}
                onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
              />
              <Field
                placeholder={t.confirmPin}
                value={confirmPin}
                onChangeText={(v) => setConfirmPin(v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
              />

              <View style={{ height: 20 }} />
              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={!loading ? submitReset : undefined} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t.resetPin.toUpperCase()}</Text>}
              </TouchableOpacity>

              <View style={{ height: 24 }} />
              <TouchableOpacity onPress={() => { setStage('request'); setCode(''); setError(''); }}>
                <Text style={s.linkMuted}>{t.resendCode}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ placeholder, value, onChangeText, keyboardType, secureTextEntry, maxLength, autoFocus }) {
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
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={C.accent}
      />
      <View style={s.inputLine} />
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 40, alignItems: 'center' },
  explain: { color: C.textDim, fontSize: 14, lineHeight: 20, marginBottom: 24, width: '100%' },
  error: { color: C.danger, fontSize: 14, marginBottom: 16, width: '100%' },
  input: { color: C.text, fontSize: 16, fontWeight: '500', paddingVertical: 8, paddingHorizontal: 0 },
  inputLine: { height: 1.5, backgroundColor: C.border, width: '100%' },
  btn: { width: '100%', height: 54, backgroundColor: C.accent, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  linkMuted: { color: C.textDim, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});