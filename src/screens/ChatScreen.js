// localpulse/app/src/screens/ChatScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useChatStore } from '../store/chatStore.js';
import { useAuth } from '../context/AuthContext.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

export default function ChatScreen({ route }) {
  const styles = useStyles(stylesFactory);
  const { conversationId } = route.params;
  const { user: me } = useAuth();
  const messages = useChatStore((s) => s.messages);
  const typingUserId = useChatStore((s) => s.typingUserId);
  const enterConversation = useChatStore((s) => s.enterConversation);
  const leaveConversation = useChatStore((s) => s.leaveConversation);
  const send = useChatStore((s) => s.send);
  const emitTyping = useChatStore((s) => s.emitTyping);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    enterConversation(conversationId);
    return () => leaveConversation();
  }, [conversationId, enterConversation, leaveConversation]);

  useEffect(() => {
    if (messages.length) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  function submit() {
    if (!text.trim()) return;
    send(text);
    setText('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: theme.spacing(3) }}
        renderItem={({ item }) => {
          const mine = String(item.sender?.id) === String(me?.id);
          return (
            <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />
      {typingUserId ? <Text style={styles.typing}>typing…</Text> : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={theme.colors.textDim}
          value={text}
          onChangeText={(t) => { setText(t); emitTyping(); }}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={submit}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    bubbleRow: { marginBottom: spacing(2), flexDirection: 'row' },
    rowMine: { justifyContent: 'flex-end' },
    rowTheirs: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '78%', paddingHorizontal: spacing(3.5), paddingVertical: spacing(2.5), borderRadius: radius.lg },
    bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
    bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
    msgText: { color: colors.text, fontSize: 15, lineHeight: 20 },
    msgTextMine: { color: '#04101f' },
    typing: { color: colors.textDim, fontSize: 12, paddingHorizontal: spacing(4), paddingBottom: spacing(1), fontStyle: 'italic' },
    inputRow: { flexDirection: 'row', padding: spacing(3), gap: spacing(2), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
    input: { flex: 1, backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.md, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), fontSize: 15, borderWidth: 1, borderColor: colors.border, maxHeight: 120 },
    sendBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing(4), justifyContent: 'center' },
    sendText: { color: '#04101f', fontWeight: '700' },
  })
);
