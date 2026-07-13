// localpulse/app/src/screens/ComposeScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFeedStore } from '../store/feedStore.js';
import { api } from '../api/client.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { theme, makeStyles, useStyles, POST_TYPE_META } from '../theme/theme.js';

const TYPES = Object.keys(POST_TYPE_META);

export default function ComposeScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const [type, setType] = useState('update');
  const [text, setText] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [posting, setPosting] = useState(false);
  // Uploaded immediately on pick, so `submit` only has to pass the URL along.
  // Trades a wasted upload on abandon for a fast, predictable Post button.
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const createPost = useFeedStore((s) => s.createPost);

  async function pickImage() {
    if (uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType ? ['images'] : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const res = await api.uploadImage(result.assets[0].uri);
      const url = typeof res === 'string' ? res : res?.url;
      if (!url) throw new Error('Upload returned no URL.');
      setImageUrl(url);
    } catch (e) {
      Alert.alert('Upload failed', e?.message ?? 'Try again.');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!text.trim()) return;
    setPosting(true);
    // The server treats '' as "no image", so an unset imageUrl is fine to send.
    const ok = await createPost({ type, text: text.trim(), placeName: placeName.trim(), imageUrl });
    setPosting(false);
    if (ok) navigation.goBack();
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="New Post" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: theme.spacing(10) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <Text style={styles.label}>Photo (optional)</Text>
          {imageUrl ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUrl }} style={styles.preview} resizeMode="cover" />
              <Pressable style={styles.previewRemove} onPress={() => setImageUrl('')} hitSlop={10}>
                <Text style={styles.previewRemoveText}>×</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.imageAdd} onPress={pickImage} disabled={uploading}>
              {uploading
                ? <ActivityIndicator color={theme.colors.accent} />
                : <Text style={styles.imageAddPlus}>＋</Text>}
            </Pressable>
          )}

          <Text style={styles.label}>Place (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bergen sentrum"
            placeholderTextColor={theme.colors.textDim}
            value={placeName}
            onChangeText={setPlaceName}
          />

          <Pressable
            style={[styles.btn, (!text.trim() || posting || uploading) && styles.btnDisabled]}
            onPress={submit}
            disabled={!text.trim() || posting || uploading}
          >
            <Text style={styles.btnText}>{posting ? 'Posting…' : 'Post'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    imageAdd: {
      height: 120, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed',
      borderColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    },
    imageAddPlus: { color: colors.accent, fontSize: 34, fontWeight: '300' },
    previewWrap: { position: 'relative' },
    preview: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
    previewRemove: {
      position: 'absolute', top: spacing(2), right: spacing(2),
      width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center', justifyContent: 'center',
    },
    previewRemoveText: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 20 },
    btn: {
      backgroundColor: colors.accent, borderRadius: radius.md,
      paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(6),
    },
    btnDisabled: { backgroundColor: colors.accentDim, opacity: 0.6 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  })
);