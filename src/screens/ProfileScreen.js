// localpulse/app/src/screens/ProfileScreen.js
// Public profile — view another user, reached via navigation.navigate('Profile', { username }).
// Fetches by username, shows photos/bio/age/neighborhood, with Message + Report/Block.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet, Pressable, Alert,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { api } from '../api/client.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';

const { width } = Dimensions.get('window');

const REPORT_REASONS = ['Inappropriate photos', 'Harassment', 'Spam or scam', 'Fake profile', 'Other'];

export default function ProfileScreen({ route, navigation }) {
  const styles = useStyles(stylesFactory);
  const username = route?.params?.username;

  const [profile, setProfile] = useState(route?.params?.user ?? null);
  const [loading, setLoading] = useState(!route?.params?.user);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!username) { setError('No user specified'); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const data = await api.getProfile(username);
      setProfile(data.profile ?? data.user ?? data);
    } catch (e) {
      setError(e?.message ?? 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { if (!profile) load(); }, [load, profile]);

  const userId = profile?.id ?? profile?._id;

  async function message() {
    try {
      const convo = await api.openConversation(userId);
      navigation.navigate('Chat', {
        conversationId: convo.id ?? convo.conversationId ?? convo._id,
        title: profile?.displayName || profile?.username,
      });
    } catch (e) {
      Alert.alert('Could not open chat', e?.message ?? 'Try again.');
    }
  }

  function confirmBlock() {
    Alert.alert(
      'Block user',
      `Block ${profile?.displayName || profile?.username}? They won't be able to see you or message you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.blockUser(userId);
              Alert.alert('Blocked', 'You will no longer see this person.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e) {
              Alert.alert('Error', e?.message ?? 'Could not block.');
            }
          },
        },
      ]
    );
  }

  function report() {
    const buttons = REPORT_REASONS.map((reason) => ({
      text: reason,
      onPress: async () => {
        try {
          await api.reportUser(userId, reason);
          Alert.alert('Reported', 'Thanks — our team will review this profile.');
        } catch (e) {
          Alert.alert('Error', e?.message ?? 'Could not send report.');
        }
      },
    }));
    Alert.alert('Report user', 'Why are you reporting this profile?', [
      ...buttons,
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function moreActions() {
    Alert.alert(profile?.displayName || profile?.username || 'User', undefined, [
      { text: 'Report', onPress: report },
      { text: 'Block', style: 'destructive', onPress: confirmBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Profile" onBack={() => navigation.goBack()} />
        <View style={styles.centered}><ActivityIndicator color={theme.colors.accent} /></View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Profile" onBack={() => navigation.goBack()} />
        <View style={styles.centered}><Text style={styles.errorText}>{error || 'Profile not found'}</Text></View>
      </View>
    );
  }

  const photos = profile.photos || [];
  const name = profile.displayName || profile.username || 'Someone';

  return (
    <View style={styles.screen}>
      <ScreenHeader title={profile.username || 'Profile'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing(10) }}>
        {photos.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {photos.map((uri, i) => (
              <Image key={`${uri}-${i}`} source={{ uri }} style={styles.photo} />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Text style={styles.noPhotoText}>{name[0]?.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.name}>
            {name}{profile.age ? `, ${profile.age}` : ''}
          </Text>
          {profile.neighborhood ? (
            <Text style={styles.neighborhood}>{profile.neighborhood}</Text>
          ) : null}

          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {Array.isArray(profile.interests) && profile.interests.length > 0 && (
            <View style={styles.interests}>
              {profile.interests.map((tag) => (
                <View key={tag} style={styles.chip}><Text style={styles.chipText}>{tag}</Text></View>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.messageBtn} onPress={message}>
              <Text style={styles.messageText}>Message</Text>
            </Pressable>
            <Pressable style={styles.moreBtn} onPress={moreActions}>
              <Text style={styles.moreText}>•••</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(8) },
    errorText: { color: colors.textDim, fontSize: 15, textAlign: 'center' },

    photo: { width, height: width, backgroundColor: colors.surface },
    noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    noPhotoText: { color: colors.textDim, fontSize: 72, fontWeight: '800' },

    body: { padding: spacing(5) },
    name: { color: colors.text, fontSize: 26, fontWeight: '800' },
    neighborhood: { color: colors.textDim, fontSize: 15, marginTop: spacing(1) },
    bio: { color: colors.text, fontSize: 16, lineHeight: 23, marginTop: spacing(4) },

    interests: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(4) },
    chip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5), borderWidth: 1, borderColor: colors.border },
    chipText: { color: colors.textDim, fontSize: 13 },

    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginTop: spacing(7) },
    messageBtn: { flex: 1, height: 52, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    messageText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    moreBtn: { width: 52, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    moreText: { color: colors.textDim, fontSize: 20, fontWeight: '700' },
  })
);