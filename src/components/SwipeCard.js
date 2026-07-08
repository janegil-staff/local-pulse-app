// localpulse/app/src/components/SwipeCard.js
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

// Static profile card — no gestures, no reanimated. Like/pass is driven by the
// buttons in DiscoveryScreen, so this renders in Expo Go with zero native deps.
export default function SwipeCard({ card }) {
  const styles = useStyles(stylesFactory);
  const photo = card.photos?.[0];
  return (
    <View style={styles.card}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.noPhoto]}>
          <Text style={styles.noPhotoText}>{(card.displayName || '?')[0]}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>
          {card.displayName}{card.age ? `, ${card.age}` : ''}
        </Text>
        {card.neighborhood ? <Text style={styles.meta}>📍 {card.neighborhood}</Text> : null}
        {card.bio ? <Text style={styles.bio} numberOfLines={3}>{card.bio}</Text> : null}
        {card.interests?.length ? (
          <View style={styles.tags}>
            {card.interests.slice(0, 4).map((t) => (
              <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    card: {
      width: '100%', height: '100%',
      borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.border,
    },
    photo: { width: '100%', height: '100%' },
    noPhoto: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    noPhotoText: { color: colors.textDim, fontSize: 80, fontWeight: '800' },
    info: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing(5), backgroundColor: '#000000aa' },
    name: { color: '#fff', fontSize: 26, fontWeight: '800' },
    meta: { color: '#e8ecf1', fontSize: 14, marginTop: spacing(1) },
    bio: { color: '#dfe5ec', fontSize: 14, marginTop: spacing(2), lineHeight: 19 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(3) },
    tag: { backgroundColor: '#ffffff22', borderRadius: radius.sm, paddingHorizontal: spacing(2.5), paddingVertical: spacing(1) },
    tagText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  })
);
