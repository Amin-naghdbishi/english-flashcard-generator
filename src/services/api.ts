import {
  AppSettings,
  CardData,
  DiagnosticsReport,
  ManualOverrides,
  AnkiCardVerificationDetails,
  ThemeId,
  CardType,
  TaggedNoteItem,
  CustomAIProviderConfig,
  CustomTTSProviderConfig,
  SmartImagesConfig,
  AIPromptsConfig,
} from '../types';
import { OllamaModelTag } from '../../server/ollama';
import { PiperVoice, PiperDiagnosticResult } from '../../server/piper';
import { OnlineTTSDiagnosticResult } from '../../server/onlineTts';

export async function fetchConfig(): Promise<AppSettings> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to load configuration');
  return res.json();
}

export async function saveConfig(settings: Partial<AppSettings>): Promise<AppSettings> {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save configuration');
  const data = await res.json();
  return data.settings;
}

export async function fetchDefaultPrompts(): Promise<AIPromptsConfig> {
  const res = await fetch('/api/prompts/defaults');
  if (!res.ok) throw new Error('Failed to load default AI prompts');
  const data = await res.json();
  return data.prompts;
}

export async function restoreDefaultPrompts(): Promise<{ settings: AppSettings; prompts: AIPromptsConfig }> {
  const res = await fetch('/api/prompts/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to restore default AI prompts');
  return res.json();
}

export async function updateAnkiNote(
  noteId: number,
  cardData: CardData,
  themeId?: ThemeId
): Promise<{ success: boolean; noteId: number; error?: string }> {
  const res = await fetch('/api/anki/update-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteId, cardData, themeId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update note in Anki');
  }
  return res.json();
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 3500): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// --- Ollama ---
export async function checkOllama(url?: string): Promise<{ connected: boolean; version?: string; error?: string }> {
  try {
    const q = url ? `?url=${encodeURIComponent(url)}` : '';
    const res = await fetchWithTimeout(`/api/ollama/health${q}`, {}, 3500);
    return await res.json();
  } catch (err: any) {
    return { connected: false, error: err?.message || 'Ollama offline' };
  }
}

export async function getOllamaModels(url?: string): Promise<{ success: boolean; models: OllamaModelTag[]; error?: string }> {
  const q = url ? `?url=${encodeURIComponent(url)}` : '';
  const res = await fetch(`/api/ollama/models${q}`);
  return res.json();
}

// --- Gemini ---
export async function checkGemini(apiKey: string, model?: string): Promise<{ connected: boolean; model?: string; error?: string }> {
  try {
    const res = await fetchWithTimeout('/api/gemini/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model }),
    }, 4000);
    return await res.json();
  } catch (err: any) {
    return { connected: false, error: err?.message || 'Gemini check timed out' };
  }
}

export async function getGeminiModels(): Promise<{ success: boolean; models: Array<{ id: string; name: string }> }> {
  const res = await fetch('/api/gemini/models');
  return res.json();
}

// --- Custom AI Provider ---
export async function checkCustomAI(config: CustomAIProviderConfig): Promise<{
  connected: boolean;
  message: string;
  models?: string[];
  error?: string;
}> {
  const res = await fetch('/api/custom-ai/health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  return res.json();
}

export async function getCustomAIModels(config: CustomAIProviderConfig): Promise<{
  success: boolean;
  models: string[];
  error?: string;
}> {
  const res = await fetch('/api/custom-ai/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  return res.json();
}

// --- Custom TTS Provider ---
export async function testCustomTTS(
  config: CustomTTSProviderConfig,
  testSentence?: string
): Promise<{
  success: boolean;
  normalAudioBase64?: string;
  slowAudioBase64?: string;
  durationSeconds?: number;
  format?: string;
  error?: string;
}> {
  const res = await fetch('/api/custom-tts/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, testSentence }),
  });
  return res.json();
}

// --- Piper TTS ---
export async function checkTTS(endpoint?: string): Promise<{
  success: boolean;
  ready: boolean;
  connected: boolean;
  endpoint: string;
  voicesCount?: number;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (endpoint) params.set('endpoint', endpoint);
    const res = await fetchWithTimeout(`/api/tts/health?${params.toString()}`, {}, 3500);
    return await res.json();
  } catch (err: any) {
    return { success: false, ready: false, connected: false, endpoint: endpoint || '', error: err?.message || 'Piper offline' };
  }
}

