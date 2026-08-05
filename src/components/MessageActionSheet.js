// localpulse/app/src/components/MessageActionSheet.js
//
// Long-press actions for a chat message: the sheet, the retract confirm, and
// the report form. All three live here so the wording that explains what each
// action does cannot drift apart — on web the same explanation was written in
// two places and they said different things.
//
// WHICH ACTIONS APPEAR
//
//   my message     Hide (my view only)  ·  Retract (both parties, permanent)
//   their message  Hide (my view only)  ·  Report
//
// Retract is offered on your OWN messages only. Putting it on theirs would
// invite someone to "delete" another person's words and believe them gone.
// Hide belongs on both sides: it changes your view and says nothing to anyone.
// Report is offered on theirs only — reporting your own message is refused by
// the server and would put a moderator on a complaint with no counterparty.
//
// Hide is listed FIRST and styled neutrally; retract is last and destructive.
// The recoverable action should be the easy one to hit.
//
// The reason list comes from REPORT_REASONS on the server. Passed in rather
// than hardcoded so the two cannot disagree — an unknown reason is a 400.
//
// COPY IS FLAT. This app's i18n is a single flat key map per language
// (t.appName, t.reportUserTitle), not the nested t.app.messages the web client
// uses — and getTranslations wraps it in a Proxy that falls back to English one
// level deep, which would not work for a nested branch. So `m` here is the
// whole translation object and the keys are flat.
//
// The reason labels reuse the report* keys this app ALREADY has for profile and
// post reports rather than introducing a parallel set. One vocabulary for
// "spam" across three report surfaces is worth more than message-specific
// wording.
//
// Every label still has an English fallback: a key that resolves to undefined
// renders a zero-width control, which is far harder to notice than a wrong
// word — that failure hit three surfaces on web in one evening.

import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const DEFAULT_REASONS = [
  "spam",
  "harassment",
  "inappropriate",
  "misinformation",
  "other",
];

// REPORT_REASONS values map to the existing flat keys: spam -> reportSpam,
// harassment -> reportHarassment, and so on. Derived rather than hardcoded as a
// lookup table so a new server-side reason picks up its label automatically
// once the key is added, instead of silently rendering the raw enum forever.
function reasonKey(value) {
  return "report" + value.charAt(0).toUpperCase() + value.slice(1);
}

