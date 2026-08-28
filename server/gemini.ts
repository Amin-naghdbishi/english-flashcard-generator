import { GoogleGenAI } from '@google/genai';
import { CardData, ManualOverrides, AIPromptsConfig } from '../src/types';
import { buildFlashcardPrompt } from './prompts';

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & High Quality)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Advanced Reasoning)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
];

export function buildGeminiPrompt(
  word: string,
  manualOverrides: ManualOverrides = {},
  promptsConfig?: Partial<AIPromptsConfig>
): string {
  return buildFlashcardPrompt(word, manualOverrides, promptsConfig);
}

export async function checkGeminiConnection(
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<{ connected: boolean; model?: string; error?: string }> {
  const cleanKey = (apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!cleanKey) {
    return {
      connected: false,
      error: 'Gemini API key is required. Please set your API key in Settings or environment variable.',
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

    const text = response.text || '';
    if (text.includes('ok')) {
      return { connected: true, model: targetModel };
    }
    return { connected: true, model: targetModel };
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
  temperature: number = 0.2,
  promptsConfig?: Partial<AIPromptsConfig>
): Promise<{
  success: boolean;
  data?: CardData;
  error?: string;
  rawResponse?: string;
}> {
  const cleanKey = (apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!cleanKey) {
    return {
      success: false,
      error: 'Gemini API key is missing. Please configure your API key in Settings or set GEMINI_API_KEY environment variable.',
    };
  }

  const prompt = buildGeminiPrompt(word, manualOverrides, promptsConfig);
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
