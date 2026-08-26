import { exec } from 'child_process';
import { promisify } from 'util';
import { validateWavBuffer, WavValidationResult } from './wavHelper';

const execPromise = promisify(exec);

export interface PiperVoice {
  id: string;
  name: string;
  accent: 'american' | 'british' | 'other';
  defaultModel: string;
}

export const PIPER_VOICES: PiperVoice[] = [
  {
    id: 'en_US-lessac-high',
    name: 'American English (Lessac High)',
    accent: 'american',
    defaultModel: 'en_US-lessac-high',
  },
  {
    id: 'en_US-lessac-medium',
    name: 'American English (Lessac Medium)',
    accent: 'american',
    defaultModel: 'en_US-lessac-medium',
  },
  {
    id: 'en_GB-cori-high',
    name: 'British English (Cori High)',
    accent: 'british',
    defaultModel: 'en_GB-cori-high',
  },
];

export interface PiperAudioResult {
  success: boolean;
  wavBuffer?: Buffer;
  wavBase64?: string;
  fileName?: string;
  label?: string;
  voice?: string;
  speed?: number;
  validation?: WavValidationResult;
  error?: string;
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

/**
 * Checks if Piper TTS HTTP server is alive and reachable.
 * Tests /voices first, then falls back to /synthesize.
 */
export async function checkPiperHealth(endpoint: string = 'http://127.0.0.1:5000'): Promise<{
  connected: boolean;
  endpoint: string;
  voicesCount?: number;
  error?: string;
}> {
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    // 1. Try standard /voices endpoint
    try {
      const voicesRes = await fetch(`${cleanEndpoint}/voices`, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: controller.signal,
      });

      if (voicesRes && voicesRes.ok) {
        clearTimeout(timeoutId);
        let count = 0;
        try {
          const data = await voicesRes.json();
          if (Array.isArray(data)) count = data.length;
          else if (data && typeof data === 'object') {
            count = Array.isArray(data.voices) ? data.voices.length : Object.keys(data).length;
          }
        } catch {}
        return { connected: true, endpoint: cleanEndpoint, voicesCount: count };
      }
    } catch {}

    // 2. Try OPTIONS or GET on /synthesize or root
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
    const synthRes = await fetch(`${cleanEndpoint}/synthesize`, {
      method: 'OPTIONS',
      signal: controller2.signal,
    }).catch(() => null);
    clearTimeout(timeoutId2);

    if (synthRes && (synthRes.ok || synthRes.status === 405 || synthRes.status === 200 || synthRes.status === 404)) {
      return { connected: true, endpoint: cleanEndpoint };
    }

    return {
      connected: false,
      endpoint: cleanEndpoint,
      error: `Piper TTS is unreachable at ${cleanEndpoint}`,
    };
  } catch (err: any) {
    return {
      connected: false,
      endpoint: cleanEndpoint,
      error: `Piper TTS is unreachable at ${cleanEndpoint} (${err?.message || 'Connection refused'})`,
    };
  }
}

/**
 * Dynamically retrieves available voices from Piper's /voices HTTP endpoint.
 * Parses both array and object formats, falling back to default voice list if Piper is offline.
 */
export async function getAvailablePiperVoices(endpoint: string = 'http://127.0.0.1:5000'): Promise<{
  success: boolean;
  voices: PiperVoice[];
  error?: string;
}> {
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${cleanEndpoint}/voices`, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        voices: PIPER_VOICES,
        error: `Piper HTTP error ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    let rawList: string[] = [];

    if (Array.isArray(data)) {
      rawList = data.map((v) => (typeof v === 'string' ? v : v.id || v.name || v.key || String(v))).filter(Boolean);
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.voices)) {
        rawList = data.voices.map((v: any) => (typeof v === 'string' ? v : v.id || v.name || v.key || String(v))).filter(Boolean);
      } else {
        rawList = Object.keys(data);
      }
    }

    if (rawList.length > 0) {
      const parsedVoices: PiperVoice[] = rawList.map((id) => {
        const lower = id.toLowerCase();
        const isBritish = lower.includes('en_gb') || lower.includes('en-gb') || lower.includes('cori') || lower.includes('alan');
        const isAmerican = lower.includes('en_us') || lower.includes('en-us') || lower.includes('lessac') || lower.includes('ryan') || lower.includes('amy') || !isBritish;
        
        // Clean display name
        const cleanName = id
          .replace(/^en_US-|^en_GB-|^en-US-|^en-GB-/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        
        const regionPrefix = isBritish ? 'British' : (isAmerican ? 'American' : 'English');

        return {
          id,
          name: `${regionPrefix} (${cleanName})`,
          accent: isBritish ? 'british' : (isAmerican ? 'american' : 'other'),
          defaultModel: id,
        };
      });

      return {
        success: true,
        voices: parsedVoices,
      };
    }

    return {
      success: true,
      voices: PIPER_VOICES,
    };
  } catch (err: any) {
    return {
      success: false,
      voices: PIPER_VOICES,
      error: `Could not fetch voices from Piper: ${err?.message || 'Connection refused'}`,
    };
  }
}

