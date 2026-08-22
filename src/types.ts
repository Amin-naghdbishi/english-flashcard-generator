export interface CardAudioFile {
  fileName: string;
  fieldSoundTag: string;
  base64: string;
  label: string;
  voice: string;
  speed: number;
  durationSeconds?: number;
}

export interface CardData {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaningFa: string;
  example: string;
  translationFa: string;
  mnemonic: string;

  // Multi-audio files
  wordAudioUsNormalBase64?: string;
  wordAudioUsSlowBase64?: string;
  wordAudioUkNormalBase64?: string;
  wordAudioUkSlowBase64?: string;
  exampleAudioUsNormalBase64?: string;
  exampleAudioUkNormalBase64?: string;

  wordAudioUsNormalFileName?: string;
  wordAudioUsSlowFileName?: string;
  wordAudioUkNormalFileName?: string;
  wordAudioUkSlowFileName?: string;
  exampleAudioUsNormalFileName?: string;
  exampleAudioUkNormalFileName?: string;

  // Primary / fallback audio
  wordAudioBase64?: string;
  exampleAudioBase64?: string;
  wordAudioFileName?: string;
  exampleAudioFileName?: string;

  // Array of all generated audio clips
  audioFiles?: CardAudioFile[];
}

export interface ManualOverrides {
  phonetic?: string;
  partOfSpeech?: string;
  meaningFa?: string;
  example?: string;
  translationFa?: string;
  mnemonic?: string;
}

export type AIProvider = 'ollama' | 'gemini';
export type TTSProvider = 'piper' | 'online';

export type ThemeId =
  | 'comic-pop-light'
  | 'comic-pop-dark'
  | 'comic-strip-light'
  | 'comic-strip-dark'
  | 'comic-manga-light'
  | 'comic-manga-dark'
  | 'comic-minimal-light'
  | 'comic-minimal-dark'
  | 'comic-arcade-light'
  | 'comic-arcade-dark'
  | 'comic-dark'
  | 'comic-light';

export interface OllamaConfig {
  url: string;
  model: string;
  temperature: number;
  contextLength: number;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
}

export interface AIConfig {
  provider: AIProvider;
  ollama: OllamaConfig;
  gemini: GeminiConfig;
  // Legacy / fallback flat properties
  url?: string;
  model?: string;
  temperature?: number;
  contextLength?: number;
}

export interface TTSConfig {
  provider: TTSProvider;
  engine?: TTSProvider; // backwards compatibility
  endpoint: string; // http://127.0.0.1:5000 (for Piper)
  americanVoice: string; // en_US-lessac-high
  britishVoice: string; // en_GB-cori-high
  normalSpeed: number;
  slowSpeed: number;
  generateSlow: boolean;
  generateBritish: boolean;
  generateAmerican: boolean;
  generateSlowExample?: boolean;
}

export interface AnkiConfig {
  url?: string;
  endpoint?: string;
  defaultDeck?: string;
  deck?: string;
  noteType?: string;
  model?: string;
  autoSync?: boolean;
  tags?: string[];
}

export interface AppSettings {
  ai: AIConfig;
  tts: TTSConfig;
  anki: AnkiConfig;
  theme: ThemeId;
}

export interface BatchFieldConfig {
  word: boolean;
  deck: boolean;
  phonetic: boolean;
  partOfSpeech: boolean;
  meaningFa: boolean;
  example: boolean;
  translationFa: boolean;
  mnemonic: boolean;
}

export interface BatchItem {
  id: string;
  word: string;
  deck?: string;
  status: 'idle' | 'checking_duplicate' | 'generating_ai' | 'generating_audio' | 'creating_anki' | 'success' | 'error' | 'duplicate';
  cardData?: CardData;
  parsedFields?: Partial<CardData>;
  error?: string;
  noteId?: number;
  isDuplicate?: boolean;
}

export interface StepLog {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message: string;
  details?: string;
  timestamp?: number;
}

export interface AnkiCardVerificationDetails {
  noteId: number;
  cardIds: number[];
  targetDeck: string;
  actualDeck: string;
  modelName: string;
  tags: string[];
  fields: Record<string, string>;
  cardsCount: number;
  cardsInfo: Array<{
    cardId: number;
    deckName: string;
    noteId: number;
    ord: number;
    queue: number;
    queueLabel: string;
    type: number;
    typeLabel: string;
    due: number;
    suspended: boolean;
  }>;
  deckMatched: boolean;
  isSuspended: boolean;
  isVerified: boolean;
  verificationMessage: string;
}

export interface DiagnosticsItem {
  name: string;
  status: 'ok' | 'error' | 'pending' | 'warning';
  message: string;
  details?: string;
  timestamp: string;
}

export interface DiagnosticsReport {
  system: DiagnosticsItem[];
  ai: DiagnosticsItem[];
  tts: DiagnosticsItem[];
  anki: DiagnosticsItem[];
  templates: DiagnosticsItem[];
  allPassed: boolean;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  frontHtml: string;
  backHtml: string;
  css: string;
}
