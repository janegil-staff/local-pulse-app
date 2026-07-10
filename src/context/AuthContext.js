// localpulse/app/src/context/AuthContext.js
// Mirrors the Recover / copd_doctor auth pattern (local PIN verify, SecureStore
// for email+pin, pinVerified/isNewUser flags), adapted to Nearby's backend
// which returns { token, user } and logs in with email + (password OR pin).
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken } from '../api/client.js';

const TOKEN_KEY = 'auth.token.v1';

// Load SecureStore defensively — if the native module isn't linked, fall back
// to AsyncStorage so the app never crashes at import time.
let SecureStore = null;
try {
  // eslint-disable-next-line global-require
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

// Crash-proof storage wrappers. Prefer SecureStore; fall back to AsyncStorage.
async function secureSet(key, value) {
  try {
    if (value == null) return;
    if (SecureStore?.setItemAsync) await SecureStore.setItemAsync(key, String(value));
    else await AsyncStorage.setItem(`secure.${key}`, String(value));
  } catch (e) {
    console.warn('secureSet failed', key, e?.message);
  }
}
async function secureGet(key) {
  try {
    if (SecureStore?.getItemAsync) return await SecureStore.getItemAsync(key);
    return await AsyncStorage.getItem(`secure.${key}`);
  } catch (e) {
    console.warn('secureGet failed', key, e?.message);
    return null;
  }
}
async function secureDelete(key) {
  try {
    if (SecureStore?.deleteItemAsync) await SecureStore.deleteItemAsync(key);
    else await AsyncStorage.removeItem(`secure.${key}`);
  } catch { /* ignore */ }
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
    setToken(t);        // client module — attaches to requests
    setTokenState(t);   // react state — drives navigation
  };

  // Restore session on launch: token from AsyncStorage → load full profile.
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (savedToken) {
          applyToken(savedToken);
          const { profile } = await api.getMyProfile();
          setUser(profile ?? null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(token, email) {
    if (!token) throw new Error('Server did not return a token');
    applyToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (email) await secureSet('userEmail', email.trim().toLowerCase());
  }

  // login(emailOrUsername, secret) — secret is the PIN (or password). Always
  // authenticate against the server so we get a fresh valid token; the backend
  // accepts either the PIN or the password.
  const login = async (email, secret) => {
    const cleanEntered = String(email).trim().toLowerCase();
    const { token } = await api.login({ emailOrUsername: cleanEntered, password: secret });
    await persist(token, cleanEntered);
    await secureSet('userPin', secret);
    const { profile } = await api.getMyProfile();
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
    await persist(token, cleanEmail);
    if (data.pin) await secureSet('userPin', data.pin);
    setIsNewUser(true);
    setPinVerified(true);
    // When deferUser is set (multi-step onboarding), DON'T publish the user yet —
    // otherwise the navigator sees an incomplete profile and bounces to
    // onboarding mid-flow. The caller sets the user once everything's saved.
    if (opts.deferUser) return null;
    const { profile } = await api.getMyProfile();
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
    if (pin) await secureSet('userPin', pin);
    setPinVerified(true);
    const { profile } = await api.getMyProfile();
    setUser(profile);
    return profile;
  };

  const savePin = async (pin) => {
    await secureSet('userPin', pin);
    const email = user?.email ?? (await secureGet('userEmail'));
    if (email) await secureSet('userEmail', email.trim().toLowerCase());
  };

  const updateUser = (data) => setUser((prev) => (prev ? { ...prev, ...data } : prev));

  // Refresh the full profile (used by onboarding to flip profileComplete).
  const hydrate = async () => {
    const { profile } = await api.getMyProfile();
    setUser(profile);
    return profile;
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    applyToken(null);
    setPinVerified(false);
    setUser(null);
  };

  const logoutAndClearPin = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await secureDelete('userPin');
    await secureDelete('userEmail');
    applyToken(null);
    setPinVerified(false);
    setUser(null);
  };
  // Change the PIN. The server verifies the current one; on success we must
  // overwrite the SecureStore copy, or the local app-lock screen keeps
  // accepting the old value.
  const changePin = async (currentPin, newPin) => {
    await api.changePin(currentPin, newPin);
    await secureSet('userPin', newPin);
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
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}