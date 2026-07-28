// localpulse/app/src/components/ProfilePrompt.js
//
// Advisory banner for an incomplete profile. Deliberately NOT a gate:
// the user is legitimately logged in and everything else works. This only
// tells them what is still missing and offers a shortcut to fix it.
//
// Dismissal lasts for the session only — module scope rather than
// AsyncStorage — so it reappears next launch without nagging on every
// screen change. Someone who has dismissed it three launches running is
// telling you something; consider capping it rather than escalating.

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";
import { getTranslations } from "../i18n/translations";

// Survives navigation within a session, resets on app restart.
var dismissedThisSession = false;

// Which onboarding step fixes which gap. The API returns field names; the
// app decides where to send the user. Keep this in sync with
// User.missingProfileFields() on the server.
var FIELD_ROUTES = {
  location: { screen: "EditLocation", label: "fieldLocation" },
  dateOfBirth: { screen: "EditProfile", label: "fieldDateOfBirth" },
  gender: { screen: "EditProfile", label: "fieldGender" },
  username: { screen: "EditProfile", label: "fieldUsername" },
  photos: { screen: "EditProfile", label: "fieldPhotos" },
  bio: { screen: "EditProfile", label: "fieldBio" },
};

// Location first — it is the only gap that actually stops discovery from
// returning anything, so it is the one worth routing to.
var FIELD_PRIORITY = [
  "location",
  "username",
  "dateOfBirth",
  "gender",
  "photos",
  "bio",
];

export default function ProfilePrompt({ style }) {
  var { missingProfileFields } = useAuth();
  var { t } = getTranslations();
  var navigation = useNavigation();
  var [dismissed, setDismissed] = useState(dismissedThisSession);

  if (dismissed) return null;
  if (!missingProfileFields || missingProfileFields.length === 0) return null;

  // Ignore any field the app has no route for, so a new server-side
  // requirement cannot render a banner that goes nowhere.
  var known = FIELD_PRIORITY.filter(function (field) {
    return missingProfileFields.indexOf(field) !== -1 && FIELD_ROUTES[field];
  });

  if (known.length === 0) return null;

  // Plain comma join rather than Intl.ListFormat: Hermes on Android does
  // not reliably ship the full Intl set, and a missing conjunction is
  // less bad than a crash.
  var labels = known
    .map(function (field) {
      return t[FIELD_ROUTES[field].label];
    })
    .join(", ");

  var primary = known[0];

  function handleDismiss() {
    dismissedThisSession = true;
    setDismissed(true);
  }

  function handleComplete() {
    navigation.navigate(FIELD_ROUTES[primary].screen, { focusField: primary });
  }

  return (
    <View style={[styles.card, style]} accessibilityRole="alert">
      <View style={styles.icon}>
        <Ionicons
          name="person-circle-outline"
          size={22}
          color={COLORS.accent}
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{t.profilePromptTitle}</Text>
        <Text style={styles.text}>
          {t.profilePromptBody.replace("{fields}", labels)}
        </Text>

        <Pressable
          onPress={handleComplete}
          style={function (state) {
            return [styles.cta, state.pressed && styles.ctaPressed];
          }}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{t.profilePromptCta}</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.onAccent} />
        </Pressable>
      </View>

      <Pressable
        onPress={handleDismiss}
        hitSlop={10}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel={t.profilePromptDismiss}
      >
        <Ionicons name="close" size={18} color={COLORS.textMuted} />
      </Pressable>
    </View>
  );
}

// Swap for the shared theme import if this project has one — these are the
// LocalPulse steel-blue values, kept local so the component drops in
// without assuming a theme API.
var COLORS = {
  surface: "#eef3f8",
  border: "#cfdcea",
  accent: "#4a7ab5",
  onAccent: "#ffffff",
  text: "#2d4a6e",
  textMuted: "#6b7f96",
};

var styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  icon: { paddingTop: 2 },
  body: { flex: 1, gap: 4 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: "600" },
  text: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 8,
    minHeight: 36,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: COLORS.onAccent, fontSize: 13, fontWeight: "600" },
  close: { padding: 2 },
});
