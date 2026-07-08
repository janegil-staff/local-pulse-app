// localpulse/app/src/theme/ThemeContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyMode, theme } from './theme.js';

const KEY = 'theme.pref.v1'; // 'system' | 'light' | 'dark'

const ThemeContext = createContext({
  mode: 'dark',        // resolved mode actually in use
  pref: 'system',      // user preference
  setPref: () => {},
});

export function ThemeProvider({ children }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [pref, setPrefState] = useState('system');
  const [ready, setReady] = useState(false);
  // A revision counter that re-renders consumers in place (NO remount).
  const [rev, setRev] = useState(0);

  const resolve = useCallback(
    (p) => (p === 'system' ? (system === 'light' ? 'light' : 'dark') : p),
    [system]
  );

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        const p = saved || 'system';
        setPrefState(p);
        applyMode(resolve(p));
      } catch {
        applyMode('dark');
      } finally {
        setReady(true);
        setRev((r) => r + 1);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pref === 'system' && ready) {
      applyMode(resolve('system'));
      setRev((r) => r + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system]);

  const setPref = useCallback(
    async (p) => {
      setPrefState(p);
      applyMode(resolve(p));
      setRev((r) => r + 1);
      try { await AsyncStorage.setItem(KEY, p); } catch { /* ignore */ }
    },
    [resolve]
  );

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ mode: theme.mode, theme, pref, setPref, rev }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}

// Alias matching the Recover / copd_doctor pattern: `const { theme } = useTheme()`.
export function useTheme() {
  return useContext(ThemeContext);
}
