// localpulse/app/src/components/SettingsRows.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { theme, useStyles } from '../theme/theme.js';

export function Row({ label, value, onPress, danger, last }) {
  const styles = useStyles(settingsStyles);
  return (
    <Pressable
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowRight}>
        {value != null ? <Text style={styles.rowValue}>{value}</Text> : null}
        {onPress ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </Pressable>
  );
}

export function ToggleRow({ label, sublabel, value, onValueChange, last }) {
  const styles = useStyles(settingsStyles);
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

export function Section({ title, children }) {
  const styles = useStyles(settingsStyles);
  return (
    <View style={styles.sectionWrap}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.section}>{children}</View>
    </View>
  );
}

// Shared by SettingsScreen and PersonalSettingsScreen. Exported so both can
// pass it to useStyles for the screen/modal chrome around the rows.
export const settingsStyles = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    root: { flex: 1, backgroundColor: colors.bg },

    sectionWrap: { marginBottom: spacing(6) },
    sectionTitle: { color: colors.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing(2), marginLeft: spacing(1) },
    section: {
      backgroundColor: colors.surface, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },

    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing(4), paddingVertical: spacing(4), minHeight: 54,
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLabel: { color: colors.text, fontSize: 16 },
    rowSublabel: { color: colors.textDim, fontSize: 13, marginTop: 2 },
    rowLabelDanger: { color: colors.danger, fontWeight: '600' },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
    rowValue: { color: colors.textDim, fontSize: 15 },
    chevron: { color: colors.textDim, fontSize: 22, fontWeight: '300' },

    // Gender picker (PersonalSettingsScreen). The row switches to a column
    // when the chips expand, so the label stays put and they drop below it.
    rowColumn: { flexDirection: 'column', alignItems: 'stretch', paddingBottom: spacing(3) },
    genderHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    genderRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing(3) },
    genderChip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: colors.accent, marginRight: 8, marginBottom: 8 },
    genderChipActive: { backgroundColor: colors.accent },
    genderChipText: { color: colors.accent, fontSize: 14, textTransform: 'capitalize', fontWeight: '600' },
    genderChipTextActive: { color: '#fff' },

    rangeRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
    rangeInput: {
      backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.sm,
      paddingHorizontal: spacing(3), paddingVertical: spacing(2), fontSize: 15,
      borderWidth: 1, borderColor: colors.border, minWidth: 56, textAlign: 'center',
    },
    rangeDash: { color: colors.textDim, fontSize: 16 },

    version: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginTop: spacing(2) },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing(8) },
    modalSheet: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing(5) },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing(4) },
    modalInput: { color: colors.text, fontSize: 17, borderBottomWidth: 1.5, borderBottomColor: colors.border, paddingVertical: spacing(2) },
    modalError: { color: colors.danger, fontSize: 14, marginTop: spacing(3) },
    modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing(5), marginTop: spacing(5) },
    modalCancel: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
    modalSave: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing(6), paddingVertical: spacing(2.5), minWidth: 72, alignItems: 'center' },
    modalSaveDisabled: { backgroundColor: colors.accentDim },
    modalSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  })
);