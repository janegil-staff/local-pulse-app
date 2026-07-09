// localpulse/app/src/screens/SettingsScreen.js
import React from 'react';
import { View, Text, Pressable, Alert, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useThemeMode } from '../theme/ThemeContext.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { Row, ToggleRow, Section, settingsStyles } from '../components/SettingsRows.js';
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

export default function SettingsScreen({ navigation }) {
  const styles = useStyles(settingsStyles);
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { pref, setPref } = useThemeMode();

  const isDark = pref === 'dark' || (pref === 'system' && theme.mode === 'dark');

  function confirmLogout() {
    Alert.alert('Log out?', 'You\u2019ll need your email and PIN to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
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
        {/* Account + Discovery moved here — this screen was getting long. */}
        <Section>
          <Row
            label="Personal settings"
            onPress={() => navigation.navigate('PersonalSettings')}
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

        {/* Legal */}
        <Section title="LEGAL">
          <Row label="Terms of Service" onPress={() => navigation.navigate('Terms')} last={false} />
          <Row label="Privacy Policy" onPress={() => navigation.navigate('Privacy')} last />
        </Section>

        {/* Danger zone */}
        <Section>
          <Row label="Log out" onPress={confirmLogout} last={false} />
          <Row label="Delete account" onPress={confirmDelete} danger last />
        </Section>

        <Text style={styles.version}>LocalPulse</Text>
      </ScrollView>
    </View>
  );
}