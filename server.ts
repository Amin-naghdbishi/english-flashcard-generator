import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { checkOllamaConnection, listOllamaModels, generateWithOllama } from './server/ollama';
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
import { AppSettings, CardData, DiagnosticsReport, StepLog } from './src/types';
import { THEMES } from './src/themes';

const SETTINGS_FILE = path.join(process.cwd(), 'user-settings.json');

const defaultSettings: AppSettings = {
  ai: {
    url: 'http://127.0.0.1:11434',
    model: 'qwen3:4b',
    temperature: 0.2,
    contextLength: 2048,
  },
  tts: {
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
  theme: 'comic-dark',
};

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...defaultSettings, ...JSON.parse(raw) };
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

  // --- API Routes ---

  // Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Settings
  app.get('/api/config', (req, res) => {
    res.json(appSettings);
  });

  app.post('/api/config', (req, res) => {
    appSettings = { ...appSettings, ...req.body };
    saveSettings(appSettings);
    res.json({ success: true, settings: appSettings });
  });

  // --- Ollama Endpoints ---
  app.get('/api/ollama/health', async (req, res) => {
    const url = (req.query.url as string) || appSettings.ai.url;
    const result = await checkOllamaConnection(url);
    res.json(result);
  });

  app.get('/api/ollama/models', async (req, res) => {
    const url = (req.query.url as string) || appSettings.ai.url;
    const result = await listOllamaModels(url);
    res.json(result);
  });

  app.post('/api/ollama/generate', async (req, res) => {
    const { word, manualOverrides, model, url, temperature, contextLength } = req.body;
    const aiUrl = url || appSettings.ai.url;
    const aiModel = model || appSettings.ai.model;
    const temp = typeof temperature === 'number' ? temperature : appSettings.ai.temperature;
    const ctx = typeof contextLength === 'number' ? contextLength : appSettings.ai.contextLength;

    if (!word || !word.trim()) {
      return res.status(400).json({ success: false, error: 'Word parameter is required' });
    }

    const result = await generateWithOllama(aiUrl, aiModel, word, manualOverrides || {}, temp, ctx);
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

  // Piper systemd user service control
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

  // Independent Test Pipeline for Anki integration testing
  app.post('/api/anki/test-pipeline', async (req, res) => {
    const { url, deck, themeId } = req.body;
    const ankiUrl = url || appSettings.anki.url;
    const targetDeck = deck || appSettings.anki.defaultDeck || 'English::B1';
    const selectedTheme = themeId || appSettings.theme;

    const result = await runAnkiPipelineDiagnostic(ankiUrl, targetDeck, selectedTheme);
    res.json(result);
  });

  // Verify Note and Cards in AnkiConnect
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

  // Open note/card in Anki GUI Browser
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

  // --- Full End-to-End Pipeline Handler with 13 Detailed Step Logs ---
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

    // [3] Ollama connected
    const ollamaCheck = await checkOllamaConnection(appSettings.ai.url);
    if (!ollamaCheck.connected) {
      pushLog(3, 'Ollama connected', 'error', `Cannot connect to Ollama at ${appSettings.ai.url}`, ollamaCheck.error);
      return res.status(502).json({
        success: false,
        stage: 'ollama_connect',
        error: `Ollama connection failed: ${ollamaCheck.error}`,
        logs,
      });
    }
    pushLog(3, 'Ollama connected', 'success', `Connected to Ollama (${ollamaCheck.version || 'active'}) at ${appSettings.ai.url}`);

    // [4] AI data generated
    let cardData: CardData;
    try {
      const aiResult = await generateWithOllama(
        appSettings.ai.url,
        appSettings.ai.model,
        cleanWord,
        manualOverrides || {},
        appSettings.ai.temperature,
        appSettings.ai.contextLength
      );

      if (!aiResult.success || !aiResult.data) {
        pushLog(4, 'AI data generated', 'error', `AI card generation failed: ${aiResult.error}`);
        return res.status(500).json({
          success: false,
          stage: 'ai_data_generated',
          error: `Ollama AI generation failed: ${aiResult.error}`,
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

    // [5] Check Piper TTS Reachability & Voice Check
    const piperCheck = await checkPiperHealth(appSettings.tts.endpoint);
    if (!piperCheck.connected) {
      const errMsg = `Piper TTS is not running. Piper is offline at ${appSettings.tts.endpoint}: ${piperCheck.error}. Please ensure Piper HTTP server is running on port 5000.`;
      pushLog(5, 'Piper TTS reachable', 'error', errMsg);
      return res.status(502).json({
        success: false,
        stage: 'piper_tts_reachable',
        error: errMsg,
        cardData,
        logs,
      });
    }
    pushLog(5, 'Piper TTS reachable', 'success', `Piper HTTP server is active at ${appSettings.tts.endpoint} (Voices: ${appSettings.tts.americanVoice}, ${appSettings.tts.britishVoice})`);

    // [6] Piper audio generation (American & British normal & slow + example sentences)
    pushLog(6, 'Piper audio generated', 'pending', 'Synthesizing US/UK normal & slow pronunciations with Piper...');
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
        pushLog(6, 'Piper audio generated', 'error', errDetail);
        return res.status(500).json({
          success: false,
          stage: 'piper_audio_generated',
          error: `Piper audio generation failed: ${errDetail}`,
          cardData,
          logs,
        });
      }

      // Merge generated audio files into cardData
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
      pushLog(
        6,
        'Piper audio generated',
        'success',
        `Synthesized & validated ${audioGenRes.files.length} WAV audio clips via Piper`,
        fileSummary
      );
    } catch (err: any) {
      pushLog(6, 'Piper audio generated', 'error', `Piper audio exception: ${err?.message}`);
      return res.status(500).json({
        success: false,
        stage: 'piper_audio_generated',
        error: `Piper audio generation exception: ${err?.message}`,
        cardData,
        logs,
      });
    }

    if (!createInAnki) {
      pushLog(7, 'AnkiConnect connected', 'skipped', 'Anki sync disabled (Preview mode only)');
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
      pushLog(7, 'AnkiConnect connected', 'error', `Cannot connect to AnkiConnect at ${appSettings.anki.url}`, ankiCheck.error);
      return res.status(502).json({
        success: false,
        stage: 'anki_connected',
        error: `AnkiConnect is offline or unreachable at ${appSettings.anki.url}: ${ankiCheck.error}. Please ensure Anki is open with AnkiConnect installed.`,
        cardData,
        logs,
      });
    }
    pushLog(7, 'AnkiConnect connected', 'success', `Connected to AnkiConnect v${ankiCheck.version}`);

    // [8] Deck found / created
    const deckRes = await getAnkiDecks(appSettings.anki.url);
    const existingDecks = deckRes.decks || [];
    const deckExists = existingDecks.includes(targetDeck);
    if (!deckExists) {
      pushLog(8, 'Deck found', 'success', `Deck "${targetDeck}" will be automatically ensured in Anki`);
    } else {
      pushLog(8, 'Deck found', 'success', `Deck "${targetDeck}" found in Anki (${existingDecks.length} total decks)`);
    }

    // [9] Note Type found / created
    const modelSetup = await ensureAnkiModel(appSettings.anki.url, appSettings.theme);
    if (!modelSetup.success) {
      pushLog(9, 'Note Type found/created', 'error', `Note type setup failed: ${modelResError(modelSetup)}`);
      return res.status(500).json({
        success: false,
        stage: 'note_type_found',
        error: `Failed to configure note type 'AI Vocabulary': ${modelResError(modelSetup)}`,
        cardData,
        logs,
      });
    }
    pushLog(9, 'Note Type found/created', 'success', modelSetup.message);

    // [10] Fields prepared
    const totalClips = (cardData.audioFiles || []).length;
    pushLog(
      10,
      'Fields prepared',
      'success',
      `Prepared note fields with ${totalClips} Piper WAV audio sound tags (US/UK normal/slow)`
    );

    // [11] Media uploaded & [12] Note created & [13] Card verified
    const noteCreation = await createAnkiNote(
      appSettings.anki.url,
      targetDeck,
      cardData,
      appSettings.theme
    );

    if (!noteCreation.success || !noteCreation.noteId) {
      pushLog(12, 'Note created', 'error', `Note creation or verification failed: ${noteCreation.error}`);
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
    pushLog(11, 'Media uploaded', 'success', `Uploaded & verified ${totalClips} WAV audio files in Anki media collection`, uploadedNames);
    pushLog(12, 'Note created', 'success', `Note #${noteCreation.noteId} created & verified in model "${v?.modelName || 'AI Vocabulary'}"`);

    // [13] Card created & verified
    if (cardIds.length === 0 || !v || !v.isVerified) {
      pushLog(13, 'Card created & verified', 'error', v?.verificationMessage || 'Verification failed: 0 cards generated.');
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
      'Card created & verified',
      'success',
      `✓ Verified in Deck: "${v.actualDeck}" | ✓ ${v.cardsCount} Active Card(s): [${cardIds.join(', ')}] | Status: ${firstCard?.queueLabel || 'New'} (${firstCard?.typeLabel || 'New'})`
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
          message: 'Local AI English Flashcard Generator active',
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
    const ollamaHealth = await checkOllamaConnection(appSettings.ai.url);
    if (ollamaHealth.connected) {
      report.ai.push({
        name: 'Ollama Connection',
        status: 'ok',
        message: `Connected to ${appSettings.ai.url} (${ollamaHealth.version})`,
        timestamp: now,
      });

      const models = await listOllamaModels(appSettings.ai.url);
      if (models.success && models.models.length > 0) {
        report.ai.push({
          name: 'Installed AI Models',
          status: 'ok',
          message: `${models.models.length} model(s) available: ${models.models.map((m) => m.name).join(', ')}`,
          timestamp: now,
        });
      } else {
        report.ai.push({
          name: 'AI Model Check',
          status: 'warning',
          message: 'No models found in Ollama. Run `ollama pull qwen3:4b` or another model.',
          timestamp: now,
        });
      }
    } else {
      report.allPassed = false;
      report.ai.push({
        name: 'Ollama Connection',
        status: 'error',
        message: `Unreachable at ${appSettings.ai.url} (${ollamaHealth.error})`,
        timestamp: now,
      });
    }

    // Check Piper TTS
    const piperService = await getPiperServiceStatus();
    report.tts.push({
      name: 'systemd piper.service',
      status: piperService.active ? 'ok' : 'warning',
      message: piperService.active
        ? 'piper.service is running (systemctl --user is-active)'
        : `piper.service is ${piperService.status} (${piperService.error || 'stopped'})`,
      timestamp: now,
    });

    const ttsDiag = await runPiperDiagnostics({
      endpoint: appSettings.tts.endpoint,
      americanVoice: appSettings.tts.americanVoice,
      britishVoice: appSettings.tts.britishVoice,
      normalSpeed: appSettings.tts.normalSpeed,
      slowSpeed: appSettings.tts.slowSpeed,
    });
    if (!ttsDiag.ready) {
      report.allPassed = false;
    }
    ttsDiag.steps.forEach((step) => {
      report.tts.push({
        name: step.title,
        status: step.status,
        message: step.message,
        timestamp: now,
      });
    });

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

    // Check Templates
    const darkTheme = THEMES['comic-dark'];
    const lightTheme = THEMES['comic-light'];
    if (darkTheme && lightTheme) {
      report.templates.push({
        name: 'Comic Dark Theme',
        status: 'ok',
        message: 'Front, Back templates and CSS loaded',
        timestamp: now,
      });
      report.templates.push({
        name: 'Comic Light Theme',
        status: 'ok',
        message: 'Front, Back templates and CSS loaded',
        timestamp: now,
      });
    }

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
