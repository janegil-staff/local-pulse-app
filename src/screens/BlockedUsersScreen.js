// src/screens/BlockedUsersScreen.js
//
// People you have blocked, with an Unblock action. Only YOUR blocks appear
// here — anyone who blocked you stays invisible, by design.
//
// NOTE: `t` from useLang() is a plain object of strings, not a function.
// Access keys as t.someKey — never t('someKey').
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, Image, Pressable, StyleSheet, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { api } from '../api/client.js';
import { useLang } from '../context/LangContext.js';
import { theme, useStyles } from '../theme/theme.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { avatarSource } from '../lib/avatar.js';

export default function BlockedUsersScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const { t } = useLang();

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // ids currently mid-unblock, so the row can show a spinner and the button
  // can't be double-tapped into two DELETEs.
  const [pending, setPending] = useState([]);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.getBlocked();
      setPeople(data.blocked ?? []);
    } catch (e) {
      setError(e?.message || t.couldntLoadBlocked);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  function confirmUnblock(person) {
    const name = person.displayName || person.username;
    Alert.alert(t.unblockTitle, `${t.unblockBody} ${name}`, [
      { text: t.cancel, style: 'cancel' },
      { text: t.unblock, onPress: () => unblock(person) },
    ]);
  }

  async function unblock(person) {
    const id = person.id ?? person._id;
    setPending((p) => [...p, String(id)]);
    try {
      await api.unblockUser(id);
      // Drop locally rather than refetching — the list is small and the
      // server has no other state to reconcile.
      setPeople((list) => list.filter((u) => String(u.id ?? u._id) !== String(id)));
    } catch (e) {
      Alert.alert(t.couldntUnblock, e?.message || t.tryAgain);
    } finally {
      setPending((p) => p.filter((x) => x !== String(id)));
    }
  }

  function renderRow({ item }) {
    console.log(item); 
    const id = String(item.id);
    const busy = pending.includes(id);
    return (
      <View style={styles.row}>
        {/* Deliberately not tappable. Opening the profile of someone you
            blocked is not a thing you should be able to do from here — and
            the server 404s it anyway. */}
        <Image source={avatarSource(item)} style={styles.avatar} />
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>
            {item.displayName || item.username}
          </Text>
          {item.displayName && item.username ? (
            <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
          ) : null}
        </View>
        <Pressable
          style={styles.unblockBtn}
          onPress={busy ? undefined : () => confirmUnblock(item)}
          disabled={busy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {busy
            ? <ActivityIndicator size="small" color={theme.colors.accent} />
            : <Text style={styles.unblockText}>{t.unblock}</Text>}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title={t.blockedUsersTitle} onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => String(item.id ?? item._id ?? item.username)}
          renderItem={renderRow}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.empty}>{error || t.noBlockedUsers}</Text>
            </View>
          }
          ListFooterComponent={
            people.length > 0 ? <Text style={styles.footnote}>{t.unblockNote}</Text> : null
          }
        />
      )}
    </View>
  );
}

const stylesFactory = (({ colors, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },

    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt },
    rowText: { flex: 1 },
    name: { color: colors.text, fontSize: 16, fontWeight: '600' },
    username: { color: colors.textDim, fontSize: 13, marginTop: 1 },

    unblockBtn: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.accent, minWidth: 88, alignItems: 'center',
    },
    unblockText: { color: colors.accent, fontSize: 14, fontWeight: '700' },

    empty: { color: colors.textDim, fontSize: 15, textAlign: 'center', lineHeight: 22 },
    footnote: {
      color: colors.textDim, fontSize: 12, lineHeight: 18,
      paddingHorizontal: 20, paddingTop: 20, textAlign: 'center',
    },
  })
);