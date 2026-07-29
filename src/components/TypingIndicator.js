// localpulse/app/src/components/TypingIndicator.js
//
// Three animated dots, styled as an incoming message bubble so it sits in the
// message list without shifting the layout when it appears.
//
//   {peerTyping && <TypingIndicator />}
//
// No text, deliberately: the animation is universally understood and needs no
// translation, which keeps it out of the 12-language set entirely.
//
// Rendered at the BOTTOM of an inverted FlatList, or after the last message in
// a normal one — see the note in ChatScreen.

import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";

import { useStyles } from "../theme/theme.js";

const DOT_COUNT = 3;
const CYCLE_MS = 600;

function Dot({ delay, style }) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration: CYCLE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          // Opacity and transform run on the UI thread, so the animation
          // keeps running smoothly while JS is busy rendering messages.
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: CYCLE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(CYCLE_MS - delay),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [delay, value]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: value.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 1],
          }),
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -3],
              }),
            },
          ],
        },
      ]}
    />
  );
}

export default function TypingIndicator({ style }) {
  const s = useStyles(stylesFactory);

  return (
    <View
      style={[s.bubble, style]}
      accessibilityRole="progressbar"
      // Screen readers get nothing useful from three dots, so the label
      // carries the meaning. Not translated because it is not visible text
      // and the alternative is adding a string in 12 languages for a
      // decoration — revisit if accessibility testing says otherwise.
      accessibilityLabel="Typing"
    >
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <Dot key={i} delay={(i * CYCLE_MS) / DOT_COUNT} style={s.dot} />
      ))}
    </View>
  );
}

const stylesFactory = ({ colors: C }) =>
  StyleSheet.create({
    bubble: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginHorizontal: 12,
      marginVertical: 4,
      borderRadius: 18,
      borderBottomLeftRadius: 4,
      backgroundColor: C.surfaceAlt,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: C.textDim,
    },
  });
