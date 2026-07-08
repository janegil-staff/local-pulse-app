// localpulse/app/src/screens/NotificationsScreen.js
import React, { useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useNotificationStore } from '../store/notificationStore.js';
import { theme, makeStyles, useStyles } from '../theme/theme.js';

const ICON = { like: '♥', comment: '💬', follow: '＋', message: '✉' };

function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function line(n) {
  const who = n.actor?.displayName || n.actor?.username || 'Someone';
  switch (n.type) {
    case 'like': return `${who} liked your post`;
    case 'comment': return `${who} commented on your post`;
    case 'follow': return `${who} started following you`;
    case 'message': return `${who} sent you a message`;
    default: return `${who} did something`;
  }
}

export default function NotificationsScreen({ navigation }) {
  const styles = useStyles(stylesFactory);
  const notifications = useNotificationStore((s) => s.notifications);
  const loading = useNotificationStore((s) => s.loading);
  const load = useNotificationStore((s) => s.load);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    load();
    // Mark read on open so the badge clears.
    const t = setTimeout(markAllRead, 800);
    return () => clearTimeout(t);
  }, [load, markAllRead]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.accent} /></View>;
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={notifications}
        keyExtractor={(n) => String(n.id)}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, !item.read && styles.rowUnread]}
            onPress={() => {
              if (item.type === 'follow') {
                navigation.navigate('Profile', { username: item.actor?.username });
              }
            }}
          >
            <Text style={styles.icon}>{ICON[item.type] || '•'}</Text>
            <Text style={styles.text}>{line(item)}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
      />
    </View>
  );
}

const stylesFactory = (({ colors, spacing }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(4), paddingVertical: spacing(3.5), borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing(3) },
    rowUnread: { backgroundColor: colors.surface },
    icon: { fontSize: 18, color: colors.accent, width: 24, textAlign: 'center' },
    text: { flex: 1, color: colors.text, fontSize: 14 },
    time: { color: colors.textDim, fontSize: 12 },
    empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing(20) },
  })
);
