// localpulse/app/src/components/ChaInput.jsx
import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useChatStore } from '../store/chatStore.js';

export default function ChatInput({ styles }) {
  const [text, setText] = useState('');
  const send = useChatStore((s) => s.send);

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    send(trimmed);
    setText('');
  }, [text, send]);

  return (
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Skriv en melding…"
        multiline
        onSubmitEditing={submit}
      />
      <TouchableOpacity style={styles.sendBtn} onPress={submit}>
        <Text style={styles.sendText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}