/**
 * Synthesizes audio using the real Piper TTS local HTTP server.
 * Endpoint: POST /synthesize
 * Body: { text: string, voice: string, length_scale: number }
 */
export async function synthesizePiperAudio(
  text: string,
  voice: string = 'en_US-lessac-high',
  lengthScale: number = 1.0,
  endpoint: string = 'http://127.0.0.1:5000'
): Promise<PiperAudioResult> {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Cannot synthesize empty text',
    };
  }

  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const synthesizeUrl = `${cleanEndpoint}/synthesize`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const safeLengthScale = typeof lengthScale === 'number' && lengthScale > 0 ? lengthScale : 1.0;
    const payload = {
      text: trimmed,
      voice: voice || 'en_US-lessac-high',
      length_scale: safeLengthScale,
    };

    let response: Response;
    try {
      response = await fetch(synthesizeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/wav, audio/x-wav, audio/*, application/octet-stream',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (networkErr: any) {
      clearTimeout(timeoutId);
      const isAbort = networkErr.name === 'AbortError';
      const msg = isAbort
        ? `Request timed out connecting to Piper TTS at ${cleanEndpoint}`
        : `Piper TTS is unreachable at ${cleanEndpoint} (${networkErr.message || 'Connection refused'})`;
      return {
        success: false,
        error: msg,
      };
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errBody = '';
      try {
        errBody = await response.text();
      } catch {}
      return {
        success: false,
        error: `Piper HTTP error ${response.status} (${response.statusText}): ${errBody || 'Failed to synthesize audio'}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const wavBuffer = Buffer.from(arrayBuffer);

    // Verify WAV integrity
    const validation = validateWavBuffer(wavBuffer);
    if (!validation.isValid || wavBuffer.length === 0) {
      return {
        success: false,
        error: `Piper output is not a valid WAV file: ${validation.error || 'Empty audio buffer'} (size: ${wavBuffer.length} bytes)`,
      };
    }

    return {
      success: true,
      wavBuffer,
      wavBase64: wavBuffer.toString('base64'),
      voice,
      speed: safeLengthScale,
      validation,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Piper TTS exception: ${err?.message || 'Unknown error'}`,
    };
  }
}

export interface GeneratedPiperCardAudios {
  success: boolean;
  error?: string;
  files: Array<{
    fileName: string;
    fieldSoundTag: string;
    base64: string;
    buffer: Buffer;
    label: string;
    voice: string;
    speed: number;
    validation: WavValidationResult;
  }>;
  // Summary tags for Anki note fields
  wordAudioField: string;
  exampleAudioField: string;
  // Specific audio base64 & filenames for CardData
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
}

/**
 * Generates audio files for a flashcard using Piper TTS based on enabled variants.
 * Accurately tracks errors from each requested synthesis and provides clean diagnostic summaries.
 */
export async function generateAllCardAudios(params: {
  word: string;
  example: string;
  endpoint?: string;
  americanVoice?: string;
  britishVoice?: string;
  normalSpeed?: number;
  slowSpeed?: number;
  generateAmericanNormal?: boolean;
  generateAmericanSlow?: boolean;
  generateBritishNormal?: boolean;
  generateBritishSlow?: boolean;
  generateExampleUsNormal?: boolean;
  generateExampleUsSlow?: boolean;
  generateExampleUkNormal?: boolean;
  generateExampleUkSlow?: boolean;
  // Legacy aliases
  generateExampleUs?: boolean;
  generateExampleUk?: boolean;
  generateSlow?: boolean;
  generateBritish?: boolean;
  generateAmerican?: boolean;
  generateSlowExample?: boolean;

  // Individual speeds (length_scale) for each variant
  speedAmericanNormal?: number;
  speedAmericanSlow?: number;
  speedBritishNormal?: number;
  speedBritishSlow?: number;
  speedExampleUsNormal?: number;
  speedExampleUsSlow?: number;
  speedExampleUkNormal?: number;
  speedExampleUkSlow?: number;
}): Promise<GeneratedPiperCardAudios> {
  const {
    word,
    example,
    endpoint = 'http://127.0.0.1:5000',
    americanVoice = 'en_US-lessac-high',
    britishVoice = 'en_GB-cori-high',
    normalSpeed = 1.0,
    slowSpeed = 1.25,
    generateAmericanNormal = true,
    generateAmericanSlow = true,
    generateBritishNormal = false,
    generateBritishSlow = false,
    generateExampleUsNormal = params.generateExampleUs ?? true,
    generateExampleUsSlow = params.generateSlowExample ?? false,
    generateExampleUkNormal = params.generateExampleUk ?? false,
    generateExampleUkSlow = false,
  } = params;

  const speedUsNormal = Number(params.speedAmericanNormal ?? normalSpeed) || 1.0;
  const speedUsSlow = Number(params.speedAmericanSlow ?? slowSpeed) || 1.25;
  const speedUkNormal = Number(params.speedBritishNormal ?? normalSpeed) || 1.0;
  const speedUkSlow = Number(params.speedBritishSlow ?? slowSpeed) || 1.25;
  const speedExUsNormal = Number(params.speedExampleUsNormal ?? normalSpeed) || 1.0;
  const speedExUsSlow = Number(params.speedExampleUsSlow ?? slowSpeed) || 1.25;
  const speedExUkNormal = Number(params.speedExampleUkNormal ?? normalSpeed) || 1.0;
  const speedExUkSlow = Number(params.speedExampleUkSlow ?? slowSpeed) || 1.25;

  const safeWord = word.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const resultFiles: GeneratedPiperCardAudios['files'] = [];
  const synthesisErrors: string[] = [];

  const wordSoundTags: string[] = [];
  const exampleSoundTags: string[] = [];

  const returnData: GeneratedPiperCardAudios = {
    success: true,
    files: [],
    wordAudioField: '',
    exampleAudioField: '',
  };

  // 1. Check reachability before synthesizing
  const health = await checkPiperHealth(endpoint);
  if (!health.connected) {
    return {
      success: false,
      error: `Piper TTS is not running at ${endpoint}. ${health.error || 'Please start Piper HTTP server before creating cards.'}`,
      files: [],
      wordAudioField: '',
      exampleAudioField: '',
    };
  }

  // --- AMERICAN PRONUNCIATIONS ---
  if (generateAmericanNormal) {
    const usNormalFile = `${safeWord}_us_normal.wav`;
    const usNormalRes = await synthesizePiperAudio(word, americanVoice, speedUsNormal, endpoint);
    if (usNormalRes.success && usNormalRes.wavBuffer && usNormalRes.wavBase64) {
      resultFiles.push({
        fileName: usNormalFile,
        fieldSoundTag: `[sound:${usNormalFile}]`,
        base64: usNormalRes.wavBase64,
        buffer: usNormalRes.wavBuffer,
        label: '🇺🇸 American Normal',
        voice: americanVoice,
        speed: speedUsNormal,
        validation: usNormalRes.validation!,
      });
      wordSoundTags.push(`[sound:${usNormalFile}]`);
      returnData.wordAudioUsNormalBase64 = usNormalRes.wavBase64;
      returnData.wordAudioUsNormalFileName = usNormalFile;
    } else {
      synthesisErrors.push(`American Normal (${americanVoice}): ${usNormalRes.error || 'Failed'}`);
    }
  }

  if (generateAmericanSlow) {
    const usSlowFile = `${safeWord}_us_slow.wav`;
    const usSlowRes = await synthesizePiperAudio(word, americanVoice, speedUsSlow, endpoint);
    if (usSlowRes.success && usSlowRes.wavBuffer && usSlowRes.wavBase64) {
      resultFiles.push({
        fileName: usSlowFile,
        fieldSoundTag: `[sound:${usSlowFile}]`,
        base64: usSlowRes.wavBase64,
        buffer: usSlowRes.wavBuffer,
        label: '🇺🇸 American Slow',
        voice: americanVoice,
        speed: speedUsSlow,
        validation: usSlowRes.validation!,
      });
      wordSoundTags.push(`[sound:${usSlowFile}]`);
      returnData.wordAudioUsSlowBase64 = usSlowRes.wavBase64;
      returnData.wordAudioUsSlowFileName = usSlowFile;
    } else {
      synthesisErrors.push(`American Slow (${americanVoice}): ${usSlowRes.error || 'Failed'}`);
    }
  }

  if (generateExampleUsNormal && example && example.trim()) {
    const exampleUsFile = `${safeWord}_example_us_normal.wav`;
    const exampleUsRes = await synthesizePiperAudio(example, americanVoice, speedExUsNormal, endpoint);
    if (exampleUsRes.success && exampleUsRes.wavBuffer && exampleUsRes.wavBase64) {
      resultFiles.push({
        fileName: exampleUsFile,
        fieldSoundTag: `[sound:${exampleUsFile}]`,
        base64: exampleUsRes.wavBase64,
        buffer: exampleUsRes.wavBuffer,
        label: '🇺🇸 Example American Normal',
        voice: americanVoice,
        speed: speedExUsNormal,
        validation: exampleUsRes.validation!,
      });
      exampleSoundTags.push(`[sound:${exampleUsFile}]`);
      returnData.exampleAudioUsNormalBase64 = exampleUsRes.wavBase64;
      returnData.exampleAudioUsNormalFileName = exampleUsFile;
    } else {
      synthesisErrors.push(`Example American Normal (${americanVoice}): ${exampleUsRes.error || 'Failed'}`);
    }
  }

  if (generateExampleUsSlow && example && example.trim()) {
    const exampleUsSlowFile = `${safeWord}_example_us_slow.wav`;
    const exampleUsSlowRes = await synthesizePiperAudio(example, americanVoice, speedExUsSlow, endpoint);
    if (exampleUsSlowRes.success && exampleUsSlowRes.wavBuffer && exampleUsSlowRes.wavBase64) {
      resultFiles.push({
        fileName: exampleUsSlowFile,
        fieldSoundTag: `[sound:${exampleUsSlowFile}]`,
        base64: exampleUsSlowRes.wavBase64,
        buffer: exampleUsSlowRes.wavBuffer,
        label: '🇺🇸 Example American Slow',
        voice: americanVoice,
        speed: speedExUsSlow,
        validation: exampleUsSlowRes.validation!,
      });
      exampleSoundTags.push(`[sound:${exampleUsSlowFile}]`);
      returnData.exampleAudioUsSlowBase64 = exampleUsSlowRes.wavBase64;
      returnData.exampleAudioUsSlowFileName = exampleUsSlowFile;
    } else {
      synthesisErrors.push(`Example American Slow (${americanVoice}): ${exampleUsSlowRes.error || 'Failed'}`);
    }
  }

  // --- BRITISH PRONUNCIATIONS ---
  if (generateBritishNormal) {
    const ukNormalFile = `${safeWord}_uk_normal.wav`;
    const ukNormalRes = await synthesizePiperAudio(word, britishVoice, speedUkNormal, endpoint);
    if (ukNormalRes.success && ukNormalRes.wavBuffer && ukNormalRes.wavBase64) {
      resultFiles.push({
        fileName: ukNormalFile,
        fieldSoundTag: `[sound:${ukNormalFile}]`,
        base64: ukNormalRes.wavBase64,
        buffer: ukNormalRes.wavBuffer,
        label: '🇬🇧 British Normal',
        voice: britishVoice,
        speed: speedUkNormal,
        validation: ukNormalRes.validation!,
      });
      wordSoundTags.push(`[sound:${ukNormalFile}]`);
      returnData.wordAudioUkNormalBase64 = ukNormalRes.wavBase64;
      returnData.wordAudioUkNormalFileName = ukNormalFile;
    } else {
      synthesisErrors.push(`British Normal (${britishVoice}): ${ukNormalRes.error || 'Failed'}`);
    }
  }

  if (generateBritishSlow) {
    const ukSlowFile = `${safeWord}_uk_slow.wav`;
    const ukSlowRes = await synthesizePiperAudio(word, britishVoice, speedUkSlow, endpoint);
    if (ukSlowRes.success && ukSlowRes.wavBuffer && ukSlowRes.wavBase64) {
      resultFiles.push({
        fileName: ukSlowFile,
        fieldSoundTag: `[sound:${ukSlowFile}]`,
        base64: ukSlowRes.wavBase64,
        buffer: ukSlowRes.wavBuffer,
        label: '🇬🇧 British Slow',
        voice: britishVoice,
        speed: speedUkSlow,
        validation: ukSlowRes.validation!,
      });
      wordSoundTags.push(`[sound:${ukSlowFile}]`);
      returnData.wordAudioUkSlowBase64 = ukSlowRes.wavBase64;
      returnData.wordAudioUkSlowFileName = ukSlowFile;
    } else {
      synthesisErrors.push(`British Slow (${britishVoice}): ${ukSlowRes.error || 'Failed'}`);
    }
  }

  if (generateExampleUkNormal && example && example.trim()) {
    const exampleUkFile = `${safeWord}_example_uk_normal.wav`;
    const exampleUkRes = await synthesizePiperAudio(example, britishVoice, speedExUkNormal, endpoint);
    if (exampleUkRes.success && exampleUkRes.wavBuffer && exampleUkRes.wavBase64) {
      resultFiles.push({
        fileName: exampleUkFile,
        fieldSoundTag: `[sound:${exampleUkFile}]`,
        base64: exampleUkRes.wavBase64,
        buffer: exampleUkRes.wavBuffer,
        label: '🇬🇧 Example British Normal',
        voice: britishVoice,
        speed: speedExUkNormal,
        validation: exampleUkRes.validation!,
      });
      exampleSoundTags.push(`[sound:${exampleUkFile}]`);
      returnData.exampleAudioUkNormalBase64 = exampleUkRes.wavBase64;
      returnData.exampleAudioUkNormalFileName = exampleUkFile;
    } else {
      synthesisErrors.push(`Example British Normal (${britishVoice}): ${exampleUkRes.error || 'Failed'}`);
    }
  }

  if (generateExampleUkSlow && example && example.trim()) {
    const exampleUkSlowFile = `${safeWord}_example_uk_slow.wav`;
    const exampleUkSlowRes = await synthesizePiperAudio(example, britishVoice, speedExUkSlow, endpoint);
    if (exampleUkSlowRes.success && exampleUkSlowRes.wavBuffer && exampleUkSlowRes.wavBase64) {
      resultFiles.push({
        fileName: exampleUkSlowFile,
        fieldSoundTag: `[sound:${exampleUkSlowFile}]`,
        base64: exampleUkSlowRes.wavBase64,
        buffer: exampleUkSlowRes.wavBuffer,
        label: '🇬🇧 Example British Slow',
        voice: britishVoice,
        speed: speedExUkSlow,
        validation: exampleUkSlowRes.validation!,
      });
      exampleSoundTags.push(`[sound:${exampleUkSlowFile}]`);
      returnData.exampleAudioUkSlowBase64 = exampleUkSlowRes.wavBase64;
      returnData.exampleAudioUkSlowFileName = exampleUkSlowFile;
    } else {
      synthesisErrors.push(`Example British Slow (${britishVoice}): ${exampleUkSlowRes.error || 'Failed'}`);
    }
  }

  if (resultFiles.length === 0) {
    returnData.success = false;
    returnData.error = synthesisErrors.length > 0
      ? synthesisErrors.join(' | ')
      : 'No audio variants were enabled for synthesis.';
  } else {
    returnData.success = true;
    returnData.files = resultFiles;
    returnData.wordAudioField = wordSoundTags.join(' ');
    returnData.exampleAudioField = exampleSoundTags.join(' ');
  }

  return returnData;
}

/**
 * Diagnostic test for [Run Voice Diagnostic] button.
 */
export async function runPiperDiagnostics(params?: {
  endpoint?: string;
  americanVoice?: string;
  britishVoice?: string;
  normalSpeed?: number;
  slowSpeed?: number;
}): Promise<PiperDiagnosticResult> {
  const endpoint = params?.endpoint || 'http://127.0.0.1:5000';
  const americanVoice = params?.americanVoice || 'en_US-lessac-high';
  const britishVoice = params?.britishVoice || 'en_GB-cori-high';
  const normalSpeed = params?.normalSpeed || 1.0;
  const slowSpeed = params?.slowSpeed || 1.25;

  const testPhrase = 'The quick brown fox jumps over the lazy dog.';
  const steps: PiperDiagnosticStep[] = [];

  const checklist = {
    piperConnected: false,
    americanVoiceWorking: false,
    britishVoiceWorking: false,
    normalSpeedWorking: false,
    slowSpeedWorking: false,
  };

  const testAudios: PiperTestAudioClips = {};

  // Step 1: Check Piper Connection
  const health = await checkPiperHealth(endpoint);
  if (!health.connected) {
    steps.push({
      step: 1,
      title: 'Connecting to Piper TTS',
      status: 'error',
      message: `Piper TTS is unreachable at ${endpoint}: ${health.error || 'Connection refused'}`,
    });
    return {
      engine: 'piper',
      ready: false,
      endpoint,
      steps,
      checklist,
      error: `Piper TTS is not running. Please start Piper HTTP server on ${endpoint}.`,
    };
  }

  checklist.piperConnected = true;
  steps.push({
    step: 1,
    title: 'Connecting to Piper TTS',
    status: 'ok',
    message: `Piper HTTP server is online at ${endpoint}`,
  });

  // Step 2: Test American Voice (Normal Speed)
  const usNormal = await synthesizePiperAudio(testPhrase, americanVoice, normalSpeed, endpoint);
  if (!usNormal.success || !usNormal.wavBase64) {
    steps.push({
      step: 2,
      title: 'Testing American Voice (Normal)',
      status: 'error',
      message: `American voice failed: ${usNormal.error || 'Unknown error'}`,
    });
    return {
      engine: 'piper',
      ready: false,
      endpoint,
      steps,
      checklist,
      error: `American voice (${americanVoice}) failed: ${usNormal.error}`,
    };
  }

  checklist.americanVoiceWorking = true;
  checklist.normalSpeedWorking = true;
  testAudios.usNormalBase64 = usNormal.wavBase64;
  steps.push({
    step: 2,
    title: 'Testing American Voice (Normal)',
    status: 'ok',
    message: `✓ American voice "${americanVoice}" working at normal speed (${usNormal.validation?.durationSeconds}s WAV)`,
    details: usNormal.validation,
  });

  // Step 3: Test American Voice (Slow Speed)
  const usSlow = await synthesizePiperAudio(testPhrase, americanVoice, slowSpeed, endpoint);
  if (!usSlow.success || !usSlow.wavBase64) {
    steps.push({
      step: 3,
      title: 'Testing American Voice (Slow)',
      status: 'error',
      message: `American slow generation failed: ${usSlow.error || 'Unknown error'}`,
    });
    return {
      engine: 'piper',
      ready: false,
      endpoint,
      steps,
      checklist,
      error: `American slow voice failed: ${usSlow.error}`,
    };
  }

  checklist.slowSpeedWorking = true;
  testAudios.usSlowBase64 = usSlow.wavBase64;
  steps.push({
    step: 3,
    title: 'Testing American Voice (Slow)',
    status: 'ok',
    message: `✓ American slow voice working (length_scale=${slowSpeed}, ${usSlow.validation?.durationSeconds}s WAV)`,
    details: usSlow.validation,
  });

  // Step 4: Test British Voice (Normal Speed)
  const ukNormal = await synthesizePiperAudio(testPhrase, britishVoice, normalSpeed, endpoint);
  if (!ukNormal.success || !ukNormal.wavBase64) {
    steps.push({
      step: 4,
      title: 'Testing British Voice (Normal)',
      status: 'error',
      message: `British voice failed: ${ukNormal.error || 'Unknown error'}`,
    });
    return {
      engine: 'piper',
      ready: false,
      endpoint,
      steps,
      checklist,
      error: `British voice (${britishVoice}) failed: ${ukNormal.error}`,
    };
  }

  checklist.britishVoiceWorking = true;
  testAudios.ukNormalBase64 = ukNormal.wavBase64;
  steps.push({
    step: 4,
    title: 'Testing British Voice (Normal)',
    status: 'ok',
    message: `✓ British voice "${britishVoice}" working at normal speed (${ukNormal.validation?.durationSeconds}s WAV)`,
    details: ukNormal.validation,
  });

  // Step 5: Test British Voice (Slow Speed)
  const ukSlow = await synthesizePiperAudio(testPhrase, britishVoice, slowSpeed, endpoint);
  if (!ukSlow.success || !ukSlow.wavBase64) {
    steps.push({
      step: 5,
      title: 'Testing British Voice (Slow)',
      status: 'error',
      message: `British slow generation failed: ${ukSlow.error || 'Unknown error'}`,
    });
    return {
      engine: 'piper',
      ready: false,
      endpoint,
      steps,
      checklist,
      error: `British slow voice failed: ${ukSlow.error}`,
    };
  }

  testAudios.ukSlowBase64 = ukSlow.wavBase64;
  steps.push({
    step: 5,
    title: 'Testing British Voice (Slow)',
    status: 'ok',
    message: `✓ British slow voice working (length_scale=${slowSpeed}, ${ukSlow.validation?.durationSeconds}s WAV)`,
    details: ukSlow.validation,
  });

  return {
    engine: 'piper',
    ready: true,
    endpoint,
    steps,
    testAudios,
    testUsAudioBase64: testAudios.usNormalBase64,
    testUkAudioBase64: testAudios.ukNormalBase64,
    testSlowAudioBase64: testAudios.usSlowBase64,
    checklist,
  };
}

export interface PiperServiceStatus {
  active: boolean;
  status: string; // 'active' | 'inactive' | 'failed' | 'not-found'
  detail?: string;
  error?: string;
}

/**
 * Checks systemd user service state for piper.service and checks HTTP health.
 * Executes: systemctl --user is-active piper.service
 */
export async function getPiperServiceStatus(): Promise<PiperServiceStatus> {
  const health = await checkPiperHealth();

  let systemdStatus = 'unknown';
  let systemdActive = false;
  let systemdError = '';

  try {
    const { stdout } = await execPromise('systemctl --user is-active piper.service');
    systemdStatus = (stdout || '').trim();
    systemdActive = systemdStatus === 'active';
  } catch (err: any) {
    systemdStatus = (err.stdout || err.stderr || '').trim() || 'inactive';
    systemdActive = systemdStatus === 'active';
    systemdError = (err.stderr || err.stdout || err.message || '').trim();
  }

  const isActive = systemdActive || health.connected;
  const statusStr = systemdActive
    ? 'active'
    : (health.connected ? 'active' : (systemdStatus !== 'unknown' ? systemdStatus : 'inactive'));

  return {
    active: isActive,
    status: statusStr,
    detail: systemdActive
      ? 'systemd: active (running)'
      : (health.connected ? 'HTTP Server: Online (port 5000)' : `systemd: ${systemdStatus}`),
    error: isActive ? undefined : (systemdError || 'Piper service is not running'),
  };
}

export interface PiperServiceControlResult {
  success: boolean;
  active: boolean;
  status: string;
  command: string;
  message: string;
  error?: string;
}

/**
 * Starts or stops the Linux systemd user service for Piper
 * Executes: systemctl --user start piper.service | systemctl --user stop piper.service
 */
export async function controlPiperService(action: 'start' | 'stop' | 'restart'): Promise<PiperServiceControlResult> {
  const cmd = `systemctl --user ${action} piper.service`;
  try {
    const { stderr } = await execPromise(cmd);
    // Allow process a moment to initialize or stop
    await new Promise((resolve) => setTimeout(resolve, 600));
    const currentStatus = await getPiperServiceStatus();

    const isExpected = action === 'start' ? currentStatus.active : (action === 'stop' ? !currentStatus.active : currentStatus.active);

    return {
      success: isExpected || (action === 'start' && currentStatus.active),
      active: currentStatus.active,
      status: currentStatus.status,
      command: cmd,
      message: isExpected
        ? `Successfully executed: ${cmd} (Service is ${currentStatus.status})`
        : `Executed: ${cmd}. Current status: ${currentStatus.status}`,
      error: (stderr || '').trim() || undefined,
    };
  } catch (err: any) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const currentStatus = await getPiperServiceStatus();
    const errMsg = (err.stderr || err.stdout || err.message || '').trim() || `Failed to execute: ${cmd}`;
    return {
      success: false,
      active: currentStatus.active,
      status: currentStatus.status,
      command: cmd,
      message: `Failed to execute: ${cmd}`,
      error: errMsg,
    };
  }
}