export async function getTTSVoices(endpoint?: string): Promise<{ success: boolean; voices: PiperVoice[]; error?: string }> {
  const params = new URLSearchParams();
  if (endpoint) params.set('endpoint', endpoint);
  const res = await fetch(`/api/tts/voices?${params.toString()}`);
  return res.json();
}

export async function getPiperServiceStatus(): Promise<{
  active: boolean;
  status: string;
  detail?: string;
  error?: string;
}> {
  try {
    const res = await fetchWithTimeout('/api/piper/service', {}, 3500);
    return await res.json();
  } catch (err: any) {
    return { active: false, status: 'inactive', error: err?.message };
  }
}

export async function controlPiperService(action: 'start' | 'stop' | 'restart'): Promise<{
  success: boolean;
  active: boolean;
  status: string;
  command: string;
  message: string;
  error?: string;
}> {
  const res = await fetch('/api/piper/service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return res.json();
}

export async function synthesizeAudio(text: string, voice?: string, speed?: number, endpoint?: string) {
  const res = await fetch('/api/tts/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, speed, endpoint }),
  });
  return res.json();
}

export async function runTTSDiagnostics(params?: {
  endpoint?: string;
  americanVoice?: string;
  britishVoice?: string;
  normalSpeed?: number;
  slowSpeed?: number;
}): Promise<PiperDiagnosticResult> {
  const res = await fetch('/api/tts/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  });
  return res.json();
}

// --- Online TTS ---
export async function checkOnlineTTS(): Promise<{ connected: boolean; error?: string }> {
  try {
    const res = await fetchWithTimeout('/api/online-tts/health', {}, 3500);
    return await res.json();
  } catch (err: any) {
    return { connected: false, error: err?.message || 'Online TTS offline' };
  }
}

export async function runOnlineTTSDiagnostics(): Promise<OnlineTTSDiagnosticResult> {
  const res = await fetch('/api/online-tts/diagnostics');
  return res.json();
}

// --- Smart Images & Manual Image Selection ---
export async function testSmartImage(
  word: string,
  partOfSpeech?: string,
  meaningFa?: string,
  config?: SmartImagesConfig
) {
  const res = await fetch('/api/smart-images/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, partOfSpeech, meaningFa, config }),
  });
  return res.json();
}

export async function searchOnlineImages(word: string): Promise<{
  success: boolean;
  results: Array<{ title: string; thumbUrl: string; fullUrl: string; source: string }>;
}> {
  const res = await fetch(`/api/smart-images/search?word=${encodeURIComponent(word)}`);
  return res.json();
}

export async function downloadImage(url: string, word?: string): Promise<{
  success: boolean;
  imageBase64?: string;
  imageFileName?: string;
  mimeType?: string;
  error?: string;
}> {
  const res = await fetch('/api/download-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, word }),
  });
  return res.json();
}

// --- Dictionary Sources ---
export async function lookupAbadisDict(word: string) {
  const res = await fetch(`/api/dictionary/abadis?word=${encodeURIComponent(word)}`);
  return res.json();
}

export async function lookupFreeDict(word: string) {
  const res = await fetch(`/api/dictionary/freedict?word=${encodeURIComponent(word)}`);
  return res.json();
}

