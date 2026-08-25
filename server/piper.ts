import { exec } from 'child_process';
import { promisify } from 'util';
import { validateWavBuffer, WavValidationResult } from './wavHelper';

const execPromise = promisify(exec);

export interface PiperVoice {
  id: string;
  name: string;
  accent: 'american' | 'british';
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
 * Synthesizes audio using the real Piper TTS local HTTP server.
 * Never uses fake/browser audio.
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
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const payload = {
      text: trimmed,
      voice: voice,
      length_scale: Number(lengthScale) || 1.0,
    };

    let response: Response;
    try {
      response = await fetch(synthesizeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/x-wav, audio/wav, audio/*, application/octet-stream',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (networkErr: any) {
      clearTimeout(timeoutId);
      const isAbort = networkErr.name === 'AbortError';
      const msg = isAbort
        ? `Request timed out connecting to Piper TTS at ${cleanEndpoint}`
        : `Piper TTS is not running. Failed to connect to ${cleanEndpoint} (${networkErr.message || 'Connection refused'})`;
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
        error: `Piper HTTP error ${response.status}: ${errBody || response.statusText || 'Failed to synthesize audio'}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const wavBuffer = Buffer.from(arrayBuffer);

    // Verify WAV integrity
    const validation = validateWavBuffer(wavBuffer);
    if (!validation.isValid || wavBuffer.length === 0) {
      return {
        success: false,
        error: `Piper output is not a valid WAV file: ${validation.error || 'Empty audio buffer'}`,
      };
    }

    return {
      success: true,
      wavBuffer,
      wavBase64: wavBuffer.toString('base64'),
      voice,
      speed: lengthScale,
      validation,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Piper TTS exception: ${err?.message || 'Unknown error'}`,
    };
  }
}

/**
 * Check if Piper TTS server is alive and reachable.
 */
export async function checkPiperHealth(endpoint: string = 'http://127.0.0.1:5000'): Promise<{
  connected: boolean;
  endpoint: string;
  error?: string;
}> {
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Try a lightweight request to check server
    const res = await fetch(cleanEndpoint, {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && (res.ok || res.status === 404 || res.status === 405 || res.status === 200)) {
      return { connected: true, endpoint: cleanEndpoint };
    }

    // Try OPTIONS or HEAD on /synthesize
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
    const synthCheck = await fetch(`${cleanEndpoint}/synthesize`, {
      method: 'OPTIONS',
      signal: controller2.signal,
    }).catch(() => null);
    clearTimeout(timeoutId2);

    if (synthCheck && (synthCheck.ok || synthCheck.status === 405 || synthCheck.status === 200)) {
      return { connected: true, endpoint: cleanEndpoint };
    }

    return {
      connected: false,
      endpoint: cleanEndpoint,
      error: `Piper TTS is not running at ${cleanEndpoint}`,
    };
  } catch (err: any) {
    return {
      connected: false,
      endpoint: cleanEndpoint,
      error: `Piper TTS is not running. (${err?.message || 'Connection refused'})`,
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
 * Generates audio files for a flashcard using Piper TTS strictly based on enabled variants:
 * 1. American normal pronunciation (length_scale = 1.0) -> [word]_us_normal.wav
 * 2. American slow pronunciation (length_scale = slowSpeed) -> [word]_us_slow.wav
 * 3. British normal pronunciation (length_scale = 1.0) -> [word]_uk_normal.wav
 * 4. British slow pronunciation (length_scale = slowSpeed) -> [word]_uk_slow.wav
 * 5. Example sentence American normal (length_scale = 1.0) -> [word]_example_us_normal.wav
 * 6. Example sentence American slow (length_scale = slowSpeed) -> [word]_example_us_slow.wav
 * 7. Example sentence British normal (length_scale = 1.0) -> [word]_example_uk_normal.wav
 * 8. Example sentence British slow (length_scale = slowSpeed) -> [word]_example_uk_slow.wav
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

  const safeWord = word.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const resultFiles: GeneratedPiperCardAudios['files'] = [];

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
      error: `Piper TTS is not running at ${endpoint}. Please start Piper HTTP server before creating cards.`,
      files: [],
      wordAudioField: '',
      exampleAudioField: '',
    };
  }

  // --- AMERICAN PRONUNCIATIONS ---
  if (generateAmericanNormal) {
    const usNormalFile = `${safeWord}_us_normal.wav`;
    const usNormalRes = await synthesizePiperAudio(word, americanVoice, normalSpeed, endpoint);
    if (usNormalRes.success && usNormalRes.wavBuffer && usNormalRes.wavBase64) {
      resultFiles.push({
        fileName: usNormalFile,
        fieldSoundTag: `[sound:${usNormalFile}]`,
        base64: usNormalRes.wavBase64,
        buffer: usNormalRes.wavBuffer,
        label: '🇺🇸 American Normal',
        voice: americanVoice,
        speed: normalSpeed,
        validation: usNormalRes.validation!,
      });
      wordSoundTags.push(`[sound:${usNormalFile}]`);
      returnData.wordAudioUsNormalBase64 = usNormalRes.wavBase64;
      returnData.wordAudioUsNormalFileName = usNormalFile;
    }
  }

  if (generateAmericanSlow) {
    const usSlowFile = `${safeWord}_us_slow.wav`;
    const usSlowRes = await synthesizePiperAudio(word, americanVoice, slowSpeed, endpoint);
    if (usSlowRes.success && usSlowRes.wavBuffer && usSlowRes.wavBase64) {
      resultFiles.push({
        fileName: usSlowFile,
        fieldSoundTag: `[sound:${usSlowFile}]`,
        base64: usSlowRes.wavBase64,
        buffer: usSlowRes.wavBuffer,
        label: '🇺🇸 American Slow',
        voice: americanVoice,
        speed: slowSpeed,
        validation: usSlowRes.validation!,
      });
      wordSoundTags.push(`[sound:${usSlowFile}]`);
      returnData.wordAudioUsSlowBase64 = usSlowRes.wavBase64;
      returnData.wordAudioUsSlowFileName = usSlowFile;
    }
  }

  if (generateExampleUsNormal && example && example.trim()) {
    const exampleUsFile = `${safeWord}_example_us_normal.wav`;
    const exampleUsRes = await synthesizePiperAudio(example, americanVoice, normalSpeed, endpoint);
    if (exampleUsRes.success && exampleUsRes.wavBuffer && exampleUsRes.wavBase64) {
      resultFiles.push({
        fileName: exampleUsFile,
        fieldSoundTag: `[sound:${exampleUsFile}]`,
        base64: exampleUsRes.wavBase64,
        buffer: exampleUsRes.wavBuffer,
        label: '🇺🇸 Example American Normal',
        voice: americanVoice,
        speed: normalSpeed,
        validation: exampleUsRes.validation!,
      });
      exampleSoundTags.push(`[sound:${exampleUsFile}]`);
      returnData.exampleAudioUsNormalBase64 = exampleUsRes.wavBase64;
      returnData.exampleAudioUsNormalFileName = exampleUsFile;
    }
  }

  if (generateExampleUsSlow && example && example.trim()) {
    const exampleUsSlowFile = `${safeWord}_example_us_slow.wav`;
    const exampleUsSlowRes = await synthesizePiperAudio(example, americanVoice, slowSpeed, endpoint);
    if (exampleUsSlowRes.success && exampleUsSlowRes.wavBuffer && exampleUsSlowRes.wavBase64) {
      resultFiles.push({
        fileName: exampleUsSlowFile,
        fieldSoundTag: `[sound:${exampleUsSlowFile}]`,
        base64: exampleUsSlowRes.wavBase64,
        buffer: exampleUsSlowRes.wavBuffer,
        label: '🇺🇸 Example American Slow',
        voice: americanVoice,
        speed: slowSpeed,
        validation: exampleUsSlowRes.validation!,
      });
      exampleSoundTags.push(`[sound:${exampleUsSlowFile}]`);
      returnData.exampleAudioUsSlowBase64 = exampleUsSlowRes.wavBase64;
      returnData.exampleAudioUsSlowFileName = exampleUsSlowFile;
    }
  }

  // --- BRITISH PRONUNCIATIONS ---
  if (generateBritishNormal) {
    const ukNormalFile = `${safeWord}_uk_normal.wav`;
    const ukNormalRes = await synthesizePiperAudio(word, britishVoice, normalSpeed, endpoint);
    if (ukNormalRes.success && ukNormalRes.wavBuffer && ukNormalRes.wavBase64) {
      resultFiles.push({
        fileName: ukNormalFile,
        fieldSoundTag: `[sound:${ukNormalFile}]`,
        base64: ukNormalRes.wavBase64,
        buffer: ukNormalRes.wavBuffer,
        label: '🇬🇧 British Normal',
        voice: britishVoice,
        speed: normalSpeed,
        validation: ukNormalRes.validation!,
      });
      wordSoundTags.push(`[sound:${ukNormalFile}]`);
      returnData.wordAudioUkNormalBase64 = ukNormalRes.wavBase64;
      returnData.wordAudioUkNormalFileName = ukNormalFile;
    }
  }

  if (generateBritishSlow) {
    const ukSlowFile = `${safeWord}_uk_slow.wav`;
    const ukSlowRes = await synthesizePiperAudio(word, britishVoice, slowSpeed, endpoint);
    if (ukSlowRes.success && ukSlowRes.wavBuffer && ukSlowRes.wavBase64) {
      resultFiles.push({
        fileName: ukSlowFile,
        fieldSoundTag: `[sound:${ukSlowFile}]`,
        base64: ukSlowRes.wavBase64,
        buffer: ukSlowRes.wavBuffer,
        label: '🇬🇧 British Slow',
        voice: britishVoice,
        speed: slowSpeed,
        validation: ukSlowRes.validation!,
      });
      wordSoundTags.push(`[sound:${ukSlowFile}]`);
      returnData.wordAudioUkSlowBase64 = ukSlowRes.wavBase64;
      returnData.wordAudioUkSlowFileName = ukSlowFile;
    }
  }

  if (generateExampleUkNormal && example && example.trim()) {
    const exampleUkFile = `${safeWord}_example_uk_normal.wav`;
    const exampleUkRes = await synthesizePiperAudio(example, britishVoice, normalSpeed, endpoint);
    if (exampleUkRes.success && exampleUkRes.wavBuffer && exampleUkRes.wavBase64) {
      resultFiles.push({
        fileName: exampleUkFile,
        fieldSoundTag: `[sound:${exampleUkFile}]`,
        base64: exampleUkRes.wavBase64,
        buffer: exampleUkRes.wavBuffer,
        label: '🇬🇧 Example British Normal',
        voice: britishVoice,
        speed: normalSpeed,
        validation: exampleUkRes.validation!,
      });
      exampleSoundTags.push(`[sound:${exampleUkFile}]`);
      returnData.exampleAudioUkNormalBase64 = exampleUkRes.wavBase64;
      returnData.exampleAudioUkNormalFileName = exampleUkFile;
    }
  }

  if (generateExampleUkSlow && example && example.trim()) {
    const exampleUkSlowFile = `${safeWord}_example_uk_slow.wav`;
    const exampleUkSlowRes = await synthesizePiperAudio(example, britishVoice, slowSpeed, endpoint);
    if (exampleUkSlowRes.success && exampleUkSlowRes.wavBuffer && exampleUkSlowRes.wavBase64) {
      resultFiles.push({
        fileName: exampleUkSlowFile,
        fieldSoundTag: `[sound:${exampleUkSlowFile}]`,
        base64: exampleUkSlowRes.wavBase64,
        buffer: exampleUkSlowRes.wavBuffer,
        label: '🇬🇧 Example British Slow',
        voice: britishVoice,
        speed: slowSpeed,
        validation: exampleUkSlowRes.validation!,
      });
      exampleSoundTags.push(`[sound:${exampleUkSlowFile}]`);
      returnData.exampleAudioUkSlowBase64 = exampleUkSlowRes.wavBase64;
      returnData.exampleAudioUkSlowFileName = exampleUkSlowFile;
    }
  }

  returnData.files = resultFiles;
  returnData.wordAudioField = wordSoundTags.join(' ');
  returnData.exampleAudioField = exampleSoundTags.join(' ');
  return returnData;
}

/**
 * Diagnostic test for [Test Piper] button:
 * 1. Send "Hello Amin, this is Stitch." to American voice (en_US-lessac-high)
 * 2. Send the same text to British voice (en_GB-cori-high)
 * 3. Generate both normal (1.0) and slow (1.25) versions
 * 4. Verify all 4 WAV files
 * 5. Return status checklist
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
      message: `Piper TTS is not running at ${endpoint}`,
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

  // Step 2: Test American Voice (Normal Speed 1.0)
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

  // Step 3: Test American Voice (Slow Speed 1.25)
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

  // Step 4: Test British Voice (Normal Speed 1.0)
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

  // Step 5: Test British Voice (Slow Speed 1.25)
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
  status: string; // 'active' | 'inactive' | 'failed' | 'activating' | 'deactivating' | 'not-found' | string
  detail?: string;
  error?: string;
}

/**
 * Checks actual systemd user service state for piper.service
 * Executes: systemctl --user is-active piper.service
 */
export async function getPiperServiceStatus(): Promise<PiperServiceStatus> {
  try {
    const { stdout } = await execPromise('systemctl --user is-active piper.service');
    const statusText = (stdout || '').trim();
    return {
      active: statusText === 'active',
      status: statusText || 'inactive',
      detail: `systemctl status: ${statusText}`,
    };
  } catch (err: any) {
    // systemctl is-active returns non-zero exit status if inactive/failed/not-found
    const statusText = (err.stdout || err.stderr || '').trim() || 'inactive';
    const isActive = statusText === 'active';
    const errorDetail = (err.stderr || err.stdout || err.message || '').trim();
    return {
      active: isActive,
      status: statusText,
      error: errorDetail || 'Service is not active',
      detail: `systemctl status: ${statusText}`,
    };
  }
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
 * Starts or stops the actual Linux systemd user service for Piper
 * Executes: systemctl --user start piper.service | systemctl --user stop piper.service
 */
export async function controlPiperService(action: 'start' | 'stop' | 'restart'): Promise<PiperServiceControlResult> {
  const cmd = `systemctl --user ${action} piper.service`;
  try {
    const { stderr } = await execPromise(cmd);
    // Brief sleep to allow systemd to update process table if needed
    await new Promise((resolve) => setTimeout(resolve, 350));
    const currentStatus = await getPiperServiceStatus();

    const isExpected = action === 'start' ? currentStatus.active : (action === 'stop' ? !currentStatus.active : currentStatus.active);

    return {
      success: isExpected,
      active: currentStatus.active,
      status: currentStatus.status,
      command: cmd,
      message: isExpected
        ? `Successfully executed: ${cmd} (Service is ${currentStatus.status})`
        : `Executed: ${cmd}, but service is now ${currentStatus.status}`,
      error: (stderr || '').trim() || undefined,
    };
  } catch (err: any) {
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

