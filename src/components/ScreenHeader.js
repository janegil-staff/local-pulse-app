// src/components/ScreenHeader.js
//
// Shared blue app header. Two modes:
//
//  TAB screens (Feed, Discover, Matches, MyProfile):
//    <ScreenHeader title="Feed" navigation={navigation} />
//    -> shows ⚙ Settings (left) and ✉ Messages (right)
//
//  STACK screens (Chat, Profile, Settings, Messages, PostDetail, ...):
//    <ScreenHeader title="Chat" onBack={() => navigation.goBack()} />
//    -> shows a back arrow (left), no settings/messages icons
//
// The rule: pass `onBack` and you get a back arrow with NO icons (stack style).
// Omit `onBack` and you get the two icons (tab style). Simple and predictable.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme.js';

const C = theme.colors;
const hit = { top: 12, bottom: 12, left: 12, right: 12 };

export default function ScreenHeader({ title, navigation, onBack, right }) {
  const insets = useSafeAreaInsets();
  const isStack = !!onBack;

  const go = (screen) => {
    if (navigation?.navigate) navigation.navigate(screen);
  };

  // LEFT: back arrow on stack screens, settings gear on tab screens.
  const left = isStack ? (
    <TouchableOpacity style={s.side} onPress={onBack} hitSlop={hit}>
      <Text style={s.arrow}>‹</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity style={s.side} onPress={() => go('Settings')} hitSlop={hit}>
      <Text style={s.icon}>⚙</Text>
    </TouchableOpacity>
  );

  // RIGHT: a caller-provided action if given; else messages envelope on tab
  // screens; else an empty spacer on stack screens.
  const rightSlot = right ? (
    <View style={s.side}>{right}</View>
  ) : isStack ? (
    <View style={s.side} />
  ) : (
    <TouchableOpacity style={s.side} onPress={() => go('Messages')} hitSlop={hit}>
      <Text style={s.icon}>✉</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      {left}
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      {rightSlot}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.accent,
  },
  side: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: '#fff', fontSize: 34, lineHeight: 36 },
  icon: { color: '#fff', fontSize: 22 },
  title: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
});