// --- Anki ---
export async function checkAnki(url?: string): Promise<{ connected: boolean; version?: number; error?: string }> {
  try {
    const q = url ? `?url=${encodeURIComponent(url)}` : '';
    const res = await fetchWithTimeout(`/api/anki/health${q}`, {}, 3500);
    return await res.json();
  } catch (err: any) {
    return { connected: false, error: err?.message || 'AnkiConnect unreachable' };
  }
}

export async function getAnkiDecks(url?: string): Promise<{ success: boolean; decks: string[]; error?: string }> {
  const q = url ? `?url=${encodeURIComponent(url)}` : '';
  const res = await fetch(`/api/anki/decks${q}`);
  return res.json();
}

export async function checkDuplicate(
  deck: string,
  word: string,
  url?: string
): Promise<{ isDuplicate: boolean; existingNoteIds: number[]; error?: string }> {
  const res = await fetch('/api/anki/check-duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deck, word, url }),
  });
  return res.json();
}

export async function ensureModelInAnki(url?: string, theme?: ThemeId, cardType?: CardType) {
  const res = await fetch('/api/anki/model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, theme, cardType }),
  });
  return res.json();
}

export async function runAnkiPipelineTest(params: {
  word?: string;
  deck?: string;
  url?: string;
  theme?: ThemeId;
  cardType?: CardType;
}) {
  const res = await fetch('/api/anki/diagnostics/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function verifyNoteInAnki(noteId: number, deck?: string, url?: string): Promise<{
  success: boolean;
  verification?: AnkiCardVerificationDetails;
  error?: string;
}> {
  const params = new URLSearchParams();
  if (deck) params.set('deck', deck);
  if (url) params.set('url', url);
  const res = await fetch(`/api/anki/verify/${noteId}?${params.toString()}`);
  return res.json();
}

export async function openInAnki(params: { noteId?: number; query?: string; url?: string }): Promise<{
  success: boolean;
  query?: string;
  error?: string;
}> {
  const res = await fetch('/api/anki/open-browser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function createDirectAnkiNote(params: {
  deck: string;
  cardData: CardData;
  theme?: ThemeId;
  cardType?: CardType;
  url?: string;
}): Promise<{
  success: boolean;
  noteId?: number;
  cardIds?: number[];
  verification?: AnkiCardVerificationDetails;
  error?: string;
}> {
  const res = await fetch('/api/anki/create-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function runFullPipeline(params: {
  word: string;
  deck: string;
  manualOverrides?: ManualOverrides;
  cardType?: CardType;
  createInAnki?: boolean;
}): Promise<{
  success: boolean;
  cardData?: CardData;
  noteId?: number;
  cardIds?: number[];
  deck?: string;
  cardType?: CardType;
  stage?: string;
  error?: string;
  verification?: AnkiCardVerificationDetails;
  logs?: Array<{
    step: number;
    name: string;
    status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
    message: string;
    details?: string;
    timestamp?: number;
  }>;
}> {
  const res = await fetch('/api/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function runFullDiagnostics(): Promise<DiagnosticsReport> {
  const res = await fetch('/api/diagnostics');
  return res.json();
}

export async function getAnkiTags(url?: string): Promise<{ success: boolean; tags: string[]; error?: string }> {
  const query = url ? `?url=${encodeURIComponent(url)}` : '';
  const res = await fetch(`/api/anki/tags${query}`);
  return res.json();
}

export async function findNotesByTag(params: {
  tag: string;
  url?: string;
}): Promise<{
  success: boolean;
  tag: string;
  notes: TaggedNoteItem[];
  totalCount: number;
  missingCount: number;
  error?: string;
}> {
  const res = await fetch('/api/anki/notes-by-tag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function completeAnkiNote(params: {
  noteId: number;
  selectedTag?: string;
  includeImage?: boolean;
  url?: string;
}): Promise<{
  success: boolean;
  noteId?: number;
  word?: string;
  cardData?: CardData;
  generatedFields?: string[];
  removedTag?: string;
  error?: string;
}> {
  const res = await fetch('/api/anki/complete-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}
