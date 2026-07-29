// localpulse/app/src/components/DobEditor.js
//
// Date of birth row for Personal Settings. Drop it into the screen with:
//
//   import DobEditor from "../components/DobEditor.js";
//   <DobEditor />
//
// Self-contained on purpose — it owns its own modal, validation and save.
//
// DOB is not an ordinary profile field. It drives the age shown to every
// other user and the ageMin/ageMax matching, and it is the 18+ gate. So the
// server limits how often it can change and this screen says so up front,
// rather than letting someone discover the limit by hitting it.

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";

import { useAuth } from "../context/AuthContext.js";
import { useLang } from "../context/LangContext.js";
import { api } from "../api/client.js";
import { theme, useStyles } from "../theme/theme.js";

const MIN_AGE = 18;
const MODAL_ROW_HEIGHT = 44;

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();

// Starts 18 years back, so the wheel itself cannot produce a minor.
const DOB_YEARS = Array.from({ length: 83 }, (_, i) =>
  String(CURRENT_YEAR - 18 - i),
);

function daysInMonth(year, monthIdx) {
  return new Date(Number(year), monthIdx + 1, 0).getDate();
}

// Calendar arithmetic, not elapsed-milliseconds ÷ 365.25. The division
// approach drifts by a day or two depending on where leap years fall, which
// on an age gate means the client and the server can disagree about whether
// someone is 18 — the client blocks a valid date, or accepts one the server
// then rejects.
export function exactAge(y, m, d, now = new Date()) {
  if (!y || !m || !d) return null;

  let age = now.getFullYear() - Number(y);
  const monthDiff = now.getMonth() + 1 - Number(m);
  const dayDiff = now.getDate() - Number(d);

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

// Splits an ISO date or Date into the three wheel values.
function splitDob(value) {
  if (!value) return { y: "", m: "", d: "" };
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { y: "", m: "", d: "" };
  return {
    y: String(date.getFullYear()),
    m: String(date.getMonth() + 1).padStart(2, "0"),
    d: String(date.getDate()).padStart(2, "0"),
  };
}

export default function DobEditor() {
  const s = useStyles(stylesFactory);
  const C = theme.colors;
  const { t } = useLang();
  const { user, hydrate } = useAuth();

  const initial = splitDob(user?.dob);

  const [dobYear, setDobYear] = useState(initial.y);
  const [dobMonth, setDobMonth] = useState(initial.m);
  const [dobDay, setDobDay] = useState(initial.d);
  const [picker, setPicker] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const MONTHS = t.months;

  // Remaining allowance, sent by the server on toSelf(). Undefined on older
  // responses — treat that as "no limit known" rather than "none left", so a
  // stale client never locks someone out of their own profile.
  const changesLeft = user?.dobChangesLeft;
  const locked = changesLeft === 0;

  const dobStr =
    dobYear && dobMonth && dobDay ? `${dobYear}-${dobMonth}-${dobDay}` : "";

  const age = exactAge(dobYear, dobMonth, dobDay);
  const savedDobStr = initial.y ? `${initial.y}-${initial.m}-${initial.d}` : "";
  const dirty = dobStr && dobStr !== savedDobStr;

  const options =
    picker === "year"
      ? DOB_YEARS
      : picker === "month"
        ? MONTHS.map((_, i) => String(i + 1).padStart(2, "0"))
        : picker === "day"
          ? Array.from(
              {
                length:
                  dobYear && dobMonth
                    ? daysInMonth(dobYear, Number(dobMonth) - 1)
                    : 31,
              },
              (_, i) => String(i + 1).padStart(2, "0"),
            )
          : [];

  const selectedIndex = Math.max(
    0,
    options.indexOf(
      picker === "year" ? dobYear : picker === "month" ? dobMonth : dobDay,
    ),
  );

  const save = async () => {
    setError("");

    if (!dobStr) {
      setError(t.dobRequired);
      return;
    }

    // Checked here for immediate feedback. The server checks again — this is
    // convenience, not the gate.
    if (age !== null && age < MIN_AGE) {
      setError(t.dobUnderAge);
      return;
    }

    // Last one gets a confirmation. Finding out the allowance is gone AFTER
    // spending it is the kind of thing that generates support mail.
    if (changesLeft === 1) {
      const confirmed = await new Promise((resolve) => {
        Alert.alert(t.dob, t.dobLastChangeWarning, [
          { text: t.cancel, style: "cancel", onPress: () => resolve(false) },
          { text: t.save, onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      await api.updateMyProfile({ dob: dobStr });
      await hydrate();
      Alert.alert("", t.dobSaved);
    } catch (e) {
      // The server returns a translation key, not a sentence — look it up,
      // and fall back to whatever came back if the key is unknown.
      const key = e?.message;
      setError(t[key] || key || t.couldNotSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.headerRow}>
        <Text style={s.label}>{t.dob}</Text>
        {age !== null && (
          <Text style={s.ageText}>
            {t.age} {age}
          </Text>
        )}
      </View>

      <View style={s.row}>
        <TouchableOpacity
          style={[s.box, locked && s.boxLocked]}
          onPress={locked ? undefined : () => setPicker("day")}
          activeOpacity={locked ? 1 : 0.8}
        >
          <Text style={[s.value, { color: dobDay ? C.text : C.textDim }]}>
            {dobDay ? String(Number(dobDay)) : t.day}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.box, { flex: 1.4 }, locked && s.boxLocked]}
          onPress={locked ? undefined : () => setPicker("month")}
          activeOpacity={locked ? 1 : 0.8}
        >
          <Text style={[s.value, { color: dobMonth ? C.text : C.textDim }]}>
            {dobMonth ? MONTHS[Number(dobMonth) - 1] : t.month}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.box, { flex: 1.3 }, locked && s.boxLocked]}
          onPress={locked ? undefined : () => setPicker("year")}
          activeOpacity={locked ? 1 : 0.8}
        >
          <Text style={[s.value, { color: dobYear ? C.text : C.textDim }]}>
            {dobYear || t.year}
          </Text>
        </TouchableOpacity>
      </View>

      {locked ? (
        <Text style={s.hint}>{t.dobChangeLimit}</Text>
      ) : changesLeft !== undefined ? (
        <Text style={s.hint}>
          {String(t.dobChangesLeft).replace("{n}", String(changesLeft))}
        </Text>
      ) : null}

      {!!error && <Text style={s.error}>{error}</Text>}

      {dirty && !locked && (
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={saving ? undefined : save}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.saveText}>{t.save}</Text>
          )}
        </TouchableOpacity>
      )}

      <Modal
        visible={!!picker}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setPicker(null)}
        >
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>
              {picker === "year"
                ? t.year
                : picker === "month"
                  ? t.month
                  : t.day}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              // Opens on the current value instead of the top of the list.
              // getItemLayout is required — FlatList silently ignores
              // initialScrollIndex for rows it has not measured.
              initialScrollIndex={selectedIndex}
              getItemLayout={(_, index) => ({
                length: MODAL_ROW_HEIGHT,
                offset: MODAL_ROW_HEIGHT * index,
                index,
              })}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.modalItem}
                  onPress={() => {
                    if (picker === "year") setDobYear(item);
                    else if (picker === "month") setDobMonth(item);
                    else setDobDay(item);
                    setPicker(null);
                    setError("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.modalItemText}>
                    {picker === "month"
                      ? MONTHS[Number(item) - 1]
                      : picker === "day"
                        ? String(Number(item))
                        : item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
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
    ageText: { color: C.textDim, fontSize: 14, fontWeight: "600" },
    row: { flexDirection: "row", gap: 10 },
    box: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderWidth: 1.5,
      borderColor: C.border,
      borderRadius: 10,
      backgroundColor: C.surface,
      alignItems: "center",
    },
    boxLocked: { opacity: 0.5 },
    value: { fontSize: 16, fontWeight: "600" },
    hint: { color: C.textDim, fontSize: 12, marginTop: 8 },
    error: { color: C.danger, fontSize: 14, marginTop: 8 },
    saveBtn: {
      marginTop: 14,
      height: 48,
      borderRadius: 10,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 1.5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    modalSheet: {
      width: "100%",
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: C.border,
      backgroundColor: C.surface,
      overflow: "hidden",
    },
    modalTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: "700",
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    // height must match MODAL_ROW_HEIGHT — getItemLayout assumes it.
    modalItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 12,
      height: 44,
    },
    modalItemText: { color: C.text, fontSize: 16, fontWeight: "500" },
  });
