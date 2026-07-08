// localpulse/app/src/screens/ProfileScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useChatStore } from '../store/chatStore.js';
import { reportUserFlow, blockUserFlow } from '../lib/moderation.js';
import PostCard from '../components/PostCard.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

export default function ProfileScreen({ route, navigation }) {
  const styles = useStyles(stylesFactory);
  const username = route.params?.username;
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const openConversation = useChatStore((s) => s.openConversation);

  const load = useCallback(async () => {
    try {
      const { profile, posts } = await api.getProfile(username);
      setProfile(profile);
      setPosts(posts);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  const isMe = me && profile && me.username === profile.username;

  async function toggleFollow() {
    if (!profile) return;
    setBusy(true);
    try {
      if (profile.followedByMe) {
        await api.unfollow(profile.id);
        setProfile((p) => ({ ...p, followedByMe: false, followerCount: p.followerCount - 1 }));
      } else {
        await api.follow(profile.id);
        setProfile((p) => ({ ...p, followedByMe: true, followerCount: p.followerCount + 1 }));
      }
    } finally {
      setBusy(false);
    }
  }

  async function message() {
    const conversationId = await openConversation(profile.id);
    navigation.navigate('Chat', { conversationId, title: profile.displayName });
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.accent} /></View>;
  }
  if (!profile) {
    return <View style={styles.center}><Text style={styles.dim}>Profile not found.</Text></View>;
  }

  return (
    <FlatList
      style={styles.root}
      data={posts}
      keyExtractor={(p) => String(p.id)}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.handle}>@{profile.username}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          <View style={styles.stats}>
            <Text style={styles.stat}><Text style={styles.statNum}>{profile.followerCount}</Text> followers</Text>
            <Text style={styles.stat}><Text style={styles.statNum}>{profile.followingCount}</Text> following</Text>
          </View>

          {!isMe && (
            <>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, profile.followedByMe && styles.btnSecondary]}
                  onPress={toggleFollow}
                  disabled={busy}
                >
                  <Text style={[styles.btnText, profile.followedByMe && styles.btnTextSecondary]}>
                    {profile.followedByMe ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnSecondary]} onPress={message}>
                  <Text style={styles.btnTextSecondary}>Message</Text>
                </Pressable>
              </View>
              <View style={styles.modRow}>
                <Pressable onPress={() => reportUserFlow(profile)} hitSlop={6}>
                  <Text style={styles.modText}>Report</Text>
                </Pressable>
                <Pressable
                  onPress={() => blockUserFlow(profile, () => navigation.goBack())}
                  hitSlop={6}
                >
                  <Text style={[styles.modText, styles.modDanger]}>Block</Text>
                </Pressable>
              </View>
            </>
          )}
          {isMe && (
            <Pressable style={styles.savedLink} onPress={() => navigation.navigate('Saved')}>
              <Text style={styles.savedLinkText}>🔖 Saved posts</Text>
            </Pressable>
          )}
        </View>
      }
      renderItem={({ item }) => <PostCard post={item} onLike={() => {}} />}
      ListEmptyComponent={<Text style={styles.empty}>No posts yet.</Text>}
    />
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    dim: { color: colors.textDim },
    header: { padding: spacing(5), borderBottomWidth: 1, borderBottomColor: colors.border },
    name: { color: colors.text, fontSize: 24, fontWeight: '800' },
    handle: { color: colors.textDim, fontSize: 15, marginTop: spacing(1) },
    bio: { color: colors.text, fontSize: 15, marginTop: spacing(3), lineHeight: 21 },
    stats: { flexDirection: 'row', gap: spacing(5), marginTop: spacing(4) },
    stat: { color: colors.textDim, fontSize: 14 },
    statNum: { color: colors.text, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(4) },
    modRow: { flexDirection: 'row', gap: spacing(6), marginTop: spacing(4) },
    modText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
    modDanger: { color: colors.danger },
    savedLink: { marginTop: spacing(5), paddingVertical: spacing(3), backgroundColor: colors.surface, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    savedLinkText: { color: colors.text, fontSize: 15, fontWeight: '600' },
    btn: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(3), alignItems: 'center' },
    btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    btnText: { color: '#04101f', fontWeight: '700' },
    btnTextSecondary: { color: colors.text, fontWeight: '600' },
    empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing(8) },
  })
);
