// localpulse/app/src/screens/DiscoveryScreen.js
// People nearby — a grid of users. Tap a card to open their profile (where you
// can Message / Report / Block). Replaces the old swipe deck.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { api } from '../api/client.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';

const { width } = Dimensions.get('window');
const GAP = 12;
const COLS = 2;
const CARD_W = (width - GAP * (COLS + 1)) / COLS;

export default function DiscoveryScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      // Push a fresh location so results are geo-accurate, then fetch.
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          await api.updateLocation(pos.coords.longitude, pos.coords.latitude);
        }
      } catch { /* proceed without fresh location */ }

      const data = await api.getDiscovery();
      // Accept a few possible shapes: { users }, { people }, { deck }, or a bare array.
      const list = data.users ?? data.people ?? data.deck ?? (Array.isArray(data) ? data : []);
      setPeople(list);
    } catch (e) {
      setError(e?.message ?? 'Could not load people nearby');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  function openProfile(person) {
    navigation.navigate('Profile', { username: person.username, user: person });
  }

  function renderCard({ item }) {
    const photo = item.photos?.[0];
    const name = item.displayName || item.username || 'Someone';
    return (
      <Pressable style={styles.card} onPress={() => openProfile(item)}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Text style={styles.noPhotoText}>{name[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.label}>
          <Text style={styles.name} numberOfLines={1}>
            {name}{item.age ? `, ${item.age}` : ''}
          </Text>
          {item.neighborhood ? (
            <Text style={styles.meta} numberOfLines={1}>{item.neighborhood}</Text>
          ) : null}
        </View>
        {item.online ? <View style={styles.onlineDot} /> : null}
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Discover" navigation={navigation} />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.colors.accent} /></View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => String(item.id ?? item._id ?? item.username)}
          renderItem={renderCard}
          numColumns={COLS}
          columnWrapperStyle={{ paddingHorizontal: GAP, gap: GAP }}
          contentContainerStyle={{ paddingTop: GAP, paddingBottom: 32, gap: GAP }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error || 'No one nearby yet. Pull to refresh, or widen your distance in Settings.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const stylesFactory = (({ colors, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    card: {
      width: CARD_W, aspectRatio: 0.72, borderRadius: 16, overflow: 'hidden',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    photo: { width: '100%', height: '100%' },
    noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    noPhotoText: { color: colors.textDim, fontSize: 52, fontWeight: '800' },
    label: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: '#000000aa' },
    onlineDot: {
      position: 'absolute', top: 10, right: 10, width: 14, height: 14, borderRadius: 7,
      backgroundColor: '#3BD16F', borderWidth: 2, borderColor: '#fff',
    },
    name: { color: '#fff', fontSize: 15, fontWeight: '700' },
    meta: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 },
    empty: { color: colors.textDim, textAlign: 'center', marginTop: 80, paddingHorizontal: 40, lineHeight: 22 },
  })
);