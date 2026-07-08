// localpulse/app/src/screens/MatchesScreen.js
import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet, Alert } from 'react-native';
import { useProfileStore } from '../store/profileStore.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

export default function MatchesScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const matches = useProfileStore((s) => s.matches);
  const loadMatches = useProfileStore((s) => s.loadMatches);
  const unmatch = useProfileStore((s) => s.unmatch);

  const load = useCallback(() => { loadMatches().catch(() => {}); }, [loadMatches]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  function confirmUnmatch(m) {
    Alert.alert('Unmatch', `Unmatch ${m.user?.displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unmatch', style: 'destructive', onPress: () => unmatch(m.id) },
    ]);
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Matches" navigation={navigation} />
      <FlatList
        data={matches}
        keyExtractor={(m) => String(m.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: theme.spacing(3) }}
        contentContainerStyle={{ padding: theme.spacing(4), gap: theme.spacing(3) }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('Chat', {
                conversationId: item.conversationId,
                title: item.user?.displayName,
              })
            }
            onLongPress={() => confirmUnmatch(item)}
          >
            {item.user?.photos?.[0] ? (
              <Image source={{ uri: item.user.photos[0] }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.noPhoto]}>
                <Text style={styles.noPhotoText}>{(item.user?.displayName || '?')[0]}</Text>
              </View>
            )}
            <View style={styles.label}>
              <Text style={styles.name} numberOfLines={1}>
                {item.user?.displayName}{item.user?.age ? `, ${item.user.age}` : ''}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No matches yet. Head to Discover and start swiping.</Text>
        }
      />
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    card: { flex: 1, aspectRatio: 0.8, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    photo: { width: '100%', height: '100%' },
    noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    noPhotoText: { color: colors.textDim, fontSize: 48, fontWeight: '800' },
    label: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing(3), backgroundColor: '#000000aa' },
    name: { color: '#fff', fontSize: 15, fontWeight: '700' },
    empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing(20), paddingHorizontal: spacing(8), lineHeight: 22 },
  })
);