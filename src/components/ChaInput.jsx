// local-pulse-app/src/components/ChatInput.js
import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { getSocket } from '../services/socket';

export default function ChatInput({ conversationId, styles }) {
  const [text, setText] = useState('');

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const socket = getSocket();
    if (!socket?.connected) return;
    socket.emit('message:send', { conversationId, text: trimmed });
    setText('');
  }, [text, conversationId]);

  return (
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Skriv en melding…"
        multiline
        onSubmitEditing={send}
      />
      <TouchableOpacity style={styles.sendBtn} onPress={send}>
        <Text style={styles.sendText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}