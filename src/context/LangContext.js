// src/context/LangContext.js
// Mirrors Recover's useLang() shape: { t, lang, setLang }.
// Persists the choice to AsyncStorage and re-renders consumers on change,
// so switching the language picker updates all text live.
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTranslations, DEFAULT_LANG, SUPPORTED_LANGS } from '../i18n/translations.js';

const LANG_KEY = 'lang_override';
const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((v) => { if (v && SUPPORTED_LANGS.includes(v)) setLangState(v); })
      .catch(() => {});
  }, []);

  const setLang = (code) => {
    if (!SUPPORTED_LANGS.includes(code)) return;
    setLangState(code);
    AsyncStorage.setItem(LANG_KEY, code).catch(() => {});
  };

  // Recompute t whenever lang changes → consumers re-render in the new language.
  const t = useMemo(() => getTranslations(lang), [lang]);

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}