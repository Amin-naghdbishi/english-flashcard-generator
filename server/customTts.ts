import { CustomTTSProviderConfig } from '../src/types';

export const GENERIC_TTS_TEST_SENTENCE = 'The quick brown fox jumps over the lazy dog.';

export interface CustomTTSResult {
  success: boolean;
  audioBuffer?: Buffer;
  audioBase64?: string;
  fileName?: string;
  format?: 'mp3' | 'wav' | 'opus' | 'aac';
  label?: string;
  speed?: number;
  durationSeconds?: number;
  error?: string;
}

/**
 * Builds request headers based on authentication type and custom headers.
 */
function buildTTSHeaders(config: CustomTTSProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.authType === 'bearer' && config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
  } else if (config.authType === 'api-key-header' && config.apiKey) {
    const headerName = config.authHeaderName || (config.protocol === 'elevenlabs' ? 'xi-api-key' : 'x-api-key');
    headers[headerName] = config.apiKey.trim();
  }

  if (config.customHeaders && typeof config.customHeaders === 'object') {
    for (const [k, v] of Object.entries(config.customHeaders)) {
      if (k && v) headers[k] = v;
    }
  }

  return headers;
}

/**
 * Synthesizes audio using any custom or standard TTS provider.
 */
export async function synthesizeCustomTTS(
  config: CustomTTSProviderConfig,
  text: string,
  isSlow: boolean = false,
  slowSpeed: number = 1.25
): Promise<CustomTTSResult> {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { success: false, error: 'Cannot synthesize empty text' };
  }

  const endpoint = config.endpoint.trim();
  if (!endpoint) {
    return { success: false, error: 'TTS Endpoint is not configured' };
  }

  const headers = buildTTSHeaders(config);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // 1. OPENAI AUDIO / SPEECH PROTOCOL
    if (config.protocol === 'openai-speech' || endpoint.includes('/audio/speech')) {
      // For OpenAI, speed is a multiplier (0.25 - 4.0). Slow speech means < 1.0 (e.g. 1 / 1.25 = 0.8x)
      const calculatedSpeed = isSlow ? Math.max(0.25, Math.min(4.0, +(1 / slowSpeed).toFixed(2))) : 1.0;

      const bodyPayload = {
        model: config.model || 'tts-1',
        input: trimmed,
        voice: config.voice || 'alloy',
        speed: calculatedSpeed,
        response_format: config.audioFormat || 'mp3',
        ...(config.customBodyParams || {}),
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return {
          success: false,
          error: `OpenAI Speech HTTP ${res.status}: ${errText.slice(0, 150)}`,
        };
      }

      const arrayBuf = await res.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuf);

      return {
        success: true,
        audioBuffer,
        audioBase64: audioBuffer.toString('base64'),
        format: config.audioFormat || 'mp3',
        speed: calculatedSpeed,
        durationSeconds: Math.max(0.4, Math.round((audioBuffer.length / 4000) * 10) / 10),
      };
    }

    // 2. ELEVENLABS PROTOCOL
    if (config.protocol === 'elevenlabs' || endpoint.includes('elevenlabs.io')) {
      const voiceId = config.voice || '21m00Tcm4TlvDq8ikWAM';
      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      const ttsUrl = cleanEndpoint.endsWith(`/text-to-speech/${voiceId}`)
        ? cleanEndpoint
        : `${cleanEndpoint}/v1/text-to-speech/${voiceId}`;

      const bodyPayload = {
        text: trimmed,
        model_id: config.model || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
        ...(config.customBodyParams || {}),
      };

      const res = await fetch(ttsUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return {
          success: false,
          error: `ElevenLabs HTTP ${res.status}: ${errText.slice(0, 150)}`,
        };
      }

      const arrayBuf = await res.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuf);

      return {
        success: true,
        audioBuffer,
        audioBase64: audioBuffer.toString('base64'),
        format: 'mp3',
        speed: isSlow ? 0.8 : 1.0,
      };
    }

    // 3. PIPER HTTP PROTOCOL
    if (config.protocol === 'piper-http') {
      const lengthScale = isSlow ? slowSpeed : 1.0;
      const url = `${endpoint.replace(/\/+$/, '')}/?text=${encodeURIComponent(trimmed)}&length_scale=${lengthScale}&voice=${encodeURIComponent(config.voice || 'en_US-lessac-high')}`;

      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return { success: false, error: `Piper HTTP ${res.status}: ${res.statusText}` };
      }

      const arrayBuf = await res.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuf);

      return {
        success: true,
        audioBuffer,
        audioBase64: audioBuffer.toString('base64'),
        format: 'wav',
        speed: lengthScale,
      };
    }

    // 4. GOOGLE TRANSLATE PROTOCOL
    if (config.protocol === 'google-translate') {
      const speedParam = isSlow ? '&ttsspeed=0.25' : '';
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${config.voice || 'en-US'}&q=${encodeURIComponent(trimmed)}${speedParam}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'audio/mpeg, audio/*, */*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return { success: false, error: `Google TTS HTTP ${res.status}` };
      }

      const arrayBuf = await res.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuf);

      return {
        success: true,
        audioBuffer,
        audioBase64: audioBuffer.toString('base64'),
        format: 'mp3',
        speed: isSlow ? 0.75 : 1.0,
      };
    }

    // 5. CUSTOM HTTP POST / GET
    const method = config.httpMethod || 'POST';
    let res: Response;

    if (method === 'GET') {
      const url = new URL(endpoint);
      url.searchParams.set('text', trimmed);
      if (config.voice) url.searchParams.set('voice', config.voice);
      if (isSlow) url.searchParams.set('speed', `${+(1 / slowSpeed).toFixed(2)}`);

      res = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    } else {
      const body = {
        text: trimmed,
        voice: config.voice,
        model: config.model,
        speed: isSlow ? +(1 / slowSpeed).toFixed(2) : 1.0,
        ...(config.customBodyParams || {}),
      };

      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { success: false, error: `Custom TTS HTTP ${res.status}: ${errText.slice(0, 150)}` };
    }

    const arrayBuf = await res.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuf);

    return {
      success: true,
      audioBuffer,
      audioBase64: audioBuffer.toString('base64'),
      format: config.audioFormat || 'mp3',
      speed: isSlow ? 0.8 : 1.0,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Custom TTS Error: ${err?.message || 'Network request failed'}`,
    };
  }
}

/**
 * Tests custom TTS provider with the generic pronunciation sentence.
 */
export async function testCustomTTS(
  config: CustomTTSProviderConfig,
  testSentence: string = GENERIC_TTS_TEST_SENTENCE
): Promise<{
  success: boolean;
  normalAudioBase64?: string;
  slowAudioBase64?: string;
  durationSeconds?: number;
  format?: string;
  error?: string;
}> {
  // Test Normal
  const normalRes = await synthesizeCustomTTS(config, testSentence, false, 1.25);
  if (!normalRes.success || !normalRes.audioBase64) {
    return { success: false, error: `Normal speech test failed: ${normalRes.error}` };
  }

  // Test Slow
  const slowRes = await synthesizeCustomTTS(config, testSentence, true, 1.30);

  return {
    success: true,
    normalAudioBase64: normalRes.audioBase64,
    slowAudioBase64: slowRes.audioBase64 || normalRes.audioBase64,
    durationSeconds: normalRes.durationSeconds,
    format: normalRes.format || 'mp3',
  };
}
