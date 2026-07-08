// localpulse/app/src/screens/ConversationsScreen.js
// Messages inbox with a Messages / Requests toggle.
//  - Messages: accepted conversations (getConversations returns accepted only).
//  - Requests: pending conversations someone started with you; Accept to move
//    them into Messages.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useChatStore } from '../store/chatStore.js';
import { api } from '../api/client.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { theme, useStyles } from '../theme/theme.js';

export default function ConversationsScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const initSocket = useChatStore((s) => s.initSocket);

  const [tab, setTab] = useState('messages'); // 'messages' | 'requests'
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        api.getConversations().catch(() => ({ conversations: [] })),
        api.getRequests().catch(() => ({ requests: [] })),
      ]);
      setConversations(c.conversations ?? []);
      setRequests(r.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initSocket();
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [initSocket, load, navigation]);

  function openChat(item) {
    const other = item.participants[0];
    navigation.navigate('Chat', {
      conversationId: item.id,
      title: other?.displayName || other?.username,
    });
  }

  async function accept(item) {
    try {
      await api.acceptConversation(item.id);
      await load();
      setTab('messages');
      openChat(item);
    } catch {
      /* ignore; stays in requests */
    }
  }

  const data = tab === 'messages' ? conversations : requests;

  function renderItem({ item }) {
    const other = item.participants[0];
    const name = other?.displayName || other?.username || 'Someone';
    return (
      <Pressable style={styles.row} onPress={() => (tab === 'messages' ? openChat(item) : openChat(item))}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name[0]?.toUpperCase()}</Text>
          </View>
          {other?.online ? <View style={styles.onlineDot} /> : null}
        </View>
        <View style={styles.body}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || 'No messages yet'}</Text>
        </View>
        {tab === 'requests' && (
          <Pressable style={styles.acceptBtn} onPress={() => accept(item)}>
            <Text style={styles.acceptText}>Accept</Text>
          </Pressable>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Messages" navigation={navigation} />

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'messages' && styles.tabActive]} onPress={() => setTab('messages')}>
          <Text style={[styles.tabText, tab === 'messages' && styles.tabTextActive]}>Messages</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'requests' && styles.tabActive]} onPress={() => setTab('requests')}>
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
            Requests{requests.length ? ` (${requests.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.colors.accent} /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'messages'
                ? 'No conversations yet. Find people in Discover and say hi.'
                : 'No message requests right now.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const stylesFactory = (({ colors, spacing }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabs: { flexDirection: 'row', gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(3) },
    tab: { paddingVertical: spacing(2), paddingHorizontal: spacing(4), borderRadius: 20, backgroundColor: colors.surfaceAlt },
    tabActive: { backgroundColor: colors.accent },
    tabText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
    tabTextActive: { color: '#fff' },

    row: { flexDirection: 'row', alignItems: 'center', padding: spacing(4), borderBottomWidth: 1, borderBottomColor: colors.border },
    avatarWrap: { position: 'relative', marginRight: spacing(3) },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: colors.text, fontSize: 18, fontWeight: '700' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: '#3BD16F', borderWidth: 2, borderColor: colors.bg },
    body: { flex: 1 },
    name: { color: colors.text, fontSize: 16, fontWeight: '600' },
    preview: { color: colors.textDim, fontSize: 14, marginTop: spacing(1) },

    acceptBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: spacing(4), paddingVertical: spacing(2) },
    acceptText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing(20), paddingHorizontal: spacing(8), lineHeight: 22 },
  })
);