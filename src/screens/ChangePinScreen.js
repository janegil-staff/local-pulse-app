// localpulse/app/src/screens/ChangePinScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { useLang } from '../context/LangContext.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';

export default function ChangePinScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const { t } = useLang();
  const { changePin } = useAuth();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const digits = (v) => v.replace(/\D/g, '').slice(0, 4);

  async function submit() {
    if (!/^\d{4}$/.test(currentPin)) { setError(t.pinFourDigits); return; }
    if (!/^\d{4}$/.test(newPin)) { setError(t.pinFourDigits); return; }
    if (newPin !== confirmPin) { setError(t.pinMismatch); return; }
    if (currentPin === newPin) { setError(t.pinMustDiffer); return; }

    setLoading(true); setError('');
    try {
      await changePin(currentPin, newPin);
      Alert.alert('', t.pinChanged, [{ text: t.ok, onPress: () => navigation.goBack() }]);
    } catch (e) {
      setError(e?.message ?? t.couldNotSave);
      // A wrong current PIN is the common failure; clear it rather than the
      // new one the user just composed twice.
      setCurrentPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title={t.changePin} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!!error && <Text style={styles.error}>{error}</Text>}

          <Field
            label={t.currentPin}
            value={currentPin}
            onChangeText={(v) => setCurrentPin(digits(v))}
            autoFocus
          />
          <Field label={t.newPin} value={newPin} onChangeText={(v) => setNewPin(digits(v))} />
          <Field label={t.confirmPin} value={confirmPin} onChangeText={(v) => setConfirmPin(digits(v))} />

          <View style={{ height: 20 }} />
          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={!loading ? submit : undefined}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t.save.toUpperCase()}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, value, onChangeText, autoFocus }) {
  const styles = useStyles(stylesFactory);
  return (
    <View style={{ width: '100%', marginBottom: 24 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        autoFocus={autoFocus}
        selectionColor={theme.colors.accent}
      />
      <View style={styles.inputLine} />
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, paddingHorizontal: spacing(8), paddingTop: spacing(8), paddingBottom: spacing(10) },
    error: { color: colors.danger, fontSize: 14, marginBottom: spacing(4) },
    label: { color: colors.textDim, fontSize: 14, fontWeight: '600', marginBottom: spacing(1.5) },
    input: { color: colors.text, fontSize: 20, letterSpacing: 8, paddingVertical: spacing(2) },
    inputLine: { height: 1.5, backgroundColor: colors.border, width: '100%' },
    btn: { width: '100%', height: 54, backgroundColor: colors.accent, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  })
);