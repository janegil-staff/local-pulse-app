// localpulse/app/src/screens/ConversationsScreen.js
import React, { useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useChatStore } from '../store/chatStore.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

export default function ConversationsScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const initSocket = useChatStore((s) => s.initSocket);

  useEffect(() => {
    initSocket();
    loadConversations().catch(() => {});
  }, [initSocket, loadConversations]);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Messages" onBack={() => navigation.goBack()} />
      <FlatList
        data={conversations}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => {
          const other = item.participants[0];
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate('Chat', {
                  conversationId: item.id,
                  title: other?.displayName || other?.username,
                })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(other?.displayName || other?.username || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>{other?.displayName || other?.username}</Text>
                <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || 'No messages yet'}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No conversations yet. Message someone from their profile.</Text>
        }
      />
    </View>
  );
}

const stylesFactory = (({ colors, spacing }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    row: { flexDirection: 'row', alignItems: 'center', padding: spacing(4), borderBottomWidth: 1, borderBottomColor: colors.border },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center', marginRight: spacing(3) },
    avatarText: { color: colors.text, fontSize: 18, fontWeight: '700' },
    body: { flex: 1 },
    name: { color: colors.text, fontSize: 16, fontWeight: '600' },
    preview: { color: colors.textDim, fontSize: 14, marginTop: spacing(1) },
    empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing(20), paddingHorizontal: spacing(8), lineHeight: 22 },
  })
);