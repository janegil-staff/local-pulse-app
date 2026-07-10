// src/components/VerifiedBadge.js
// VERIFIED_BADGE_V1 — a filled circle with an envelope glyph, shown next to the
// display name of users who have confirmed their email address. Deliberately
// NOT a checkmark: a check reads as identity verification, and confirming an
// inbox proves only control of an email address.
//
// NOTE: `t` from useLang() is a plain object of strings, not a function.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLang } from '../context/LangContext.js';

const BLUE = '#3B82C4';

export default function VerifiedBadge({ size = 14, color = BLUE, style }) {
  const { t } = useLang();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t.badgeEmailConfirmed}
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.56, lineHeight: size }]}>✉</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  glyph: { color: '#fff', fontWeight: '700', includeFontPadding: false },
});