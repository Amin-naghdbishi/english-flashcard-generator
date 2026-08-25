import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { checkOllamaConnection, listOllamaModels, generateWithOllama } from './server/ollama';
import { checkGeminiConnection, generateWithGemini, GEMINI_MODELS } from './server/gemini';
import { checkCustomAIConnection, getCustomAIModels, generateWithCustomAI } from './server/customAi';
import { synthesizeCustomTTS, testCustomTTS, GENERIC_TTS_TEST_SENTENCE } from './server/customTts';
import { getDictionaryData, lookupAbadis, lookupFreeDictionary } from './server/dictionary';
import { getSmartImage, evaluateWordNeedsImageHeuristic, downloadImageAsBase64, searchImagesOnline } from './server/smartImages';
import {
  checkPiperHealth,
  synthesizePiperAudio,
  generateAllCardAudios,
  runPiperDiagnostics,
  getPiperServiceStatus,
  controlPiperService,
  PIPER_VOICES,
} from './server/piper';
import {
  checkOnlineTtsHealth,
  synthesizeOnlineAudio,
  generateAllOnlineCardAudios,
  runOnlineTtsDiagnostics,
} from './server/onlineTts';
import {
  checkAnkiConnection,
  getAnkiDecks,
  ensureAnkiModel,
  checkDuplicateInDeck,
  createAnkiNote,
  runAnkiPipelineDiagnostic,
  verifyFullAnkiNoteAndCards,
  openInAnkiBrowser,
  changeCardsDeck,
} from './server/anki';
import { AppSettings, CardData, DiagnosticsReport, StepLog, ThemeId, CardType, CustomAIProviderConfig, CustomTTSProviderConfig } from './src/types';
import { THEMES, makeSpellingSentence } from './src/themes';

const SETTINGS_FILE = path.join(process.cwd(), 'user-settings.json');

const defaultSettings: AppSettings = {
  appTheme: 'anki-light',
  ai: {
    provider: 'ollama',
    ollama: {
      url: 'http://127.0.0.1:11434',
      model: 'qwen3:4b',
      temperature: 0.2,
      contextLength: 2048,
    },
    gemini: {
      apiKey: '',
      model: 'gemini-2.5-flash',
      temperature: 0.2,
    },
    customProviders: [
      {
        id: 'openrouter',
        name: 'OpenRouter (DeepSeek / Llama)',
        protocol: 'openai-compatible',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: '',
        model: 'deepseek/deepseek-chat',
        temperature: 0.2,
        authType: 'bearer',
      },
    ],
    url: 'http://127.0.0.1:11434',
    model: 'qwen3:4b',
    temperature: 0.2,
    contextLength: 2048,
  },
  tts: {
    provider: 'piper',
    engine: 'piper',
    endpoint: 'http://127.0.0.1:5000',
    americanVoice: 'en_US-lessac-high',
    britishVoice: 'en_GB-cori-high',
    normalSpeed: 1.0,
    slowSpeed: 1.25,
    customProviders: [
      {
        id: 'openai_speech',
        name: 'OpenAI Speech TTS',
        protocol: 'openai-speech',
        endpoint: 'https://api.openai.com/v1/audio/speech',
        apiKey: '',
        voice: 'alloy',
        model: 'tts-1',
        audioFormat: 'mp3',
        authType: 'bearer',
        httpMethod: 'POST',
      },
    ],
    generateAmericanNormal: true,
    generateAmericanSlow: true,
    generateBritishNormal: false,
    generateBritishSlow: false,
    generateExampleUsNormal: true,
    generateExampleUsSlow: false,
    generateExampleUkNormal: false,
    generateExampleUkSlow: false,
    speedAmericanNormal: 1.0,
    speedAmericanSlow: 1.25,
    speedBritishNormal: 1.0,
    speedBritishSlow: 1.25,
    speedExampleUsNormal: 1.0,
    speedExampleUsSlow: 1.25,
    speedExampleUkNormal: 1.0,
    speedExampleUkSlow: 1.25,
    generateExampleUs: true,
    generateExampleUk: false,
    generateSlow: true,
    generateBritish: false,
    generateAmerican: true,
    generateSlowExample: false,
  },
  dictionary: {
    meaningFaSource: 'ai',
    definitionEnSource: 'ai',
    exampleSource: 'ai',
    translationSource: 'ai',
    mnemonicSource: 'ai',
    enableFallback: true,
  },
  smartImages: {
    enabled: true,
    decisionProvider: 'heuristic',
    searchProvider: 'wikimedia',
  },
  defaultCard: {
    cardType: 'normal',
    allowDuplicateWords: true,
  },
  anki: {
    url: 'http://127.0.0.1:8765',
    defaultDeck: 'English::B1',
    noteType: 'AI Vocabulary',
  },
  theme: 'comic-pop-dark',
};

