// localpulse/app/src/screens/DiscoveryScreen.js
import React, { useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import * as Location from 'expo-location';
import { useDiscoveryStore } from '../store/discoveryStore.js';
import { api } from '../api/client.js';
import SwipeCard from '../components/SwipeCard.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';
export default function DiscoveryScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const deck = useDiscoveryStore((s) => s.deck);
  const loading = useDiscoveryStore((s) => s.loading);
  const error = useDiscoveryStore((s) => s.error);
  const lastMatch = useDiscoveryStore((s) => s.lastMatch);
  const loadDeck = useDiscoveryStore((s) => s.loadDeck);
  const swipe = useDiscoveryStore((s) => s.swipe);
  const clearMatch = useDiscoveryStore((s) => s.clearMatch);

  // Push location so discovery is geo-accurate, then load the deck.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          await api.updateLocation(pos.coords.longitude, pos.coords.latitude);
        }
      } catch {
        /* proceed without fresh location */
      } finally {
        loadDeck();
      }
    })();
  }, [loadDeck]);

  // Top card is the LAST item so it renders above the rest in the stack.
  const top = deck[deck.length - 1];

  const onButtonSwipe = useCallback(
    (action) => { if (top) swipe(top.id, action); },
    [top, swipe]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScreenHeader title="Discover" navigation={navigation} />

      <View style={styles.deck}>
        {loading && deck.length === 0 ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : deck.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No one new nearby</Text>
            <Text style={styles.emptyBody}>
              {error || 'Check back later, or widen your distance in settings.'}
            </Text>
            <Pressable style={styles.reload} onPress={loadDeck}>
              <Text style={styles.reloadText}>Reload</Text>
            </Pressable>
          </View>
        ) : (
          <SwipeCard card={top} />
        )}
      </View>

      {deck.length > 0 && (
        <View style={styles.actions}>
          <Pressable style={[styles.circle, styles.pass]} onPress={() => onButtonSwipe('pass')}>
            <Text style={styles.passGlyph}>✕</Text>
          </Pressable>
          <Pressable style={[styles.circle, styles.like]} onPress={() => onButtonSwipe('like')}>
            <Text style={styles.likeGlyph}>♥</Text>
          </Pressable>
        </View>
      )}

      {/* It's a match! modal */}
      {lastMatch && (
        <View style={styles.matchOverlay}>
          <Text style={styles.matchTitle}>It's a match!</Text>
          {lastMatch.user?.photos?.[0] ? (
            <Image source={{ uri: lastMatch.user.photos[0] }} style={styles.matchPhoto} />
          ) : null}
          <Text style={styles.matchName}>You and {lastMatch.user?.displayName} liked each other</Text>
          <Pressable
            style={styles.matchBtn}
            onPress={() => {
              clearMatch();
              navigation.navigate('Chat', {
                conversationId: lastMatch.conversationId,
                title: lastMatch.user?.displayName,
              });
            }}
          >
            <Text style={styles.matchBtnText}>Send a message</Text>
          </Pressable>
          <Pressable onPress={clearMatch}>
            <Text style={styles.matchDismiss}>Keep swiping</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, padding: spacing(4) },
    title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: spacing(3) },
    deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', padding: spacing(6) },
    emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    emptyBody: { color: colors.textDim, fontSize: 14, marginTop: spacing(2), textAlign: 'center', lineHeight: 20 },
    reload: { marginTop: spacing(5), backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing(6), paddingVertical: spacing(3) },
    reloadText: { color: '#04101f', fontWeight: '700' },
    actions: { flexDirection: 'row', justifyContent: 'center', gap: spacing(10), paddingVertical: spacing(5) },
    circle: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    pass: { borderColor: colors.danger, backgroundColor: colors.surface },
    like: { borderColor: colors.success, backgroundColor: colors.surface },
    passGlyph: { color: colors.danger, fontSize: 28, fontWeight: '700' },
    likeGlyph: { color: colors.success, fontSize: 30 },
    matchOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: spacing(8) },
    matchTitle: { color: colors.accent, fontSize: 34, fontWeight: '900', marginBottom: spacing(5) },
    matchPhoto: { width: 140, height: 140, borderRadius: 70, marginBottom: spacing(4) },
    matchName: { color: colors.text, fontSize: 16, textAlign: 'center', marginBottom: spacing(6) },
    matchBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing(8), paddingVertical: spacing(3.5) },
    matchBtnText: { color: '#04101f', fontWeight: '700', fontSize: 16 },
    matchDismiss: { color: colors.textDim, marginTop: spacing(4), fontSize: 14 },
  })
);