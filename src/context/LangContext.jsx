import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations } from '../lib/i18n';

const LangContext = createContext(null);
const STORAGE_KEY = 'nm-lang';

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
    return saved === 'hi' || saved === 'en' ? saved : 'en';
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = useCallback(() => setLang((l) => (l === 'en' ? 'hi' : 'en')), []);

  // t('key', { n, ...vars })
  //  - if n === 1 and a `<key>_one` variant exists, that singular form wins
  //  - {placeholder} tokens are replaced from vars
  //  - missing Hindi keys fall back to English, then to the raw key
  const t = useCallback((key, vars) => {
    const dict = translations[lang] || translations.en;
    const en = translations.en;
    const singular = vars && Number(vars.n) === 1;
    const lookup = (d) => (singular && d[`${key}_one`] != null ? d[`${key}_one`] : d[key]);

    let str = lookup(dict);
    if (str == null) str = lookup(en);
    if (str == null) str = key;

    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.split(`{${k}}`).join(String(vars[k]));
      }
    }
    return str;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
