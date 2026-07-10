// src/screens/ProfileScreen.js
// Public profile — view another user. Hero photo gallery, info sections,
// online status, and Message / Report / Block actions.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet, Pressable, Alert,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../api/client.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { avatarSource } from '../lib/avatar.js';
import VerifiedBadge from '../components/VerifiedBadge.js';
import { useLang } from '../context/LangContext.js';

const { width } = Dimensions.get('window');
const HERO_H = Math.round(width * 1.1);
const REPORT_REASONS = ['Inappropriate photos', 'Harassment', 'Spam or scam', 'Fake profile', 'Other'];

export default function ProfileScreen({ route, navigation }) {
  const styles = useStyles(stylesFactory);
  const username = route?.params?.username;
  const { t, lang, setLang } = useLang();
  const [profile, setProfile] = useState(route?.params?.user ?? null);
  const [loading, setLoading] = useState(!route?.params?.user);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    if (!username) { setError('No user specified'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const data = await api.getProfile(username);
      setProfile(data.profile ?? data.user ?? data);
    } catch (e) {
      setError(e?.message ?? 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { if (!profile || !profile.photos) load(); }, [load, profile]);

  const userId = profile?.id ?? profile?._id;

  async function message() {
    try {
      const convo = await api.openConversation(userId);
      navigation.navigate('Chat', {
        conversationId: convo.conversationId ?? convo.id ?? convo._id,
        title: profile?.displayName || profile?.username,
      });
    } catch (e) {
      Alert.alert('Could not open chat', e?.message ?? 'Try again.');
    }
  }

  function confirmBlock() {
    Alert.alert('Block user', `Block ${profile?.displayName || profile?.username}? They won't be able to see you or message you.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive',
        onPress: async () => {
          try {
            await api.blockUser(userId);
            Alert.alert('Blocked', 'You will no longer see this person.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          } catch (e) { Alert.alert('Error', e?.message ?? 'Could not block.'); }
        },
      },
    ]);
  }

  function report() {
    const buttons = REPORT_REASONS.map((reason) => ({
      text: reason,
      onPress: async () => {
        try { await api.reportUser(userId, reason); Alert.alert('Reported', 'Thanks — our team will review this profile.'); }
        catch (e) { Alert.alert('Error', e?.message ?? 'Could not send report.'); }
      },
    }));
    Alert.alert('Report user', 'Why are you reporting this profile?', [...buttons, { text: 'Cancel', style: 'cancel' }]);
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

  // Photos are { url, publicId } objects. Guard against a bare string anyway:
  // this screen can be handed a `user` object via route params from Discover,
  // and an older cached one may still hold the flat form.
  const photos = (profile.photos || []).map((p) => (typeof p === 'string' ? { url: p } : p));
  const name = profile.displayName || profile.username || 'Someone';

  function onPhotoScroll(e) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== photoIndex) setPhotoIndex(i);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={profile.username || 'Profile'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero gallery */}
        <View style={styles.hero}>
          {photos.length > 0 ? (
            <ScrollView
              ref={scrollRef}
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onScroll={onPhotoScroll} scrollEventThrottle={16}
            >
              {photos.map((photo, i) => (
                <Image key={`${photo.url}-${i}`} source={{ uri: photo.url }} style={styles.heroImg} />
              ))}
            </ScrollView>
          ) : (
            <Image source={avatarSource(profile)} style={styles.heroImg} />
          )}

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.heroScrim} pointerEvents="none" />

          {/* photo dots */}
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* name + email badge + online */}
          <View style={styles.heroContent}>
            <View style={styles.nameRow}>

              <Text style={styles.heroName}>
                {name}{profile.age ? <Text style={styles.heroAge}>  {profile.age}</Text> : null}
              </Text>
              {/* VERIFIED_BADGE_V1 — envelope, not a checkmark. Confirming an
                  inbox proves control of an email address, not identity. */}
              {profile.emailVerified ? <VerifiedBadge size={22} /> : null}
              {profile.online ? (
                <View style={styles.onlinePill}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              ) : null}
            </View>
            {profile.locationName || profile.neighborhood || profile.distanceKm != null ? (
              <Text style={styles.heroMeta}>
                {profile.locationName || profile.neighborhood || ''}
                {(profile.locationName || profile.neighborhood) && profile.distanceKm != null ? '  ·  ' : ''}
                {profile.distanceKm != null ? `~${profile.distanceKm} km away` : ''}
              </Text>
            ) : null}
          </View>
        </View>

        {/* About */}
        {profile.bio ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>About</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* Interests */}
        {Array.isArray(profile.interests) && profile.interests.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Interests</Text>
            <View style={styles.chips}>
              {profile.interests.map((tag) => (
                <View key={tag} style={styles.chip}><Text style={styles.chipText}>{tag}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.messageBtn} onPress={message}>
            <Text style={styles.messageText}>Message</Text>
          </Pressable>
          <Pressable style={styles.moreBtn} onPress={moreActions}>
            <Text style={styles.moreText}>•••</Text>
          </Pressable>
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

    hero: { width, height: HERO_H, position: 'relative', backgroundColor: colors.surface },
    heroImg: { width, height: HERO_H },
    heroEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    heroEmptyText: { color: colors.textDim, fontSize: 88, fontWeight: '800' },
    heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },

    dots: { position: 'absolute', top: 14, alignSelf: 'center', flexDirection: 'row', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
    dotActive: { backgroundColor: '#fff', width: 18 },

    heroContent: { position: 'absolute', left: 20, right: 20, bottom: 18 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    heroName: { color: '#fff', fontSize: 30, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
    heroAge: { color: '#fff', fontSize: 26, fontWeight: '400' },
    heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
    onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3BD16F' },
    onlineText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    card: { backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border },
    cardLabel: { color: colors.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
    bio: { color: colors.text, fontSize: 16, lineHeight: 23 },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
    chipText: { color: colors.text, fontSize: 14 },

    actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 24 },
    messageBtn: { flex: 1, height: 54, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    messageText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    moreBtn: { width: 54, height: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    moreText: { color: colors.textDim, fontSize: 20, fontWeight: '700' },
  })
);