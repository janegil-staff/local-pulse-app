
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const BLUE = '#3B82C4';

export default function VerifiedBadge({ size = 14, color = BLUE, style }) {
  const { t } = useTranslation();
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