// local-pulse-app/src/screens/CallHistoryScreen.js

import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../theme/ThemeContext";
import { useCall } from "../context/CallContext";
import ReportCallSheet from "../components/call/ReportCallSheet";
import api from "../services/api";

/**
 * Recent calls across all conversations.
 *
 * Tap redials, long-press reports. Deliberately no swipe-to-delete: call
 * records are the audit trail behind any report, so they are not the user's
 * to erase. Account deletion removes them along with everything else.
 */

function formatDuration(seconds) {
  if (!seconds || seconds < 1) return null;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function statusMeta(call, t) {
  const outgoing = call.direction === "outgoing";

  switch (call.status) {
    case "ended":
    case "connected":
      return {
        icon: outgoing ? "arrow-up-outline" : "arrow-down-outline",
        label: outgoing ? t("call.outgoing") : t("call.incoming"),
        alert: false,
      };
    case "missed":
      return {
        icon: outgoing ? "arrow-up-outline" : "arrow-down-outline",
        label: outgoing ? t("call.noAnswer") : t("call.missed"),
        alert: !outgoing,
      };
    case "declined":
      return {
        icon: "close-outline",
        label: t("call.callDeclined"),
        alert: false,
      };
    case "cancelled":
      return {
        icon: "close-outline",
        label: t("call.callCancelled"),
        alert: false,
      };
    case "failed":
      return {
        icon: "alert-circle-outline",
        label: t("call.callFailed"),
        alert: true,
      };
    default:
      return { icon: "call-outline", label: t("call.callEnded"), alert: false };
  }
}

export default function CallHistoryScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { startCall, currentUserId } = useCall();

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [i18n.language],
  );

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/calls/recent", {
        params: { limit: 50 },
      });
      setCalls(data?.calls || []);
    } catch (error) {
      setCalls([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleCallAgain = useCallback(
    (call) => {
      const peer =
        String(call.caller?._id) === String(currentUserId)
          ? call.callee
          : call.caller;

      startCall({
        conversationId: String(call.conversation),
        peer,
        media: call.media,
      });
    },
    [startCall, currentUserId],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const peer = item.direction === "outgoing" ? item.callee : item.caller;
      const meta = statusMeta(item, t);
      const duration = formatDuration(item.durationSeconds);

      return (
        <Pressable
          onPress={() => handleCallAgain(item)}
          onLongPress={() => setReportTarget(item)}
          delayLongPress={400}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {(peer?.displayName || "?").charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.rowBody}>
            <Text
              style={[styles.name, meta.alert && styles.nameAlert]}
              numberOfLines={1}
            >
              {peer?.displayName || t("call.unknownUser")}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons
                name={meta.icon}
                size={13}
                color={
                  meta.alert ? theme.colors.danger : theme.colors.textSecondary
                }
              />
              <Text style={styles.meta} numberOfLines={1}>
                {meta.label}
                {duration ? ` · ${duration}` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.rowRight}>
            <Text style={styles.timestamp}>
              {dateFormatter.format(new Date(item.createdAt))}
            </Text>
            <Ionicons
              name={
                item.media === "video" ? "videocam-outline" : "call-outline"
              }
              size={18}
              color={theme.colors.primary}
            />
          </View>
        </Pressable>
      );
    },
    [t, theme, styles, dateFormatter, handleCallAgain],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={calls.length === 0 && styles.emptyContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="call-outline"
              size={38}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>{t("call.historyEmpty")}</Text>
          </View>
        }
      />

      <ReportCallSheet
        visible={Boolean(reportTarget)}
        call={reportTarget}
        onClose={() => setReportTarget(null)}
      />
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    rowPressed: {
      backgroundColor: theme.colors.surface,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    avatarInitial: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "600",
    },
    rowBody: {
      flex: 1,
      marginLeft: 12,
    },
    name: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
    },
    nameAlert: {
      color: theme.colors.danger,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
    },
    meta: {
      marginLeft: 5,
      fontSize: 13,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    rowRight: {
      alignItems: "flex-end",
      marginLeft: 10,
    },
    timestamp: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: 72,
    },
    emptyContainer: {
      flexGrow: 1,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
  });
