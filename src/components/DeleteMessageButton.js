// localpulse/app/src/components/DeleteMessageButton.js
//
// The × on your own messages. Confirms, retracts, removes.
//
// SELF-CONTAINED ON PURPOSE. It touches Alert, api.retractMessage and one
// store action, and nothing else — not useMessageActions, not
// MessageActionSheet. Those are written and installed but something on
// ChatScreen is stopping them working, and this needs to work independently of
// whatever that turns out to be. If the × appears and the alert opens, the
// problem is in that stack; if the × does not even render, the problem is the
// screen itself. Either way this is informative as well as useful.
//
// OWN MESSAGES ONLY. Retraction is the sender withdrawing their own words; the
// server returns 403 not_sender for anything else. The caller gates on `mine`.
//
// WHAT THE COPY PROMISES, and why each line is true:
//
//   "hidden for both of you"      retractedAt is filtered at all three
//                                 participant-facing reads, so neither side
//                                 sees it again.
//   "cannot be undone"            there is no unretract endpoint, deliberately.
//                                 An undo would let someone remove and restore
//                                 a message around a moderator's read of it.
//   "moderators keep a copy"      the text is never blanked in the database.
//                                 That is what keeps a report filed before the
//                                 retraction meaningful.
//
// The third line matters legally as much as ethically: telling someone a
// message is deleted when the text is still on the server would be false.
//
// THE ONE CASE THE COPY DOES NOT COVER: a message that has already been
// reported cannot be retracted — the server returns 409 message_reported. That
// gets its own alert rather than a generic failure, because it is the single
// situation where the promise above does not hold.

import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { api } from "../api/client.js";

export default function DeleteMessageButton({ msg, onDeleted, m = {}, mine }) {
  if (!mine) return null;

  function confirm() {
    Alert.alert(
      m.retractTitle || "Delete this message?",
      m.retractBody ||
        "The message is hidden for both of you — including the person you sent it to.\n\n" +
          "This cannot be undone.\n\n" +
          "The message isn't erased from the server — moderators keep a copy so reports can be handled.",
      [
        { text: m.cancel || "Cancel", style: "cancel" },
        {
          text: m.retractConfirm || "Delete",
          style: "destructive",
          onPress: run,
        },
      ],
    );
  }

  async function run() {
    try {
      await api.retractMessage(msg.id);
      // Removed locally as well as over the socket. The server emits to the
      // conversation room, but waiting on a round trip to update the screen
      // that caused the change makes it feel broken on a slow connection.
      onDeleted?.(msg.id);
    } catch (e) {
      // 409: a report already exists, so the message stays put. This is the
      // only outcome the confirm dialog's promise does not cover, so it needs
      // its own sentence rather than "failed".
      if (e?.code === "message_reported") {
        Alert.alert(
          m.retractTitle || "Cannot delete",
          m.retractReported ||
            "This message has been reported, so it cannot be deleted until moderators have reviewed it.",
        );
        return;
      }
      Alert.alert(
        m.retractFailed || "Could not delete the message",
        e?.message || "",
      );
    }
  }

  return (
    <Pressable
      onPress={confirm}
      hitSlop={10}
      accessibilityLabel={m.retract || "Delete message"}
      style={styles.button}
    >
      <Text style={styles.glyph}>×</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // hitSlop rather than padding does the work: the visible mark stays small
  // next to the text while the touch target is a usable size.
  button: {
    marginLeft: 6,
    alignSelf: "flex-start",
  },
  glyph: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.55,
    color: "#8b97a6",
  },
});
