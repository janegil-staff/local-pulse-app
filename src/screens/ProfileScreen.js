// src/screens/ProfileScreen.js
// Public profile — view another user. Hero photo gallery, info sections,
// online status, and Follow / Message / Report / Block actions.
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
import ReportSheet from '../components/ReportSheet.js';
import PostCard from '../components/PostCard.js';

const { width } = Dimensions.get('window');
const HERO_H = Math.round(width * 1.1);

export default function ProfileScreen({ route, navigation }) {
  const styles = useStyles(stylesFactory);
  const username = route?.params?.username;
  const { t, lang, setLang } = useLang();
  const [profile, setProfile] = useState(route?.params?.user ?? null);
  const [loading, setLoading] = useState(!route?.params?.user);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [posts, setPosts] = useState(route?.params?.user?.posts ?? []);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    // Discovery may navigate with only a `user` object, no separate `username`
    // param — fall back to the username carried on that object so we can still
    // fetch the full profile (which brings followerCount/followingCount + posts).
    const handle = username || route?.params?.user?.username;
    if (!handle) { setError('No user specified'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const data = await api.getProfile(handle);
      setProfile(data.profile ?? data.user ?? data);
      // getProfile returns the author's recent posts alongside the profile.
      // The old code read only data.profile and dropped these on the floor.
      if (Array.isArray(data.posts)) setPosts(data.posts);
    } catch (e) {
      setError(e?.message ?? 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, [username, route?.params?.user?.username]);

  // Always fetch the full profile when we have a username. A route-param `user`
  // (from feed or Discovery) is only a fast first paint and may lack fields the
  // full profile carries — notably followerCount/followingCount and posts. So
  // refetch unless we already hold a complete profile (photos + counts present).
  useEffect(() => {
    const complete = profile && profile.photos && profile.followerCount != null;
    if (!complete) load();
  }, [load, profile]);

  const userId = profile?.id ?? profile?._id;

  // ── Follow state ──────────────────────────────────────────
  // getProfile returns `followedByMe`; seed the button from it once the
  // profile loads, then toggle optimistically against the follow endpoints.
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (profile) setFollowing(Boolean(profile.followedByMe));
  }, [profile]);

  async function toggleFollow() {
    if (followBusy || !userId) return;
    setFollowBusy(true);
    const next = !following;
    setFollowing(next); // optimistic
    try {
      if (next) await api.follow(userId);
      else await api.unfollow(userId);
    } catch (e) {
      setFollowing(!next); // revert on failure
      Alert.alert(t.error || 'Error', e?.message || t.tryAgain || 'Try again.');
    } finally {
      setFollowBusy(false);
    }
  }

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

  // Submit handler for the report sheet. Receives the enum reason key and the
  // optional note; the sheet owns the UI and reason selection.
  async function submitReport(reason, note) {
    try {
      await api.reportUser(userId, reason, note); // enum key + optional note
      setReportOpen(false);
      Alert.alert(t.reportThanksTitle || 'Reported', t.reportThanks || 'Thanks — our team will review this profile.');
    } catch (e) {
      Alert.alert(t.error || 'Error', e?.message ?? t.couldntSend ?? 'Could not send report.');
    }
  }

  function moreActions() {
    Alert.alert(profile?.displayName || profile?.username || 'User', undefined, [
      { text: 'Report', onPress: () => setReportOpen(true) },
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

  // Like a post from the profile list. Optimistic local update — this screen
  // isn't backed by the feed store, so we toggle the post in local state and
  // call the API. Reverts if the request fails.
  async function likePost(postId) {
    setPosts((list) => list.map((p) =>
      p.id === postId
        ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
        : p));
    try {
      await api.toggleLike(postId);
    } catch {
      setPosts((list) => list.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p));
    }
  }

  function openPost(post) {
    navigation.navigate('PostDetail', { post });
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

        {/* Actions — Message / Follow / More (report + block), placed above the
            follower/following counts. */}
        <View style={styles.actions}>
          <Pressable style={styles.messageBtn} onPress={message}>
            <Text style={styles.messageText}>Message</Text>
          </Pressable>
          <Pressable
            style={[styles.followBtn, following && styles.followingBtn]}
            onPress={toggleFollow}
            disabled={followBusy}
          >
            <Text style={[styles.followText, following && styles.followingText]}>
              {following ? (t.following || 'Following') : (t.follow || 'Follow')}
            </Text>
          </Pressable>
          <Pressable style={styles.moreBtn} onPress={moreActions}>
            <Text style={styles.moreText}>•••</Text>
          </Pressable>
        </View>

        {/* Follower / following counts — shown on every profile (feed or
            Discovery). Defaults to 0 until the full profile loads. */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile.followerCount ?? 0}</Text>
            <Text style={styles.statLabel}>{t.followers || 'Followers'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile.followingCount ?? 0}</Text>
            <Text style={styles.statLabel}>{t.following || 'Following'}</Text>
          </View>
        </View>

        {/* About */}
        {profile.bio ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>About</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* Neighborhood — self-authored "local flavor", shown when present. */}
        {profile.neighborhood ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t.neighborhoodLabel || 'Neighborhood'}</Text>
            <Text style={styles.bio}>{profile.neighborhood}</Text>
          </View>
        ) : null}

        {/* Interests */}
        {Array.isArray(profile.interests) && profile.interests.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t.interests || 'Interests'}</Text>
            <View style={styles.chips}>
              {profile.interests.map((tag) => (
                <View key={tag} style={styles.chip}><Text style={styles.chipText}>{tag}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Posts — everything this user has written (most recent first).
            Reuses PostCard; tapping a card opens the post. Save/report/author
            actions are omitted since this is already the author's profile. */}
        {posts.length > 0 ? (
          <View style={styles.postsSection}>
            <Text style={styles.postsLabel}>{t.postsLabel || 'Posts'}</Text>
            {posts.map((p) => (
              <PostCard
                key={String(p.id)}
                post={p}
                onLike={likePost}
                onPress={() => openPost(p)}
              />
            ))}
          </View>
        ) : null}

      </ScrollView>

      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={submitReport}
        title={t.reportUserTitle || 'Report user'}
        prompt={t.reportWhy || 'Why are you reporting this profile?'}
      />
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

    stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 16, paddingVertical: 14, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
    stat: { flex: 1, alignItems: 'center' },
    statNum: { color: colors.text, fontSize: 20, fontWeight: '800' },
    statLabel: { color: colors.textDim, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
    statDivider: { width: 1, height: 32, backgroundColor: colors.border },

    card: { backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border },
    cardLabel: { color: colors.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
    bio: { color: colors.text, fontSize: 16, lineHeight: 23 },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
    chipText: { color: colors.text, fontSize: 14 },

    // Posts list. PostCard supplies its own horizontal margins, so the section
    // only owns the top spacing and the section label (aligned to the cards).
    postsSection: { marginTop: 24 },
    postsLabel: { color: colors.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginHorizontal: 16, marginBottom: 4 },

    actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 24 },
    messageBtn: { flex: 1, height: 54, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    messageText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    followBtn: { paddingHorizontal: 18, height: 54, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    followText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    followingText: { color: colors.text },
    moreBtn: { width: 54, height: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    moreText: { color: colors.textDim, fontSize: 20, fontWeight: '700' },
  })
);