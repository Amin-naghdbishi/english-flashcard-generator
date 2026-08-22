export interface OnlineAudioResult {
  success: boolean;
  audioBuffer?: Buffer;
  audioBase64?: string;
  fileName?: string;
  label?: string;
  voice?: string;
  speed?: number;
  durationSeconds?: number;
  format?: 'mp3';
  error?: string;
}

export interface GeneratedOnlineCardAudios {
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
    durationSeconds?: number;
  }>;
  wordAudioField: string;
  exampleAudioField: string;
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
}

export interface OnlineTTSDiagnosticStep {
  step: number;
  title: string;
  status: 'ok' | 'error' | 'pending' | 'warning';
  message: string;
  details?: any;
}

export interface OnlineTTSDiagnosticResult {
  engine: 'online';
  ready: boolean;
  endpoint: string;
  steps: OnlineTTSDiagnosticStep[];
  testAudios?: {
    usNormalBase64?: string;
    usSlowBase64?: string;
    ukNormalBase64?: string;
    ukSlowBase64?: string;
  };
  testUsAudioBase64?: string;
  testUkAudioBase64?: string;
  testSlowAudioBase64?: string;
  checklist: {
    onlineConnected: boolean;
    americanVoiceWorking: boolean;
    britishVoiceWorking: boolean;
    normalSpeedWorking: boolean;
    slowSpeedWorking: boolean;
  };
  error?: string;
}

/**
 * Estimates MP3 duration in seconds from byte length (~32-48kbps stream).
 */
function estimateMp3Duration(bufferLength: number): number {
  // Approximate standard 32kbps MP3 (4000 bytes/sec)
  const est = bufferLength / 4000;
  return Math.max(0.4, Math.round(est * 10) / 10);
}

/**
 * Synthesize a single audio segment via high quality online English TTS.
 * Supports American English ('en-US') and British English ('en-GB').
 * Supports normal speed and slow speed (ttsspeed parameter).
 */
