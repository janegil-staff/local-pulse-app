// localpulse/app/src/context/AuthContext.js
// Mirrors the Recover / copd_doctor auth pattern (local PIN verify, SecureStore
// for email+pin, pinVerified/isNewUser flags), adapted to Nearby's backend
// which returns { token, user } and logs in with email + (password OR pin).
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setToken, setAuthFailureHandler } from "../api/client.js";
import { getChatSocket } from "../api/socket.js";
import { useChatStore } from "../store/chatStore.js";

const TOKEN_KEY = "auth.token.v1";

// Load SecureStore defensively — if the native module isn't linked, fall back
// to AsyncStorage so the app never crashes at import time.
let SecureStore = null;
try {
  // eslint-disable-next-line global-require
  SecureStore = require("expo-secure-store");
} catch {
  SecureStore = null;
}

// Crash-proof storage wrappers. Prefer SecureStore; fall back to AsyncStorage.
async function secureSet(key, value) {
  try {
    if (value == null) return;
    if (SecureStore?.setItemAsync)
      await SecureStore.setItemAsync(key, String(value));
    else await AsyncStorage.setItem(`secure.${key}`, String(value));
  } catch (e) {
    console.warn("secureSet failed", key, e?.message);
  }
}
async function secureGet(key) {
  try {
    if (SecureStore?.getItemAsync) return await SecureStore.getItemAsync(key);
    return await AsyncStorage.getItem(`secure.${key}`);
  } catch (e) {
    console.warn("secureGet failed", key, e?.message);
    return null;
  }
}
async function secureDelete(key) {
  try {
    if (SecureStore?.deleteItemAsync) await SecureStore.deleteItemAsync(key);
    else await AsyncStorage.removeItem(`secure.${key}`);
  } catch {
    /* ignore */
  }
}

