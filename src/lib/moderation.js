// localpulse/app/src/lib/moderation.js
import { Alert } from 'react-native';
import { api } from '../api/client.js';

const REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'inappropriate', label: 'Inappropriate' },
  { key: 'misinformation', label: 'Misinformation' },
  { key: 'other', label: 'Other' },
];

// Present report reasons for a post. Fires the API on selection.
export function reportPostFlow(post) {
  Alert.alert(
    'Report post',
    'Why are you reporting this?',
    [
      ...REASONS.map((r) => ({
        text: r.label,
        onPress: async () => {
          try {
            await api.reportPost(post.id, r.key);
            Alert.alert('Thanks', 'Your report has been submitted.');
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ],
    { cancelable: true }
  );
}

export function reportUserFlow(user) {
  Alert.alert(
    `Report @${user.username}`,
    'Why are you reporting this user?',
    [
      ...REASONS.map((r) => ({
        text: r.label,
        onPress: async () => {
          try {
            await api.reportUser(user.id, r.key);
            Alert.alert('Thanks', 'Your report has been submitted.');
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ],
    { cancelable: true }
  );
}

export function blockUserFlow(user, onBlocked) {
  Alert.alert(
    `Block @${user.username}?`,
    "You won't see their posts, and they can't message you.",
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.blockUser(user.id);
            onBlocked?.();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]
  );
}
