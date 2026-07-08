// src/screens/MyProfileScreen.js
//
// "My Profile" tab — the logged-in user's own profile with inline editing.
// Fields: photos, bio, username, gender, email. Plus a logout button.
//
// Rewritten to match your actual app: static `theme.colors.*` import (no hook),
// emoji-glyph convention, JS/ESM. Remaining guesses are marked "⚠️ ADJUST":
//   - API method names (updateMyProfile / uploadImage) — match your api/client.
//   - user shape (photos/bio/username/email/gender) — match your backend.
//   - theme.colors keys — I used bg/surface/text/textDim/accent/border from
//     your RootNavigator. Add any that don't exist.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../context/AuthContext.js';
import * as api from '../api/client.js'; // ⚠️ ADJUST if your client path/name differs.
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';

const GENDERS = ['male', 'female', 'other']; // ⚠️ ADJUST to your gender options.

export default function MyProfileScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  // ⚠️ ADJUST: refreshUser re-fetches current user after a save; logout clears auth.
  const { user, refreshUser, logout } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(null); // 'username'|'bio'|'email'|'gender'|null
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const photos = user?.photos || []; // ⚠️ ADJUST if named differently.

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshUser?.();
    } catch (e) {
      // Pull-to-refresh failing shouldn't alert.
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser]);

  function startEdit(field, currentValue) {
    setEditing(field);
    setDraft(currentValue == null ? '' : String(currentValue));
  }

  function cancelEdit() {
    setEditing(null);
    setDraft('');
  }

  async function saveField(field) {
    const value = field === 'bio' ? draft : draft.trim();

    if (field === 'username' && value.length < 3) {
      Alert.alert('Username too short', 'Pick a username with at least 3 characters.');
      return;
    }
    if (field === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      Alert.alert('Check your email', 'That doesn\u2019t look like a valid email address.');
      return;
    }

    setSaving(true);
    try {
      await api.updateMyProfile({ [field]: value }); // ⚠️ ADJUST method/payload.
      await refreshUser?.();
      setEditing(null);
      setDraft('');
    } catch (e) {
      Alert.alert('Couldn\u2019t save', e?.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveGender(value) {
    setSaving(true);
    try {
      await api.updateMyProfile({ gender: value }); // ⚠️ ADJUST method/payload.
      await refreshUser?.();
      setEditing(null);
    } catch (e) {
      Alert.alert('Couldn\u2019t save', e?.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function addPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const url = await api.uploadImage(asset.uri); // ⚠️ ADJUST method.
      const nextPhotos = [...photos, url];
      await api.updateMyProfile({ photos: nextPhotos }); // ⚠️ ADJUST payload.
      await refreshUser?.();
    } catch (e) {
      Alert.alert('Upload failed', e?.message || 'Couldn\u2019t upload that photo. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto(index) {
    Alert.alert('Remove photo?', 'This photo will be removed from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const nextPhotos = photos.filter((_, i) => i !== index);
          setSaving(true);
          try {
            await api.updateMyProfile({ photos: nextPhotos }); // ⚠️ ADJUST payload.
            await refreshUser?.();
          } catch (e) {
            Alert.alert('Couldn\u2019t remove', e?.message || 'Try again.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  function confirmLogout() {
    Alert.alert('Log out?', 'You\u2019ll need your email and PIN to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout?.() },
    ]);
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Profile" navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        <Text style={styles.sectionLabel}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {photos.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                <Text style={styles.photoRemoveText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addPhoto} onPress={addPhoto} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (
              <Text style={styles.addPhotoText}>＋</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        <EditableRow
          label="Username"
          value={user.username}
          editing={editing === 'username'}
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          onStart={() => startEdit('username', user.username)}
          onCancel={cancelEdit}
          onSave={() => saveField('username')}
          autoCapitalize="none"
        />

        <EditableRow
          label="Email"
          value={user.email}
          editing={editing === 'email'}
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          onStart={() => startEdit('email', user.email)}
          onCancel={cancelEdit}
          onSave={() => saveField('email')}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <EditableRow
          label="Bio"
          value={user.bio}
          editing={editing === 'bio'}
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          onStart={() => startEdit('bio', user.bio)}
          onCancel={cancelEdit}
          onSave={() => saveField('bio')}
          multiline
          placeholder="Tell people a bit about yourself\u2026"
        />

        <View style={styles.fieldBlock}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldLabel}>Gender</Text>
            {editing !== 'gender' && (
              <TouchableOpacity onPress={() => setEditing('gender')}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editing === 'gender' ? (
            <View style={styles.genderRow}>
              {GENDERS.map((g) => {
                const selected = user.gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, selected && styles.genderChipActive]}
                    onPress={() => saveGender(g)}
                    disabled={saving}
                  >
                    <Text style={[styles.genderChipText, selected && styles.genderChipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={() => setEditing(null)} style={styles.cancelChip}>
                <Text style={styles.cancelChipText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.fieldValue}>{user.gender || '\u2014'}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function EditableRow({
  label,
  value,
  editing,
  draft,
  setDraft,
  saving,
  onStart,
  onCancel,
  onSave,
  multiline,
  placeholder,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {!editing && (
          <TouchableOpacity onPress={onStart}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        <View>
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            value={draft}
            onChangeText={setDraft}
            multiline={multiline}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textDim}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity onPress={onCancel} disabled={saving}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.fieldValue}>{value || '\u2014'}</Text>
      )}
    </View>
  );
}

const stylesFactory = ({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },

  scrollContent: { padding: 20, paddingBottom: 48 },

  sectionLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  photoRow: { flexDirection: 'row', marginBottom: 24 },
  photoWrap: { marginRight: 12, position: 'relative' },
  photo: { width: 96, height: 96, borderRadius: 12, backgroundColor: colors.surface },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: colors.bg, fontSize: 18, lineHeight: 20, fontWeight: '700' },
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { color: colors.accent, fontSize: 32, fontWeight: '300' },

  fieldBlock: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: { color: colors.text, fontSize: 16 },
  editLink: { color: colors.accent, fontSize: 14, fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputMultiline: { height: 100, textAlignVertical: 'top' },

  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelLink: { color: colors.textDim, fontSize: 14, marginRight: 20 },
  saveButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  genderRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    marginRight: 8,
    marginBottom: 8,
  },
  genderChipActive: { backgroundColor: colors.accent },
  genderChipText: { color: colors.accent, fontSize: 14, textTransform: 'capitalize' },
  genderChipTextActive: { color: '#fff' },
  cancelChip: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelChipText: { color: colors.textDim, fontSize: 14 },

  logoutButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c0392b',
    alignItems: 'center',
  },
  logoutText: { color: '#c0392b', fontSize: 16, fontWeight: '600' },
});