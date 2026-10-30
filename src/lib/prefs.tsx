import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from './i18n';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from './data';

type Lang = 'en' | 'hi';

interface Prefs {
  lang: Lang;
  setLang: (lang: Lang) => void;
  lite: boolean;
  setLite: (lite: boolean) => void;
  t: (source: string, vars?: Record<string, string | number>) => string;
}

const PrefsContext = createContext<Prefs | undefined>(undefined);

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked in private windows; the preference then lasts for this visit.
  }
}

export const PrefsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user, refreshProfile } = useAuth();

  const [lang, setLangState] = useState<Lang>(() => (read('prepsaathi_lang') === 'hi' ? 'hi' : 'en'));
  const [lite, setLiteState] = useState<boolean>(() => {
    const stored = read('prepsaathi_lite');
    if (stored !== null) return stored === 'true';
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return connection?.saveData === true;
  });

  // The account's saved language wins once it has loaded.
  useEffect(() => {
    if (profile?.language_pref) setLangState(profile.language_pref);
  }, [profile?.language_pref]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle('lite', lite);
  }, [lite]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      write('prepsaathi_lang', next);
      if (user?.id && profile) {
        void updateProfile(user.id, { language_pref: next }).then(refreshProfile);
      }
    },
    [user?.id, profile, refreshProfile]
  );

  const setLite = useCallback((next: boolean) => {
    setLiteState(next);
    write('prepsaathi_lite', String(next));
  }, []);

  const value = useMemo<Prefs>(
    () => ({ lang, setLang, lite, setLite, t: (source, vars) => translate(lang, source, vars) }),
    [lang, setLang, lite, setLite]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
};

export const usePrefs = () => {
  const context = useContext(PrefsContext);
  if (!context) throw new Error('usePrefs must be used within a PrefsProvider');
  return context;
};