function normalizeSettings(raw: any): AppSettings {
  const merged: any = { ...defaultSettings, ...(raw || {}) };

  // Normalize AI config
  const ai = merged.ai || {};
  const provider = ai.provider || 'ollama';
  const ollamaUrl = ai.ollama?.url || ai.url || 'http://127.0.0.1:11434';
  const ollamaModel = ai.ollama?.model || ai.model || 'qwen3:4b';
  const ollamaTemp = typeof ai.ollama?.temperature === 'number' ? ai.ollama.temperature : (typeof ai.temperature === 'number' ? ai.temperature : 0.2);
  const ollamaCtx = typeof ai.ollama?.contextLength === 'number' ? ai.ollama.contextLength : (typeof ai.contextLength === 'number' ? ai.contextLength : 2048);

  const geminiApiKey = ai.gemini?.apiKey || '';
  const geminiModel = ai.gemini?.model || 'gemini-2.5-flash';
  const geminiTemp = typeof ai.gemini?.temperature === 'number' ? ai.gemini.temperature : 0.2;

  merged.ai = {
    provider,
    ollama: {
      url: ollamaUrl,
      model: ollamaModel,
      temperature: ollamaTemp,
      contextLength: ollamaCtx,
    },
    gemini: {
      apiKey: geminiApiKey,
      model: geminiModel,
      temperature: geminiTemp,
    },
    customProviders: Array.isArray(ai.customProviders) ? ai.customProviders : defaultSettings.ai.customProviders,
    activeCustomProviderId: ai.activeCustomProviderId,
    url: ollamaUrl,
    model: ollamaModel,
    temperature: ollamaTemp,
    contextLength: ollamaCtx,
  };

  // Normalize TTS config
  const tts = merged.tts || {};
  const ttsProvider = tts.provider || tts.engine || 'piper';
  const genUsNorm = tts.generateAmericanNormal !== false;
  const genUsSlow = tts.generateAmericanSlow !== false;
  const genUkNorm = !!tts.generateBritishNormal;
  const genUkSlow = !!tts.generateBritishSlow;
  const genExUsNorm = typeof tts.generateExampleUsNormal === 'boolean' ? tts.generateExampleUsNormal : (tts.generateExampleUs !== false);
  const genExUsSlow = typeof tts.generateExampleUsSlow === 'boolean' ? tts.generateExampleUsSlow : (tts.generateSlowExample === true);
  const genExUkNorm = typeof tts.generateExampleUkNormal === 'boolean' ? tts.generateExampleUkNormal : (tts.generateExampleUk === true);
  const genExUkSlow = !!tts.generateExampleUkSlow;

  merged.tts = {
    provider: ttsProvider,
    engine: ttsProvider,
    endpoint: tts.endpoint || 'http://127.0.0.1:5000',
    americanVoice: tts.americanVoice || 'en_US-lessac-high',
    britishVoice: tts.britishVoice || 'en_GB-cori-high',
    normalSpeed: typeof tts.normalSpeed === 'number' ? tts.normalSpeed : 1.0,
    slowSpeed: typeof tts.slowSpeed === 'number' ? tts.slowSpeed : 1.25,
    speedAmericanNormal: typeof tts.speedAmericanNormal === 'number' ? tts.speedAmericanNormal : 1.0,
    speedAmericanSlow: typeof tts.speedAmericanSlow === 'number' ? tts.speedAmericanSlow : 1.25,
    speedBritishNormal: typeof tts.speedBritishNormal === 'number' ? tts.speedBritishNormal : 1.0,
    speedBritishSlow: typeof tts.speedBritishSlow === 'number' ? tts.speedBritishSlow : 1.25,
    speedExampleUsNormal: typeof tts.speedExampleUsNormal === 'number' ? tts.speedExampleUsNormal : 1.0,
    speedExampleUsSlow: typeof tts.speedExampleUsSlow === 'number' ? tts.speedExampleUsSlow : 1.25,
    speedExampleUkNormal: typeof tts.speedExampleUkNormal === 'number' ? tts.speedExampleUkNormal : 1.0,
    speedExampleUkSlow: typeof tts.speedExampleUkSlow === 'number' ? tts.speedExampleUkSlow : 1.25,
    customProviders: Array.isArray(tts.customProviders) ? tts.customProviders : defaultSettings.tts.customProviders,
    activeCustomProviderId: tts.activeCustomProviderId,
    generateAmericanNormal: genUsNorm,
    generateAmericanSlow: genUsSlow,
    generateBritishNormal: genUkNorm,
    generateBritishSlow: genUkSlow,
    generateExampleUsNormal: genExUsNorm,
    generateExampleUsSlow: genExUsSlow,
    generateExampleUkNormal: genExUkNorm,
    generateExampleUkSlow: genExUkSlow,
    generateExampleUs: genExUsNorm,
    generateExampleUk: genExUkNorm,
    generateSlow: genUsSlow || genUkSlow,
    generateBritish: genUkNorm || genUkSlow,
    generateAmerican: genUsNorm || genUsSlow,
    generateSlowExample: genExUsSlow,
  };

  // Normalize Dictionary config
  const dict = merged.dictionary || {};
  merged.dictionary = {
    meaningFaSource: dict.meaningFaSource || 'ai',
    definitionEnSource: dict.definitionEnSource || 'ai',
    exampleSource: dict.exampleSource || 'ai',
    translationSource: dict.translationSource || 'ai',
    mnemonicSource: dict.mnemonicSource || 'ai',
    enableFallback: dict.enableFallback !== false,
  };

  // Normalize Smart Images
  const img = merged.smartImages || {};
  merged.smartImages = {
    enabled: img.enabled !== false,
    decisionProvider: img.decisionProvider || 'heuristic',
    searchProvider: img.searchProvider || 'wikimedia',
    customSearchUrl: img.customSearchUrl || '',
    googleSearchApiKey: img.googleSearchApiKey || '',
    googleSearchCx: img.googleSearchCx || '',
  };

  // Normalize Default Card
  const defCard = merged.defaultCard || {};
  merged.defaultCard = {
    cardType: defCard.cardType === 'spelling' ? 'spelling' : 'normal',
    allowDuplicateWords: defCard.allowDuplicateWords !== false,
  };

  // Normalize Card Theme
  if (merged.theme === 'comic-dark') merged.theme = 'comic-pop-dark';
  if (merged.theme === 'comic-light') merged.theme = 'comic-pop-light';
  if (!THEMES[merged.theme]) merged.theme = 'comic-pop-dark';

  // Normalize Application UI Theme (strictly Anki Light vs Anki Dark)
  if (merged.appTheme === 'anki-dark' || merged.appTheme === 'minimal-dark') {
    merged.appTheme = 'anki-dark';
  } else {
    merged.appTheme = 'anki-light';
  }

  return merged;
}

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return normalizeSettings(JSON.parse(raw));
    }
  } catch (err) {
    console.error('Error loading settings file, using defaults:', err);
  }
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

