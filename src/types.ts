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

  // Piper multi-audio files
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

export interface OllamaConfig {
  url: string;
  model: string;
  temperature: number;
  contextLength: number;
}

export interface TTSConfig {
  engine: 'piper';
  endpoint: string; // http://127.0.0.1:5000
  americanVoice: string; // en_US-lessac-high
  britishVoice: string; // en_GB-cori-high
  normalSpeed: number; // 1.0 (length_scale = 1.0)
  slowSpeed: number; // 1.25 (length_scale = 1.25)
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

export interface PiperVoice {
  id: string;
  name: string;
  accent: 'american' | 'british';
  defaultModel: string;
}

export interface PiperTestAudioClips {
  usNormalBase64?: string;
  usSlowBase64?: string;
  ukNormalBase64?: string;
  ukSlowBase64?: string;
}

export interface PiperDiagnosticStep {
  step: number;
  title: string;
  status: 'ok' | 'error' | 'pending' | 'warning';
  message: string;
  details?: any;
}

export interface PiperDiagnosticResult {
  engine: 'piper';
  ready: boolean;
  endpoint: string;
  steps: PiperDiagnosticStep[];
  testAudios?: PiperTestAudioClips;
  testUsAudioBase64?: string;
  testUkAudioBase64?: string;
  testSlowAudioBase64?: string;
  checklist: {
    piperConnected: boolean;
    americanVoiceWorking: boolean;
    britishVoiceWorking: boolean;
    normalSpeedWorking: boolean;
    slowSpeedWorking: boolean;
  };
  error?: string;
}

export interface AppSettings {
  ai: OllamaConfig;
  tts: TTSConfig;
  anki: AnkiConfig;
  theme: 'comic-dark' | 'comic-light';
}

export interface BatchItem {
  id: string;
  word: string;
  status: 'idle' | 'checking_duplicate' | 'generating_ai' | 'generating_audio' | 'creating_anki' | 'success' | 'error' | 'duplicate';
  cardData?: CardData;
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
  id: 'comic-dark' | 'comic-light';
  name: string;
  description: string;
  frontHtml: string;
  backHtml: string;
  css: string;
}
