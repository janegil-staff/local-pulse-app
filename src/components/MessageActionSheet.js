// localpulse/app/src/components/MessageActionSheet.js
//
// Long-press actions for a chat message: the sheet, the delete-for-everyone
// confirm, and the report form. All three live here so the wording that
// explains what each action does cannot drift apart — on web the same
// explanation was written in two places and they said different things.
//
// WHICH ACTIONS APPEAR
//
//   my message     Delete for me  ·  Delete for everyone
//   their message  Delete for me  ·  Report
//
// "Delete for everyone" is offered on your OWN messages only. Putting it on
// theirs would invite someone to delete another person's words and believe
// them gone. "Delete for me" belongs on both sides: it changes your view and
// says nothing to anyone. Report is offered on theirs only — reporting your
// own message is refused by the server and would put a moderator on a
// complaint with no counterparty.
//
// "Delete for me" is listed FIRST and styled neutrally; the permanent one is
// last and destructive. The recoverable action should be the easy one to hit.
//
// WORDING: these used to say "Hide" and "Retract". Both are jargon — users
// read "hide" as reversible-and-hidden-from-them and "retract" as nothing at
// all. "Delete for me" / "Delete for everyone" is the vocabulary every other
// messenger uses, so it needs no explanation. The hints stay because the
// distinction between the two still does.
//
// Report keeps its honest hint. It does not remove anything, and labelling it
// as a delete would tell users their report deleted a message when it did not.
//
// THEMING: uses useStyles with a module-scope factory so the sheet re-renders
// when the palette swaps. The previous version called makeStyles(theme) — the
// frozen legacy path — AND referenced colors.card / colors.muted /
// colors.primary, none of which exist in this palette. Those fell through to
// hardcoded dark hex values, so in light mode the sheet stayed dark navy while
// colors.text correctly resolved to near-black: unreadable titles. Only real
// tokens are used below: accent, bg, surface, surfaceAlt, border, text,
// textDim, danger.
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
// word — that failure hit three surfaces on web in one evening. New keys fall
// back to the old ones first (m.deleteForEveryone || m.retract || "…") so this
// reads correctly before the locale files are patched.

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
import { theme, useStyles } from "../theme/theme.js";

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
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const s = useStyles(stylesFactory);

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
          <View style={s.grabber} />

          <View style={s.group}>
            <Pressable
              style={({ pressed }) => [s.item, pressed && s.itemPressed]}
              onPress={() => {
                const msg = sheetFor?.msg;
                closeSheet();
                if (msg) actions.hide(msg);
              }}
            >
              <Text style={s.itemText}>
                {m.deleteForMe || m.hideForMe || "Delete for me"}
              </Text>
              <Text style={s.itemHint}>
                {m.deleteForMeHint ||
                  m.hideForMeHint ||
                  "Removed from your view only. They keep their copy."}
              </Text>
            </Pressable>

            {sheetFor?.mine ? (
              <>
                <View style={s.divider} />
                <Pressable
                  style={({ pressed }) => [s.item, pressed && s.itemPressed]}
                  onPress={() => {
                    const msg = sheetFor?.msg;
                    closeSheet();
                    if (msg) actions.askRetract(msg);
                  }}
                >
                  <Text style={[s.itemText, s.destructive]}>
                    {m.deleteForEveryone || m.retract || "Delete for everyone"}
                  </Text>
                  <Text style={s.itemHint}>
                    {m.deleteForEveryoneHint ||
                      m.retractHint ||
                      "Removed for both of you. Cannot be undone."}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={s.divider} />
                <Pressable
                  style={({ pressed }) => [s.item, pressed && s.itemPressed]}
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
              </>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [s.cancel, pressed && s.itemPressed]}
            onPress={closeSheet}
          >
            <Text style={s.cancelText}>{m.cancel || "Cancel"}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ── Delete-for-everyone confirm ────────────────────────
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
      <View style={s.centeredBackdrop}>
        <View style={s.dialog}>
          <Text style={s.dialogTitle}>
            {m.deleteForEveryoneTitle ||
              m.retractTitle ||
              "Delete this message for everyone?"}
          </Text>
          <Text style={s.dialogBody}>
            {m.retractBothParties || "The message disappears for both of you."}
          </Text>
          <Text style={s.dialogBody}>
            {m.retractUndoNote || "This cannot be undone."}
          </Text>
          <Text style={s.dialogNote}>
            {m.retractModerationNote || "A reported message cannot be deleted."}
          </Text>

          <View style={s.dialogRow}>
            <Pressable
              style={({ pressed }) => [s.dialogBtn, pressed && s.itemPressed]}
              onPress={actions.cancelRetract}
            >
              <Text style={s.dialogBtnText}>{m.cancel || "Cancel"}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                s.dialogBtn,
                s.dialogBtnDanger,
                pressed && s.itemPressed,
              ]}
              onPress={actions.confirmRetract}
            >
              <Text style={[s.dialogBtnText, s.dialogBtnTextDanger]}>
                {m.deleteForEveryoneConfirm || m.retractConfirm || "Delete"}
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
      <View style={s.centeredBackdrop}>
        <View style={s.dialog}>
          <Text style={s.dialogTitle}>
            {m.reportMessageTitle || "Report this message"}
          </Text>

          <ScrollView style={s.reasons} keyboardShouldPersistTaps="handled">
            {reasons.map((value) => (
              <Pressable
                key={value}
                style={({ pressed }) => [s.reasonRow, pressed && s.itemPressed]}
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
            placeholderTextColor={theme.colors.textDim}
            style={s.note}
          />

          <View style={s.dialogRow}>
            <Pressable
              style={({ pressed }) => [s.dialogBtn, pressed && s.itemPressed]}
              onPress={() => {
                resetReport();
                actions.cancelReport();
              }}
            >
              <Text style={s.dialogBtnText}>{m.cancel || "Cancel"}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                s.dialogBtn,
                s.dialogBtnPrimary,
                pressed && s.itemPressed,
              ]}
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

  // ── Undo toast, delete-for-me only ─────────────────────
  //
  // Nothing in the app lists what you have removed from your own view, so
  // without this it is effectively permanent from the user's side even though
  // the server treats it as reversible. There is deliberately no equivalent
  // for delete-for-everyone.

  const undo = actions.undoFor ? (
    <View style={s.toast}>
      <Text style={s.toastText}>{m.messageHidden || "Message deleted"}</Text>
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

// Module scope: a stable reference, otherwise useStyles' memo is defeated.
function stylesFactory({ colors, spacing }) {
  const pad = typeof spacing === "function" ? spacing(3) : 12;

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    centeredBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
    },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: pad,
      paddingTop: 10,
      // Clears the home indicator without pulling in safe-area context here.
      paddingBottom: pad + 20,
    },
    grabber: {
      alignSelf: "center",
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 14,
    },
    // Rows are grouped on a raised surface so the sheet reads as a list of
    // choices rather than floating text.
    group: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
    },
    item: { paddingVertical: 14, paddingHorizontal: pad },
    itemPressed: { opacity: 0.6 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: pad,
    },
    itemText: { fontSize: 16, fontWeight: "600", color: colors.text },
    itemHint: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textDim,
    },
    destructive: { color: colors.danger },
    cancel: {
      marginTop: 10,
      alignItems: "center",
      paddingVertical: 15,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    cancelText: { fontSize: 16, fontWeight: "600", color: colors.text },
    dialog: {
      margin: pad,
      borderRadius: 18,
      padding: pad + 4,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    dialogTitle: {
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 10,
      color: colors.text,
    },
    dialogBody: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 4,
      color: colors.text,
    },
    dialogNote: { fontSize: 12, marginTop: 6, color: colors.textDim },
    dialogRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: pad + 4,
    },
    dialogBtn: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10 },
    dialogBtnDanger: { backgroundColor: colors.danger },
    dialogBtnPrimary: { backgroundColor: colors.accent },
    dialogBtnText: { fontSize: 15, fontWeight: "600", color: colors.textDim },
    dialogBtnTextDanger: { color: "#ffffff" },
    dialogBtnTextPrimary: { color: "#ffffff" },
    reasons: { maxHeight: 210, marginTop: 4 },
    reasonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 11,
    },
    radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
    reasonText: { fontSize: 15, color: colors.text },
    note: {
      marginTop: 10,
      minHeight: 74,
      borderRadius: 10,
      padding: 11,
      textAlignVertical: "top",
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.bg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    error: { marginTop: 10, fontSize: 13, color: colors.danger },
    toast: {
      position: "absolute",
      left: pad,
      right: pad,
      bottom: pad * 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    toastText: { fontSize: 14, color: colors.text },
    toastAction: { fontSize: 14, fontWeight: "700", color: colors.accent },
  });
}
