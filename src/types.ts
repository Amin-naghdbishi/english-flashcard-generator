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
  exampleAudioUsSlowBase64?: string;
  exampleAudioUkNormalBase64?: string;
  exampleAudioUkSlowBase64?: string;

  wordAudioUsNormalFileName?: string;
  wordAudioUsSlowFileName?: string;
  wordAudioUkNormalFileName?: string;
  wordAudioUkSlowFileName?: string;
  exampleAudioUsNormalFileName?: string;
  exampleAudioUsSlowFileName?: string;
  exampleAudioUkNormalFileName?: string;
  exampleAudioUkSlowFileName?: string;

  // Primary / fallback audio
  wordAudioBase64?: string;
  exampleAudioBase64?: string;
  wordAudioFileName?: string;
  exampleAudioFileName?: string;

  needsPhoto?: boolean;

  // Array of all generated audio clips
  audioFiles?: CardAudioFile[];

  // Custom Theme-Aware Blocks/Boxes
  customBlocks?: CustomCardBlock[];
}

export interface CustomCardBlock {
  id: string;
  title: string;
  content: string;
  color?: string; // Hex or theme color preset
  dir?: 'rtl' | 'ltr' | 'auto';
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
  needsPhoto?: boolean;
  customBlocks?: CustomCardBlock[];
}

export type AppTheme = 'anki-light' | 'anki-dark';

export type AIProvider = 'ollama' | 'gemini' | 'custom' | string;
export type TTSProvider = 'piper' | 'online' | 'custom' | string;

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
  | 'minimal-light'
  | 'minimal-dark'
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

export interface CustomAIProviderConfig {
  id: string;
  name: string;
  protocol: 'openai-compatible' | 'gemini' | 'ollama' | 'custom-rest';
  baseUrl: string;
  apiKey?: string;
  model: string;
  temperature: number;
  authType: 'bearer' | 'api-key-header' | 'query-param' | 'none';
  authHeaderName?: string;
  customHeaders?: Record<string, string>;
  customBodyParams?: Record<string, any>;
  responseJsonPath?: string;
}

export interface AIConfig {
  provider: AIProvider;
  ollama: OllamaConfig;
  gemini: GeminiConfig;
  customProviders?: CustomAIProviderConfig[];
  activeCustomProviderId?: string;
  url?: string;
  model?: string;
  temperature?: number;
  contextLength?: number;
}

export interface CustomTTSProviderConfig {
  id: string;
  name: string;
  protocol: 'openai-speech' | 'elevenlabs' | 'google-translate' | 'piper-http' | 'custom-http';
  endpoint: string;
  apiKey?: string;
  voice: string;
  model?: string;
  audioFormat: 'mp3' | 'wav' | 'opus' | 'aac';
  authType: 'bearer' | 'api-key-header' | 'query-param' | 'none';
  authHeaderName?: string;
  httpMethod: 'POST' | 'GET';
  speedParamName?: string;
  speedFactorType?: 'multiplier' | 'length_scale';
  customHeaders?: Record<string, string>;
  customBodyParams?: Record<string, any>;
}

export interface TTSConfig {
  provider: TTSProvider;
  engine?: TTSProvider; // backwards compatibility
  endpoint: string; // http://127.0.0.1:5000 (for Piper)
  americanVoice: string; // en_US-lessac-high
  britishVoice: string; // en_GB-cori-high
  normalSpeed: number; // 1.0
  slowSpeed: number; // 1.25 (higher = slower for Piper length scale)
  customProviders?: CustomTTSProviderConfig[];
  activeCustomProviderId?: string;

  // Independent audio generation flags
  generateAmericanNormal: boolean;
  generateAmericanSlow: boolean;
  generateBritishNormal: boolean;
  generateBritishSlow: boolean;
  generateExampleUsNormal: boolean;
  generateExampleUsSlow: boolean;
  generateExampleUkNormal: boolean;
  generateExampleUkSlow: boolean;

  // Independent speed (length_scale) for every audio variant
  speedAmericanNormal?: number; // default 1.00
  speedAmericanSlow?: number; // default 1.25
  speedBritishNormal?: number; // default 1.00
  speedBritishSlow?: number; // default 1.25
  speedExampleUsNormal?: number; // default 1.00
  speedExampleUsSlow?: number; // default 1.25
  speedExampleUkNormal?: number; // default 1.00
  speedExampleUkSlow?: number; // default 1.25

  // Legacy flat fields
  generateExampleUs?: boolean;
  generateExampleUk?: boolean;
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
  enableFallback?: boolean;
}

export interface SmartImagesConfig {
  enabled: boolean;
  decisionProvider: 'main' | 'ollama' | 'gemini' | 'heuristic' | string;
  searchProvider: 'wikimedia' | 'google' | 'custom';
  customSearchUrl?: string;
  customSearchApiKey?: string;
  googleSearchApiKey?: string;
  googleSearchCx?: string;
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

export type AppLanguage = 'en' | 'fa';
export type AppDirection = 'ltr' | 'rtl';

export interface AIPromptsConfig {
  systemRole: string;
  meaningGeneration: string;
  exampleGeneration: string;
  exampleTranslation: string;
  memoryHook: string;
  missingFieldCompletion: string;
  phoneticAndPos: string;
  smartImageDecision: string;
}

export interface AppSettings {
  ai: AIConfig;
  tts: TTSConfig;
  dictionary: DictionaryConfig;
  smartImages: SmartImagesConfig;
  defaultCard: DefaultCardConfig;
  anki: AnkiConfig;
  theme: ThemeId;
  appTheme?: AppTheme;
  language?: AppLanguage;
  direction?: AppDirection;
  aiPrompts?: AIPromptsConfig;
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
  status: 'idle' | 'waiting' | 'checking_duplicate' | 'generating_ai' | 'generating_audio' | 'creating_anki' | 'retrying' | 'success' | 'error' | 'duplicate';
  cardData?: CardData;
  parsedFields?: Partial<CardData>;
  error?: string;
  noteId?: number;
  isDuplicate?: boolean;
  retryCount?: number;
}

export interface TaggedNoteFieldInspection {
  field: string;
  label: string;
  hasValue: boolean;
  value: string;
}

export interface TaggedNoteItem {
  noteId: number;
  word: string;
  tags: string[];
  modelName: string;
  fields: Record<string, string>;
  presentFields: string[];
  missingFields: string[];
  needsCompletion: boolean;
  status: 'idle' | 'waiting' | 'scanning' | 'generating_ai' | 'generating_audio' | 'updating_anki' | 'retrying' | 'success' | 'error' | 'skipped';
  error?: string;
  updatedCardData?: CardData;
  generatedFieldsSummary?: string[];
  retryCount?: number;
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
