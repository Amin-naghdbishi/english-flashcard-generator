export type CardType = 'normal' | 'spelling';

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

  // Card type & Spelling specific
  cardType?: CardType;
  spellingSentence?: string; // Sentence with ______ for the target word

  // Smart Images
  imageBase64?: string;
  imageFileName?: string;
  imageAlt?: string;
  needsImage?: boolean;
  imageReason?: string;

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
  cardType?: CardType;
  imageBase64?: string;
  imageFileName?: string;
}

export type AIProvider = 'ollama' | 'gemini';
export type TTSProvider = 'piper' | 'online';

export type ThemeId =
  | 'comic-pop-light'
  | 'comic-pop-dark'
  | 'comic-strip-light'
  | 'comic-strip-dark'
  | 'comic-quest-light'
  | 'comic-quest-dark'
  | 'comic-notebook-light'
  | 'comic-notebook-dark'
  | 'comic-arcade-light'
  | 'comic-arcade-dark'
  // Legacy aliases
  | 'comic-manga-light'
  | 'comic-manga-dark'
  | 'comic-minimal-light'
  | 'comic-minimal-dark'
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
  normalSpeed: number; // 1.0
  slowSpeed: number; // 1.25 (higher = slower for Piper length scale)
  generateAmericanNormal: boolean;
  generateAmericanSlow: boolean;
  generateBritishNormal: boolean;
  generateBritishSlow: boolean;
  generateExampleUs: boolean;
  generateExampleUk: boolean;
  // Legacy flat fields
  generateSlow?: boolean;
  generateBritish?: boolean;
  generateAmerican?: boolean;
  generateSlowExample?: boolean;
}

export interface DictionaryConfig {
  meaningFaSource: 'ai' | 'abadis' | 'freedict';
  definitionEnSource: 'ai' | 'freedict' | 'wiktionary';
  exampleSource: 'ai' | 'freedict';
  translationSource: 'ai';
  mnemonicSource: 'ai';
}

export interface SmartImagesConfig {
  enabled: boolean;
  provider: 'auto' | 'wikimedia' | 'unsplash';
}

export interface DefaultCardConfig {
  cardType: CardType;
  allowDuplicateWords: boolean;
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
  dictionary: DictionaryConfig;
  smartImages: SmartImagesConfig;
  defaultCard: DefaultCardConfig;
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
  dictionary: DiagnosticsItem[];
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
