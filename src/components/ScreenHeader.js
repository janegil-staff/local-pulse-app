// src/components/ScreenHeader.js
//
// Shared app header. Two modes:
//
//  TAB screens (Feed, Discover, MyProfile):
//    <ScreenHeader title="Feed" navigation={navigation} />
//    -> shows ⚙ Settings (left) and ✉ Messages (right, with unread badge)
//
//  STACK screens (Chat, Profile, Settings, Messages, PostDetail, ...):
//    <ScreenHeader title="Chat" onBack={() => navigation.goBack()} />
//    -> shows a back arrow (left), no settings/messages icons
//
// The rule: pass `onBack` and you get a back arrow with NO icons (stack style).
// Omit `onBack` and you get the two icons (tab style).
//
// Pass `right={<Node/>}` to override the right slot with a custom action.
// Pass `onTitlePress` to make the title tappable (shows a ▾ affordance).

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../theme/theme.js';
import { useChatStore } from '../store/chatStore.js';

const hit = { top: 12, bottom: 12, left: 12, right: 12 };

export default function ScreenHeader({ title, subtitle, navigation, onBack, right, onTitlePress }) {
  const s = useStyles(stylesFactory);
  const insets = useSafeAreaInsets();
  const isStack = !!onBack;
  const unread = useChatStore((st) => st.unread);
  const requestCount = useChatStore((st) => st.requestCount);
  const badgeCount = unread + requestCount;

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
      {badgeCount > 0 ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const titleBlock = (
    <View style={s.titleWrap}>
      <Text style={s.title} numberOfLines={1}>
        {title}
        {onTitlePress ? <Text style={s.caret}>  ▾</Text> : null}
      </Text>
      {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
  );

  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      {left}
      {onTitlePress ? (
        <TouchableOpacity style={s.titleTouch} onPress={onTitlePress} activeOpacity={0.7}>
          {titleBlock}
        </TouchableOpacity>
      ) : (
        titleBlock
      )}
      {rightSlot}
    </View>
  );
}

const stylesFactory = ({ colors }) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.accent,
    },
    side: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    arrow: { color: '#fff', fontSize: 34, lineHeight: 36 },
    icon: { color: '#fff', fontSize: 22 },
    badge: {
      position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9,
      backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 4, borderWidth: 1.5, borderColor: colors.accent,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    titleTouch: { flex: 1 },
    titleWrap: { flex: 1, alignItems: 'center' },
    title: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
    caret: { color: '#ffffffcc', fontSize: 13 },
    subtitle: { color: '#ffffffb3', fontSize: 11, marginTop: 1 },
  });