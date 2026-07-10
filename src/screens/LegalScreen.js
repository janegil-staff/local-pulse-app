// src/screens/LegalScreen.js
import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LEGAL } from '../lib/legalContent.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';

export default function LegalScreen({ route, navigation }) {
  const styles = useStyles(stylesFactory);
  const { t } = useTranslation();
  const which = route?.params?.doc === 'privacy' ? 'privacy' : 'terms';
  const doc = LEGAL[which];

  return (
    <View style={styles.root}>
      <ScreenHeader title={doc.title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing(5) }}>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.updated}>{t('legal.lastUpdated', { year: 2026 })}</Text>
        {doc.body.map(([h, p]) => (
          <React.Fragment key={h}>
            <Text style={styles.h}>{h}</Text>
            <Text style={styles.p}>{p}</Text>
          </React.Fragment>
        ))}
        <Text style={styles.note}>{t('legal.placeholder')}</Text>
      </ScrollView>
    </View>
  );
}

const stylesFactory = (({ colors, spacing }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    title: { color: colors.text, fontSize: 24, fontWeight: '800' },
    updated: { color: colors.textDim, fontSize: 13, marginTop: spacing(1), marginBottom: spacing(4) },
    h: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: spacing(4), marginBottom: spacing(1) },
    p: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
    note: { color: colors.textDim, fontSize: 12, fontStyle: 'italic', marginTop: spacing(6) },
  })
);