export default function MessageActionSheet({
  sheetFor,
  onClose,
  actions,
  m = {},
  reasons = DEFAULT_REASONS,
  theme,
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const s = makeStyles(theme);

  function closeSheet() {
    onClose?.();
  }

  function resetReport() {
    setReason("");
    setNote("");
  }

  // ── The sheet itself ───────────────────────────────────

  const sheet = (
    <Modal
      visible={Boolean(sheetFor)}
      transparent
      animationType="fade"
      onRequestClose={closeSheet}
    >
      <Pressable style={s.backdrop} onPress={closeSheet}>
        {/* Stops a tap inside the sheet from closing it. */}
        <Pressable style={s.sheet} onPress={() => {}}>
          <Pressable
            style={s.item}
            onPress={() => {
              const msg = sheetFor?.msg;
              closeSheet();
              if (msg) actions.hide(msg);
            }}
          >
            <Text style={s.itemText}>{m.hideForMe || "Hide for me"}</Text>
            <Text style={s.itemHint}>
              {m.hideForMeHint ||
                "Removed from your view only. They keep their copy."}
            </Text>
          </Pressable>

          {sheetFor?.mine ? (
            <Pressable
              style={s.item}
              onPress={() => {
                const msg = sheetFor?.msg;
                closeSheet();
                if (msg) actions.askRetract(msg);
              }}
            >
              <Text style={[s.itemText, s.destructive]}>
                {m.retract || "Retract"}
              </Text>
              <Text style={s.itemHint}>
                {m.retractHint || "Removed for both of you. Cannot be undone."}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={s.item}
              onPress={() => {
                const msg = sheetFor?.msg;
                closeSheet();
                if (msg) actions.askReport(msg);
              }}
            >
              <Text style={s.itemText}>
                {m.reportMessage || "Report message"}
              </Text>
              <Text style={s.itemHint}>
                {m.reportMessageHint ||
                  "Sends it to moderators. Removes nothing."}
              </Text>
            </Pressable>
          )}

          <Pressable style={[s.item, s.cancel]} onPress={closeSheet}>
            <Text style={s.cancelText}>{m.cancel || "Cancel"}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ── Retract confirm ────────────────────────────────────
  //
  // Not optional. The action cannot be undone and this is the only place the
  // sender is told so before it happens.

  const confirm = (
    <Modal
      visible={Boolean(actions.retractFor)}
      transparent
      animationType="fade"
      onRequestClose={actions.cancelRetract}
    >
      <View style={s.backdrop}>
        <View style={s.dialog}>
          <Text style={s.dialogTitle}>
            {m.retractTitle || "Retract this message?"}
          </Text>
          <Text style={s.dialogBody}>
            {m.retractBothParties || "The message disappears for both of you."}
          </Text>
          <Text style={s.dialogBody}>
            {m.retractUndoNote || "This cannot be undone."}
          </Text>
          <Text style={s.dialogNote}>
            {m.retractModerationNote ||
              "A reported message cannot be retracted."}
          </Text>

          <View style={s.dialogRow}>
            <Pressable style={s.dialogBtn} onPress={actions.cancelRetract}>
              <Text style={s.dialogBtnText}>{m.cancel || "Cancel"}</Text>
            </Pressable>
            <Pressable
              style={[s.dialogBtn, s.dialogBtnDanger]}
              onPress={actions.confirmRetract}
            >
              <Text style={[s.dialogBtnText, s.dialogBtnTextDanger]}>
                {m.retractConfirm || "Retract"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ── Report ─────────────────────────────────────────────

  const report = (
    <Modal
      visible={Boolean(actions.reportFor)}
      transparent
      animationType="fade"
      onRequestClose={() => {
        resetReport();
        actions.cancelReport();
      }}
    >
      <View style={s.backdrop}>
        <View style={s.dialog}>
          <Text style={s.dialogTitle}>
            {m.reportMessageTitle || "Report this message"}
          </Text>

          <ScrollView style={s.reasons}>
            {reasons.map((value) => (
              <Pressable
                key={value}
                style={s.reasonRow}
                onPress={() => setReason(value)}
              >
                <View style={[s.radio, reason === value && s.radioOn]} />
                {/* Reason labels are keyed per value so they translate.
                    Falling back to the raw enum keeps the list usable if a
                    key is missing, rather than rendering blank rows. */}
                <Text style={s.reasonText}>{m[reasonKey(value)] || value}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            placeholder={
              m.reportNotePlaceholder ||
              "Anything else a moderator should know? (optional)"
            }
            placeholderTextColor={theme?.colors?.muted || "#888"}
            style={s.note}
          />

          <View style={s.dialogRow}>
            <Pressable
              style={s.dialogBtn}
              onPress={() => {
                resetReport();
                actions.cancelReport();
              }}
            >
              <Text style={s.dialogBtnText}>{m.cancel || "Cancel"}</Text>
            </Pressable>
            <Pressable
              style={[s.dialogBtn, s.dialogBtnPrimary]}
              onPress={async () => {
                const res = await actions.submitReport({ reason, note });
                if (res) resetReport();
              }}
            >
              <Text style={[s.dialogBtnText, s.dialogBtnTextPrimary]}>
                {m.reportSubmit || "Send report"}
              </Text>
            </Pressable>
          </View>

          {actions.error ? <Text style={s.error}>{actions.error}</Text> : null}
        </View>
      </View>
    </Modal>
  );

  // ── Undo toast, hide only ──────────────────────────────
  //
  // Nothing in the app lists what you have hidden, so without this a hide is
  // effectively permanent from the user's side even though the server treats
  // it as reversible. There is deliberately no equivalent for retract.

  const undo = actions.undoFor ? (
    <View style={s.toast}>
      <Text style={s.toastText}>{m.messageHidden || "Message hidden"}</Text>
      <Pressable onPress={actions.undoHide}>
        <Text style={s.toastAction}>{m.undo || "Undo"}</Text>
      </Pressable>
    </View>
  ) : null;

  return (
    <>
      {sheet}
      {confirm}
      {report}
      {undo}
    </>
  );
}

function makeStyles(theme) {
  const pad = theme?.spacing ? theme.spacing(3) : 12;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme?.colors?.card || "#131c26",
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: pad,
    },
    item: { paddingVertical: pad, paddingHorizontal: pad },
    itemText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme?.colors?.text || "#fff",
    },
    itemHint: {
      marginTop: 2,
      fontSize: 12,
      color: theme?.colors?.muted || "#8b97a6",
    },
    destructive: { color: theme?.colors?.danger || "#ef4444" },
    cancel: { alignItems: "center" },
    cancelText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme?.colors?.muted || "#8b97a6",
    },
    dialog: {
      margin: pad,
      marginBottom: pad * 2,
      borderRadius: 18,
      padding: pad,
      backgroundColor: theme?.colors?.card || "#131c26",
    },
    dialogTitle: {
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 8,
      color: theme?.colors?.text || "#fff",
    },
    dialogBody: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 4,
      color: theme?.colors?.text || "#dfe6ee",
    },
    dialogNote: {
      fontSize: 12,
      marginTop: 4,
      color: theme?.colors?.muted || "#8b97a6",
    },
    dialogRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: pad,
    },
    dialogBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
    dialogBtnDanger: { backgroundColor: theme?.colors?.danger || "#ef4444" },
    dialogBtnPrimary: { backgroundColor: theme?.colors?.primary || "#10b981" },
    dialogBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme?.colors?.muted || "#8b97a6",
    },
    dialogBtnTextDanger: { color: "#fff" },
    dialogBtnTextPrimary: { color: "#052e21" },
    reasons: { maxHeight: 200, marginTop: 4 },
    reasonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: theme?.colors?.muted || "#8b97a6",
      marginRight: 10,
    },
    radioOn: {
      borderColor: theme?.colors?.primary || "#10b981",
      backgroundColor: theme?.colors?.primary || "#10b981",
    },
    reasonText: { fontSize: 15, color: theme?.colors?.text || "#dfe6ee" },
    note: {
      marginTop: 8,
      minHeight: 70,
      borderRadius: 10,
      padding: 10,
      textAlignVertical: "top",
      color: theme?.colors?.text || "#dfe6ee",
      backgroundColor: theme?.colors?.bg || "#0b1016",
    },
    error: {
      marginTop: 8,
      fontSize: 13,
      color: theme?.colors?.danger || "#ef4444",
    },
    toast: {
      position: "absolute",
      left: pad,
      right: pad,
      bottom: pad * 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: theme?.colors?.card || "#131c26",
    },
    toastText: { fontSize: 14, color: theme?.colors?.text || "#dfe6ee" },
    toastAction: {
      fontSize: 14,
      fontWeight: "700",
      color: theme?.colors?.primary || "#10b981",
    },
  });
}
