// localpulse/app/src/components/InterestChips.js
//
// Read-only interest chips. Used on the public profile, your own profile, and
// discovery cards, so the same interest looks the same everywhere.
//
//   <InterestChips interests={profile.interests} />
//
// Labels come from the locale key `interest_<id>` — the stored value is a
// stable id, never display text, which is what lets the same profile read
// correctly in all 12 languages.
//
// Renders nothing at all when the list is empty. An empty "Interests" heading
// on someone else's profile is worse than no heading: it draws attention to
// an absence the viewer can do nothing about.

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { useLang } from "../context/LangContext.js";
import { useStyles } from "../theme/theme.js";

export default function InterestChips({
  interests,
  showLabel = true,
  // Highlights interests the viewer also has. Pass the viewer's own list to
  // enable it; leave undefined on your own profile, where every chip would
  // match and the highlight would be meaningless.
  sharedWith,
  style,
}) {
  const s = useStyles(stylesFactory);
  const { t } = useLang();

  const list = interests || [];
  if (list.length === 0) return null;

  const shared = sharedWith ? new Set(sharedWith) : null;

  return (
    <View style={[s.wrap, style]}>
      {showLabel && <Text style={s.label}>{t.interests}</Text>}
      <View style={s.row}>
        {list.map((id) => {
          const isShared = shared?.has(id);
          return (
            <View key={id} style={[s.chip, isShared && s.chipShared]}>
              <Text style={[s.chipText, isShared && s.chipTextShared]}>
                {t[`interest_${id}`] || id}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const stylesFactory = ({ colors: C }) =>
  StyleSheet.create({
    wrap: { marginBottom: 20 },
    label: {
      color: C.textDim,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 10,
    },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
    },
    chipShared: {
      backgroundColor: C.accent + "1A",
      borderColor: C.accent + "55",
    },
    chipText: { color: C.text, fontSize: 13, fontWeight: "600" },
    chipTextShared: { color: C.accent },
  });
