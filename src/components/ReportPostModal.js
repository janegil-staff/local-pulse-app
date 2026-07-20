import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStyles } from '../theme/theme.js';

const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Hate speech',
  'Violence or threats',
  'False information',
  'Inappropriate content',
  'Other',
];

const MAX_COMMENT_LENGTH = 500;

export default function ReportPostModal({
  visible,
  postId,
  onClose,
  onSubmit,
}) {
  const s = useStyles(stylesFactory);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setReason('');
      setComment('');
      setError('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a reason.');
      return;
    }

    if (!postId) {
      setError('This post could not be identified.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await onSubmit?.({
        postId,
        reason,
        comment: comment.trim(),
      });

      onClose?.();
    } catch (err) {
      setError(err?.message || 'Could not submit the report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={submitting ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={submitting ? undefined : onClose}
        />

        <View style={s.card}>
          <Text style={s.title}>Report post</Text>

          <Text style={s.description}>
            Select a reason and add any details that may help us review the post.
          </Text>

          <View style={s.reasons}>
            {REPORT_REASONS.map((item) => {
              const selected = reason === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[s.reasonButton, selected && s.reasonButtonSelected]}
                  onPress={() => {
                    setReason(item);
                    setError('');
                  }}
                  disabled={submitting}
                >
                  <View style={[s.radio, selected && s.radioSelected]}>
                    {selected ? <View style={s.radioDot} /> : null}
                  </View>

                  <Text
                    style={[
                      s.reasonText,
                      selected && s.reasonTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.label}>Additional details</Text>

          <TextInput
            style={s.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Provide additional details about this report..."
            placeholderTextColor={s.placeholder.color}
            multiline
            textAlignVertical="top"
            maxLength={MAX_COMMENT_LENGTH}
            editable={!submitting}
          />

          <Text style={s.characterCount}>
            {comment.length}/{MAX_COMMENT_LENGTH}
          </Text>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <View style={s.actions}>
            <TouchableOpacity
              style={s.cancelButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.submitButton,
                (!reason || submitting) && s.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!reason || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitText}>Submit report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const stylesFactory = ({ colors, radius }) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },

    card: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      padding: 20,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },

    description: {
      marginTop: 6,
      marginBottom: 16,
      color: colors.textDim,
      fontSize: 14,
      lineHeight: 20,
    },

    reasons: {
      gap: 8,
    },

    reasonButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },

    reasonButtonSelected: {
      borderColor: colors.accent,
    },

    radio: {
      width: 20,
      height: 20,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.textDim,
    },

    radioSelected: {
      borderColor: colors.accent,
    },

    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },

    reasonText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },

    reasonTextSelected: {
      fontWeight: '700',
    },

    label: {
      marginTop: 18,
      marginBottom: 8,
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },

    input: {
      minHeight: 110,
      padding: 12,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
    },

    placeholder: {
      color: colors.textDim,
    },

    characterCount: {
      marginTop: 5,
      color: colors.textDim,
      fontSize: 11,
      textAlign: 'right',
    },

    error: {
      marginTop: 10,
      color: colors.danger,
      fontSize: 13,
    },

    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 18,
    },

    cancelButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },

    cancelText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },

    submitButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: radius.md,
      backgroundColor: colors.danger,
    },

    submitButtonDisabled: {
      opacity: 0.5,
    },

    submitText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
  });