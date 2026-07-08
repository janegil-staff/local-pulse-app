// localpulse/app/src/screens/SettingsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert, ScrollView, Switch, TextInput, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client.js';
import { useProfileStore } from '../store/profileStore.js';
import { useAuth } from '../context/AuthContext.js';
import { useThemeMode } from '../theme/ThemeContext.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';

const SHOW = [
  { key: 'female', label: 'Women' },
  { key: 'male', label: 'Men' },
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
  const { pref, setPref } = useThemeMode();

  const [show, setShow] = useState('everyone');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('99');
  const [distance, setDistance] = useState('50');

  const isDark = pref === 'dark' || (pref === 'system' && theme.mode === 'dark');

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
      />

      <ScrollView
        style={styles.root}
        contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: insets.bottom + theme.spacing(10) }}
      >
        {/* Account */}
        <Section title="ACCOUNT">
          <Row label="Username" value={profile?.username || '—'} last={false} />
          <Row
            label="Email"
            value={profile?.email || '—'}
            onPress={() => navigation.navigate('ChangeEmail')}
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
  })
);