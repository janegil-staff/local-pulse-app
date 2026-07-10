// localpulse/app/src/screens/ChatScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform,
  Image, Alert, ActivityIndicator, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore } from '../store/chatStore.js';
import { useAuth } from '../context/AuthContext.js';
import ScreenHeader from '../components/ScreenHeader.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

export default function ChatScreen({ route, navigation }) {
  const styles = useStyles(stylesFactory);
  const insets = useSafeAreaInsets();
  const { conversationId, title } = route.params;
  const { user: me } = useAuth();
  const messages = useChatStore((s) => s.messages);
  const typingUserId = useChatStore((s) => s.typingUserId);
  const sendingImage = useChatStore((s) => s.sendingImage);
  const enterConversation = useChatStore((s) => s.enterConversation);
  const leaveConversation = useChatStore((s) => s.leaveConversation);
  const send = useChatStore((s) => s.send);
  const sendImage = useChatStore((s) => s.sendImage);
  const emitTyping = useChatStore((s) => s.emitTyping);
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const [fullImage, setFullImage] = useState(null);
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

  async function attachImage() {
    if (sendingImage) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to send a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType ? ['images'] : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;

    // sendImage resolves to an error string, or null on success — the server
    // rejects photos in pending conversations, and that message lands here.
    const err = await sendImage(result.assets[0].uri);
    if (err) Alert.alert('Could not send', err);
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title={title || 'Chat'} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: theme.spacing(3), flexGrow: 1, justifyContent: 'flex-end' }}
          renderItem={({ item }) => {
            const mine = String(item.sender?.id) === String(me?.id);
            // Image bubbles drop the padding and background — the photo is the
            // bubble. Text bubbles are unchanged.
            if (item.imageUrl) {
              return (
                <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <Pressable onPress={() => setFullImage(item.imageUrl)}>
                    <Image source={{ uri: item.imageUrl }} style={styles.imageBubble} resizeMode="cover" />
                  </Pressable>
                </View>
              );
            }
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

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, theme.spacing(3)) }]}>
          <Pressable style={styles.attachBtn} onPress={attachImage} disabled={sendingImage}>
            {sendingImage
              ? <ActivityIndicator size="small" color={theme.colors.textDim} />
              : <Text style={styles.attachText}>＋</Text>}
          </Pressable>
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
      {/* Fullscreen viewer. `resizeMode="contain"` so a portrait photo isn't
          cropped — the bubble crops, the viewer must not. */}
      <Modal
        visible={!!fullImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullImage(null)}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setFullImage(null)}>
          <Image source={{ uri: fullImage }} style={styles.viewerImage} resizeMode="contain" />
          <View style={[styles.viewerClose, { top: insets.top + 12 }]}>
            <Text style={styles.viewerCloseText}>×</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const stylesFactory = (({ colors, spacing, radius }) =>
  StyleSheet.create({
    viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
    viewerImage: { width: '100%', height: '100%' },
    viewerClose: {
      position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
    },
    viewerCloseText: { color: '#fff', fontSize: 26, fontWeight: '300', marginTop: -3 },
    root: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    bubbleRow: { marginBottom: spacing(2), flexDirection: 'row' },
    rowMine: { justifyContent: 'flex-end' },
    rowTheirs: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '78%', paddingHorizontal: spacing(3.5), paddingVertical: spacing(2.5), borderRadius: radius.lg },
    bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
    bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
    imageBubble: { width: 220, height: 220, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
    msgText: { color: colors.text, fontSize: 15, lineHeight: 20 },
    msgTextMine: { color: '#fff' },
    typing: { color: colors.textDim, fontSize: 12, paddingHorizontal: spacing(4), paddingBottom: spacing(1), fontStyle: 'italic' },
    inputRow: { flexDirection: 'row', paddingHorizontal: spacing(3), paddingTop: spacing(3), gap: spacing(2), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, alignItems: 'flex-end' },
    attachBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    attachText: { color: colors.textDim, fontSize: 24, fontWeight: '300', marginTop: -2 },
    input: { flex: 1, backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.md, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), fontSize: 15, borderWidth: 1, borderColor: colors.border, maxHeight: 120 },
    sendBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing(4), height: 44, justifyContent: 'center' },
    sendText: { color: '#fff', fontWeight: '700' },
  })
);