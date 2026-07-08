// localpulse/app/src/screens/ChangeEmailScreen.js
// Change email flow: shows current email, collects new email + confirm + PIN,
// then saves. Uses the shared blue header (stack style) and the live theme.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { api } from '../api/client.js';
import { useProfileStore } from '../store/profileStore.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';

export default function ChangeEmailScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const profile = useProfileStore((s) => s.profile);
  const loadProfile = useProfileStore((s) => s.loadProfile);

  const currentEmail = profile?.email || '';
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const canSave =
    emailRx.test(newEmail.trim()) &&
    newEmail.trim().toLowerCase() === confirmEmail.trim().toLowerCase() &&
    pin.length === 4;

  async function save() {
    setError('');
    if (!emailRx.test(newEmail.trim())) { setError('That email doesn’t look right.'); return; }
    if (newEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) { setError('Emails do not match.'); return; }
    if (pin.length !== 4) { setError('Enter your 4-digit PIN.'); return; }

    setSaving(true);
    try {
      // Email is a login credential, so send the PIN for verification.
      await api.updateMyProfile({ email: newEmail.trim().toLowerCase(), pin });
      await loadProfile?.();
      Alert.alert('Email updated', 'Your email has been changed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setError(e?.message ?? 'Could not change email. Check your PIN and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Change email" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Current email</Text>
          <View style={styles.readonlyWrap}>
            <Text style={styles.readonly}>{currentEmail || '—'}</Text>
            <View style={styles.line} />
          </View>

          <Text style={styles.label}>New email*</Text>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            selectionColor={theme.colors.accent}
          />
          <View style={styles.line} />

          <Text style={styles.label}>Confirm email*</Text>
          <TextInput
            style={styles.input}
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            selectionColor={theme.colors.accent}
          />
          <View style={styles.line} />

          <Text style={styles.label}>PIN code*</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            selectionColor={theme.colors.accent}
          />
          <View style={styles.line} />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={canSave && !saving ? save : undefined}
            activeOpacity={canSave ? 0.85 : 1}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>SAVE</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing(6), paddingTop: spacing(8) },
    label: { color: colors.textDim, fontSize: 15, fontWeight: '600', marginBottom: spacing(2), marginTop: spacing(5) },
    readonlyWrap: {},
    readonly: { color: colors.text, fontSize: 17, fontWeight: '600', paddingBottom: spacing(2) },
    input: { color: colors.text, fontSize: 17, paddingVertical: spacing(2) },
    line: { height: 1.5, backgroundColor: colors.border, width: '100%' },
    error: { color: colors.danger, fontSize: 14, marginTop: spacing(4) },
    saveBtn: {
      marginTop: spacing(10), height: 56, borderRadius: radius.md,
      backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    },
    saveBtnDisabled: { backgroundColor: colors.accentDim },
    saveText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  })
);