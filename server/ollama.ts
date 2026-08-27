import { CardData, ManualOverrides } from '../src/types';

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

export function buildPrompt(word: string, manualOverrides: ManualOverrides = {}): string {
  const cleanWord = word.trim();
  const providedContext: string[] = [];

  if (manualOverrides.meaningFa?.trim()) {
    providedContext.push(`- User-Specified Persian Meaning: "${manualOverrides.meaningFa.trim()}"`);
  }
  if (manualOverrides.example?.trim()) {
    providedContext.push(`- User-Specified English Example: "${manualOverrides.example.trim()}"`);
  }
  if (manualOverrides.translationFa?.trim()) {
    providedContext.push(`- User-Specified Example Translation (Persian): "${manualOverrides.translationFa.trim()}"`);
  }
  if (manualOverrides.partOfSpeech?.trim()) {
    providedContext.push(`- User-Specified Part of Speech: "${manualOverrides.partOfSpeech.trim()}"`);
  }
  if (manualOverrides.phonetic?.trim()) {
    providedContext.push(`- User-Specified Phonetic IPA: "${manualOverrides.phonetic.trim()}"`);
  }
  if (manualOverrides.mnemonic?.trim()) {
    providedContext.push(`- User-Specified Mnemonic: "${manualOverrides.mnemonic.trim()}"`);
  }

  const contextBlock = providedContext.length > 0
    ? `\n### AUTHORITATIVE USER CONTEXT (Do NOT alter or contradict any of these):\n${providedContext.join('\n')}\n`
    : '';

  const relationshipRules: string[] = [];

  if (manualOverrides.meaningFa?.trim()) {
    relationshipRules.push(
      `* CRITICAL SENSE MATCHING: The user has specified the exact meaning "${manualOverrides.meaningFa.trim()}". All generated content (especially the English example sentence, part of speech, and mnemonic) MUST strictly match and demonstrate THIS specific meaning/sense, NOT any alternate or unrelated definitions of the word. (For example, if the word is "extension" and the meaning is "پسوند فایل", the example sentence MUST be about a computer file extension like .txt, NOT a browser extension, hair extension, or deadline extension).`
    );
  }

  if (manualOverrides.example?.trim()) {
    relationshipRules.push(
      `* CRITICAL EXAMPLE & TRANSLATION RELATIONSHIP: The user has provided the exact English example sentence: "${manualOverrides.example.trim()}". You MUST preserve this sentence in the "example" field. The "translationFa" field MUST be the direct, natural Persian translation of THIS specific example sentence.`
    );
  } else if (manualOverrides.translationFa?.trim()) {
    relationshipRules.push(
      `* CRITICAL TRANSLATION TO EXAMPLE: The user provided the Persian sentence translation: "${manualOverrides.translationFa.trim()}". Generate an English example sentence that precisely translates to this and contains the word "${cleanWord}".`
    );
  }

  if (manualOverrides.partOfSpeech?.trim()) {
    relationshipRules.push(
      `* PART OF SPEECH: Use "${cleanWord}" strictly as a "${manualOverrides.partOfSpeech.trim()}" in the example sentence.`
    );
  }

  const rulesBlock = relationshipRules.length > 0
    ? `\n### MANDATORY RELATIONSHIP RULES:\n${relationshipRules.join('\n')}\n`
    : '';

  return `You are an expert English-Persian lexicographer and vocabulary flashcard teacher.
Complete the flashcard information for this English word:
"${cleanWord}"
${contextBlock}${rulesBlock}
Return a structured JSON object with these exact keys:
- word: The target English word (preserve exactly).
- phonetic: Accurate IPA pronunciation between slashes (e.g. /.../).
- partOfSpeech: Most common grammatical part of speech (noun, verb, adjective, etc.).
- meaningFa: Concise, natural, and accurate Persian meaning.
- example: Exactly one short, clear, natural English sentence illustrating the target word "${cleanWord}".
- translationFa: Fluent and natural Persian translation of the example sentence.
- mnemonic: A short, clever memory aid (یادافزا) to remember the word.

Strict Completion Rules:
1. Complete all missing fields using the user-provided context as authoritative anchor.
2. If the user provided a meaning, the example MUST demonstrate that exact meaning.
3. If the user provided an example, translationFa MUST translate that exact example sentence.
4. Generated fields must remain semantically consistent with all user-provided fields.
5. Return strictly valid JSON matching the schema without markdown or additional text.`;
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
  contextLength: number = 2048
): Promise<{
  success: boolean;
  data?: CardData;
  error?: string;
  rawResponse?: string;
}> {
  const prompt = buildPrompt(word, manualOverrides);
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