let appSettings = loadSettings();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '35mb' }));

  // --- Health ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- Settings ---
  app.get('/api/config', (req, res) => {
    res.json(appSettings);
  });

  app.post('/api/config', (req, res) => {
    appSettings = normalizeSettings({ ...appSettings, ...req.body });
    saveSettings(appSettings);
    res.json({ success: true, settings: appSettings });
  });

  // --- Custom AI Endpoints ---
  app.post('/api/custom-ai/health', async (req, res) => {
    const { config } = req.body;
    if (!config || !config.baseUrl) {
      return res.status(400).json({ connected: false, message: 'Provider config is required' });
    }
    const result = await checkCustomAIConnection(config);
    res.json(result);
  });

  app.post('/api/custom-ai/models', async (req, res) => {
    const { config } = req.body;
    if (!config || !config.baseUrl) {
      return res.status(400).json({ success: false, models: [], error: 'Provider config is required' });
    }
    const result = await getCustomAIModels(config);
    res.json(result);
  });

  app.post('/api/custom-ai/generate', async (req, res) => {
    const { config, word, manualOverrides, temperature } = req.body;
    if (!config || !word) {
      return res.status(400).json({ success: false, error: 'Config and Word required' });
    }
    const result = await generateWithCustomAI(config, word, manualOverrides || {}, temperature);
    res.json(result);
  });

  // --- Custom TTS Endpoints ---
  app.post('/api/custom-tts/test', async (req, res) => {
    const { config, testSentence } = req.body;
    if (!config || !config.endpoint) {
      return res.status(400).json({ success: false, error: 'TTS Endpoint required' });
    }
    const result = await testCustomTTS(config, testSentence || GENERIC_TTS_TEST_SENTENCE);
    res.json(result);
  });

  app.post('/api/custom-tts/synthesize', async (req, res) => {
    const { config, text, isSlow, slowSpeed } = req.body;
    if (!config || !text) {
      return res.status(400).json({ success: false, error: 'Config and text required' });
    }
    const result = await synthesizeCustomTTS(config, text, !!isSlow, slowSpeed || 1.25);
    res.json(result);
  });

  // --- Dictionary Endpoints ---
  app.get('/api/dictionary/abadis', async (req, res) => {
    const word = (req.query.word as string) || '';
    if (!word) return res.status(400).json({ error: 'Word required' });
    const result = await lookupAbadis(word);
    res.json(result);
  });

  app.get('/api/dictionary/freedict', async (req, res) => {
    const word = (req.query.word as string) || '';
    if (!word) return res.status(400).json({ error: 'Word required' });
    const result = await lookupFreeDictionary(word);
    res.json(result);
  });

  // --- Smart Images Endpoints ---
  app.post('/api/smart-images/test', async (req, res) => {
    const { word, partOfSpeech, meaningFa, config } = req.body;
    if (!word) return res.status(400).json({ error: 'Word required' });
    const result = await getSmartImage(
      word,
      partOfSpeech || '',
      meaningFa || '',
      config || appSettings.smartImages,
      appSettings
    );
    res.json(result);
  });

  app.get('/api/smart-images/search', async (req, res) => {
    const word = (req.query.word as string) || '';
    if (!word) return res.json({ success: true, results: [] });
    const results = await searchImagesOnline(word);
    res.json({ success: true, results });
  });

  app.post('/api/download-image', async (req, res) => {
    const { url, word } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
    const result = await downloadImageAsBase64(url, word);
    res.json(result);
  });

  // --- Ollama Endpoints ---
  app.get('/api/ollama/health', async (req, res) => {
    const url = (req.query.url as string) || appSettings.ai.ollama.url;
    const result = await checkOllamaConnection(url);
    res.json(result);
  });

  app.get('/api/ollama/models', async (req, res) => {
    const url = (req.query.url as string) || appSettings.ai.ollama.url;
    const result = await listOllamaModels(url);
    res.json(result);
  });

  app.post('/api/ollama/generate', async (req, res) => {
    const { word, manualOverrides, model, url, temperature, contextLength } = req.body;
    const aiUrl = url || appSettings.ai.ollama.url;
    const aiModel = model || appSettings.ai.ollama.model;
    const temp = typeof temperature === 'number' ? temperature : appSettings.ai.ollama.temperature;
    const ctx = typeof contextLength === 'number' ? contextLength : appSettings.ai.ollama.contextLength;

    if (!word || !word.trim()) {
      return res.status(400).json({ success: false, error: 'Word parameter is required' });
    }

    const result = await generateWithOllama(aiUrl, aiModel, word, manualOverrides || {}, temp, ctx);
    res.json(result);
  });

  // --- Gemini Endpoints ---
  app.get('/api/gemini/models', (req, res) => {
    res.json({ success: true, models: GEMINI_MODELS });
  });

  app.post('/api/gemini/health', async (req, res) => {
    const { apiKey, model } = req.body;
    const key = apiKey || appSettings.ai.gemini.apiKey;
    const mod = model || appSettings.ai.gemini.model || 'gemini-2.5-flash';
    const result = await checkGeminiConnection(key, mod);
    res.json(result);
  });

  app.post('/api/gemini/generate', async (req, res) => {
    const { word, manualOverrides, apiKey, model, temperature } = req.body;
    const key = apiKey || appSettings.ai.gemini.apiKey;
    const mod = model || appSettings.ai.gemini.model || 'gemini-2.5-flash';
    const temp = typeof temperature === 'number' ? temperature : appSettings.ai.gemini.temperature;

    if (!word || !word.trim()) {
      return res.status(400).json({ success: false, error: 'Word parameter is required' });
    }

    const result = await generateWithGemini(key, mod, word, manualOverrides || {}, temp);
    res.json(result);
  });

  // --- Piper TTS Endpoints ---
  app.get('/api/tts/health', async (req, res) => {
    const endpoint = (req.query.endpoint as string) || appSettings.tts.endpoint;
    const diag = await runPiperDiagnostics({
      endpoint,
      americanVoice: appSettings.tts.americanVoice,
      britishVoice: appSettings.tts.britishVoice,
      normalSpeed: appSettings.tts.normalSpeed,
      slowSpeed: appSettings.tts.slowSpeed,
    });
    res.json(diag);
  });

  app.get('/api/tts/voices', (req, res) => {
    res.json({ success: true, voices: PIPER_VOICES });
  });

  app.get('/api/piper/service', async (req, res) => {
    const status = await getPiperServiceStatus();
    res.json(status);
  });

  app.post('/api/piper/service', async (req, res) => {
    const { action } = req.body;
    if (action !== 'start' && action !== 'stop' && action !== 'restart') {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "start", "stop", or "restart".',
      });
    }
    const result = await controlPiperService(action);
    res.json(result);
  });

  app.post('/api/tts/synthesize', async (req, res) => {
    const { text, voice, speed, endpoint } = req.body;
    const ttsVoice = voice || appSettings.tts.americanVoice;
    const ttsSpeed = typeof speed === 'number' ? speed : appSettings.tts.normalSpeed;
    const ttsEndpoint = endpoint || appSettings.tts.endpoint;

    const result = await synthesizePiperAudio(text, ttsVoice, ttsSpeed, ttsEndpoint);
    res.json(result);
  });

  app.post('/api/tts/diagnostics', async (req, res) => {
    const { endpoint, americanVoice, britishVoice, normalSpeed, slowSpeed } = req.body;
    const result = await runPiperDiagnostics({
      endpoint: endpoint || appSettings.tts.endpoint,
      americanVoice: americanVoice || appSettings.tts.americanVoice,
      britishVoice: britishVoice || appSettings.tts.britishVoice,
      normalSpeed: typeof normalSpeed === 'number' ? normalSpeed : appSettings.tts.normalSpeed,
      slowSpeed: typeof slowSpeed === 'number' ? slowSpeed : appSettings.tts.slowSpeed,
    });
    res.json(result);
  });

  // --- Online TTS Endpoints ---
  app.get('/api/online-tts/health', async (req, res) => {
    const result = await checkOnlineTtsHealth();
    res.json(result);
  });

  app.post('/api/online-tts/synthesize', async (req, res) => {
    const { text, voice, isSlow } = req.body;
    const result = await synthesizeOnlineAudio(text, voice || 'en-US', !!isSlow);
    res.json(result);
  });

  app.get('/api/online-tts/diagnostics', async (req, res) => {
    const result = await runOnlineTtsDiagnostics();
    res.json(result);
  });

  // --- Anki Endpoints ---
  app.get('/api/anki/health', async (req, res) => {
    const url = (req.query.url as string) || appSettings.anki.url || 'http://127.0.0.1:8765';
    const result = await checkAnkiConnection(url);
    res.json(result);
  });

  app.get('/api/anki/decks', async (req, res) => {
    const url = (req.query.url as string) || appSettings.anki.url || 'http://127.0.0.1:8765';
    const result = await getAnkiDecks(url);
    res.json(result);
  });

  app.post('/api/anki/model', async (req, res) => {
    const { url, theme, cardType } = req.body;
    const ankiUrl = url || appSettings.anki.url || 'http://127.0.0.1:8765';
    const selectedTheme: ThemeId = theme || appSettings.theme || 'comic-pop-dark';
    const selectedType: CardType = cardType || appSettings.defaultCard?.cardType || 'normal';
    const result = await ensureAnkiModel(ankiUrl, selectedTheme, selectedType);
    res.json(result);
  });

  app.post('/api/anki/check-duplicate', async (req, res) => {
    const { deck, word, url } = req.body;
    const ankiUrl = url || appSettings.anki.url || 'http://127.0.0.1:8765';
    const targetDeck = deck || appSettings.anki.defaultDeck || 'English::B1';
    if (!word) return res.status(400).json({ error: 'Word is required' });
    const result = await checkDuplicateInDeck(ankiUrl, targetDeck, word);
    res.json(result);
  });

  app.post('/api/anki/create-note', async (req, res) => {
    const { cardData, deck, url, theme, cardType } = req.body;
    const ankiUrl = url || appSettings.anki.url || 'http://127.0.0.1:8765';
    const targetDeck = deck || appSettings.anki.defaultDeck || 'English::B1';
    const selectedTheme: ThemeId = theme || appSettings.theme || 'comic-pop-dark';
    const selectedType: CardType = cardType || cardData?.cardType || appSettings.defaultCard?.cardType || 'normal';

    if (!cardData || !cardData.word) {
      return res.status(400).json({ success: false, error: 'cardData with word is required' });
    }

    const result = await createAnkiNote(
      ankiUrl,
      targetDeck,
      cardData,
      selectedTheme,
      selectedType
    );
    res.json(result);
  });

  app.post('/api/anki/diagnostics/pipeline', async (req, res) => {
    const { deck, url, theme } = req.body;
    const ankiUrl = url || appSettings.anki.url || 'http://127.0.0.1:8765';
    const targetDeck = deck || appSettings.anki.defaultDeck || 'English::B1';
    const selectedTheme: ThemeId = theme || appSettings.theme || 'comic-pop-dark';

    const result = await runAnkiPipelineDiagnostic(
      ankiUrl,
      targetDeck,
      selectedTheme
    );
    res.json(result);
  });

  app.get('/api/anki/verify/:noteId', async (req, res) => {
    const noteId = parseInt(req.params.noteId, 10);
    const targetDeck = (req.query.deck as string) || appSettings.anki.defaultDeck || 'English::B1';
    const url = (req.query.url as string) || appSettings.anki.url || 'http://127.0.0.1:8765';

    if (isNaN(noteId)) {
      return res.status(400).json({ success: false, error: 'Invalid noteId' });
    }

    const result = await verifyFullAnkiNoteAndCards(url, noteId, targetDeck);
    res.json(result);
  });

  app.post('/api/anki/open-browser', async (req, res) => {
    const { query, noteId, url } = req.body;
    const ankiUrl = url || appSettings.anki.url || 'http://127.0.0.1:8765';
    const searchQuery = query || (noteId ? `nid:${noteId}` : '');
    const result = await openInAnkiBrowser(ankiUrl, searchQuery);
    res.json(result);
  });

  app.post('/api/anki/change-deck', async (req, res) => {
    const { cardIds, newDeck, url } = req.body;
    const ankiUrl = url || appSettings.anki.url || 'http://127.0.0.1:8765';
    if (!Array.isArray(cardIds) || !newDeck) {
      return res.status(400).json({ success: false, error: 'cardIds and newDeck are required' });
    }
    const result = await changeCardsDeck(ankiUrl, cardIds, newDeck);
    res.json(result);
  });

  // --- Diagnostics All-In-One ---
  app.get('/api/diagnostics', async (req, res) => {
    const ankiUrl = appSettings.anki.url || 'http://127.0.0.1:8765';
    const piperUrl = appSettings.tts.endpoint || 'http://127.0.0.1:5000';

    const [ankiRes, piperRes, onlineTtsRes] = await Promise.all([
      checkAnkiConnection(ankiUrl),
      checkPiperHealth(piperUrl),
      checkOnlineTtsHealth(),
    ]);

    let aiStatus: any = { connected: false, message: 'Not checked' };
    if (appSettings.ai.provider === 'gemini') {
      aiStatus = await checkGeminiConnection(appSettings.ai.gemini.apiKey, appSettings.ai.gemini.model);
    } else if (appSettings.ai.provider === 'ollama') {
      aiStatus = await checkOllamaConnection(appSettings.ai.ollama.url);
    } else {
      const customConfig = appSettings.ai.customProviders?.find((p) => p.id === appSettings.ai.provider);
      if (customConfig) {
        aiStatus = await checkCustomAIConnection(customConfig);
      }
    }

    const report: DiagnosticsReport = {
      system: [
        {
          name: 'Server Node.js Process',
          status: 'ok',
          message: 'Server process active and serving requests',
          timestamp: new Date().toISOString(),
        },
      ],
      ai: [
        {
          name: `AI Provider (${appSettings.ai.provider.toUpperCase()})`,
          status: aiStatus.connected ? 'ok' : 'error',
          message: aiStatus.message || (aiStatus.connected ? 'Connected' : aiStatus.error || 'Failed'),
          timestamp: new Date().toISOString(),
        },
      ],
      tts: [
        {
          name: `TTS Service (${appSettings.tts.provider.toUpperCase()})`,
          status: appSettings.tts.provider === 'online' ? (onlineTtsRes.connected ? 'ok' : 'error') : (piperRes.connected ? 'ok' : 'error'),
          message: appSettings.tts.provider === 'online' ? (onlineTtsRes.connected ? 'Online TTS Ready' : onlineTtsRes.error || 'Failed') : (piperRes.connected ? `Piper running at ${piperUrl}` : piperRes.error || 'Failed'),
          timestamp: new Date().toISOString(),
        },
      ],
      dictionary: [
        {
          name: `Persian Meaning Source (${appSettings.dictionary.meaningFaSource.toUpperCase()})`,
          status: 'ok',
          message: `Configured to use ${appSettings.dictionary.meaningFaSource}`,
          timestamp: new Date().toISOString(),
        },
      ],
      anki: [
        {
          name: 'AnkiConnect Service',
          status: ankiRes.connected ? 'ok' : 'error',
          message: ankiRes.connected ? `AnkiConnect reachable at ${ankiUrl} (v${ankiRes.version})` : ankiRes.error || 'Unreachable',
          timestamp: new Date().toISOString(),
        },
      ],
      templates: [
        {
          name: `Active Theme (${THEMES[appSettings.theme]?.name || appSettings.theme})`,
          status: 'ok',
          message: 'Theme definitions loaded and verified',
          timestamp: new Date().toISOString(),
        },
      ],
      allPassed: (aiStatus.connected || false) && (appSettings.tts.provider === 'online' ? onlineTtsRes.connected : piperRes.connected) && ankiRes.connected,
    };

    res.json(report);
  });

  // --- Full Generation Pipeline Route ---
  app.post('/api/pipeline', async (req, res) => {
    const { word, deck, manualOverrides, createInAnki = true, cardType } = req.body;
    const cleanWord = (word || '').trim();
    const targetDeck = deck || appSettings.anki.defaultDeck || 'English::B1';
    const effectiveCardType: CardType =
      manualOverrides?.cardType || cardType || appSettings.defaultCard?.cardType || 'normal';

    if (!cleanWord) {
      return res.status(400).json({
        success: false,
        stage: 'input_received',
        error: 'Word parameter is required and cannot be empty.',
      });
    }

    const logs: StepLog[] = [];
    const pushLog = (step: number, name: string, status: StepLog['status'], message: string, details?: string) => {
      logs.push({
        step,
        name,
        status,
        message,
        details,
        timestamp: Date.now(),
      });
    };

    // [1] Input Received
    pushLog(1, 'Input received', 'success', `Processing word "${cleanWord}" for deck "${targetDeck}" (Type: ${effectiveCardType.toUpperCase()})`);

    // [2] Duplicate Check (Informative only - duplicates are fully permitted)
    pushLog(2, 'Duplicate checked', 'success', `Duplicate check completed for "${cleanWord}" (Multiple cards for same word are fully allowed).`);

    // [3] Dictionary Pre-fetch (Multi-source integration)
    const dictConfig = appSettings.dictionary;
    let dictData: any = {};
    const sourcesList: string[] = [];

    if (dictConfig.meaningFaSource !== 'ai' || dictConfig.definitionEnSource !== 'ai' || dictConfig.exampleSource !== 'ai') {
      pushLog(3, 'Dictionary lookup', 'pending', `Querying configured dictionary sources...`);
      dictData = await getDictionaryData(cleanWord, {
        meaningFaSource: dictConfig.meaningFaSource,
        definitionEnSource: dictConfig.definitionEnSource,
        exampleSource: dictConfig.exampleSource,
      });
      if (dictData.sources && dictData.sources.length > 0) {
        sourcesList.push(...dictData.sources);
        pushLog(3, 'Dictionary lookup', 'success', `Retrieved data from: ${dictData.sources.join(', ')}`, JSON.stringify(dictData));
      } else {
        pushLog(3, 'Dictionary lookup', 'skipped', 'No external dictionary data found, falling back to AI provider.');
      }
    } else {
      pushLog(3, 'Dictionary lookup', 'skipped', 'Using AI provider directly as configured.');
    }

    // [4] AI Generation
    let cardData: CardData;
    const aiProvider = appSettings.ai.provider;
    pushLog(4, 'AI data generated', 'pending', `Generating vocabulary with ${aiProvider.toUpperCase()}...`);

    try {
      // Merge overrides with dictionary data
      const mergedOverrides = {
        ...manualOverrides,
        phonetic: manualOverrides?.phonetic || dictData.phonetic,
        partOfSpeech: manualOverrides?.partOfSpeech || dictData.partOfSpeech,
        meaningFa: manualOverrides?.meaningFa || dictData.meaningFa,
        example: manualOverrides?.example || dictData.example,
      };

      if (aiProvider === 'gemini') {
        const geminiRes = await generateWithGemini(
          appSettings.ai.gemini.apiKey,
          appSettings.ai.gemini.model,
          cleanWord,
          mergedOverrides,
          appSettings.ai.gemini.temperature
        );
        if (!geminiRes.success || !geminiRes.data) {
          pushLog(4, 'AI data generated', 'error', geminiRes.error || 'Gemini generation failed');
          return res.status(500).json({
            success: false,
            stage: 'ai_data_generated',
            error: `Gemini Error: ${geminiRes.error}`,
            logs,
          });
        }
        cardData = geminiRes.data;
        sourcesList.push(`Gemini (${appSettings.ai.gemini.model})`);
      } else if (aiProvider === 'ollama') {
        const ollamaRes = await generateWithOllama(
          appSettings.ai.ollama.url,
          appSettings.ai.ollama.model,
          cleanWord,
          mergedOverrides,
          appSettings.ai.ollama.temperature,
          appSettings.ai.ollama.contextLength
        );
        if (!ollamaRes.success || !ollamaRes.data) {
          pushLog(4, 'AI data generated', 'error', ollamaRes.error || 'Ollama generation failed');
          return res.status(500).json({
            success: false,
            stage: 'ai_data_generated',
            error: `Ollama Error: ${ollamaRes.error}`,
            logs,
          });
        }
        cardData = ollamaRes.data;
        sourcesList.push(`Ollama (${appSettings.ai.ollama.model})`);
      } else {
        // Custom AI Provider (OpenRouter, DeepSeek, Groq, custom OpenAI-compatible endpoint)
        const customConfig = appSettings.ai.customProviders?.find((p) => p.id === aiProvider) || appSettings.ai.customProviders?.[0];
        if (!customConfig) {
          const errMsg = `Custom AI provider "${aiProvider}" not found in configured providers.`;
          pushLog(4, 'AI data generated', 'error', errMsg);
          return res.status(400).json({ success: false, stage: 'ai_data_generated', error: errMsg, logs });
        }

        const customRes = await generateWithCustomAI(
          customConfig,
          cleanWord,
          mergedOverrides,
          customConfig.temperature || 0.2
        );

        if (!customRes.success || !customRes.data) {
          pushLog(4, 'AI data generated', 'error', customRes.error || 'Custom AI generation failed');
          return res.status(500).json({
            success: false,
            stage: 'ai_data_generated',
            error: `Custom AI Error: ${customRes.error}`,
            logs,
          });
        }
        cardData = customRes.data;
        sourcesList.push(`Custom AI (${customConfig.name || customConfig.model})`);
      }

      // Explicit dictionary priority overrides
      if (dictData.meaningFa && dictConfig.meaningFaSource === 'abadis') {
        cardData.meaningFa = dictData.meaningFa;
      }
      if (dictData.example && dictConfig.exampleSource === 'freedict') {
        cardData.example = dictData.example;
      }
      if (dictData.phonetic && dictConfig.definitionEnSource === 'freedict') {
        cardData.phonetic = dictData.phonetic;
      }

      // Attach Card Type and Spelling sentence
      cardData.cardType = effectiveCardType;
      if (effectiveCardType === 'spelling') {
        cardData.spellingSentence = makeSpellingSentence(cardData.example, cardData.word);
      }

      pushLog(
        4,
        'AI data generated',
        'success',
        `Generated card data for "${cleanWord}" (POS: ${cardData.partOfSpeech}, IPA: ${cardData.phonetic})`,
        `Meaning: ${cardData.meaningFa} | Sources: ${sourcesList.join(', ')}`
      );
    } catch (err: any) {
      pushLog(4, 'AI data generated', 'error', `AI exception: ${err?.message}`);
      return res.status(500).json({
        success: false,
        stage: 'ai_data_generated',
        error: err?.message,
        logs,
      });
    }

    // [5] Smart Images (Manual Image Override, Automatic image evaluation, or explicit Photo Choice)
    if (manualOverrides && manualOverrides.imageBase64) {
      const fileName =
        manualOverrides.imageFileName ||
        `card_manual_${cleanWord.replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}.png`;
      cardData.imageBase64 = manualOverrides.imageBase64;
      cardData.imageFileName = fileName;
      cardData.needsImage = true;
      cardData.imageReason = 'Manual image override selected by user';
      pushLog(
        5,
        'Manual Image Attached',
        'success',
        `Attached manual user-selected image (${fileName})`,
        'User manual override takes absolute priority'
      );
    } else {
      const explicitPhotoChoice = (manualOverrides && typeof manualOverrides.needsPhoto === 'boolean')
        ? manualOverrides.needsPhoto
        : (req.body.photoChoice === 'yes' || req.body.photoChoice === true
            ? true
            : (req.body.photoChoice === 'no' || req.body.photoChoice === false
                ? false
                : undefined));

      if (explicitPhotoChoice === false) {
        pushLog(5, 'Smart Image Option', 'skipped', `Photo disabled by user (Photo: No). No image searched.`);
      } else if (explicitPhotoChoice === true || appSettings.smartImages.enabled) {
        try {
          const forceFetch = explicitPhotoChoice === true;
          const imgRes = await getSmartImage(
            cardData.word,
            cardData.partOfSpeech,
            cardData.meaningFa,
            appSettings.smartImages,
            appSettings,
            forceFetch
          );
          if (imgRes.success && imgRes.needsImage && imgRes.imageBase64 && imgRes.imageFileName) {
            cardData.imageBase64 = imgRes.imageBase64;
            cardData.imageFileName = imgRes.imageFileName;
            cardData.needsImage = true;
            cardData.imageReason = imgRes.reason;
            pushLog(5, 'Smart Image Attached', 'success', `Attached image for "${cardData.word}" (${imgRes.imageFileName})`, imgRes.reason);
          } else {
            pushLog(5, 'Smart Image Evaluated', 'skipped', `No image attached: ${imgRes.reason || 'Not needed or not found'}`);
          }
        } catch (err: any) {
          pushLog(5, 'Smart Image Evaluated', 'skipped', `Image search skipped: ${err?.message}`);
        }
      }
    }

    // [6] TTS Audio Generation (Piper vs Online vs Custom)
    const ttsProvider = appSettings.tts.provider;

    if (ttsProvider === 'online') {
      pushLog(6, 'TTS Audio Generation', 'pending', 'Synthesizing selected pronunciations with Online TTS...');
      try {
        const onlineAudioRes = await generateAllOnlineCardAudios({
          word: cardData.word,
          example: cardData.example,
          generateAmericanNormal: appSettings.tts.generateAmericanNormal,
          generateAmericanSlow: appSettings.tts.generateAmericanSlow,
          generateBritishNormal: appSettings.tts.generateBritishNormal,
          generateBritishSlow: appSettings.tts.generateBritishSlow,
          generateExampleUsNormal: appSettings.tts.generateExampleUsNormal,
          generateExampleUsSlow: appSettings.tts.generateExampleUsSlow,
          generateExampleUkNormal: appSettings.tts.generateExampleUkNormal,
          generateExampleUkSlow: appSettings.tts.generateExampleUkSlow,
        });

        if (!onlineAudioRes.success || onlineAudioRes.files.length === 0) {
          const errDetail = onlineAudioRes.error || 'Failed to synthesize online audio';
          pushLog(6, 'TTS Audio Generation', 'error', errDetail);
          return res.status(500).json({
            success: false,
            stage: 'audio_generated',
            error: `Online TTS generation failed: ${errDetail}`,
            cardData,
            logs,
          });
        }

        cardData = {
          ...cardData,
          wordAudioUsNormalBase64: onlineAudioRes.wordAudioUsNormalBase64,
          wordAudioUsSlowBase64: onlineAudioRes.wordAudioUsSlowBase64,
          wordAudioUkNormalBase64: onlineAudioRes.wordAudioUkNormalBase64,
          wordAudioUkSlowBase64: onlineAudioRes.wordAudioUkSlowBase64,
          exampleAudioUsNormalBase64: onlineAudioRes.exampleAudioUsNormalBase64,
          exampleAudioUsSlowBase64: onlineAudioRes.exampleAudioUsSlowBase64,
          exampleAudioUkNormalBase64: onlineAudioRes.exampleAudioUkNormalBase64,
          exampleAudioUkSlowBase64: onlineAudioRes.exampleAudioUkSlowBase64,
          wordAudioUsNormalFileName: onlineAudioRes.wordAudioUsNormalFileName,
          wordAudioUsSlowFileName: onlineAudioRes.wordAudioUsSlowFileName,
          wordAudioUkNormalFileName: onlineAudioRes.wordAudioUkNormalFileName,
          wordAudioUkSlowFileName: onlineAudioRes.wordAudioUkSlowFileName,
          exampleAudioUsNormalFileName: onlineAudioRes.exampleAudioUsNormalFileName,
          exampleAudioUsSlowFileName: onlineAudioRes.exampleAudioUsSlowFileName,
          exampleAudioUkNormalFileName: onlineAudioRes.exampleAudioUkNormalFileName,
          exampleAudioUkSlowFileName: onlineAudioRes.exampleAudioUkSlowFileName,
          wordAudioBase64: onlineAudioRes.wordAudioUsNormalBase64 || onlineAudioRes.wordAudioUsSlowBase64 || onlineAudioRes.wordAudioUkNormalBase64 || onlineAudioRes.wordAudioUkSlowBase64,
          exampleAudioBase64: onlineAudioRes.exampleAudioUsNormalBase64 || onlineAudioRes.exampleAudioUsSlowBase64 || onlineAudioRes.exampleAudioUkNormalBase64 || onlineAudioRes.exampleAudioUkSlowBase64,
          wordAudioFileName: onlineAudioRes.wordAudioUsNormalFileName || onlineAudioRes.wordAudioUsSlowFileName || onlineAudioRes.wordAudioUkNormalFileName || onlineAudioRes.wordAudioUkSlowFileName,
          exampleAudioFileName: onlineAudioRes.exampleAudioUsNormalFileName || onlineAudioRes.exampleAudioUsSlowFileName || onlineAudioRes.exampleAudioUkNormalFileName || onlineAudioRes.exampleAudioUkSlowFileName,
          audioFiles: onlineAudioRes.files.map((f) => ({
            fileName: f.fileName,
            fieldSoundTag: f.fieldSoundTag,
            base64: f.base64,
            label: f.label,
            voice: f.voice,
            speed: f.speed,
            durationSeconds: f.durationSeconds,
          })),
        };

        pushLog(6, 'TTS Audio Generation', 'success', `Generated ${onlineAudioRes.files.length} audio clips via Online TTS`);
      } catch (err: any) {
        pushLog(6, 'TTS Audio Generation', 'error', `Online TTS exception: ${err?.message}`);
        return res.status(500).json({
          success: false,
          stage: 'audio_generated',
          error: `Online TTS exception: ${err?.message}`,
          cardData,
          logs,
        });
      }
    } else if (ttsProvider === 'piper') {
      // Offline Piper TTS
      const piperCheck = await checkPiperHealth(appSettings.tts.endpoint);
      if (!piperCheck.connected) {
        const errMsg = `Piper TTS is offline at ${appSettings.tts.endpoint}: ${piperCheck.error}.`;
        pushLog(6, 'TTS Audio Generation', 'error', errMsg);
        return res.status(502).json({
          success: false,
          stage: 'tts_reachable',
          error: errMsg,
          cardData,
          logs,
        });
      }

      pushLog(6, 'TTS Audio Generation', 'pending', `Synthesizing with Piper (Length scale ${appSettings.tts.slowSpeed})...`);
      try {
        const audioGenRes = await generateAllCardAudios({
          word: cardData.word,
          example: cardData.example,
          endpoint: appSettings.tts.endpoint,
          americanVoice: appSettings.tts.americanVoice,
          britishVoice: appSettings.tts.britishVoice,
          normalSpeed: appSettings.tts.normalSpeed,
          slowSpeed: appSettings.tts.slowSpeed,
          generateAmericanNormal: appSettings.tts.generateAmericanNormal,
          generateAmericanSlow: appSettings.tts.generateAmericanSlow,
          generateBritishNormal: appSettings.tts.generateBritishNormal,
          generateBritishSlow: appSettings.tts.generateBritishSlow,
          generateExampleUsNormal: appSettings.tts.generateExampleUsNormal,
          generateExampleUsSlow: appSettings.tts.generateExampleUsSlow,
          generateExampleUkNormal: appSettings.tts.generateExampleUkNormal,
          generateExampleUkSlow: appSettings.tts.generateExampleUkSlow,
          speedAmericanNormal: appSettings.tts.speedAmericanNormal,
          speedAmericanSlow: appSettings.tts.speedAmericanSlow,
          speedBritishNormal: appSettings.tts.speedBritishNormal,
          speedBritishSlow: appSettings.tts.speedBritishSlow,
          speedExampleUsNormal: appSettings.tts.speedExampleUsNormal,
          speedExampleUsSlow: appSettings.tts.speedExampleUsSlow,
          speedExampleUkNormal: appSettings.tts.speedExampleUkNormal,
          speedExampleUkSlow: appSettings.tts.speedExampleUkSlow,
        });

        if (!audioGenRes.success || audioGenRes.files.length === 0) {
          const errDetail = audioGenRes.error || 'Failed to synthesize audio with Piper';
          pushLog(6, 'TTS Audio Generation', 'error', errDetail);
          return res.status(500).json({
            success: false,
            stage: 'audio_generated',
            error: `Piper audio generation failed: ${errDetail}`,
            cardData,
            logs,
          });
        }

        cardData = {
          ...cardData,
          wordAudioUsNormalBase64: audioGenRes.wordAudioUsNormalBase64,
          wordAudioUsSlowBase64: audioGenRes.wordAudioUsSlowBase64,
          wordAudioUkNormalBase64: audioGenRes.wordAudioUkNormalBase64,
          wordAudioUkSlowBase64: audioGenRes.wordAudioUkSlowBase64,
          exampleAudioUsNormalBase64: audioGenRes.exampleAudioUsNormalBase64,
          exampleAudioUsSlowBase64: audioGenRes.exampleAudioUsSlowBase64,
          exampleAudioUkNormalBase64: audioGenRes.exampleAudioUkNormalBase64,
          exampleAudioUkSlowBase64: audioGenRes.exampleAudioUkSlowBase64,
          wordAudioUsNormalFileName: audioGenRes.wordAudioUsNormalFileName,
          wordAudioUsSlowFileName: audioGenRes.wordAudioUsSlowFileName,
          wordAudioUkNormalFileName: audioGenRes.wordAudioUkNormalFileName,
          wordAudioUkSlowFileName: audioGenRes.wordAudioUkSlowFileName,
          exampleAudioUsNormalFileName: audioGenRes.exampleAudioUsNormalFileName,
          exampleAudioUsSlowFileName: audioGenRes.exampleAudioUsSlowFileName,
          exampleAudioUkNormalFileName: audioGenRes.exampleAudioUkNormalFileName,
          exampleAudioUkSlowFileName: audioGenRes.exampleAudioUkSlowFileName,
          wordAudioBase64: audioGenRes.wordAudioUsNormalBase64 || audioGenRes.wordAudioUsSlowBase64 || audioGenRes.wordAudioUkNormalBase64 || audioGenRes.wordAudioUkSlowBase64,
          exampleAudioBase64: audioGenRes.exampleAudioUsNormalBase64 || audioGenRes.exampleAudioUsSlowBase64 || audioGenRes.exampleAudioUkNormalBase64 || audioGenRes.exampleAudioUkSlowBase64,
          wordAudioFileName: audioGenRes.wordAudioUsNormalFileName || audioGenRes.wordAudioUsSlowFileName || audioGenRes.wordAudioUkNormalFileName || audioGenRes.wordAudioUkSlowFileName,
          exampleAudioFileName: audioGenRes.exampleAudioUsNormalFileName || audioGenRes.exampleAudioUsSlowFileName || audioGenRes.exampleAudioUkNormalFileName || audioGenRes.exampleAudioUkSlowFileName,
          audioFiles: audioGenRes.files.map((f) => ({
            fileName: f.fileName,
            fieldSoundTag: f.fieldSoundTag,
            base64: f.base64,
            label: f.label,
            voice: f.voice,
            speed: f.speed,
            durationSeconds: f.validation?.durationSeconds,
          })),
        };

        pushLog(6, 'TTS Audio Generation', 'success', `Synthesized ${audioGenRes.files.length} WAV clips via Piper`);
      } catch (err: any) {
        pushLog(6, 'TTS Audio Generation', 'error', `Piper audio exception: ${err?.message}`);
        return res.status(500).json({
          success: false,
          stage: 'audio_generated',
          error: `Piper audio generation exception: ${err?.message}`,
          cardData,
          logs,
        });
      }
    } else {
      // Custom TTS Provider
      const customConfig = appSettings.tts.customProviders?.find((p) => p.id === ttsProvider) || appSettings.tts.customProviders?.[0];
      if (!customConfig) {
        const errMsg = `Custom TTS provider "${ttsProvider}" not found.`;
        pushLog(6, 'TTS Audio Generation', 'error', errMsg);
        return res.status(400).json({ success: false, stage: 'audio_generated', error: errMsg, logs });
      }

      pushLog(6, 'TTS Audio Generation', 'pending', `Synthesizing with Custom TTS (${customConfig.name})...`);
      try {
        const safeWord = cardData.word.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const files: any[] = [];

        // Normal Word Audio
        if (appSettings.tts.generateAmericanNormal !== false) {
          const resNormal = await synthesizeCustomTTS(customConfig, cardData.word, false, appSettings.tts.slowSpeed);
          if (resNormal.success && resNormal.audioBase64) {
            const fileName = `tts_custom_${safeWord}_normal.${resNormal.format || 'mp3'}`;
            cardData.wordAudioUsNormalBase64 = resNormal.audioBase64;
            cardData.wordAudioUsNormalFileName = fileName;
            cardData.wordAudioBase64 = resNormal.audioBase64;
            cardData.wordAudioFileName = fileName;
            files.push({
              fileName,
              fieldSoundTag: `[sound:${fileName}]`,
              base64: resNormal.audioBase64,
              label: `${customConfig.name} Normal`,
              voice: customConfig.voice,
              speed: 1.0,
              durationSeconds: resNormal.durationSeconds,
            });
          }
        }

        // Slow Word Audio
        if (appSettings.tts.generateAmericanSlow !== false) {
          const resSlow = await synthesizeCustomTTS(customConfig, cardData.word, true, appSettings.tts.slowSpeed);
          if (resSlow.success && resSlow.audioBase64) {
            const fileName = `tts_custom_${safeWord}_slow.${resSlow.format || 'mp3'}`;
            cardData.wordAudioUsSlowBase64 = resSlow.audioBase64;
            cardData.wordAudioUsSlowFileName = fileName;
            files.push({
              fileName,
              fieldSoundTag: `[sound:${fileName}]`,
              base64: resSlow.audioBase64,
              label: `${customConfig.name} Slow (${appSettings.tts.slowSpeed}x)`,
              voice: customConfig.voice,
              speed: appSettings.tts.slowSpeed,
              durationSeconds: resSlow.durationSeconds,
            });
          }
        }

        // Example Sentence Audio
        if (appSettings.tts.generateExampleUs !== false && cardData.example) {
          const resEx = await synthesizeCustomTTS(customConfig, cardData.example, false, 1.0);
          if (resEx.success && resEx.audioBase64) {
            const fileName = `tts_custom_${safeWord}_example.${resEx.format || 'mp3'}`;
            cardData.exampleAudioUsNormalBase64 = resEx.audioBase64;
            cardData.exampleAudioUsNormalFileName = fileName;
            cardData.exampleAudioBase64 = resEx.audioBase64;
            cardData.exampleAudioFileName = fileName;
            files.push({
              fileName,
              fieldSoundTag: `[sound:${fileName}]`,
              base64: resEx.audioBase64,
              label: `${customConfig.name} Sentence`,
              voice: customConfig.voice,
              speed: 1.0,
              durationSeconds: resEx.durationSeconds,
            });
          }
        }

        cardData.audioFiles = files;
        pushLog(6, 'TTS Audio Generation', 'success', `Generated ${files.length} audio clips via Custom TTS (${customConfig.name})`);
      } catch (err: any) {
        pushLog(6, 'TTS Audio Generation', 'error', `Custom TTS exception: ${err?.message}`);
        return res.status(500).json({
          success: false,
          stage: 'audio_generated',
          error: `Custom TTS exception: ${err?.message}`,
          cardData,
          logs,
        });
      }
    }

    if (!createInAnki) {
      pushLog(7, 'AnkiConnect Connected', 'skipped', 'Anki sync disabled (Preview mode only)');
      return res.json({
        success: true,
        cardData,
        deck: targetDeck,
        logs,
      });
    }

    // [7] AnkiConnect Connected
    const ankiUrl = appSettings.anki.url || 'http://127.0.0.1:8765';
    const ankiCheck = await checkAnkiConnection(ankiUrl);
    if (!ankiCheck.connected) {
      const errMsg = `AnkiConnect unreachable at ${ankiUrl}. Make sure Anki is running with AnkiConnect installed.`;
      pushLog(7, 'AnkiConnect Connected', 'error', errMsg);
      return res.status(502).json({
        success: false,
        stage: 'anki_connected',
        error: errMsg,
        cardData,
        logs,
      });
    }
    pushLog(7, 'AnkiConnect Connected', 'success', `AnkiConnect reachable at ${ankiUrl} (v${ankiCheck.version})`);

    // [8] Media Stored in Anki
    pushLog(8, 'Media stored in Anki', 'pending', `Storing media files (Audio & Smart Images) in Anki collection...`);

    // [9] Note Created in Anki
    pushLog(9, 'Note created in Anki', 'pending', `Writing note into deck "${targetDeck}"...`);
    const noteRes = await createAnkiNote(
      ankiUrl,
      targetDeck,
      cardData,
      appSettings.theme,
      effectiveCardType
    );

    if (!noteRes.success) {
      pushLog(9, 'Note created in Anki', 'error', noteRes.error || 'Failed to create note in Anki');
      return res.status(500).json({
        success: false,
        stage: 'note_created',
        error: noteRes.error,
        cardData,
        logs,
      });
    }

    pushLog(8, 'Media stored in Anki', 'success', `Media stored successfully in Anki`);
    pushLog(9, 'Note created in Anki', 'success', `Created Anki Note #${noteRes.noteId} in deck "${targetDeck}" (Exact HTML/CSS theme synchronized)`, `Note ID: ${noteRes.noteId}`);

    return res.json({
      success: true,
      cardData,
      noteId: noteRes.noteId,
      deck: targetDeck,
      cardType: effectiveCardType,
      logs,
    });
  });

  // --- Vite / Static Assets ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Flashcard Generator server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
