// localpulse/app/src/screens/SettingsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import { api } from '../api/client.js';
import { useProfileStore } from '../store/profileStore.js';
import { useAuth } from '../context/AuthContext.js';
import { useThemeMode } from '../theme/ThemeContext.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

const SHOW = [
  { key: 'women', label: 'Women' },
  { key: 'men', label: 'Men' },
  { key: 'everyone', label: 'Everyone' },
];

export default function SettingsScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const profile = useProfileStore((s) => s.profile);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const { logout } = useAuth();
  const { pref, setPref } = useThemeMode();

  const [show, setShow] = useState('everyone');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('99');
  const [distance, setDistance] = useState('50');

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => {
    if (profile?.preferences) {
      const p = profile.preferences;
      setShow(p.show || 'everyone');
      setAgeMin(String(p.ageMin ?? 18));
      setAgeMax(String(p.ageMax ?? 99));
      setDistance(String(p.maxDistanceKm ?? 50));
    }
  }, [profile]);

  async function save() {
    try {
      await savePreferences({
        show,
        ageMin: Number(ageMin),
        ageMax: Number(ageMax),
        maxDistanceKm: Number(distance),
      });
      Alert.alert('Saved', 'Your preferences have been updated.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  // App Store Guideline 5.1.1 — account deletion must be available in-app.
  function confirmDelete() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your profile, matches, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              await logout(); // clears token → routes back to auth
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: theme.spacing(5) }}>
      <Text style={styles.section}>Appearance</Text>
      <View style={styles.chips}>
        {[
          { key: 'system', label: 'System' },
          { key: 'light', label: 'Light' },
          { key: 'dark', label: 'Dark' },
        ].map((m) => (
          <Pressable
            key={m.key}
            style={[styles.chip, pref === m.key && styles.chipActive]}
            onPress={() => setPref(m.key)}
          >
            <Text style={[styles.chipText, pref === m.key && styles.chipTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Show me</Text>
      <View style={styles.chips}>
        {SHOW.map((s) => (
          <Pressable key={s.key} style={[styles.chip, show === s.key && styles.chipActive]} onPress={() => setShow(s.key)}>
            <Text style={[styles.chipText, show === s.key && styles.chipTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Age range</Text>
      <View style={styles.rangeRow}>
        <TextInput style={styles.smallInput} value={ageMin} onChangeText={setAgeMin} keyboardType="number-pad" />
        <Text style={styles.dash}>to</Text>
        <TextInput style={styles.smallInput} value={ageMax} onChangeText={setAgeMax} keyboardType="number-pad" />
      </View>

      <Text style={styles.section}>Max distance (km)</Text>
      <TextInput style={styles.smallInput} value={distance} onChangeText={setDistance} keyboardType="number-pad" />

      <Pressable style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Save preferences</Text>
      </Pressable>

      <View style={styles.divider} />

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
        <Text style={styles.deleteText}>Delete account</Text>
      </Pressable>

      <Text style={styles.legal}>
        By using this app you agree to our{' '}
        <Text style={styles.legalLink} onPress={() => navigation.navigate('Terms')}>Terms</Text>
        {' '}and{' '}
        <Text style={styles.legalLink} onPress={() => navigation.navigate('Privacy')}>Privacy Policy</Text>.
      </Text>
    </ScrollView>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    section: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginTop: spacing(5), marginBottom: spacing(2) },
    chips: { flexDirection: 'row', gap: spacing(2) },
    chip: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
    chipText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
    chipTextActive: { color: colors.text },
    rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
    smallInput: { backgroundColor: colors.surface, color: colors.text, borderRadius: radius.md, paddingHorizontal: spacing(4), paddingVertical: spacing(3), fontSize: 16, borderWidth: 1, borderColor: colors.border, width: 90 },
    dash: { color: colors.textDim },
    saveBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(3.5), alignItems: 'center', marginTop: spacing(6) },
    saveText: { color: '#04101f', fontWeight: '700', fontSize: 15 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing(6) },
    logoutBtn: { paddingVertical: spacing(3.5), alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
    logoutText: { color: colors.text, fontWeight: '600', fontSize: 15 },
    deleteBtn: { paddingVertical: spacing(3.5), alignItems: 'center', marginTop: spacing(3) },
    deleteText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
    legal: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: spacing(6), lineHeight: 18 },
    legalLink: { color: colors.accent, fontWeight: '700' },
  })
);
