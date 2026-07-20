// src/screens/PostDetailScreen.js
//
// NOTE: `t` from useLang() is a plain object of strings, not a function.
// Access keys as t.someKey — never t('someKey').
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client.js';
import { useLang } from '../context/LangContext.js';
import { useFeedStore } from '../store/feedStore.js';
import PostCard from '../components/PostCard.js';
import { theme, useStyles } from '../theme/theme.js';

export default function PostDetailScreen({ route, navigation }) {
  const styles = useStyles(stylesFactory);
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { post: initialPost } = route.params;
  // Read the LIVE post from the store so likes/saves reflect here. The old code
  // froze a route-param snapshot in local state, so toggleLike updated the store
  // while this screen kept showing the stale copy — the like looked dead.
  // Fall back to the route-param snapshot if it isn't in the store.
  const storePost = useFeedStore((s) => s.posts.find((p) => p.id === initialPost.id));
  const post = storePost || initialPost;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const toggleLike = useFeedStore((s) => s.toggleLike);

  // Open a user's profile by username. Shared by the post author (via PostCard's
  // onAuthorPress) and each comment author. No-op if the username is missing.
  function openProfile(username) {
    if (!username) return;
    navigation.navigate('Profile', { username });
  }

  useEffect(() => {
    (async () => {
      try {
        const { comments } = await api.getComments(post.id);
        setComments(comments);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [post.id]);

  async function submit() {
    // NOT `t` — that's the translations object now.
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      const { comment } = await api.addComment(post.id, body);
      setComments((c) => [...c, comment]);
    } catch {
      setText(body); // restore on failure
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      <FlatList
        data={comments}
        keyExtractor={(c) => String(c.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: theme.spacing(2) }}
        ListHeaderComponent={
          <View>
            <PostCard
              post={post}
              onLike={toggleLike}
              onAuthorPress={() => openProfile(post.author?.username)}
            />
            <Text style={styles.heading}>
              {loading ? t.loadingComments : `${t.comments} (${comments.length})`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Pressable onPress={() => openProfile(item.author?.username)} hitSlop={6}>
              <Text style={styles.commentAuthor}>
                {item.author?.displayName || item.author?.username}
              </Text>
            </Pressable>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>{t.noComments}</Text> : null
        }
      />

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, theme.spacing(3)) }]}>
        <TextInput
          style={styles.input}
          placeholder={t.addComment}
          placeholderTextColor={theme.colors.textDim}
          value={text}
          onChangeText={setText}
          maxLength={500}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={submit}>
          <Text style={styles.sendText}>{t.send}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    heading: { color: colors.textDim, fontSize: 14, fontWeight: '600', paddingHorizontal: spacing(4), marginVertical: spacing(3) },
    comment: { paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), marginHorizontal: spacing(4), marginBottom: spacing(2), backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
    commentAuthor: { color: colors.accent, fontSize: 13, fontWeight: '700', marginBottom: spacing(1) },
    commentText: { color: colors.text, fontSize: 14, lineHeight: 19 },
    empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing(6) },
    inputRow: { flexDirection: 'row', paddingHorizontal: spacing(3), paddingTop: spacing(3), gap: spacing(2), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.md, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), fontSize: 15, borderWidth: 1, borderColor: colors.border, maxHeight: 120 },
    sendBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing(4), height: 44, justifyContent: 'center' },
    sendText: { color: '#04101f', fontWeight: '700' },
  })
);