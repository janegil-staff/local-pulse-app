// localpulse/app/src/screens/AuthScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

function Checkbox({ checked, onToggle, children }) {
  const styles = useStyles(stylesFactory);
  return (
    <Pressable style={styles.checkRow} onPress={onToggle} hitSlop={6}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text style={styles.boxCheck}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel}>{children}</Text>
    </Pressable>
  );
}

// 3-step signup indicator (step 1 = this Account screen).
function StepIndicator({ current }) {
  const styles = useStyles(stylesFactory);
  const steps = [
    { n: 1, label: 'Account' },
    { n: 2, label: 'About you' },
    { n: 3, label: 'Photos' },
  ];
  return (
    <View style={styles.stepper}>
      {steps.map(({ n, label }) => {
        const done = current > n;
        const active = current === n;
        return (
          <View key={n} style={styles.stepCol}>
            <View style={[styles.stepNum, (active || done) && styles.stepNumActive, done && styles.stepNumDone]}>
              <Text style={[styles.stepNumText, (active || done) && styles.stepNumTextActive]}>{done ? '✓' : n}</Text>
            </View>
            <View style={[styles.stepBar, current >= n && styles.stepBarActive]} />
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AuthScreen({ navigation, route }) {
  const styles = useStyles(stylesFactory);
  const insets = useSafeAreaInsets();
  // When opened as the "Register" route (e.g. returning from PIN setup), start
  // in register mode so the form and returned PIN are preserved.
  const [mode, setMode] = useState(route?.name === 'Register' ? 'register' : 'login');

  // login
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [loginSecret, setLoginSecret] = useState('');

  // register — email + PIN only
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register, loading } = useAuth();

  const isLogin = mode === 'login';
  const pinSet = pin.length === 4;

  // Receive the confirmed PIN when PinConfirm bounces back to Register.
  useEffect(() => {
    const p = route?.params ?? {};
    if (p.pin) {
      setPin(p.pin);
      setMode('register'); // returning from PIN setup — stay on register
    }
    if (p.email) setEmail(p.email);
    if (p.agreeTerms !== undefined) setAgreeTerms(Boolean(p.agreeTerms));
    if (p.agreePrivacy !== undefined) setAgreePrivacy(Boolean(p.agreePrivacy));
  }, [route?.params]);

  const canRegister = agreeTerms && agreePrivacy && pinSet && email.trim();

  function goToPinSetup() {
    setLocalError('');
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email.trim())) return setLocalError('Enter a valid email first.');
    navigation.navigate('PinSetup', {
      returnTo: route?.name || 'Auth',
      returnParams: { email, agreeTerms, agreePrivacy },
    });
  }

  function submitLogin() {
    setLocalError('');
    setSubmitting(true);
    login(emailOrUsername, loginSecret)
      .catch((e) => setLocalError(e.message))
      .finally(() => setSubmitting(false));
  }

  async function submitRegister() {
    setLocalError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setLocalError('Enter a valid email.');
    if (!pinSet) return setLocalError('Please create a PIN.');
    // Don't create the account yet — carry email+PIN into onboarding, where the
    // username is chosen and the account is created (step 2).
    navigation.navigate('Onboarding', { email: email.trim().toLowerCase(), pin, startStep: 2 });
  }

  function switchMode() {
    setLocalError('');
    setMode(isLogin ? 'register' : 'login');
  }

  const busy = loading || submitting;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + theme.spacing(6), paddingBottom: insets.bottom + theme.spacing(10) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logoDot}><Text style={styles.logoGlyph}>♥</Text></View>
          <Text style={styles.brand}>Nearby</Text>
          <Text style={styles.tagline}>Meet people around you.</Text>
        </View>

        <View style={styles.card}>
          {isLogin ? (
            <>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.fieldLabel}>Email or username</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textDim}
                autoCapitalize="none"
                value={emailOrUsername}
                onChangeText={setEmailOrUsername}
              />
              <Text style={styles.fieldLabel}>PIN or password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••"
                placeholderTextColor={theme.colors.textDim}
                secureTextEntry
                value={loginSecret}
                onChangeText={setLoginSecret}
              />
              {localError ? <Text style={styles.error}>{localError}</Text> : null}
              <Pressable style={styles.btn} onPress={submitLogin} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>LOG IN</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <StepIndicator current={1} />
              <Text style={styles.cardTitle}>Create your account</Text>

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textDim}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              {/* Create PIN — prettier card with icon, status, and 4-dot preview */}
              <Pressable
                style={[styles.pinCard, pinSet && styles.pinCardDone]}
                onPress={goToPinSetup}
              >
                <View style={[styles.pinIcon, pinSet && styles.pinIconDone]}>
                  <Text style={styles.pinIconGlyph}>{pinSet ? '✓' : '🔒'}</Text>
                </View>
                <View style={styles.pinCardBody}>
                  <Text style={styles.pinCardTitle}>{pinSet ? 'PIN created' : 'Create a PIN'}</Text>
                  <Text style={styles.pinCardSub}>
                    {pinSet ? 'Tap to change your 4-digit PIN' : 'A 4-digit code to secure your account'}
                  </Text>
                </View>
                {pinSet ? (
                  <View style={styles.pinDots}>
                    {[0, 1, 2, 3].map((i) => <View key={i} style={styles.pinDot} />)}
                  </View>
                ) : (
                  <Text style={styles.pinChevron}>›</Text>
                )}
              </Pressable>

              <View style={styles.consentBox}>
                <Checkbox checked={agreeTerms} onToggle={() => setAgreeTerms((v) => !v)}>
                  I agree to the{' '}
                  <Text style={styles.link} onPress={() => navigation.navigate('Terms')}>Terms of Service</Text>
                </Checkbox>
                <Checkbox checked={agreePrivacy} onToggle={() => setAgreePrivacy((v) => !v)}>
                  I agree to the{' '}
                  <Text style={styles.link} onPress={() => navigation.navigate('Privacy')}>Privacy Policy</Text>
                </Checkbox>
                <Text style={styles.ageNote}>You must be 18 or older to use this app.</Text>
              </View>

              {localError ? <Text style={styles.error}>{localError}</Text> : null}

              <Pressable
                style={[styles.btn, !canRegister && styles.btnDisabled]}
                onPress={canRegister ? submitRegister : undefined}
                disabled={!canRegister || busy}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>NEXT</Text>}
              </Pressable>
            </>
          )}

          <Pressable onPress={switchMode} style={styles.switch}>
            <Text style={styles.switchText}>
              {isLogin ? 'New here? ' : 'Already have an account? '}
              <Text style={styles.switchLink}>{isLogin ? 'Create an account' : 'Log in'}</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing(6) },
    hero: { alignItems: 'center', marginBottom: spacing(7) },
    logoDot: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing(3),
      shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    logoGlyph: { color: '#fff', fontSize: 30 },
    brand: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: 0.5 },
    tagline: { color: colors.textDim, fontSize: 15, marginTop: spacing(1.5) },
    card: {
      backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing(6),
      borderWidth: 1, borderColor: colors.border,
      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    cardTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing(5) },
    stepper: { flexDirection: 'row', gap: spacing(2), marginBottom: spacing(5) },
    stepCol: { flex: 1, alignItems: 'center' },
    stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(2) },
    stepNumActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    stepNumDone: { backgroundColor: colors.success, borderColor: colors.success },
    stepNumText: { color: colors.textDim, fontSize: 13, fontWeight: '800' },
    stepNumTextActive: { color: '#fff' },
    stepBar: { width: '100%', height: 4, borderRadius: 2, backgroundColor: colors.border },
    stepBarActive: { backgroundColor: colors.accent },
    stepLabel: { color: colors.textDim, fontSize: 11, fontWeight: '600', marginTop: spacing(2) },
    stepLabelActive: { color: colors.text },
    fieldLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginBottom: spacing(2) },
    input: {
      backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.md,
      paddingHorizontal: spacing(4), paddingVertical: spacing(3.5), fontSize: 16,
      borderWidth: 1, borderColor: colors.border, marginBottom: spacing(4),
    },

    // Prettier Create-PIN card
    pinCard: {
      flexDirection: 'row', alignItems: 'center', gap: spacing(3),
      backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
      borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: spacing(4), paddingVertical: spacing(4), marginBottom: spacing(4),
    },
    pinCardDone: { borderColor: colors.success, backgroundColor: colors.surfaceAlt },
    pinIcon: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentDim,
      alignItems: 'center', justifyContent: 'center',
    },
    pinIconDone: { backgroundColor: colors.success },
    pinIconGlyph: { color: '#fff', fontSize: 20 },
    pinCardBody: { flex: 1 },
    pinCardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    pinCardSub: { color: colors.textDim, fontSize: 12, marginTop: spacing(0.5) },
    pinDots: { flexDirection: 'row', gap: 6 },
    pinDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success },
    pinChevron: { color: colors.textDim, fontSize: 26, fontWeight: '300' },

    consentBox: {
      backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing(4), marginTop: spacing(1),
    },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3), marginBottom: spacing(3) },
    box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    boxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
    boxCheck: { color: '#fff', fontSize: 15, fontWeight: '800' },
    checkLabel: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
    link: { color: colors.accent, fontWeight: '700', textDecorationLine: 'underline' },
    ageNote: { color: colors.textDim, fontSize: 12, marginTop: spacing(1) },
    btn: {
      backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(5),
      shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
    },
    btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
    switch: { alignItems: 'center', marginTop: spacing(5) },
    switchText: { color: colors.textDim, fontSize: 14 },
    switchLink: { color: colors.accent, fontWeight: '700' },
    error: { color: colors.danger, marginTop: spacing(1), marginBottom: spacing(1), fontSize: 13, textAlign: 'center' },
  })
);
