import { HI } from './i18n.hi';

// English source strings are the keys, so screens stay readable and a missing
// Hindi entry falls back to English instead of showing a raw key.
export function translate(lang: string, source: string, vars?: Record<string, string | number>): string {
  let text = lang === 'hi' ? (HI[source] ?? source) : source;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      text = text.split(`{${key}}`).join(String(value));
    }
  }
  return text;
}
