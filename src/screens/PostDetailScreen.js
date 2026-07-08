// localpulse/app/src/screens/PostDetailScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { api } from '../api/client.js';
import { useFeedStore } from '../store/feedStore.js';
import PostCard from '../components/PostCard.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

export default function PostDetailScreen({ route }) {
  const styles = useStyles(stylesFactory);
  const { post: initialPost } = route.params;
  const [post] = useState(initialPost);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const toggleLike = useFeedStore((s) => s.toggleLike);

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
    const t = text.trim();
    if (!t) return;
    setText('');
    try {
      const { comment } = await api.addComment(post.id, t);
      setComments((c) => [...c, comment]);
    } catch {
      setText(t); // restore on failure
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={comments}
        keyExtractor={(c) => String(c.id)}
        ListHeaderComponent={
          <View>
            <PostCard post={post} onLike={toggleLike} />
            <Text style={styles.heading}>
              {loading ? 'Loading comments…' : `Comments (${comments.length})`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.commentAuthor}>
              {item.author?.displayName || item.author?.username}
            </Text>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No comments yet — start the conversation.</Text> : null
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment…"
          placeholderTextColor={theme.colors.textDim}
          value={text}
          onChangeText={setText}
          maxLength={500}
        />
        <Pressable style={styles.sendBtn} onPress={submit}>
          <Text style={styles.sendText}>Send</Text>
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
    inputRow: { flexDirection: 'row', padding: spacing(3), gap: spacing(2), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
    input: { flex: 1, backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.md, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), fontSize: 15, borderWidth: 1, borderColor: colors.border },
    sendBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing(4), justifyContent: 'center' },
    sendText: { color: '#04101f', fontWeight: '700' },
  })
);
