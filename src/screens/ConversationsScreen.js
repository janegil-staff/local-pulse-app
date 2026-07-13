// localpulse/app/src/screens/ConversationsScreen.js
//
// Messages inbox with a Messages / Requests toggle.
//  - Messages: accepted conversations (getConversations returns accepted only).
//  - Requests: pending conversations someone started with you; Accept to move
//    them into Messages.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { api } from '../api/client.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { theme, useStyles } from '../theme/theme.js';
import { avatarSource } from '../lib/avatar.js';
import { useLang } from '../context/LangContext.js';

export default function ConversationsScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const { t } = useLang();
  const [tab, setTab] = useState('messages');
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

  async function accept(conversationId) {
    try {
      await api.acceptConversation(conversationId);
      load();
    } catch {
      /* ignore */
    }
  }

  const data = tab === 'messages' ? conversations : requests;

  const renderItem = ({ item }) => (
    <Pressable
      style={styles.row}
      onPress={() =>
        navigation.navigate('Chat', {
          conversationId: item.id,
          title: item.otherUser?.displayName || item.otherUser?.username,
        })
      }
    >
      <Image source={avatarSource(item.otherUser)} style={styles.avatar} />
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {item.otherUser?.displayName || item.otherUser?.username}
        </Text>
        <Text style={[styles.preview, item.unread > 0 && styles.previewUnread]} numberOfLines={1}>
          {item.lastMessage || t.noMessagesYet || 'No messages yet'}
        </Text>
      </View>
      {tab === 'requests' ? (
        <Pressable style={styles.acceptBtn} onPress={() => accept(item.id)}>
          <Text style={styles.acceptText}>{t.accept || 'Accept'}</Text>
        </Pressable>
      ) : item.unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title={t.messages || 'Messages'} onBack={() => navigation.goBack()} />

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'messages' && styles.tabActive]}
          onPress={() => setTab('messages')}
        >
          <Text style={[styles.tabText, tab === 'messages' && styles.tabTextActive]}>
            {t.messages || 'Messages'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'requests' && styles.tabActive]}
          onPress={() => setTab('requests')}
        >
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
            {t.requests || 'Requests'}{requests.length ? ` (${requests.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.accent} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={data.length === 0 ? { flex: 1 } : undefined}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'messages'
                ? (t.noConversations || 'No conversations yet. Find people in Discover and say hi.')
                : (t.noRequests || 'No requests right now.')}
            </Text>
          }
        />
      )}
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    tabs: { flexDirection: 'row', paddingHorizontal: spacing(4), gap: spacing(2), marginTop: spacing(2), marginBottom: spacing(2) },
    tab: { paddingVertical: spacing(2), paddingHorizontal: spacing(4), borderRadius: radius.lg },
    tabActive: { backgroundColor: colors.accent },
    tabText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(4), paddingVertical: spacing(3), gap: spacing(3) },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceAlt },
    rowText: { flex: 1 },
    name: { color: colors.text, fontSize: 16, fontWeight: '600' },
    preview: { color: colors.textDim, fontSize: 14, marginTop: 2 },
    previewUnread: { color: colors.text, fontWeight: '600' },
    acceptBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radius.md },
    acceptText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing(20), paddingHorizontal: spacing(8), lineHeight: 22 },
  })
);