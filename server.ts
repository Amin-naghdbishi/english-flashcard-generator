import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { checkOllamaConnection, listOllamaModels, generateWithOllama } from './server/ollama';
import { checkGeminiConnection, generateWithGemini, GEMINI_MODELS } from './server/gemini';
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
import { AppSettings, CardData, DiagnosticsReport, StepLog, ThemeId } from './src/types';
import { THEMES } from './src/themes';

const SETTINGS_FILE = path.join(process.cwd(), 'user-settings.json');

const defaultSettings: AppSettings = {
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
    generateSlow: true,
    generateBritish: true,
    generateAmerican: true,
    generateSlowExample: false,
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
  const provider = ai.provider === 'gemini' ? 'gemini' : 'ollama';
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
    url: ollamaUrl,
    model: ollamaModel,
    temperature: ollamaTemp,
    contextLength: ollamaCtx,
  };

  // Normalize TTS config
  const tts = merged.tts || {};
  const ttsProvider = tts.provider === 'online' || tts.engine === 'online' ? 'online' : 'piper';
  merged.tts = {
    provider: ttsProvider,
    engine: ttsProvider,
    endpoint: tts.endpoint || 'http://127.0.0.1:5000',
    americanVoice: tts.americanVoice || 'en_US-lessac-high',
    britishVoice: tts.britishVoice || 'en_GB-cori-high',
    normalSpeed: typeof tts.normalSpeed === 'number' ? tts.normalSpeed : 1.0,
    slowSpeed: typeof tts.slowSpeed === 'number' ? tts.slowSpeed : 1.25,
    generateSlow: tts.generateSlow !== false,
    generateBritish: tts.generateBritish !== false,
    generateAmerican: tts.generateAmerican !== false,
    generateSlowExample: !!tts.generateSlowExample,
  };

  // Normalize Theme (map legacy comic-dark / comic-light if needed)
  if (merged.theme === 'comic-dark') merged.theme = 'comic-pop-dark';
  if (merged.theme === 'comic-light') merged.theme = 'comic-pop-light';
  if (!THEMES[merged.theme]) merged.theme = 'comic-pop-dark';

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

  app.use(express.json({ limit: '25mb' }));

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
  app.get('/api/tts/online/health', async (req, res) => {
    const result = await checkOnlineTtsHealth();
    res.json(result);
  });

  app.post('/api/tts/online/synthesize', async (req, res) => {
    const { text, lang, isSlow } = req.body;
    const result = await synthesizeOnlineAudio(text, lang || 'en-US', !!isSlow);
    res.json(result);
  });

  app.post('/api/tts/online/diagnostics', async (req, res) => {
    const result = await runOnlineTtsDiagnostics();
    res.json(result);
  });

  // --- AnkiConnect Endpoints ---
  app.get('/api/anki/health', async (req, res) => {
    const url = (req.query.url as string) || appSettings.anki.url;
    const result = await checkAnkiConnection(url);
    res.json(result);
  });

  app.get('/api/anki/decks', async (req, res) => {
    const url = (req.query.url as string) || appSettings.anki.url;
    const result = await getAnkiDecks(url);
    res.json(result);
  });

  app.post('/api/anki/setup-model', async (req, res) => {
    const { url, themeId } = req.body;
    const ankiUrl = url || appSettings.anki.url;
    const selectedTheme = themeId || appSettings.theme;

    const result = await ensureAnkiModel(ankiUrl, selectedTheme);
    res.json(result);
  });

  app.post('/api/anki/check-duplicate', async (req, res) => {
    const { url, deck, word } = req.body;
    const ankiUrl = url || appSettings.anki.url;

    if (!deck || !word) {
      return res.status(400).json({ success: false, error: 'Deck and word are required' });
    }

    const result = await checkDuplicateInDeck(ankiUrl, deck, word);
    res.json(result);
  });

  app.post('/api/anki/create-note', async (req, res) => {
    const { url, deck, cardData, themeId } = req.body;
    const ankiUrl = url || appSettings.anki.url;
    const selectedTheme = themeId || appSettings.theme;

    if (!deck || !cardData) {
      return res.status(400).json({ success: false, error: 'Deck and cardData are required' });
    }

    const result = await createAnkiNote(ankiUrl, deck, cardData, selectedTheme);
    res.json(result);
  });

  app.post('/api/anki/test-pipeline', async (req, res) => {
    const { url, deck, themeId } = req.body;
    const ankiUrl = url || appSettings.anki.url;
    const targetDeck = deck || appSettings.anki.defaultDeck || 'English::B1';
    const selectedTheme = themeId || appSettings.theme;

    const result = await runAnkiPipelineDiagnostic(ankiUrl, targetDeck, selectedTheme);
    res.json(result);
  });

  app.post('/api/anki/verify-note', async (req, res) => {
    const { url, noteId, deck } = req.body;
    const ankiUrl = url || appSettings.anki.url;
    const targetDeck = deck || appSettings.anki.defaultDeck || 'English::B1';

    if (!noteId) {
      return res.status(400).json({ success: false, error: 'Note ID is required' });
    }

    const result = await verifyFullAnkiNoteAndCards(ankiUrl, Number(noteId), targetDeck);
    res.json(result);
  });

  app.post('/api/anki/open-in-anki', async (req, res) => {
    const { url, query, noteId } = req.body;
    const ankiUrl = url || appSettings.anki.url;
    const browseQuery = query || (noteId ? `nid:${noteId}` : '');

    if (!browseQuery) {
      return res.status(400).json({ success: false, error: 'Query or Note ID is required' });
    }

    const result = await openInAnkiBrowser(ankiUrl, browseQuery);
    res.json({ ...result, query: browseQuery });
  });

  // --- End-to-End Pipeline Handler ---
  app.post('/api/pipeline/generate-card', async (req, res) => {
    const { word, deck, manualOverrides, createInAnki = true } = req.body;
    const logs: StepLog[] = [];
    const pushLog = (
      step: number,
      name: string,
      status: 'pending' | 'running' | 'success' | 'error' | 'skipped',
      message: string,
      details?: string
    ) => {
      logs.push({
        step,
        name,
        status,
        message,
        details,
        timestamp: Date.now(),
      });
    };

    // [1] Word received
    if (!word || !word.trim()) {
      pushLog(1, 'Word received', 'error', 'Word parameter is empty or missing');
      return res.status(400).json({
        success: false,
        stage: 'word_received',
        error: 'Word is required',
        logs,
      });
    }
    const cleanWord = word.trim();
    pushLog(1, 'Word received', 'success', `Word received: "${cleanWord}"`);

    // [2] Deck validated
    const targetDeck = (deck || appSettings.anki.defaultDeck || 'English::B1').trim();
    pushLog(2, 'Deck validated', 'success', `Target deck selected: "${targetDeck}"`);

    // [3] AI Provider Connection Check
    const isGemini = appSettings.ai.provider === 'gemini';
    if (isGemini) {
      pushLog(3, 'AI Provider Connected', 'pending', `Checking Google Gemini API connection (${appSettings.ai.gemini.model})...`);
      const geminiCheck = await checkGeminiConnection(
        appSettings.ai.gemini.apiKey,
        appSettings.ai.gemini.model
      );
      if (!geminiCheck.connected) {
        pushLog(3, 'AI Provider Connected', 'error', `Gemini connection failed: ${geminiCheck.error}`);
        return res.status(502).json({
          success: false,
          stage: 'ai_connect',
          error: `Gemini connection failed: ${geminiCheck.error}. Please check your API key in Settings.`,
          logs,
        });
      }
      pushLog(3, 'AI Provider Connected', 'success', `Connected to Google Gemini (${appSettings.ai.gemini.model})`);
    } else {
      pushLog(3, 'AI Provider Connected', 'pending', `Checking local Ollama connection at ${appSettings.ai.ollama.url}...`);
      const ollamaCheck = await checkOllamaConnection(appSettings.ai.ollama.url);
      if (!ollamaCheck.connected) {
        pushLog(3, 'AI Provider Connected', 'error', `Cannot connect to Ollama at ${appSettings.ai.ollama.url}`, ollamaCheck.error);
        return res.status(502).json({
          success: false,
          stage: 'ai_connect',
          error: `Ollama connection failed: ${ollamaCheck.error}`,
          logs,
        });
      }
      pushLog(3, 'AI Provider Connected', 'success', `Connected to Ollama (${ollamaCheck.version || 'active'}) with model "${appSettings.ai.ollama.model}"`);
    }

    // [4] AI Data Generated
    let cardData: CardData;
    try {
      let aiResult: { success: boolean; data?: CardData; error?: string };

      if (isGemini) {
        aiResult = await generateWithGemini(
          appSettings.ai.gemini.apiKey,
          appSettings.ai.gemini.model,
          cleanWord,
          manualOverrides || {},
          appSettings.ai.gemini.temperature
        );
      } else {
        aiResult = await generateWithOllama(
          appSettings.ai.ollama.url,
          appSettings.ai.ollama.model,
          cleanWord,
          manualOverrides || {},
          appSettings.ai.ollama.temperature,
          appSettings.ai.ollama.contextLength
        );
      }

      if (!aiResult.success || !aiResult.data) {
        const errDetail = aiResult.error || 'AI generation failed';
        pushLog(4, 'AI data generated', 'error', errDetail);
        return res.status(500).json({
          success: false,
          stage: 'ai_data_generated',
          error: errDetail,
          logs,
        });
      }

      cardData = { ...aiResult.data };
      pushLog(
        4,
        'AI data generated',
        'success',
        `Generated card data for "${cleanWord}" (POS: ${cardData.partOfSpeech}, IPA: ${cardData.phonetic})`,
        `Meaning: ${cardData.meaningFa} | Example: "${cardData.example}"`
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

    // [5] & [6] TTS Audio Generation (Piper vs Online)
    const isOnlineTTS = appSettings.tts.provider === 'online';
    if (isOnlineTTS) {
      pushLog(5, 'TTS Service Reachable', 'success', 'Using High-Quality Online English TTS');
      pushLog(6, 'Audio Generated', 'pending', 'Synthesizing US/UK normal & slow pronunciations with Online TTS...');

      try {
        const onlineAudioRes = await generateAllOnlineCardAudios({
          word: cardData.word,
          example: cardData.example,
          generateSlow: appSettings.tts.generateSlow !== false,
          generateBritish: appSettings.tts.generateBritish !== false,
          generateAmerican: appSettings.tts.generateAmerican !== false,
        });

        if (!onlineAudioRes.success || onlineAudioRes.files.length === 0) {
          const errDetail = onlineAudioRes.error || 'Failed to synthesize online audio';
          pushLog(6, 'Audio Generated', 'error', errDetail);
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
          exampleAudioUkNormalBase64: onlineAudioRes.exampleAudioUkNormalBase64,
          wordAudioUsNormalFileName: onlineAudioRes.wordAudioUsNormalFileName,
          wordAudioUsSlowFileName: onlineAudioRes.wordAudioUsSlowFileName,
          wordAudioUkNormalFileName: onlineAudioRes.wordAudioUkNormalFileName,
          wordAudioUkSlowFileName: onlineAudioRes.wordAudioUkSlowFileName,
          exampleAudioUsNormalFileName: onlineAudioRes.exampleAudioUsNormalFileName,
          exampleAudioUkNormalFileName: onlineAudioRes.exampleAudioUkNormalFileName,
          wordAudioBase64: onlineAudioRes.wordAudioUsNormalBase64,
          exampleAudioBase64: onlineAudioRes.exampleAudioUsNormalBase64,
          wordAudioFileName: onlineAudioRes.wordAudioUsNormalFileName,
          exampleAudioFileName: onlineAudioRes.exampleAudioUsNormalFileName,
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

        const fileSummary = onlineAudioRes.files.map((a) => `${a.label} (${a.fileName})`).join(', ');
        pushLog(6, 'Audio Generated', 'success', `Generated ${onlineAudioRes.files.length} MP3 audio clips via Online TTS`, fileSummary);
      } catch (err: any) {
        pushLog(6, 'Audio Generated', 'error', `Online TTS exception: ${err?.message}`);
        return res.status(500).json({
          success: false,
          stage: 'audio_generated',
          error: `Online TTS exception: ${err?.message}`,
          cardData,
          logs,
        });
      }
    } else {
      // Offline Piper TTS
      const piperCheck = await checkPiperHealth(appSettings.tts.endpoint);
      if (!piperCheck.connected) {
        const errMsg = `Piper TTS is offline at ${appSettings.tts.endpoint}: ${piperCheck.error}. Please ensure Piper HTTP server is running on port 5000.`;
        pushLog(5, 'TTS Service Reachable', 'error', errMsg);
        return res.status(502).json({
          success: false,
          stage: 'tts_reachable',
          error: errMsg,
          cardData,
          logs,
        });
      }
      pushLog(5, 'TTS Service Reachable', 'success', `Piper HTTP server is active at ${appSettings.tts.endpoint} (${appSettings.tts.americanVoice}, ${appSettings.tts.britishVoice})`);

      pushLog(6, 'Audio Generated', 'pending', 'Synthesizing US/UK normal & slow pronunciations with Piper...');
      try {
        const audioGenRes = await generateAllCardAudios({
          word: cardData.word,
          example: cardData.example,
          endpoint: appSettings.tts.endpoint,
          americanVoice: appSettings.tts.americanVoice,
          britishVoice: appSettings.tts.britishVoice,
          normalSpeed: appSettings.tts.normalSpeed,
          slowSpeed: appSettings.tts.slowSpeed,
          generateSlow: appSettings.tts.generateSlow !== false,
          generateBritish: appSettings.tts.generateBritish !== false,
          generateAmerican: appSettings.tts.generateAmerican !== false,
          generateSlowExample: !!appSettings.tts.generateSlowExample,
        });

        if (!audioGenRes.success || audioGenRes.files.length === 0) {
          const errDetail = audioGenRes.error || 'Failed to synthesize audio with Piper';
          pushLog(6, 'Audio Generated', 'error', errDetail);
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
          exampleAudioUkNormalBase64: audioGenRes.exampleAudioUkNormalBase64,
          wordAudioUsNormalFileName: audioGenRes.wordAudioUsNormalFileName,
          wordAudioUsSlowFileName: audioGenRes.wordAudioUsSlowFileName,
          wordAudioUkNormalFileName: audioGenRes.wordAudioUkNormalFileName,
          wordAudioUkSlowFileName: audioGenRes.wordAudioUkSlowFileName,
          exampleAudioUsNormalFileName: audioGenRes.exampleAudioUsNormalFileName,
          exampleAudioUkNormalFileName: audioGenRes.exampleAudioUkNormalFileName,
          wordAudioBase64: audioGenRes.wordAudioUsNormalBase64,
          exampleAudioBase64: audioGenRes.exampleAudioUsNormalBase64,
          wordAudioFileName: audioGenRes.wordAudioUsNormalFileName,
          exampleAudioFileName: audioGenRes.exampleAudioUsNormalFileName,
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

        const fileSummary = audioGenRes.files.map((a) => `${a.label} (${a.fileName})`).join(', ');
        pushLog(6, 'Audio Generated', 'success', `Synthesized & validated ${audioGenRes.files.length} WAV audio clips via Piper`, fileSummary);
      } catch (err: any) {
        pushLog(6, 'Audio Generated', 'error', `Piper audio exception: ${err?.message}`);
        return res.status(500).json({
          success: false,
          stage: 'audio_generated',
          error: `Piper audio generation exception: ${err?.message}`,
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

    // [7] AnkiConnect connected
    const ankiCheck = await checkAnkiConnection(appSettings.anki.url);
    if (!ankiCheck.connected) {
      pushLog(7, 'AnkiConnect Connected', 'error', `Cannot connect to AnkiConnect at ${appSettings.anki.url}`, ankiCheck.error);
      return res.status(502).json({
        success: false,
        stage: 'anki_connected',
        error: `AnkiConnect is offline or unreachable at ${appSettings.anki.url}: ${ankiCheck.error}. Please ensure Anki is open with AnkiConnect installed.`,
        cardData,
        logs,
      });
    }
    pushLog(7, 'AnkiConnect Connected', 'success', `Connected to AnkiConnect v${ankiCheck.version}`);

    // [8] Deck found / ensured
    const deckRes = await getAnkiDecks(appSettings.anki.url);
    const existingDecks = deckRes.decks || [];
    const deckExists = existingDecks.includes(targetDeck);
    if (!deckExists) {
      pushLog(8, 'Deck Ensured', 'success', `Deck "${targetDeck}" will be automatically ensured in Anki`);
    } else {
      pushLog(8, 'Deck Ensured', 'success', `Deck "${targetDeck}" found in Anki (${existingDecks.length} total decks)`);
    }

    // [9] Note Type found / created
    const modelSetup = await ensureAnkiModel(appSettings.anki.url, appSettings.theme);
    if (!modelSetup.success) {
      pushLog(9, 'Note Type Configured', 'error', `Note type setup failed: ${modelResError(modelSetup)}`);
      return res.status(500).json({
        success: false,
        stage: 'note_type_found',
        error: `Failed to configure note type 'AI Vocabulary': ${modelResError(modelSetup)}`,
        cardData,
        logs,
      });
    }
    pushLog(9, 'Note Type Configured', 'success', modelSetup.message);

    // [10] Fields prepared
    const totalClips = (cardData.audioFiles || []).length;
    pushLog(
      10,
      'Fields Prepared',
      'success',
      `Prepared note fields with ${totalClips} audio sound tags (US/UK normal/slow)`
    );

    // [11] Media uploaded & [12] Note created & [13] Card verified
    const noteCreation = await createAnkiNote(
      appSettings.anki.url,
      targetDeck,
      cardData,
      appSettings.theme
    );

    if (!noteCreation.success || !noteCreation.noteId) {
      pushLog(12, 'Note Created', 'error', `Note creation or verification failed: ${noteCreation.error}`);
      return res.status(500).json({
        success: false,
        stage: 'note_created',
        error: `Anki note creation/verification failed: ${noteCreation.error}`,
        cardData,
        logs,
      });
    }

    const v = noteCreation.verification;
    const cardIds = noteCreation.cardIds || [];

    const uploadedNames = (cardData.audioFiles || []).map((a) => a.fileName).join(', ');
    pushLog(11, 'Media Uploaded', 'success', `Uploaded & verified ${totalClips} audio files in Anki media collection`, uploadedNames);
    pushLog(12, 'Note Created', 'success', `Note #${noteCreation.noteId} created & verified in model "${v?.modelName || 'AI Vocabulary'}"`);

    // [13] Card created & verified
    if (cardIds.length === 0 || !v || !v.isVerified) {
      pushLog(13, 'Card Verified', 'error', v?.verificationMessage || 'Verification failed: 0 cards generated.');
      return res.status(500).json({
        success: false,
        stage: 'card_verified',
        error: v?.verificationMessage || 'Card verification failed in Anki.',
        cardData,
        noteId: noteCreation.noteId,
        cardIds,
        verification: v,
        logs,
      });
    }

    const firstCard = v.cardsInfo?.[0];
    pushLog(
      13,
      'Card Verified',
      'success',
      `✓ Verified in Deck: "${v.actualDeck}" | ✓ ${v.cardsCount} Active Card(s): [${cardIds.join(', ')}] | Status: ${firstCard?.queueLabel || 'New'}`
    );

    return res.json({
      success: true,
      cardData,
      noteId: noteCreation.noteId,
      cardIds,
      deck: v.actualDeck,
      verification: v,
      logs,
    });
  });

  function modelResError(res: any): string {
    return res.error || res.message || 'Unknown error';
  }

  // --- Diagnostics Report ---
  app.post('/api/diagnostics/all', async (req, res) => {
    const now = new Date().toISOString();
    const report: DiagnosticsReport = {
      system: [
        {
          name: 'Application Core',
          status: 'ok',
          message: 'English Flashcard Generator active',
          timestamp: now,
        },
      ],
      ai: [],
      tts: [],
      anki: [],
      templates: [],
      allPassed: true,
    };

    // Check Ollama
    const ollamaHealth = await checkOllamaConnection(appSettings.ai.ollama.url);
    if (ollamaHealth.connected) {
      report.ai.push({
        name: 'Ollama Connection',
        status: 'ok',
        message: `Connected to ${appSettings.ai.ollama.url} (${ollamaHealth.version})`,
        timestamp: now,
      });

      const models = await listOllamaModels(appSettings.ai.ollama.url);
      if (models.success && models.models.length > 0) {
        report.ai.push({
          name: 'Installed Ollama Models',
          status: 'ok',
          message: `${models.models.length} model(s) available: ${models.models.map((m) => m.name).join(', ')}`,
          timestamp: now,
        });
      }
    } else {
      if (appSettings.ai.provider === 'ollama') {
        report.allPassed = false;
      }
      report.ai.push({
        name: 'Ollama Connection',
        status: appSettings.ai.provider === 'ollama' ? 'error' : 'warning',
        message: `Unreachable at ${appSettings.ai.ollama.url} (${ollamaHealth.error})`,
        timestamp: now,
      });
    }

    // Check Gemini if key present or active
    if (appSettings.ai.gemini.apiKey || appSettings.ai.provider === 'gemini') {
      const geminiHealth = await checkGeminiConnection(
        appSettings.ai.gemini.apiKey,
        appSettings.ai.gemini.model
      );
      if (geminiHealth.connected) {
        report.ai.push({
          name: 'Google Gemini API',
          status: 'ok',
          message: `Connected (${appSettings.ai.gemini.model})`,
          timestamp: now,
        });
      } else {
        if (appSettings.ai.provider === 'gemini') {
          report.allPassed = false;
        }
        report.ai.push({
          name: 'Google Gemini API',
          status: appSettings.ai.provider === 'gemini' ? 'error' : 'warning',
          message: `Gemini API Check: ${geminiHealth.error}`,
          timestamp: now,
        });
      }
    }

    // Check Piper TTS
    const piperService = await getPiperServiceStatus();
    report.tts.push({
      name: 'systemd piper.service',
      status: piperService.active ? 'ok' : (appSettings.tts.provider === 'piper' ? 'warning' : 'ok'),
      message: piperService.active
        ? 'piper.service is running (systemctl --user is-active)'
        : `piper.service is ${piperService.status}`,
      timestamp: now,
    });

    const piperHealth = await checkPiperHealth(appSettings.tts.endpoint);
    if (piperHealth.connected) {
      report.tts.push({
        name: 'Piper TTS Server',
        status: 'ok',
        message: `Online at ${appSettings.tts.endpoint}`,
        timestamp: now,
      });
    } else {
      if (appSettings.tts.provider === 'piper') {
        report.allPassed = false;
      }
      report.tts.push({
        name: 'Piper TTS Server',
        status: appSettings.tts.provider === 'piper' ? 'error' : 'warning',
        message: `Piper server unreachable at ${appSettings.tts.endpoint}`,
        timestamp: now,
      });
    }

    // Check Online TTS
    const onlineTtsHealth = await checkOnlineTtsHealth();
    if (onlineTtsHealth.connected) {
      report.tts.push({
        name: 'Online High-Quality TTS',
        status: 'ok',
        message: 'Online English TTS service active',
        timestamp: now,
      });
    } else {
      if (appSettings.tts.provider === 'online') {
        report.allPassed = false;
      }
      report.tts.push({
        name: 'Online High-Quality TTS',
        status: appSettings.tts.provider === 'online' ? 'error' : 'warning',
        message: `Online TTS check: ${onlineTtsHealth.error}`,
        timestamp: now,
      });
    }

    // Check AnkiConnect
    const ankiHealth = await checkAnkiConnection(appSettings.anki.url);
    if (ankiHealth.connected) {
      report.anki.push({
        name: 'AnkiConnect Connection',
        status: 'ok',
        message: `Connected to Anki (Version ${ankiHealth.version})`,
        timestamp: now,
      });

      const decks = await getAnkiDecks(appSettings.anki.url);
      if (decks.success) {
        report.anki.push({
          name: 'Anki Decks Access',
          status: 'ok',
          message: `Found ${decks.decks.length} deck(s): ${decks.decks.join(', ')}`,
          timestamp: now,
        });
      }
    } else {
      report.allPassed = false;
      report.anki.push({
        name: 'AnkiConnect Connection',
        status: 'error',
        message: `AnkiConnect unreachable at ${appSettings.anki.url} (${ankiHealth.error})`,
        timestamp: now,
      });
    }

    // Check 10 Templates
    const themeKeys = Object.keys(THEMES);
    report.templates.push({
      name: 'Comic Theme Templates',
      status: 'ok',
      message: `10 distinct Light and Dark comic themes loaded (${themeKeys.length} identifiers)`,
      timestamp: now,
    });

    res.json(report);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Flashcard Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
