// localpulse/app/src/screens/SavedScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api/client.js';
import { useFeedStore } from '../store/feedStore.js';
import PostCard from '../components/PostCard.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

export default function SavedScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toggleLike = useFeedStore((s) => s.toggleLike);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { posts } = await api.getSaved();
      setPosts(posts);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.accent} /></View>;
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingVertical: theme.spacing(3) }}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={toggleLike}
            onPress={() => navigation.navigate('PostDetail', { post: item })}
            onAuthorPress={() => navigation.navigate('Profile', { username: item.author?.username })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No saved posts yet. Tap the bookmark on a post to save it.</Text>
        }
      />
    </View>
  );
}

const stylesFactory = (({ colors, spacing }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing(20), paddingHorizontal: spacing(8), lineHeight: 22 },
  })
);
