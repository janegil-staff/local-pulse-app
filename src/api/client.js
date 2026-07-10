// localpulse/app/src/api/client.js
// On a device, localhost is the phone. Set EXPO_PUBLIC_API_URL to your Mac's
// LAN IP in dev (e.g. http://192.168.1.71:4000), the Android emulator's
;// http://10.0.2.2:4000, or your deployed URL. Falls back to localhost.

//import { Platform } from 'react-native';
//const HOST = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

const HOST = "https://lionfish-app-ed6lo.ondigitalocean.app"

export const API_URL = `${HOST}/api`;
export const SOCKET_URL = HOST;

let authToken = null;
export function setToken(token) { authToken = token; }
export function getToken() { return authToken; }

async function request(path, { method = 'GET', body, auth = true, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  // Abort after 15s so an unreachable server surfaces an error instead of
  // hanging forever (e.g. wrong API_URL).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Can't reach the server at ${API_URL}. Check EXPO_PUBLIC_API_URL.`);
    }
    throw new Error(`Network error reaching ${API_URL}: ${err.message}`);
  }
  clearTimeout(timeout);

  const data = await res.json().catch(() => ({}));
  console.log(`[api] ${method} ${path} -> ${res.status}`, res.ok ? 'OK' : JSON.stringify(data));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function qs(params = {}) {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null)).toString();
  return s ? `?${s}` : '';
}

export const api = {
  register: (b) => request('/auth/register', { method: 'POST', body: b, auth: false }),
  login: (b) => request('/auth/login', { method: 'POST', body: b, auth: false }),
  me: () => request('/auth/me'),

  // ── Location ──────────────────────────────────────────────
  searchPlaces: (q) => request(`/geocode${qs({ q })}`),

  setLocation: ({ lat, lng, name, mode }) =>
    request('/location', { method: 'POST', body: { lat, lng, name, mode } }),

  setBrowseLocation: (payload) =>
    request('/browse-location', { method: 'POST', body: payload }),


  createPost: (b) => request('/posts', { method: 'POST', body: b }),
  getFeed: (p) => request(`/posts/feed${qs(p)}`),
  getFollowingFeed: (p) => request(`/posts/following${qs(p)}`),
  toggleLike: (id) => request(`/posts/${id}/like`, { method: 'POST' }),

  getComments: (postId) => request(`/posts/${postId}/comments`),
  addComment: (postId, text) => request(`/posts/${postId}/comments`, { method: 'POST', body: { text } }),
  deleteComment: (id) => request(`/comments/${id}`, { method: 'DELETE' }),

  getProfile: (username) => request(`/users/${username}`),
  updateProfile: (b) => request('/users/me', { method: 'PATCH', body: b }),
  follow: (id) => request(`/users/${id}/follow`, { method: 'POST' }),
  unfollow: (id) => request(`/users/${id}/follow`, { method: 'DELETE' }),

  getConversations: () => request('/chat/conversations'),
  openConversation: (userId) => request(`/chat/conversations/${userId}`, { method: 'POST' }),
  getMessages: (id, p) => request(`/chat/conversations/${id}/messages${qs(p)}`),

  // ── Dating: profile / preferences / account ──
  getMyProfile: () => request('/me'),
  updateMyProfile: (b) => request('/me', { method: 'PATCH', body: b }),
  updatePreferences: (b) => request('/me/preferences', { method: 'PATCH', body: b }),
  updateLocation: (lng, lat) => request('/me/location', { method: 'PATCH', body: { lng, lat } }),
  deleteAccount: () => request('/me', { method: 'DELETE' }),

  // ── Dating: discovery + matching ──
  getDiscovery: (p) => request(`/discovery${qs(p)}`),
  swipe: (userId, action) => request(`/swipe/${userId}`, { method: 'POST', body: { action } }),
  getMatches: () => request('/matches'),
  unmatch: (id) => request(`/matches/${id}`, { method: 'DELETE' }),

  // Notifications + push
  getNotifications: (p) => request(`/notifications${qs(p)}`),
  getUnreadCount: () => request('/notifications/unread-count'),
  markNotificationsRead: () => request('/notifications/read', { method: 'POST' }),
  registerPush: (token) => request('/push/register', { method: 'POST', body: { token } }),
  removePush: (token) => request('/push/remove', { method: 'POST', body: { token } }),

  // Saved / bookmarks
  getSaved: () => request('/posts/saved'),
  toggleSave: (postId) => request(`/posts/${postId}/save`, { method: 'POST' }),

  // Moderation
  reportPost: (postId, reason, note) => request(`/posts/${postId}/report`, { method: 'POST', body: { reason, note } }),
  reportUser: (userId, reason, note) => request(`/users/${userId}/report`, { method: 'POST', body: { reason, note } }),
  blockUser: (userId) => request(`/users/${userId}/block`, { method: 'POST' }),
  unblockUser: (userId) => request(`/users/${userId}/block`, { method: 'DELETE' }),
  getBlocked: () => request('/blocks'),
  getRequests: () => request('/chat/requests'),
  acceptConversation: (id) => request(`/chat/conversations/${id}/accept`, { method: 'POST' }),
  getChatUnreadCount: () => request('/chat/unread-count'),
  markConversationRead: (id) => request(`/chat/conversations/${id}/read`, { method: 'POST' }),
  uploadImage: (uri) => {
    const name = (uri.split('/').pop() || 'photo.jpg').split('?')[0];
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const form = new FormData();
    form.append('image', { uri, name, type }); // ⚠️ 'image' must match the route's .single('image')
    return request('/upload', { method: 'POST', body: form, isForm: true });
  },
  resendVerification: () => request('/auth/resend-verification', { method: 'POST' }),
  requestPinReset: (email) => request('/auth/forgot-pin', { method: 'POST', body: { email }, auth: false }),
  resetPin: (email, code, pin) => request('/auth/reset-pin', { method: 'POST', body: { email, code, pin }, auth: false }),
  changePin: (currentPin, newPin) => request('/auth/change-pin', { method: 'POST', body: { currentPin, newPin } }),
};
