// localpulse/app/src/components/PostCard.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme, makeStyles, useStyles, POST_TYPE_META } from '../theme/theme.js';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function PostCard({ post, onLike, onPress, onAuthorPress, onSave, onReport }) {
  const styles = useStyles(stylesFactory);
  const meta = POST_TYPE_META[post.type] || POST_TYPE_META.update;
  const Container = onPress ? Pressable : View;
  return (
    <Container style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{meta.emoji} {meta.label}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
      </View>

      <Pressable onPress={onAuthorPress} hitSlop={4}>
        <Text style={styles.author}>{post.author?.displayName || post.author?.username}</Text>
      </Pressable>
      <Text style={styles.text}>{post.text}</Text>

      {post.placeName ? <Text style={styles.place}>📍 {post.placeName}</Text> : null}

      <View style={styles.footer}>
        <Pressable style={styles.likeBtn} onPress={() => onLike(post.id)} hitSlop={8}>
          <Text style={[styles.likeGlyph, post.likedByMe && styles.liked]}>
            {post.likedByMe ? '♥' : '♡'}
          </Text>
          <Text style={styles.likeCount}>{post.likeCount}</Text>
        </Pressable>

        <View style={styles.footerRight}>
          {onSave ? (
            <Pressable onPress={() => onSave(post.id)} hitSlop={8}>
              <Text style={[styles.actionGlyph, post.savedByMe && styles.saved]}>
                {post.savedByMe ? '🔖' : '🔖'}
              </Text>
            </Pressable>
          ) : null}
          {onReport ? (
            <Pressable onPress={() => onReport(post)} hitSlop={8}>
              <Text style={styles.actionGlyph}>⋯</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Container>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing(4),
      marginHorizontal: spacing(4), marginBottom: spacing(3),
      borderWidth: 1, borderColor: colors.border,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(2) },
    badge: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: spacing(2.5), paddingVertical: spacing(1) },
    badgeText: { color: colors.text, fontSize: 12, fontWeight: '600' },
    time: { color: colors.textDim, fontSize: 12 },
    author: { color: colors.accent, fontSize: 14, fontWeight: '700', marginBottom: spacing(1) },
    text: { color: colors.text, fontSize: 15, lineHeight: 21 },
    place: { color: colors.textDim, fontSize: 13, marginTop: spacing(2) },
    footer: { flexDirection: 'row', marginTop: spacing(3), alignItems: 'center', justifyContent: 'space-between' },
    footerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(4) },
    actionGlyph: { fontSize: 18, color: colors.textDim },
    saved: { opacity: 1 },
    likeBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
    likeGlyph: { fontSize: 20, color: colors.textDim },
    liked: { color: colors.like },
    likeCount: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  })
);
