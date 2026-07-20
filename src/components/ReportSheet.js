// src/components/ReportSheet.js
// Shared report modal for both user and post reports. Shows the reason options
// (mapped to the server's Report.js REPORT_REASONS enum) plus an optional
// free-text note (max 500 chars, matching the Report schema). Replaces the old
// Alert.alert flow, which couldn't host a text field.
//
// Usage:
//   const [reportOpen, setReportOpen] = useState(false);
//   <ReportSheet
//     visible={reportOpen}
//     onClose={() => setReportOpen(false)}
//     onSubmit={async (reason, note) => { await api.reportUser(userId, reason, note); }}
//     title={t.reportUserTitle}
//     prompt={t.reportWhy}
//   />
//
// onSubmit receives (reasonKey, note) — the enum key, not the label, and the
// trimmed note (empty string if the user left it blank).

import React, { useState } from 'react';
import {
  Modal, View, Text, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useStyles } from '../theme/theme.js';
import { useLang } from '../context/LangContext.js';

// Reason list — enum KEY (server) + localized label. Kept here so both the
// user and post report flows share one source of truth.
const REPORT_REASONS = (t) => [
  { key: 'inappropriate', label: t.reportInappropriate || 'Inappropriate content' },
  { key: 'harassment', label: t.reportHarassment || 'Harassment' },
  { key: 'spam', label: t.reportSpam || 'Spam or scam' },
  { key: 'misinformation', label: t.reportMisinformation || 'Fake or misleading profile' },
  { key: 'other', label: t.reportOther || 'Other' },
];

export default function ReportSheet({ visible, onClose, onSubmit, title, prompt }) {
  const styles = useStyles(stylesFactory);
  const { t } = useLang();
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setReason(null);
    setNote('');
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose?.();
  }

  async function submit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.(reason, note.trim());
      reset();
    } catch (e) {
      // Let the caller surface its own error alert; just re-enable the button.
      setSubmitting(false);
      throw e;
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>{title || t.reportUserTitle || 'Report'}</Text>
          {prompt ? <Text style={styles.prompt}>{prompt}</Text> : null}

          {REPORT_REASONS(t).map(({ key, label }) => {
            const active = reason === key;
            return (
              <Pressable
                key={key}
                style={[styles.reason, active && styles.reasonActive]}
                onPress={() => setReason(key)}
              >
                <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{label}</Text>
              </Pressable>
            );
          })}

          <TextInput
            style={styles.note}
            placeholder={t.reportNotePlaceholder || 'Describe what’s wrong (optional)…'}
            placeholderTextColor={styles._dim.color}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>{t.cancel || 'Cancel'}</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, (!reason || submitting) && styles.submitDisabled]}
              onPress={submit}
              disabled={!reason || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>{t.send || 'Send'}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const stylesFactory = ({ colors, spacing, radius }) => ({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  // Sheet background follows the theme: colors.surface is light in light mode,
  // dark in dark mode, so the report sheet matches the rest of the app.
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing(5),
    paddingBottom: spacing(8),
    gap: spacing(2.5),
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  prompt: { color: colors.textDim, fontSize: 14, marginBottom: spacing(1) },
  reason: {
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonActive: { borderColor: colors.accent },
  reasonText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  reasonTextActive: { color: colors.accent },
  // The complaint field. Placeholder (t.reportNotePlaceholder) tells users this
  // is where they describe what's wrong; contrasts against the sheet surface.
  note: {
    minHeight: 88,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    padding: spacing(3),
    marginTop: spacing(1),
  },
  actions: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(2) },
  cancelBtn: {
    flex: 1, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  submitBtn: {
    flex: 1, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  // Exposed so the TextInput placeholder color can read from the theme.
  _dim: { color: colors.textDim },
});