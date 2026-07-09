// localpulse/app/src/theme/ThemeContext.js
//
// Owns the user's theme *preference* ('system' | 'light' | 'dark') and
// persists it. The actual palette swap happens in theme.js via applyMode(),
// which notifies every component using useStyles().
//
// Deliberately does NOT remount the tree. An earlier version keyed the
// children on a revision counter, which rebuilt navigation on every toggle
// and bounced the user back to Discover.
import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyMode, theme, useThemeVersion } from './theme.js';

const KEY = 'theme.pref.v1'; // 'system' | 'light' | 'dark'

const ThemeContext = createContext({
  mode: 'dark',   // resolved mode actually in use
  pref: 'system', // user preference
  theme,
  setPref: () => {},
});

export function ThemeProvider({ children }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [pref, setPrefState] = useState('system');
  const [ready, setReady] = useState(false);

  // Subscribe so this provider re-renders when the palette changes, keeping
  // `mode` in the context value fresh for consumers that read it.
  useThemeVersion();

  const resolve = useCallback(
    (p) => (p === 'system' ? (system === 'light' ? 'light' : 'dark') : p),
    [system],
  );

  // Load the saved preference once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let p = 'system';
      try {
        p = (await AsyncStorage.getItem(KEY)) || 'system';
      } catch {
        // fall through with 'system'
      }
      if (cancelled) return;
      setPrefState(p);
      applyMode(p === 'system' ? (system === 'light' ? 'light' : 'dark') : p);
      setReady(true);
    })();
    return () => { cancelled = true; };
    // Intentionally once on mount; `system` is handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the OS when the preference is 'system'.
  useEffect(() => {
    if (!ready) return;
    if (pref !== 'system') return;
    applyMode(resolve('system'));
  }, [system, pref, ready, resolve]);

  const setPref = useCallback(
    async (p) => {
      setPrefState(p);
      applyMode(resolve(p));
      try {
        await AsyncStorage.setItem(KEY, p);
      } catch {
        // preference just won't persist; not worth surfacing
      }
    },
    [resolve],
  );

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ mode: theme.mode, theme, pref, setPref }}>
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