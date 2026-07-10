// localpulse/app/src/screens/MyProfileScreen.js
//
// "My Profile" tab — the logged-in user's own profile with inline editing.
// Hero-photo layout (Tinder/Hinge style): large photo up top with name overlaid,
// detail cards below. Photos and bio are edited here; username, email, and
// gender live in Settings → Personal settings.

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
  RefreshControl,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { avatarSource } from '../lib/avatar.js';

const { width } = Dimensions.get('window');
const HERO_H = Math.round(width * 1.15);

export default function MyProfileScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const { user, hydrate, logout } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [resending, setResending] = useState(false);

  // Photos are { url, publicId } objects. Coerce once — a stale cached user
  // may still hold bare strings.
  const photos = (user?.photos || []).map((p) => (typeof p === 'string' ? { url: p, publicId: null } : p));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await hydrate?.(); } catch (e) { /* ignore */ } finally { setRefreshing(false); }
  }, [hydrate]);

  function startEdit(field, currentValue) {
    setEditing(field);
    setDraft(currentValue == null ? '' : String(currentValue));
  }
  function cancelEdit() { setEditing(null); setDraft(''); }

  async function saveField(field) {
    const value = field === 'bio' ? draft : draft.trim();
    setSaving(true);
    try {
      await api.updateMyProfile({ [field]: value });
      await hydrate?.();
      setEditing(null);
      setDraft('');
    } catch (e) {
      Alert.alert('Couldn\u2019t save', e?.message || 'Something went wrong. Try again.');
    } finally { setSaving(false); }
  }

  // Resend the confirmation email. The server throttles it; the button stays
  // enabled either way, since a silently-swallowed tap is worse than a stale
  // "sent" message.
  async function resendVerification() {
    setResending(true);
    try {
      const { alreadyVerified } = await api.resendVerification();
      if (alreadyVerified) {
        await hydrate?.();
        Alert.alert('', 'Your email is already confirmed.');
      } else {
        Alert.alert('', 'Confirmation email sent. Check your inbox.');
      }
    } catch (e) {
      Alert.alert('Couldn\u2019t send', e?.message || 'Try again.');
    } finally {
      setResending(false);
    }
  }

  async function addPhoto() {
    console.log('[MyProfile] addPhoto tapped');
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[MyProfile] permission:', perm.status, perm.granted);
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo access in Settings to add a picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? ['images'] : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      console.log('[MyProfile] picker canceled?', result.canceled);
      if (result.canceled) return;
      const asset = result.assets[0];
      setUploadingPhoto(true);
      // { url, publicId } — the publicId is what lets the server destroy the
      // Cloudinary asset when this photo is later removed.
      const photo = await api.uploadImage(asset.uri);
      console.log('[MyProfile] uploaded:', photo?.url);
      if (!photo?.url) throw new Error('Upload returned no URL.');
      const nextPhotos = [...photos, photo];
      await api.updateMyProfile({ photos: nextPhotos });
      await hydrate?.();
    } catch (e) {
      console.log('[MyProfile] addPhoto error:', e?.message);
      Alert.alert('Upload failed', e?.message || 'Couldn\u2019t add that photo. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function makePrimary(index) {
    if (index === 0) return;
    const next = [...photos];
    const [pick] = next.splice(index, 1);
    next.unshift(pick);
    api.updateMyProfile({ photos: next }).then(() => hydrate?.()).catch(() => {});
  }

  // Dropping the photo from the array is enough — updateProfile diffs the old
  // and new lists server-side and destroys whatever fell out of Cloudinary.
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
            await api.updateMyProfile({ photos: nextPhotos });
            await hydrate?.();
          } catch (e) {
            Alert.alert('Couldn\u2019t remove', e?.message || 'Try again.');
          } finally { setSaving(false); }
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

  const displayName = user.displayName || user.username || 'You';

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Profile" navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {/* ── Hero ─────────────────────────────── */}
        <View style={styles.hero}>
          <Image source={avatarSource(user)} style={styles.heroImg} />
          {/* dark gradient scrim for legible text */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={styles.heroScrim}
            pointerEvents="none"
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>
              {displayName}
              {user.age ? <Text style={styles.heroAge}>  {user.age}</Text> : null}
            </Text>
            {/* Display only — edited in Settings → Personal settings. */}
            {user.gender ? <Text style={styles.heroMeta}>{user.gender}</Text> : null}
          </View>
          <TouchableOpacity style={styles.heroCam} onPress={addPhoto} disabled={uploadingPhoto} activeOpacity={0.85}>
            {uploadingPhoto ? <ActivityIndicator color="#fff" /> : <Text style={styles.heroCamText}>＋</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Email confirmation ───────────────── */}
        {/* Only while unconfirmed. Once confirmed the banner disappears rather
            than becoming a "Verified ✓" badge — confirming an inbox proves
            control of an email address, not identity, and labelling it
            "verified" on a profile in a location app oversells what it means. */}
        {!user.emailVerified && (
          <View style={styles.verifyCard}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.verifyTitle}>Confirm your email</Text>
              <Text style={styles.verifyBody}>
                We sent a link to {user.email}. Didn&rsquo;t get it?
              </Text>
            </View>
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={!resending ? resendVerification : undefined}
              disabled={resending}
              activeOpacity={0.85}
            >
              {resending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.verifyBtnText}>Resend</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Photo gallery ────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            {photos.map((photo, i) => (
              <View key={`${photo.url}-${i}`} style={[styles.thumbWrap, i === 0 && styles.thumbPrimary]}>
                <TouchableOpacity onPress={() => makePrimary(i)} activeOpacity={0.8} style={styles.thumbTouch}>
                  <Image source={{ uri: photo.url }} style={styles.thumb} />
                  {i === 0 && (
                    <View style={styles.primaryTag}><Text style={styles.primaryTagText}>Main</Text></View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.thumbRemove} onPress={() => removePhoto(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.thumbRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 6 && (
              <TouchableOpacity style={styles.thumbAdd} onPress={addPhoto} disabled={uploadingPhoto} activeOpacity={0.8}>
                <Text style={styles.thumbAddPlus}>＋</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          {photos.length > 1 && <Text style={styles.hint}>Tap a photo to make it your main picture</Text>}
        </View>

        {/* ── About ────────────────────────────── */}
        {/* Username, email, and gender are edited in Settings. */}
        <View style={styles.card}>
          <EditableRow
            label="Bio"
            value={user.bio}
            editing={editing === 'bio'}
            draft={draft} setDraft={setDraft} saving={saving}
            onStart={() => startEdit('bio', user.bio)}
            onCancel={cancelEdit} onSave={() => saveField('bio')}
            multiline placeholder="Tell people a bit about yourself…"
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function EditableRow({
  label, value, editing, draft, setDraft, saving,
  onStart, onCancel, onSave, multiline, placeholder,
  autoCapitalize = 'sentences', keyboardType = 'default',
}) {
  const styles = useStyles(stylesFactory);
  return (
    <View>
      <View style={styles.rowHeader}>
        <Text style={styles.cardLabel}>{label}</Text>
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
            selectionColor={theme.colors.accent}
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity onPress={onCancel} disabled={saving}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.value}>{value || '\u2014'}</Text>
      )}
    </View>
  );
}

const stylesFactory = ({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: { width: '100%', height: HERO_H, position: 'relative', backgroundColor: colors.surface },
  heroImg: { width: '100%', height: '100%' },
  heroScrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%',
    backgroundColor: 'transparent',
  },
  heroContent: { position: 'absolute', left: 20, bottom: 18, right: 80 },
  heroName: { color: '#fff', fontSize: 30, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  heroAge: { color: '#fff', fontSize: 26, fontWeight: '400' },
  heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: 2, textTransform: 'capitalize', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  heroCam: {
    position: 'absolute', right: 18, bottom: 18, width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  heroCamText: { color: '#fff', fontSize: 30, fontWeight: '300', marginTop: -2 },

  // Email confirmation banner
  verifyCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 16,
    borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.accent,
  },
  verifyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  verifyBody: { color: colors.textDim, fontSize: 13, marginTop: 3, lineHeight: 18 },
  verifyBtn: {
    backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10, minWidth: 84, alignItems: 'center',
  },
  verifyBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Cards
  card: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 16,
    borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border,
  },
  cardLabel: { color: colors.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { color: colors.text, fontSize: 17, marginTop: 6 },
  editLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  hint: { color: colors.textDim, fontSize: 12, marginTop: 10 },

  // Photo thumbs
  thumbWrap: { width: 84, height: 84, borderRadius: 14, marginHorizontal: 4, marginTop: 12, position: 'relative' },
  thumbTouch: { width: '100%', height: '100%', borderRadius: 14 },
  thumbPrimary: { borderWidth: 2, borderColor: colors.accent },
  thumb: { width: '100%', height: '100%', borderRadius: 14 },
  primaryTag: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.accent, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, alignItems: 'center', paddingVertical: 2 },
  primaryTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  thumbRemove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  thumbRemoveText: { color: colors.bg, fontSize: 15, lineHeight: 17, fontWeight: '800' },
  thumbAdd: { width: 84, height: 84, borderRadius: 14, marginHorizontal: 4, marginTop: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  thumbAddPlus: { color: colors.accent, fontSize: 30, fontWeight: '300' },

  // Inputs
  input: {
    borderWidth: 1, borderColor: colors.accent, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: colors.text,
    backgroundColor: colors.bg, marginTop: 10,
  },
  inputMultiline: { height: 110, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 },
  cancelLink: { color: colors.textDim, fontSize: 14, marginRight: 20 },
  saveButton: { backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10, minWidth: 78, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Logout
  logoutButton: { marginHorizontal: 16, marginTop: 24, paddingVertical: 15, borderRadius: 14, borderWidth: 1, borderColor: colors.danger, alignItems: 'center' },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
});