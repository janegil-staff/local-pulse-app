// localpulse/app/src/screens/SettingsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert, ScrollView, Switch, TextInput, StatusBar, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client.js';
import { useProfileStore } from '../store/profileStore.js';
import { useAuth } from '../context/AuthContext.js';
import { useThemeMode } from '../theme/ThemeContext.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';
import Svg, { Path, Polyline, Line } from 'react-native-svg';

// Standard "log out" icon (door with arrow out), matching the screenshot.
function LogOutIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  );
}

const SHOW = [
  { key: 'women', label: 'Women' },
  { key: 'men', label: 'Men' },
  { key: 'everyone', label: 'Everyone' },
];

// ── Reusable rows (Recover pattern) ──────────────────────────────
function Row({ label, value, onPress, danger, last }) {
  const styles = useStyles(stylesFactory);
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

function ToggleRow({ label, value, onValueChange, last }) {
  const styles = useStyles(stylesFactory);
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

function Section({ title, children }) {
  const styles = useStyles(stylesFactory);
  return (
    <View style={styles.sectionWrap}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.section}>{children}</View>
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((s) => s.profile);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const { logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Log out?', 'You\u2019ll need your email and PIN to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  }
  const { pref, setPref } = useThemeMode();

  const [show, setShow] = useState('everyone');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('99');
  const [distance, setDistance] = useState('50');

  // Inline username edit
  const [usernameModal, setUsernameModal] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const isDark = pref === 'dark' || (pref === 'system' && theme.mode === 'dark');

  useEffect(() => { loadProfile(); }, [loadProfile]);
  // Refetch on focus: returning from LocationPicker changes locationName /
  // locationMode on the server, and the row above reads them.
  useEffect(
    () => navigation.addListener('focus', loadProfile),
    [navigation, loadProfile],
  );
  useEffect(() => {
    if (profile?.preferences) {
      const p = profile.preferences;
      setShow(p.show || 'everyone');
      setAgeMin(String(p.ageMin ?? 18));
      setAgeMax(String(p.ageMax ?? 99));
      setDistance(String(p.maxDistanceKm ?? 50));
    }
  }, [profile]);

  function openUsernameEdit() {
    setUsernameDraft(profile?.username || '');
    setUsernameError('');
    setUsernameModal(true);
  }

  async function saveUsername() {
    const uname = usernameDraft.trim();
    setUsernameError('');
    if (uname.length < 3 || uname.length > 24) {
      setUsernameError('Username must be 3 to 24 characters.');
      return;
    }
    if (uname === profile?.username) { setUsernameModal(false); return; }
    setUsernameSaving(true);
    try {
      await api.updateMyProfile({ username: uname });
      await loadProfile();
      setUsernameModal(false);
    } catch (e) {
      setUsernameError(e?.message ?? 'Could not change username.');
    } finally {
      setUsernameSaving(false);
    }
  }

  async function savePrefs(patch) {
    try {
      await savePreferences(patch);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  function cycleShow() {
    const idx = SHOW.findIndex((s) => s.key === show);
    const next = SHOW[(idx + 1) % SHOW.length];
    setShow(next.key);
    savePrefs({ show: next.key });
  }

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
              await logout();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  const showLabel = SHOW.find((s) => s.key === show)?.label ?? 'Everyone';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenHeader
        title="Settings"
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={confirmLogout} hitSlop={12}>
            <LogOutIcon />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.root}
        contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: insets.bottom + theme.spacing(10) }}
      >
        {/* Account */}
        <Section title="ACCOUNT">
          <Row label="Username" value={profile?.username || '—'} onPress={openUsernameEdit} last={false} />
          <Row
            label="Email"
            value={profile?.email || '—'}
            onPress={() => navigation.navigate('ChangeEmail')}
            last={false}
          />
          {/* Where you appear to be. Browsing elsewhere is on the Discover header. */}
          <Row
            label="Your location"
            value={
              profile?.locationMode === 'manual'
                ? (profile?.locationName || 'Set manually')
                : 'Using GPS'
            }
            onPress={() => navigation.navigate('LocationPicker', { mode: 'home' })}
            last
          />
        </Section>

        {/* Appearance */}
        <Section title="APPEARANCE">
          <ToggleRow
            label="Dark mode"
            value={isDark}
            onValueChange={(v) => setPref(v ? 'dark' : 'light')}
            last={false}
          />
          <Row
            label="Use system setting"
            value={pref === 'system' ? 'On' : 'Off'}
            onPress={() => setPref(pref === 'system' ? (isDark ? 'dark' : 'light') : 'system')}
            last
          />
        </Section>

        {/* Discovery */}
        <Section title="DISCOVERY">
          <Row label="Show me" value={showLabel} onPress={cycleShow} last={false} />
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.rowLabel}>Age range</Text>
            <View style={styles.rangeRight}>
              <TextInput
                style={styles.rangeInput}
                value={ageMin}
                onChangeText={setAgeMin}
                onBlur={() => savePrefs({ ageMin: Number(ageMin) })}
                keyboardType="number-pad"
              />
              <Text style={styles.rangeDash}>–</Text>
              <TextInput
                style={styles.rangeInput}
                value={ageMax}
                onChangeText={setAgeMax}
                onBlur={() => savePrefs({ ageMax: Number(ageMax) })}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Max distance (km)</Text>
            <TextInput
              style={styles.rangeInput}
              value={distance}
              onChangeText={setDistance}
              onBlur={() => savePrefs({ maxDistanceKm: Number(distance) })}
              keyboardType="number-pad"
            />
          </View>
        </Section>

        {/* Legal */}
        <Section title="LEGAL">
          <Row label="Terms of Service" onPress={() => navigation.navigate('Terms')} last={false} />
          <Row label="Privacy Policy" onPress={() => navigation.navigate('Privacy')} last />
        </Section>

        {/* Danger zone */}
        <Section>
          <Row label="Log out" onPress={logout} last={false} />
          <Row label="Delete account" onPress={confirmDelete} danger last />
        </Section>

        <Text style={styles.version}>Nearby</Text>
      </ScrollView>

      <Modal visible={usernameModal} transparent animationType="fade" onRequestClose={() => setUsernameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Change username</Text>
            <TextInput
              style={styles.modalInput}
              value={usernameDraft}
              onChangeText={setUsernameDraft}
              autoCapitalize="none"
              autoFocus
              placeholder="Username"
              placeholderTextColor={theme.colors.textDim}
              selectionColor={theme.colors.accent}
            />
            {!!usernameError && <Text style={styles.modalError}>{usernameError}</Text>}
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setUsernameModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSave, usernameDraft.trim().length < 3 && styles.modalSaveDisabled]}
                onPress={usernameDraft.trim().length >= 3 && !usernameSaving ? saveUsername : undefined}
              >
                {usernameSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
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
    rowLabelDanger: { color: colors.danger, fontWeight: '600' },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
    rowValue: { color: colors.textDim, fontSize: 15 },
    chevron: { color: colors.textDim, fontSize: 22, fontWeight: '300' },

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