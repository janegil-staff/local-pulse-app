// localpulse/app/src/screens/OnboardingScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../api/client.js';
import { useProfileStore } from '../store/profileStore.js';
import { useAuth } from '../context/AuthContext.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

const GENDERS = [
  { key: 'woman', label: 'Woman' },
  { key: 'man', label: 'Man' },
  { key: 'nonbinary', label: 'Nonbinary' },
  { key: 'other', label: 'Other' },
];

function ageFrom(date) {
  if (!date || Number.isNaN(new Date(date).getTime())) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}
function defaultDob() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}
function formatDob(date) {
  if (!date) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// Global 3-step indicator (step 1 lives on the Auth screen).
function StepIndicator({ current }) {
  const styles = useStyles(stylesFactory);
  const steps = [
    { n: 1, label: 'Account' },
    { n: 2, label: 'About you' },
    { n: 3, label: 'Photos' },
  ];
  return (
    <View style={styles.stepper}>
      {steps.map(({ n, label }) => {
        const done = current > n;
        const active = current === n;
        return (
          <View key={n} style={styles.stepCol}>
            <View
              style={[styles.stepNum, (active || done) && styles.stepNumActive, done && styles.stepNumDone]}
            >
              <Text style={[styles.stepNumText, (active || done) && styles.stepNumTextActive]}>
                {done ? '✓' : n}
              </Text>
            </View>
            <View style={[styles.stepBar, current >= n && styles.stepBarActive]} />
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function OnboardingScreen({ navigation, route }) {
  const styles = useStyles(stylesFactory);
  const insets = useSafeAreaInsets();
  const { user, register, hydrate: refreshUser } = useAuth();
  const saveProfile = useProfileStore((s) => s.saveProfile);

  // Carried from the Auth screen (step 1). Absent if the account already exists
  // (e.g. returning to finish an incomplete profile) — then we resume at photos.
  const email = route?.params?.email;
  const pin = route?.params?.pin;

  // Step is driven explicitly. From Auth we arrive at step 2. After the account
  // is created (user exists) a fresh mount resumes at step 3 (photos).
  const [globalStep, setGlobalStep] = useState(() => {
    if (route?.params?.startStep) return route.params.startStep;
    return user ? 3 : 2;
  });

  // Step 2 — account details
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [gender, setGender] = useState(null);

  // Step 3 — photos + bio
  const [bio, setBio] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // If the account already exists (returning to edit), prefill step-2 fields.
  React.useEffect(() => {
    if (user) {
      if (user.username && !username) setUsername(user.username);
      if (user.dob && !dob) setDob(new Date(user.dob));
      if (user.gender && !gender) setGender(user.gender);
      if (user.photos?.length && photos.length === 0) setPhotos(user.photos);
      if (user.bio && !bio) setBio(user.bio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Step 2 "Next" — if the account doesn't exist yet, CREATE it with the chosen
  // username. If it already exists (came back from step 3), just update details.
  // Step 2 "Next" — validate only, then advance. The account is NOT created
  // here; everything is created together at the final step.
  function nextFromDetails() {
    if (username.trim().length < 3) return Alert.alert('Username', 'Username must be at least 3 characters.');
    const age = ageFrom(dob);
    if (age == null) return Alert.alert('Date of birth', 'Please select your date of birth.');
    if (age < 18) return Alert.alert('Sorry', 'You must be at least 18 to use this app.');
    if (!gender) return Alert.alert('Almost there', 'Please select your gender.');
    setGlobalStep(3);
  }

  // Add a photo — kept as a LOCAL uri for now. Uploaded at the final step,
  // once the account exists and we're authenticated.
  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (result.canceled) return;
    setPhotos((p) => [...p, result.assets[0].uri]);
  }

  // Final step — create the account, THEN upload photos (now authenticated),
  // THEN save the full profile. Everything happens here in one shot.
  async function finish() {
    if (photos.length === 0) return Alert.alert('Add a photo', 'Please add at least one photo.');
    setSaving(true);
    try {
      console.log('[finish] start. user exists?', !!user, 'photos:', photos.length);

      // 1) Create the account (unless it somehow already exists).
      if (!user) {
        console.log('[finish] registering…', { email, username, gender, dob: dob?.toISOString() });
        const created = await register({
          email,
          pin,
          username,
          displayName: username,
          dob: dob.toISOString(),
          gender,
        });
        console.log('[finish] register returned profile:', JSON.stringify(created));
      }

      // 2) Upload any local photos now that we're authenticated.
      const uploaded = [];
      for (const uri of photos) {
        if (/^https?:\/\//.test(uri)) {
          uploaded.push(uri);
        } else {
          console.log('[finish] uploading photo…', uri.slice(0, 40));
          const form = new FormData();
          form.append('image', { uri, name: 'photo.jpg', type: 'image/jpeg' });
          const { url } = await api.uploadImage(form);
          console.log('[finish] photo uploaded ->', url);
          uploaded.push(url);
        }
      }

      // 3) Save the full profile.
      console.log('[finish] saving profile with', uploaded.length, 'photos');
      const saved = await saveProfile({
        bio,
        photos: uploaded,
        dob: dob.toISOString(),
        gender,
      });
      console.log('[finish] saveProfile returned:', JSON.stringify(saved));

      const profile = await refreshUser();
      console.log('[finish] refreshUser profileComplete =', profile?.profileComplete);
      if (!profile?.profileComplete) {
        Alert.alert('Almost there', 'Please make sure your date of birth, gender, and at least one photo are set.');
      }
    } catch (e) {
      console.log('[finish] ERROR:', e?.message, e);
      Alert.alert('Could not finish', e?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  const headline = globalStep === 2 ? 'About you' : 'Your photos';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Header fills up behind the status bar / system buttons */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing(4) }]}>
        <Text style={styles.headerTitle}>Create account</Text>
        <Text style={styles.headerSub}>{headline}</Text>
      </View>

      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingTop: theme.spacing(6), paddingBottom: insets.bottom + theme.spacing(10) }}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator current={globalStep} />

        {globalStep === 2 && (
          <>
            <Text style={styles.heading}>About you</Text>
            <Text style={styles.sub}>Pick a username and tell us a bit about yourself.</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. janev"
            placeholderTextColor={theme.colors.textDim}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.label}>Date of birth</Text>
          <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
            <Text style={[styles.dobText, !dob && styles.dobPlaceholder]}>
              {dob ? formatDob(dob) : 'Select your date of birth'}
            </Text>
          </Pressable>
          <Text style={styles.hint}>You must be 18 or older.</Text>

          {showPicker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={dob || defaultDob()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                themeVariant="dark"
                textColor="#ffffff"
                accentColor={theme.colors.accent}
                onChange={(event, selected) => {
                  if (Platform.OS === 'android') setShowPicker(false);
                  if (event.type === 'dismissed') return;
                  if (selected) setDob(selected);
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable style={styles.pickerDone} onPress={() => setShowPicker(false)}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </Pressable>
              )}
            </View>
          )}

          <Text style={styles.label}>Gender</Text>
          <View style={styles.chips}>
            {GENDERS.map((g) => (
              <Pressable
                key={g.key}
                style={[styles.chip, gender === g.key && styles.chipActive]}
                onPress={() => setGender(g.key)}
              >
                <Text style={[styles.chipText, gender === g.key && styles.chipTextActive]}>{g.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.navRow}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => navigation.goBack()}>
              <Text style={styles.btnGhostText}>Previous</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnFlex]} onPress={nextFromDetails}>
              <Text style={styles.btnText}>Next</Text>
            </Pressable>
          </View>
        </>
      )}

      {globalStep === 3 && (
        <>
          <Text style={styles.heading}>Your photos</Text>
          <Text style={styles.sub}>Add at least one. First photo is your main.</Text>

          <View style={styles.photoRow}>
            {photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.thumb} />
            ))}
            {photos.length < 6 && (
              <Pressable style={styles.addPhoto} onPress={pickPhoto} disabled={uploading}>
                {uploading ? <ActivityIndicator color={theme.colors.accent} /> : <Text style={styles.addPhotoText}>+</Text>}
              </Pressable>
            )}
          </View>

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="A little about you…"
            placeholderTextColor={theme.colors.textDim}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={300}
          />

          <View style={styles.navRow}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setGlobalStep(2)}>
              <Text style={styles.btnGhostText}>Previous</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnFlex, saving && styles.btnDisabled]} onPress={finish} disabled={saving}>
              <Text style={styles.btnText}>{saving ? 'Creating account…' : 'Start matching'}</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    screen: { flex: 1, backgroundColor: colors.bg },
    header: {
      backgroundColor: colors.accent, paddingHorizontal: spacing(5), paddingBottom: spacing(5),
      borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg,
    },
    headerTitle: { color: '#fff', fontSize: 14, fontWeight: '600', opacity: 0.85 },
    headerSub: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: spacing(1) },
    stepper: { flexDirection: 'row', gap: spacing(2), marginBottom: spacing(7) },
    stepCol: { flex: 1, alignItems: 'center' },
    stepNum: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt,
      borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(2),
    },
    stepNumActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    stepNumDone: { backgroundColor: colors.success, borderColor: colors.success },
    stepNumText: { color: colors.textDim, fontSize: 13, fontWeight: '800' },
    stepNumTextActive: { color: '#fff' },
    stepBar: { width: '100%', height: 4, borderRadius: 2, backgroundColor: colors.border },
    stepBarActive: { backgroundColor: colors.accent },
    stepLabel: { color: colors.textDim, fontSize: 11, fontWeight: '600', marginTop: spacing(2) },
    stepLabelActive: { color: colors.text },
    heading: { color: colors.text, fontSize: 26, fontWeight: '800' },
    sub: { color: colors.textDim, fontSize: 14, marginTop: spacing(1), marginBottom: spacing(4) },
    label: { color: colors.textDim, fontSize: 13, marginTop: spacing(4), marginBottom: spacing(2) },
    hint: { color: colors.textDim, fontSize: 12, marginTop: spacing(1) },
    input: { backgroundColor: colors.surface, color: colors.text, borderRadius: radius.md, paddingHorizontal: spacing(4), paddingVertical: spacing(3.5), fontSize: 16, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    dobText: { color: colors.text, fontSize: 16 },
    dobPlaceholder: { color: colors.textDim },
    pickerWrap: { backgroundColor: '#1a2230', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing(2), paddingHorizontal: spacing(2) },
    pickerDone: { alignSelf: 'flex-end', paddingHorizontal: spacing(4), paddingVertical: spacing(2) },
    pickerDoneText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
    chip: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
    chipText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
    chipTextActive: { color: colors.text },
    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) },
    thumb: { width: 90, height: 120, borderRadius: radius.md },
    addPhoto: { width: 90, height: 120, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    addPhotoText: { color: colors.textDim, fontSize: 32, fontWeight: '300' },
    btn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(8) },
    btnFlex: { flex: 1 },
    btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, flex: 0.6 },
    btnGhostText: { color: colors.text, fontWeight: '700', fontSize: 15 },
    navRow: { flexDirection: 'row', gap: spacing(3), alignItems: 'center' },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  })
);
