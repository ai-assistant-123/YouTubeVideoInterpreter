
import { InterpretationHistory, Language, AnalysisStyle, KnowledgeLevel } from '../types';

const HISTORY_KEY = 'yt_interpreter_history';
const PREFS_KEY = 'yt_interpreter_prefs';

export function saveHistory(item: InterpretationHistory) {
  const history = getHistory();
  const existingIndex = history.findIndex(h => h.id === item.id);
  if (existingIndex > -1) {
    history[existingIndex] = item;
  } else {
    history.unshift(item);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50))); // Keep last 50
}

export function getHistory(): InterpretationHistory[] {
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export function deleteHistoryItem(id: string) {
  const history = getHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function savePrefs(lang: Language, style: AnalysisStyle, level: KnowledgeLevel) {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ lang, style, level }));
}

export function getPrefs(): { lang: Language, style: AnalysisStyle, level: KnowledgeLevel } | null {
  const data = localStorage.getItem(PREFS_KEY);
  return data ? JSON.parse(data) : null;
}
