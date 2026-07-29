// localpulse/app/src/components/InterestsEditor.js
//
// Interests picker for the profile screen. Drop it in with:
//
//   import InterestsEditor from "../components/InterestsEditor.js";
//   <InterestsEditor />
//
// Self-contained: owns its own modal, selection state and save.
//
// Interests are picked from a fixed list, never free text. Free tags produce
// a long tail nobody else shares, which makes them useless for matching and
// turns the field into a place to type slurs. A closed list is also the only
// way the labels can be translated — display text comes from the locale key
// `interest_<id>`, so the same profile reads correctly in all 12 languages.

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import { useAuth } from "../context/AuthContext.js";
import { useLang } from "../context/LangContext.js";
import { api } from "../api/client.js";
import { theme, useStyles } from "../theme/theme.js";

// MUST match INTERESTS in the server's src/lib/interests.js. A value here
// that the server does not know fails validation on save; a value there that
// is missing here renders with no label.
const INTERESTS = [
  "hiking",
  "coffee",
  "travel",
  "photography",
  "music",
  "food",
  "fitness",
  "running",
  "art",
  "books",
  "gaming",
  "cooking",
  "cycling",
  "yoga",
  "movies",
  "dancing",
  "design",
  "nature",
  "concerts",
  "fashion",
  "technology",
  "football",
  "climbing",
  "baking",
];

const MAX_INTERESTS = 8;

export default function InterestsEditor() {
  const s = useStyles(stylesFactory);
  const { t } = useLang();
  const { user, hydrate } = useAuth();

  const saved = user?.interests || [];

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);

  // Re-seed when the profile arrives or changes. useState initialisers run
  // once, so without this the chips keep whatever `user` held on first mount
  // — empty if the screen rendered before the profile loaded.
  useEffect(() => {
    setDraft(user?.interests || []);
  }, [user?.interests]);

  const label = (id) => t[`interest_${id}`] || id;

  const toggle = (id) => {
    setDraft((current) => {
      if (current.includes(id)) return current.filter((v) => v !== id);
      if (current.length >= MAX_INTERESTS) {
        // Tell them why the tap did nothing. A chip that silently refuses to
        // select reads as a broken button.
        Alert.alert(
          "",
          String(t.interestsMax).replace("{n}", String(MAX_INTERESTS)),
        );
        return current;
      }
      return [...current, id];
    });
  };

  const close = async () => {
    // Nothing changed — skip the round trip.
    const same =
      draft.length === saved.length && draft.every((v) => saved.includes(v));
    if (same) {
      setOpen(false);
      return;
    }

    setSaving(true);
    try {
      await api.updateMyProfile({ interests: draft });
      await hydrate();
      setOpen(false);
    } catch (e) {
      const key = e?.message;
      Alert.alert(t.error || "", t[key] || key || t.couldNotSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.headerRow}>
        <Text style={s.label}>{t.interests}</Text>
        <Pressable
          onPress={() => {
            setDraft(saved);
            setOpen(true);
          }}
          hitSlop={10}
        >
          <Text style={s.action}>{t.addInterests} ›</Text>
        </Pressable>
      </View>

      {saved.length === 0 ? (
        <Text style={s.empty}>
          {String(t.interestsMax).replace("{n}", String(MAX_INTERESTS))}
        </Text>
      ) : (
        <View style={s.chipRow}>
          {saved.map((id) => (
            <View key={id} style={s.chipStatic}>
              <Text style={s.chipStaticText}>{label(id)}</Text>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={saving ? undefined : close}
      >
        <View style={s.modalRoot}>
          <Pressable style={s.backdrop} onPress={saving ? undefined : close} />
          <View style={s.sheet}>
            <View style={s.handle} />

            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{t.interests}</Text>
              <Text style={s.counter}>
                {draft.length} / {MAX_INTERESTS}
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={s.grid}
              showsVerticalScrollIndicator={false}
            >
              {INTERESTS.map((id) => {
                const selected = draft.includes(id);
                // Greyed rather than hidden once the cap is reached, so the
                // list does not reshuffle under the user's finger.
                const disabled = !selected && draft.length >= MAX_INTERESTS;
                return (
                  <Pressable
                    key={id}
                    style={[
                      s.chip,
                      selected && s.chipActive,
                      disabled && s.chipDisabled,
                    ]}
                    onPress={() => toggle(id)}
                  >
                    <Text style={[s.chipText, selected && s.chipTextActive]}>
                      {label(id)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={[s.doneBtn, saving && s.doneBtnDisabled]}
              onPress={saving ? undefined : close}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.doneText}>{t.done}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const stylesFactory = ({ colors: C }) =>
  StyleSheet.create({
    wrap: { marginBottom: 24 },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    label: { color: C.textDim, fontSize: 16, fontWeight: "700" },
    action: { color: C.accent, fontSize: 15, fontWeight: "700" },
    empty: { color: C.textDim, fontSize: 13 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chipStatic: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: C.accent + "1A",
      borderWidth: 1,
      borderColor: C.accent + "44",
    },
    chipStaticText: { color: C.accent, fontSize: 13, fontWeight: "600" },

    modalRoot: { flex: 1, justifyContent: "flex-end" },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: 28,
      maxHeight: "80%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      marginTop: 10,
      marginBottom: 14,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    sheetTitle: { color: C.text, fontSize: 18, fontWeight: "700" },
    counter: { color: C.textDim, fontSize: 14, fontWeight: "600" },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingBottom: 16,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: C.border,
      backgroundColor: C.surfaceAlt,
    },
    chipActive: { backgroundColor: C.accent, borderColor: C.accent },
    chipDisabled: { opacity: 0.35 },
    chipText: { color: C.text, fontSize: 14, fontWeight: "600" },
    chipTextActive: { color: "#fff" },

    doneBtn: {
      height: 50,
      borderRadius: 10,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    doneBtnDisabled: { opacity: 0.6 },
    doneText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 1.5,
    },
  });
