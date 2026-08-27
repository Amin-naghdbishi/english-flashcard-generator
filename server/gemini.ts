import { GoogleGenAI } from '@google/genai';
import { CardData, ManualOverrides } from '../src/types';

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & High Quality)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Advanced Reasoning)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
];

export function buildGeminiPrompt(word: string, manualOverrides: ManualOverrides = {}): string {
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
      `* CRITICAL SENSE MATCHING: The user specified the exact meaning "${manualOverrides.meaningFa.trim()}". All generated content (especially the English example sentence, part of speech, and mnemonic) MUST strictly match and demonstrate THIS specific meaning/sense, NOT any alternate or unrelated definitions of the word. (For example, if the word is "extension" and the meaning is "پسوند فایل", the example sentence MUST be about a computer file extension like .txt, NOT a browser extension, hair extension, or deadline extension).`
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

  return `You are an expert English vocabulary teacher creating flashcards for a Persian-speaking learner.

Create flashcard information for this English word:
"${cleanWord}"
${contextBlock}${rulesBlock}
Return a structured JSON object with these exact keys:
- "word": The target English word (preserve exactly).
- "phonetic": Accurate IPA pronunciation between slashes (e.g. "/əˈbændən/").
- "partOfSpeech": Most common grammatical part of speech (e.g. "verb", "noun", "adjective").
- "meaningFa": Concise, high-quality Persian translation/meaning.
- "example": Exactly one clear, natural, memorable English example sentence using the word "${cleanWord}".
- "translationFa": Natural Persian translation of the example sentence.
- "mnemonic": A short, memorable memory aid or mnemonic device (یادافزا) to remember the word.

Rules:
1. Complete all missing fields using the user-provided context as authoritative anchor.
2. If the user provided a meaning, the example MUST demonstrate that exact meaning.
3. If the user provided an example, translationFa MUST translate that exact example sentence.
4. Return strictly valid JSON matching the schema.
5. Persian translations must be natural and accurate.
6. Example sentence must be clear, concise, and illustrative.`;
}

export async function checkGeminiConnection(
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<{ connected: boolean; model?: string; error?: string }> {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    return {
      connected: false,
      error: 'Gemini API key is required. Please set your API key in Settings.',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    const targetModel = model || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: 'Test connection. Respond with {"status":"ok"}',
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (response && response.text) {
      return {
        connected: true,
        model: targetModel,
      };
    }

    return {
      connected: false,
      error: 'Received empty response from Gemini',
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Failed to connect to Google Gemini API',
    };
  }
}

export async function generateWithGemini(
  apiKey: string,
  model: string = 'gemini-2.5-flash',
  word: string,
  manualOverrides: ManualOverrides = {},
  temperature: number = 0.2
): Promise<{
  success: boolean;
  data?: CardData;
  error?: string;
  rawResponse?: string;
}> {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    return {
      success: false,
      error: 'Gemini API key is missing. Please configure your API key in Settings.',
    };
  }

  const prompt = buildGeminiPrompt(word, manualOverrides);
  const targetModel = model || 'gemini-2.5-flash';

  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: typeof temperature === 'number' ? temperature : 0.2,
      },
    });

    const rawText = response.text || '';
    if (!rawText) {
      throw new Error('Gemini returned an empty response.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const aiData: CardData = {
      word: (parsed.word || word).trim(),
      phonetic: (parsed.phonetic || '').trim(),
      partOfSpeech: (parsed.partOfSpeech || '').trim(),
      meaningFa: (parsed.meaningFa || '').trim(),
      example: (parsed.example || '').trim(),
      translationFa: (parsed.translationFa || '').trim(),
      mnemonic: (parsed.mnemonic || '').trim(),
    };

    // Strict User Data Priority: Manual overrides always win
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
      rawResponse: rawText,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error generating flashcard with Google Gemini',
    };
  }
}
