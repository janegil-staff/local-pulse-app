// localpulse/app/src/screens/LegalScreen.js
import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { LEGAL } from '../lib/legalContent.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

export default function LegalScreen({ route }) {
  const styles = useStyles(stylesFactory);
  const which = route?.params?.doc === 'privacy' ? 'privacy' : 'terms';
  const doc = LEGAL[which];

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: theme.spacing(5) }}>
      <Text style={styles.title}>{doc.title}</Text>
      <Text style={styles.updated}>Last updated: 2026</Text>
      {doc.body.map(([h, p]) => (
        <React.Fragment key={h}>
          <Text style={styles.h}>{h}</Text>
          <Text style={styles.p}>{p}</Text>
        </React.Fragment>
      ))}
      <Text style={styles.note}>
        This is placeholder text. Replace with your reviewed legal documents before release.
      </Text>
    </ScrollView>
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