export async function synthesizeOnlineAudio(
  text: string,
  lang: 'en-US' | 'en-GB' = 'en-US',
  isSlow: boolean = false
): Promise<OnlineAudioResult> {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Cannot synthesize empty text',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const speedParam = isSlow ? '&ttsspeed=0.25' : '';
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(
      trimmed
    )}${speedParam}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'audio/mpeg, audio/*, */*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Online TTS HTTP error ${response.status}: ${response.statusText}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    if (audioBuffer.length === 0) {
      return {
        success: false,
        error: 'Received empty audio from Online TTS',
      };
    }

    return {
      success: true,
      audioBuffer,
      audioBase64: audioBuffer.toString('base64'),
      voice: lang === 'en-US' ? 'American English' : 'British English',
      speed: isSlow ? 0.75 : 1.0,
      durationSeconds: estimateMp3Duration(audioBuffer.length),
      format: 'mp3',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Online TTS error: ${err?.message || 'Network request failed'}`,
    };
  }
}

/**
 * Health check for Online TTS service
 */
export async function checkOnlineTtsHealth(): Promise<{ connected: boolean; error?: string }> {
  try {
    const res = await synthesizeOnlineAudio('test', 'en-US', false);
    if (res.success && res.audioBuffer && res.audioBuffer.length > 0) {
      return { connected: true };
    }
    return { connected: false, error: res.error || 'Empty response from Online TTS' };
  } catch (err: any) {
    return { connected: false, error: err?.message || 'Online TTS unreachable' };
  }
}

/**
 * Generates all audio files for a flashcard using high-quality Online TTS:
 * 1. American normal pronunciation -> [word]_us_normal.mp3
 * 2. American slow pronunciation -> [word]_us_slow.mp3
 * 3. British normal pronunciation -> [word]_uk_normal.mp3
 * 4. British slow pronunciation -> [word]_uk_slow.mp3
 * 5. Example sentence American normal -> [word]_example_us_normal.mp3
 * 6. Example sentence British normal -> [word]_example_uk_normal.mp3
 */
export async function generateAllOnlineCardAudios(params: {
  word: string;
  example: string;
  generateSlow?: boolean;
  generateBritish?: boolean;
  generateAmerican?: boolean;
}): Promise<GeneratedOnlineCardAudios> {
  const {
    word,
    example,
    generateSlow = true,
    generateBritish = true,
    generateAmerican = true,
  } = params;

  const safeWord = word.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const resultFiles: GeneratedOnlineCardAudios['files'] = [];

  const wordSoundTags: string[] = [];
  const exampleSoundTags: string[] = [];

  const returnData: GeneratedOnlineCardAudios = {
    success: true,
    files: [],
    wordAudioField: '',
    exampleAudioField: '',
  };

  // --- AMERICAN PRONUNCIATIONS ---
  if (generateAmerican) {
    // 1. American Normal Word
    const usNormalFile = `${safeWord}_us_normal.mp3`;
    const usNormalRes = await synthesizeOnlineAudio(word, 'en-US', false);
    if (!usNormalRes.success || !usNormalRes.audioBuffer || !usNormalRes.audioBase64) {
      return {
        success: false,
        error: `Failed to generate American normal audio: ${usNormalRes.error}`,
        files: [],
        wordAudioField: '',
        exampleAudioField: '',
      };
    }
    resultFiles.push({
      fileName: usNormalFile,
      fieldSoundTag: `[sound:${usNormalFile}]`,
      base64: usNormalRes.audioBase64,
      buffer: usNormalRes.audioBuffer,
      label: '🇺🇸 American Normal (1.0x)',
      voice: 'en-US',
      speed: 1.0,
      durationSeconds: usNormalRes.durationSeconds,
    });
    wordSoundTags.push(`[sound:${usNormalFile}]`);
    returnData.wordAudioUsNormalBase64 = usNormalRes.audioBase64;
    returnData.wordAudioUsNormalFileName = usNormalFile;

    // 2. American Slow Word
    if (generateSlow) {
      const usSlowFile = `${safeWord}_us_slow.mp3`;
      const usSlowRes = await synthesizeOnlineAudio(word, 'en-US', true);
      if (!usSlowRes.success || !usSlowRes.audioBuffer || !usSlowRes.audioBase64) {
        return {
          success: false,
          error: `Failed to generate American slow audio: ${usSlowRes.error}`,
          files: [],
          wordAudioField: '',
          exampleAudioField: '',
        };
      }
      resultFiles.push({
        fileName: usSlowFile,
        fieldSoundTag: `[sound:${usSlowFile}]`,
        base64: usSlowRes.audioBase64,
        buffer: usSlowRes.audioBuffer,
        label: '🇺🇸 American Slow (0.75x)',
        voice: 'en-US',
        speed: 0.75,
        durationSeconds: usSlowRes.durationSeconds,
      });
      wordSoundTags.push(`[sound:${usSlowFile}]`);
      returnData.wordAudioUsSlowBase64 = usSlowRes.audioBase64;
      returnData.wordAudioUsSlowFileName = usSlowFile;
    }

    // 3. American Example Normal
    if (example && example.trim()) {
      const exampleUsFile = `${safeWord}_example_us_normal.mp3`;
      const exampleUsRes = await synthesizeOnlineAudio(example, 'en-US', false);
      if (!exampleUsRes.success || !exampleUsRes.audioBuffer || !exampleUsRes.audioBase64) {
        return {
          success: false,
          error: `Failed to generate American example audio: ${exampleUsRes.error}`,
          files: [],
          wordAudioField: '',
          exampleAudioField: '',
        };
      }
      resultFiles.push({
        fileName: exampleUsFile,
        fieldSoundTag: `[sound:${exampleUsFile}]`,
        base64: exampleUsRes.audioBase64,
        buffer: exampleUsRes.audioBuffer,
        label: '🇺🇸 Example American Normal',
        voice: 'en-US',
        speed: 1.0,
        durationSeconds: exampleUsRes.durationSeconds,
      });
      exampleSoundTags.push(`[sound:${exampleUsFile}]`);
      returnData.exampleAudioUsNormalBase64 = exampleUsRes.audioBase64;
      returnData.exampleAudioUsNormalFileName = exampleUsFile;
    }
  }

  // --- BRITISH PRONUNCIATIONS ---
  if (generateBritish) {
    // 4. British Normal Word
    const ukNormalFile = `${safeWord}_uk_normal.mp3`;
    const ukNormalRes = await synthesizeOnlineAudio(word, 'en-GB', false);
    if (!ukNormalRes.success || !ukNormalRes.audioBuffer || !ukNormalRes.audioBase64) {
      return {
        success: false,
        error: `Failed to generate British normal audio: ${ukNormalRes.error}`,
        files: [],
        wordAudioField: '',
        exampleAudioField: '',
      };
    }
    resultFiles.push({
      fileName: ukNormalFile,
      fieldSoundTag: `[sound:${ukNormalFile}]`,
      base64: ukNormalRes.audioBase64,
      buffer: ukNormalRes.audioBuffer,
      label: '🇬🇧 British Normal (1.0x)',
      voice: 'en-GB',
      speed: 1.0,
      durationSeconds: ukNormalRes.durationSeconds,
    });
    wordSoundTags.push(`[sound:${ukNormalFile}]`);
    returnData.wordAudioUkNormalBase64 = ukNormalRes.audioBase64;
    returnData.wordAudioUkNormalFileName = ukNormalFile;

    // 5. British Slow Word
    if (generateSlow) {
      const ukSlowFile = `${safeWord}_uk_slow.mp3`;
      const ukSlowRes = await synthesizeOnlineAudio(word, 'en-GB', true);
      if (!ukSlowRes.success || !ukSlowRes.audioBuffer || !ukSlowRes.audioBase64) {
        return {
          success: false,
          error: `Failed to generate British slow audio: ${ukSlowRes.error}`,
          files: [],
          wordAudioField: '',
          exampleAudioField: '',
        };
      }
      resultFiles.push({
        fileName: ukSlowFile,
        fieldSoundTag: `[sound:${ukSlowFile}]`,
        base64: ukSlowRes.audioBase64,
        buffer: ukSlowRes.audioBuffer,
        label: '🇬🇧 British Slow (0.75x)',
        voice: 'en-GB',
        speed: 0.75,
        durationSeconds: ukSlowRes.durationSeconds,
      });
      wordSoundTags.push(`[sound:${ukSlowFile}]`);
      returnData.wordAudioUkSlowBase64 = ukSlowRes.audioBase64;
      returnData.wordAudioUkSlowFileName = ukSlowFile;
    }

    // 6. British Example Normal
    if (example && example.trim()) {
      const exampleUkFile = `${safeWord}_example_uk_normal.mp3`;
      const exampleUkRes = await synthesizeOnlineAudio(example, 'en-GB', false);
      if (!exampleUkRes.success || !exampleUkRes.audioBuffer || !exampleUkRes.audioBase64) {
        return {
          success: false,
          error: `Failed to generate British example audio: ${exampleUkRes.error}`,
          files: [],
          wordAudioField: '',
          exampleAudioField: '',
        };
      }
      resultFiles.push({
        fileName: exampleUkFile,
        fieldSoundTag: `[sound:${exampleUkFile}]`,
        base64: exampleUkRes.audioBase64,
        buffer: exampleUkRes.audioBuffer,
        label: '🇬🇧 Example British Normal',
        voice: 'en-GB',
        speed: 1.0,
        durationSeconds: exampleUkRes.durationSeconds,
      });
      exampleSoundTags.push(`[sound:${exampleUkFile}]`);
      returnData.exampleAudioUkNormalBase64 = exampleUkRes.audioBase64;
      returnData.exampleAudioUkNormalFileName = exampleUkFile;
    }
  }

  returnData.files = resultFiles;
  returnData.wordAudioField = wordSoundTags.join(' ');
  returnData.exampleAudioField = exampleSoundTags.join(' ');
  return returnData;
}

/**
 * Diagnostic test for Online TTS in Settings
 */
export async function runOnlineTtsDiagnostics(): Promise<OnlineTTSDiagnosticResult> {
  const testPhrase = 'Hello Amin, this is Stitch.';
  const steps: OnlineTTSDiagnosticStep[] = [];

  const checklist = {
    onlineConnected: false,
    americanVoiceWorking: false,
    britishVoiceWorking: false,
    normalSpeedWorking: false,
    slowSpeedWorking: false,
  };

  const testAudios: {
    usNormalBase64?: string;
    usSlowBase64?: string;
    ukNormalBase64?: string;
    ukSlowBase64?: string;
  } = {};

  // Step 1: Health check
  const health = await checkOnlineTtsHealth();
  if (!health.connected) {
    steps.push({
      step: 1,
      title: 'Connecting to Online TTS Service',
      status: 'error',
      message: `Online TTS is unreachable: ${health.error}`,
    });
    return {
      engine: 'online',
      ready: false,
      endpoint: 'Online High-Quality English TTS',
      steps,
      checklist,
      error: health.error,
    };
  }

  checklist.onlineConnected = true;
  steps.push({
    step: 1,
    title: 'Connecting to Online TTS Service',
    status: 'ok',
    message: 'Online English TTS service is active and responsive',
  });

  // Step 2: American Normal
  const usNormal = await synthesizeOnlineAudio(testPhrase, 'en-US', false);
  if (!usNormal.success || !usNormal.audioBase64) {
    steps.push({
      step: 2,
      title: 'Testing American Voice (Normal)',
      status: 'error',
      message: `American voice failed: ${usNormal.error}`,
    });
    return {
      engine: 'online',
      ready: false,
      endpoint: 'Online High-Quality English TTS',
      steps,
      checklist,
      error: usNormal.error,
    };
  }
  checklist.americanVoiceWorking = true;
  checklist.normalSpeedWorking = true;
  testAudios.usNormalBase64 = usNormal.audioBase64;
  steps.push({
    step: 2,
    title: 'Testing American Voice (Normal)',
    status: 'ok',
    message: `✓ American English (en-US) working at normal speed (${usNormal.durationSeconds}s MP3)`,
  });

  // Step 3: American Slow
  const usSlow = await synthesizeOnlineAudio(testPhrase, 'en-US', true);
  if (!usSlow.success || !usSlow.audioBase64) {
    steps.push({
      step: 3,
      title: 'Testing American Voice (Slow)',
      status: 'error',
      message: `American slow voice failed: ${usSlow.error}`,
    });
    return {
      engine: 'online',
      ready: false,
      endpoint: 'Online High-Quality English TTS',
      steps,
      checklist,
      error: usSlow.error,
    };
  }
  checklist.slowSpeedWorking = true;
  testAudios.usSlowBase64 = usSlow.audioBase64;
  steps.push({
    step: 3,
    title: 'Testing American Voice (Slow)',
    status: 'ok',
    message: `✓ American English (en-US) slow pronunciation working (${usSlow.durationSeconds}s MP3)`,
  });

  // Step 4: British Normal
  const ukNormal = await synthesizeOnlineAudio(testPhrase, 'en-GB', false);
  if (!ukNormal.success || !ukNormal.audioBase64) {
    steps.push({
      step: 4,
      title: 'Testing British Voice (Normal)',
      status: 'error',
      message: `British voice failed: ${ukNormal.error}`,
    });
    return {
      engine: 'online',
      ready: false,
      endpoint: 'Online High-Quality English TTS',
      steps,
      checklist,
      error: ukNormal.error,
    };
  }
  checklist.britishVoiceWorking = true;
  testAudios.ukNormalBase64 = ukNormal.audioBase64;
  steps.push({
    step: 4,
    title: 'Testing British Voice (Normal)',
    status: 'ok',
    message: `✓ British English (en-GB) working at normal speed (${ukNormal.durationSeconds}s MP3)`,
  });

  // Step 5: British Slow
  const ukSlow = await synthesizeOnlineAudio(testPhrase, 'en-GB', true);
  if (!ukSlow.success || !ukSlow.audioBase64) {
    steps.push({
      step: 5,
      title: 'Testing British Voice (Slow)',
      status: 'error',
      message: `British slow voice failed: ${ukSlow.error}`,
    });
    return {
      engine: 'online',
      ready: false,
      endpoint: 'Online High-Quality English TTS',
      steps,
      checklist,
      error: ukSlow.error,
    };
  }
  testAudios.ukSlowBase64 = ukSlow.audioBase64;
  steps.push({
    step: 5,
    title: 'Testing British Voice (Slow)',
    status: 'ok',
    message: `✓ British English (en-GB) slow pronunciation working (${ukSlow.durationSeconds}s MP3)`,
  });

  return {
    engine: 'online',
    ready: true,
    endpoint: 'Online High-Quality English TTS',
    steps,
    testAudios,
    testUsAudioBase64: testAudios.usNormalBase64,
    testUkAudioBase64: testAudios.ukNormalBase64,
    testSlowAudioBase64: testAudios.usSlowBase64,
    checklist,
  };
}
