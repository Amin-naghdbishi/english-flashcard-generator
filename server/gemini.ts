import { GoogleGenAI } from '@google/genai';
import { CardData, ManualOverrides } from '../src/types';

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & High Quality)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Advanced Reasoning)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
];

export function buildGeminiPrompt(word: string): string {
  return `You are an expert English vocabulary teacher creating flashcards for a Persian-speaking learner.

Create flashcard information for this English word:
"${word.trim()}"

Return a structured JSON object with these exact keys:
- "word": The target English word.
- "phonetic": Accurate IPA pronunciation between slashes (e.g. "/əˈbændən/").
- "partOfSpeech": Most common grammatical part of speech (e.g. "verb", "noun", "adjective").
- "meaningFa": Concise, high-quality Persian translation/meaning.
- "example": Exactly one clear, natural, memorable English example sentence using the word.
- "translationFa": Natural Persian translation of the example sentence.
- "mnemonic": A short, memorable memory aid or mnemonic device (یادافزا) to remember the word.

Rules:
1. Return strictly valid JSON matching the schema.
2. Persian translations must be natural and accurate.
3. Example sentence must be clear, concise, and illustrative.`;
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

  const prompt = buildGeminiPrompt(word);
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
