import { AppSettings, CardData, DiagnosticsReport, ManualOverrides, AnkiCardVerificationDetails, ThemeId } from '../types';
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

export async function checkOllama(url?: string): Promise<{ connected: boolean; version?: string; error?: string }> {
  const q = url ? `?url=${encodeURIComponent(url)}` : '';
  const res = await fetch(`/api/ollama/health${q}`);
  return res.json();
}

export async function getOllamaModels(url?: string): Promise<{ success: boolean; models: OllamaModelTag[]; error?: string }> {
  const q = url ? `?url=${encodeURIComponent(url)}` : '';
  const res = await fetch(`/api/ollama/models${q}`);
  return res.json();
}

export async function checkGemini(apiKey: string, model?: string): Promise<{ connected: boolean; model?: string; error?: string }> {
  const res = await fetch('/api/gemini/health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model }),
  });
  return res.json();
}

export async function getGeminiModels(): Promise<{ success: boolean; models: Array<{ id: string; name: string }> }> {
  const res = await fetch('/api/gemini/models');
  return res.json();
}

export async function checkTTS(endpoint?: string, voice?: string): Promise<PiperDiagnosticResult> {
  const params = new URLSearchParams();
  if (endpoint) params.set('endpoint', endpoint);
  if (voice) params.set('voice', voice);
  const res = await fetch(`/api/tts/health?${params.toString()}`);
  return res.json();
}

export async function getTTSVoices(): Promise<{ success: boolean; voices: PiperVoice[] }> {
  const res = await fetch('/api/tts/voices');
  return res.json();
}

export async function getPiperServiceStatus(): Promise<{
  active: boolean;
  status: string;
  detail?: string;
  error?: string;
}> {
  const res = await fetch('/api/piper/service');
  return res.json();
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

export async function checkOnlineTTS(): Promise<{ connected: boolean; error?: string }> {
  const res = await fetch('/api/tts/online/health');
  return res.json();
}

export async function runOnlineTTSDiagnostics(): Promise<OnlineTTSDiagnosticResult> {
  const res = await fetch('/api/tts/online/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function checkAnki(url?: string): Promise<{ connected: boolean; version?: number; error?: string }> {
  const q = url ? `?url=${encodeURIComponent(url)}` : '';
  const res = await fetch(`/api/anki/health${q}`);
  return res.json();
}

export async function getAnkiDecks(url?: string): Promise<{ success: boolean; decks: string[]; error?: string }> {
  const q = url ? `?url=${encodeURIComponent(url)}` : '';
  const res = await fetch(`/api/anki/decks${q}`);
  return res.json();
}

export async function checkDuplicate(deck: string, word: string, url?: string): Promise<{ isDuplicate: boolean; existingNoteIds: number[]; error?: string }> {
  const res = await fetch('/api/anki/check-duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deck, word, url }),
  });
  return res.json();
}

export async function setupAnkiModel(themeId?: ThemeId, url?: string) {
  const res = await fetch('/api/anki/setup-model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ themeId, url }),
  });
  return res.json();
}

export async function runAnkiPipelineTest(deck?: string, themeId?: ThemeId, url?: string): Promise<{
  success: boolean;
  steps: Array<{ step: string; status: 'ok' | 'error'; message: string; details?: any }>;
  testNoteId?: number;
  testCardIds?: number[];
  verification?: AnkiCardVerificationDetails;
}> {
  const res = await fetch('/api/anki/test-pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deck, themeId, url }),
  });
  return res.json();
}

export async function verifyNoteInAnki(noteId: number, deck?: string, url?: string): Promise<{
  success: boolean;
  isVerified: boolean;
  error?: string;
  verification?: AnkiCardVerificationDetails;
}> {
  const res = await fetch('/api/anki/verify-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteId, deck, url }),
  });
  return res.json();
}

export async function openInAnki(params: { noteId?: number; query?: string; url?: string }): Promise<{
  success: boolean;
  query?: string;
  error?: string;
}> {
  const res = await fetch('/api/anki/open-in-anki', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function createDirectAnkiNote(params: {
  deck: string;
  cardData: CardData;
  themeId?: ThemeId;
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
  createInAnki?: boolean;
}): Promise<{
  success: boolean;
  cardData?: CardData;
  noteId?: number;
  cardIds?: number[];
  deck?: string;
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
  const res = await fetch('/api/pipeline/generate-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function runFullDiagnostics(): Promise<DiagnosticsReport> {
  const res = await fetch('/api/diagnostics/all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}
