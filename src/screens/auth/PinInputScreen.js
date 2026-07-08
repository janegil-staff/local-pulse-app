// localpulse/app/src/screens/auth/PinInputScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext.js';
import { FontSize, Spacing } from '../../constants/theme.js';

export default function PinInputScreen({ title, subtitle, onComplete, onBack }) {
  const inputRef = useRef(null);
  const [pin, setPin] = useState('');
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(theme.colors.accentDark);
      StatusBar.setTranslucent(false);
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(digits);
    if (digits.length === 4) {
      inputRef.current?.blur();
      setTimeout(() => onComplete(digits), 150);
    }
  };

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <View style={[s.statusBarFill, { height: insets.top }]} />

      <View style={s.header}>
        {onBack && (
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle}>{onBack ? 'Back' : ''}</Text>
      </View>

      <TextInput
        ref={inputRef}
        style={s.hiddenInput}
        keyboardType="number-pad"
        maxLength={4}
        onChangeText={handleChange}
        value={pin}
        caretHidden
        autoFocus
      />

      <TouchableOpacity style={s.body} activeOpacity={1} onPress={() => inputRef.current?.focus()}>
        <Text style={s.title}>{title ?? 'Enter PIN'}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

        <View style={s.slots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={s.slot}>
              <Text style={s.digit}>{pin[i] ? '●' : ''}</Text>
              <View style={[s.underline, i < pin.length && s.underlineActive]} />
            </View>
          ))}
        </View>

        <Text style={s.hint}>Tap to open keyboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.bg },
    statusBarFill: { width: '100%', backgroundColor: t.colors.accentDark },
    header: {
      backgroundColor: t.colors.accentDark, height: 56, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', position: 'relative',
    },
    backBtn: { position: 'absolute', left: 16, height: '100%', justifyContent: 'center', paddingHorizontal: 8 },
    backArrow: { color: '#fff', fontSize: 34, lineHeight: 40 },
    headerTitle: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
    hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
    body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 60 },
    title: { color: t.colors.text, fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm },
    subtitle: { color: t.colors.textDim, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.xl },
    slots: { flexDirection: 'row', gap: 24, marginTop: 32, marginBottom: 32 },
    slot: { width: 52, alignItems: 'center' },
    digit: { fontSize: 32, fontWeight: '700', color: t.colors.accentDark, height: 44, lineHeight: 44, textAlign: 'center' },
    underline: { width: '100%', height: 3, borderRadius: 2, backgroundColor: t.colors.border, marginTop: 4 },
    underlineActive: { backgroundColor: t.colors.accentDark },
    hint: { color: t.colors.textDim, fontSize: 13, textAlign: 'center' },
  });
