// localpulse/app/src/components/MessagesButton.js
//
// The ✉ header button with its unread badge. Messages is not a tab, so the
// count belongs here rather than on the tab bar.
//
//   import MessagesButton from "../components/MessagesButton.js";
//   <MessagesButton />
//
// Put it in the header of Discovery and Feed — anywhere the user might be
// when a message arrives.

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useChatStore } from "../store/chatStore.js";
import { useStyles } from "../theme/theme.js";

export default function MessagesButton({ style }) {
  const s = useStyles(stylesFactory);
  const navigation = useNavigation();

  // Two separate counts, deliberately combined for the badge: an unread
  // message and a pending request both mean "someone is waiting on you", and
  // splitting them into two indicators on one icon just competes for
  // attention. The Messages screen separates them properly.
  const unread = useChatStore((state) => state.unread);
  const requestCount = useChatStore((state) => state.requestCount);

  const total = (unread || 0) + (requestCount || 0);

  return (
    <Pressable
      style={[s.wrap, style]}
      onPress={() => navigation.navigate("Messages")}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Messages"
      // Screen readers announce the count rather than just "Messages" — the
      // badge is meaningless to them otherwise.
      accessibilityHint={total > 0 ? `${total} unread` : undefined}
    >
      <Text style={s.glyph}>✉</Text>

      {total > 0 && (
        <View style={s.badge}>
          {/* Capped, because a three-digit badge stretches wider than the
              icon it sits on. */}
          <Text style={s.badgeText}>{total > 99 ? "99+" : total}</Text>
        </View>
      )}
    </Pressable>
  );
}

const stylesFactory = ({ colors: C }) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    glyph: { color: C.text, fontSize: 22 },
    badge: {
      position: "absolute",
      top: 0,
      right: 4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      backgroundColor: C.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "800",
      lineHeight: 14,
    },
  });