// The API returns the profile under `profile`. Centralised so a shape change
// surfaces once, loudly, instead of as four silent setUser(undefined) calls —
// which is a login that appears to succeed and then does nothing.
async function loadProfile() {
  const res = await api.getMyProfile();
  const profile = res?.profile ?? res?.user ?? null;

  if (!profile) {
    console.error("getMyProfile returned no profile:", JSON.stringify(res));
    throw new Error("Unexpected profile response");
  }
  return profile;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null); // reactive — navigator reads this
  const [loading, setLoading] = useState(true);
  const [pinVerified, setPinVerified] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Set the token both in the API client (for requests) and in state (so the
  // navigator reacts to login/logout).
  const applyToken = (t) => {
    setToken(t); // client module — attaches to requests
    setTokenState(t); // react state — drives navigation
  };

  // Restore session on launch: token from AsyncStorage → load full profile.
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (savedToken) {
          applyToken(savedToken);
          setUser(await loadProfile());
        }
      } catch (e) {
        // A token we cannot exchange for a profile is WORSE than no token: the
        // navigator sees loggedIn true and user null, which is a splash screen
        // with no way out. Drop it and fall through to the login screen.
        console.warn("Session restore failed:", e?.message);
        await AsyncStorage.removeItem(TOKEN_KEY);
        applyToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register the client's auth-failure hook so a 403 'Account suspended' (a
  // banned account hitting requireAuth) drops the user to the login screen.
  // logoutAndClearPin also wipes the stored PIN/email so a banned user can't
  // re-enter via the local app-lock without a fresh server login (which will
  // also 403).
  useEffect(() => {
    setAuthFailureHandler(() => {
      logoutAndClearPin();
    });
    return () => setAuthFailureHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live follower count. Someone following you should move the number on your
  // own profile while you are looking at it — notify() sends a push
  // notification, which does nothing for an app that is already open.
  //
  // Best-effort: the count is also returned by every profile load, so a missed
  // event self-corrects on the next hydrate(). Being backgrounded on Android
  // (socket suspended) is the normal case, not a failure.
  useEffect(() => {
    if (!token) return undefined;

    const socket = getChatSocket();
    if (!socket) return undefined;

    const onFollowers = ({ followerCount }) => {
      if (typeof followerCount !== "number") return;
      updateUser({ followerCount });
    };

    socket.on("profile:followers", onFollowers);
    return () => socket.off("profile:followers", onFollowers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function persist(token, email) {
    if (!token) throw new Error("Server did not return a token");
    applyToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (email) await secureSet("userEmail", email.trim().toLowerCase());
  }

  // login(emailOrUsername, secret) — secret is the PIN (or password). Always
  // authenticate against the server so we get a fresh valid token; the backend
  // accepts either the PIN or the password.
  const login = async (email, secret) => {
    const cleanEntered = String(email).trim().toLowerCase();
    const { token } = await api.login({
      emailOrUsername: cleanEntered,
      password: secret,
    });
    await persist(token, cleanEntered);
    await secureSet("userPin", secret);

    const profile = await loadProfile();
    setPinVerified(true);
    setUser(profile);
    return profile;
  };

  // register(data) — creates the account with username + profile basics.
  const register = async (data, opts = {}) => {
    const { token } = await api.register({
      email: data.email,
      password: data.password,
      pin: data.pin,
      username: data.username,
      displayName: data.displayName,
      dob: data.dob,
      gender: data.gender,
    });
    const cleanEmail = String(data.email).trim().toLowerCase();

    // BEFORE persist(). Setting the token first produces a render where
    // loggedIn is true but isNewUser is still false — the navigator briefly
    // leaves the signup branch, unmounts the multi-step screen, and it
    // remounts at step 1 when the flag catches up. From the user's side,
    // signup silently restarts.
    setIsNewUser(true);
    setPinVerified(true);

    await persist(token, cleanEmail);
    if (data.pin) await secureSet("userPin", data.pin);

    // When deferUser is set (multi-step onboarding), DON'T publish the user
    // yet — the caller sets it once everything's saved.
    if (opts.deferUser) return null;

    const profile = await loadProfile();
    setUser(profile);
    return profile;
  };

  // Adopt a session the server handed us without a login round-trip. Used by
  // the PIN reset flow: resetPin() returns a token because the user just
  // proved control of their inbox and set a fresh credential. Mirrors login()
  // minus the api.login() call.
  const adoptSession = async (token, email, pin) => {
    const cleanEmail = String(email).trim().toLowerCase();
    await persist(token, cleanEmail);
    if (pin) await secureSet("userPin", pin);
    setPinVerified(true);

    const profile = await loadProfile();
    setUser(profile);
    return profile;
  };

  const savePin = async (pin) => {
    await secureSet("userPin", pin);
    const email = user?.email ?? (await secureGet("userEmail"));
    if (email) await secureSet("userEmail", email.trim().toLowerCase());
  };

  const updateUser = useCallback(
    (data) => setUser((prev) => (prev ? { ...prev, ...data } : prev)),
    [],
  );

  // Refresh the full profile (used by onboarding to finish, and after any
  // server-side change the local copy needs to reflect).
  const hydrate = async () => {
    const profile = await loadProfile();
    setUser(profile);
    return profile;
  };

  // Clearing the chat store on logout is not housekeeping — it is a
  // correctness fix. Its counts, conversations and `bound` flag are module
  // state that survives a logout, so without this the next user sees the
  // previous one's unread badge, and initSocket() no-ops because bound is
  // still true — leaving listeners bound to a socket authenticated as
  // somebody else.
  const clearChatState = () => {
    const reset = useChatStore.getState().reset;
    if (typeof reset === "function") reset();
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    applyToken(null);
    setPinVerified(false);
    setIsNewUser(false);
    setUser(null);
    clearChatState();
  };

  const logoutAndClearPin = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await secureDelete("userPin");
    await secureDelete("userEmail");
    applyToken(null);
    setPinVerified(false);
    setIsNewUser(false);
    setUser(null);
    clearChatState();
  };

  // Change the PIN. The server verifies the current one; on success we must
  // overwrite the SecureStore copy, or the local app-lock screen keeps
  // accepting the old value.
  const changePin = async (currentPin, newPin) => {
    await api.changePin(currentPin, newPin);
    await secureSet("userPin", newPin);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        hydrated: !loading, // App.js reads `hydrated`
        pinVerified,
        isNewUser,
        setPinVerified,
        setIsNewUser,
        updateUser,
        login,
        adoptSession,
        register,
        logout,
        logoutAndClearPin,
        changePin,
        savePin,
        hydrate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
