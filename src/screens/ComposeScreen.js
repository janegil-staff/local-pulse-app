// localpulse/app/src/screens/ComposeScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useFeedStore } from '../store/feedStore.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { theme, makeStyles, useStyles, POST_TYPE_META } from '../theme/theme.js';

const TYPES = Object.keys(POST_TYPE_META);

export default function ComposeScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const [type, setType] = useState('update');
  const [text, setText] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [posting, setPosting] = useState(false);
  const createPost = useFeedStore((s) => s.createPost);

  async function submit() {
    if (!text.trim()) return;
    setPosting(true);
    const ok = await createPost({ type, text: text.trim(), placeName: placeName.trim() });
    setPosting(false);
    if (ok) navigation.goBack();
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="New Post" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: theme.spacing(4) }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {TYPES.map((t) => {
            const meta = POST_TYPE_META[t];
            const active = t === type;
            return (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {meta.emoji} {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>What's happening?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Share something with your neighborhood…"
          placeholderTextColor={theme.colors.textDim}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          autoFocus
        />

        <Text style={styles.label}>Place (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Bergen sentrum"
          placeholderTextColor={theme.colors.textDim}
          value={placeName}
          onChangeText={setPlaceName}
        />

        <Pressable
          style={[styles.btn, (!text.trim() || posting) && styles.btnDisabled]}
          onPress={submit}
          disabled={!text.trim() || posting}
        >
          <Text style={styles.btnText}>{posting ? 'Posting…' : 'Post'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    label: { color: colors.textDim, fontSize: 13, marginBottom: spacing(2), marginTop: spacing(3) },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
    chip: {
      backgroundColor: colors.surface, borderRadius: radius.md,
      paddingHorizontal: spacing(3), paddingVertical: spacing(2),
      borderWidth: 1, borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
    chipText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: colors.text },
    textArea: {
      backgroundColor: colors.surface, color: colors.text, borderRadius: radius.md,
      padding: spacing(4), fontSize: 16, minHeight: 120, textAlignVertical: 'top',
      borderWidth: 1, borderColor: colors.border,
    },
    input: {
      backgroundColor: colors.surface, color: colors.text, borderRadius: radius.md,
      paddingHorizontal: spacing(4), paddingVertical: spacing(3.5), fontSize: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    btn: {
      backgroundColor: colors.accent, borderRadius: radius.md,
      paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(6),
    },
    btnDisabled: { backgroundColor: colors.accentDim, opacity: 0.6 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  })
);