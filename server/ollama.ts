import { CardData, ManualOverrides, AIPromptsConfig } from '../src/types';
import { buildFlashcardPrompt } from './prompts';

export interface OllamaModelTag {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
}

export const OLLAMA_JSON_SCHEMA = {
  type: "object",
  properties: {
    word: { type: "string" },
    phonetic: { type: "string" },
    partOfSpeech: { type: "string" },
    meaningFa: { type: "string" },
    example: { type: "string" },
    translationFa: { type: "string" },
    mnemonic: { type: "string" }
  },
  required: [
    "word",
    "phonetic",
    "partOfSpeech",
    "meaningFa",
    "example",
    "translationFa",
    "mnemonic"
  ]
};

export function buildPrompt(
  word: string,
  manualOverrides: ManualOverrides = {},
  promptsConfig?: Partial<AIPromptsConfig>
): string {
  return buildFlashcardPrompt(word, manualOverrides, promptsConfig);
}

export async function checkOllamaConnection(baseUrl: string = 'http://127.0.0.1:11434'): Promise<{
  connected: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${cleanUrl}/api/version`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(async () => {
      // Fallback check tags endpoint
      return await fetch(`${cleanUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
    });

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        connected: true,
        version: data.version || 'Ollama Live',
      };
    }

    return {
      connected: false,
      error: `Ollama returned HTTP ${res?.status || 'unreachable'}`,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Cannot connect to Ollama. Make sure `ollama serve` is running.',
    };
  }
}

export async function listOllamaModels(baseUrl: string = 'http://127.0.0.1:11434'): Promise<{
  success: boolean;
  models: OllamaModelTag[];
  error?: string;
}> {
  try {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${cleanUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const models: OllamaModelTag[] = data.models || [];
      return {
        success: true,
        models,
      };
    }

    return {
      success: false,
      models: [],
      error: `Failed to fetch tags: HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      models: [],
      error: err?.message || 'Failed to connect to Ollama models endpoint',
    };
  }
}

/**
 * Generates flashcard data from Ollama with JSON Schema enforcement and User Data Priority.
 */
export async function generateWithOllama(
  baseUrl: string,
  model: string,
  word: string,
  manualOverrides: ManualOverrides = {},
  temperature: number = 0.2,
  contextLength: number = 2048,
  promptsConfig?: Partial<AIPromptsConfig>
): Promise<{
  success: boolean;
  data?: CardData;
  error?: string;
  rawResponse?: string;
}> {
  const prompt = buildPrompt(word, manualOverrides, promptsConfig);
  const cleanUrl = baseUrl.replace(/\/+$/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    // Call Ollama /api/chat with structured format
    const payload = {
      model: model || 'qwen3:4b',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
      format: OLLAMA_JSON_SCHEMA,
      options: {
        temperature: temperature,
        num_ctx: contextLength,
      },
    };

    const res = await fetch(`${cleanUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ollama generation failed (HTTP ${res.status}): ${errText}`);
    }

    const jsonRes = await res.json();
    const content = jsonRes.message?.content || '';

    let parsed: any;
    try {
      parsed = typeof content === 'object' ? content : JSON.parse(content);
    } catch {
      // Clean possible markdown backticks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    }

    // Validate and Normalize
    const aiData: CardData = {
      word: (parsed.word || word).trim(),
      phonetic: (parsed.phonetic || '').trim(),
      partOfSpeech: (parsed.partOfSpeech || '').trim(),
      meaningFa: (parsed.meaningFa || '').trim(),
      example: (parsed.example || '').trim(),
      translationFa: (parsed.translationFa || '').trim(),
      mnemonic: (parsed.mnemonic || '').trim(),
    };

    // STRICT USER DATA PRIORITY:
    // If the user provided a value, never overwrite it with AI output!
    const finalData: CardData = {
      word: word.trim(),
      phonetic: manualOverrides.phonetic?.trim() || aiData.phonetic,
      partOfSpeech: manualOverrides.partOfSpeech?.trim() || aiData.partOfSpeech,
      meaningFa: manualOverrides.meaningFa?.trim() || aiData.meaningFa,
      example: manualOverrides.example?.trim() || aiData.example,
      translationFa: manualOverrides.translationFa?.trim() || aiData.translationFa,
      mnemonic: manualOverrides.mnemonic?.trim() || aiData.mnemonic,
    };

    return {
      success: true,
      data: finalData,
      rawResponse: content,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error communicating with Ollama AI model',
    };
  }
}
