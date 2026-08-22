import { CustomAIProviderConfig, CardData, ManualOverrides } from '../src/types';

export interface CustomAIResponse {
  success: boolean;
  data?: CardData;
  rawResponse?: any;
  error?: string;
}

/**
 * Builds request headers based on authentication type and custom headers.
 */
function buildAuthHeaders(config: CustomAIProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.authType === 'bearer' && config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
  } else if (config.authType === 'api-key-header' && config.apiKey) {
    const headerName = config.authHeaderName || 'x-api-key';
    headers[headerName] = config.apiKey.trim();
  }

  // Merge custom user headers
  if (config.customHeaders && typeof config.customHeaders === 'object') {
    for (const [k, v] of Object.entries(config.customHeaders)) {
      if (k && v) headers[k] = v;
    }
  }

  return headers;
}

/**
 * Tests connection to a Custom AI Provider endpoint.
 */
export async function checkCustomAIConnection(
  config: CustomAIProviderConfig
): Promise<{ connected: boolean; message: string; models?: string[]; error?: string }> {
  if (!config.baseUrl) {
    return { connected: false, message: 'Base URL is missing', error: 'Base URL is required' };
  }

  const cleanUrl = config.baseUrl.replace(/\/+$/, '');
  const headers = buildAuthHeaders(config);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Try fetching /models endpoint if OpenAI-compatible
    const modelsUrl = `${cleanUrl}/models`;
    const res = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json: any = await res.json().catch(() => null);
      let modelList: string[] = [];
      if (json && Array.isArray(json.data)) {
        modelList = json.data.map((m: any) => m.id || m.name).filter(Boolean);
      }
      return {
        connected: true,
        message: `Successfully connected to ${config.name || config.baseUrl} (${modelList.length} models found)`,
        models: modelList,
      };
    } else if (res.status === 401 || res.status === 403) {
      return {
        connected: false,
        message: `Authentication failed (HTTP ${res.status}): Please check your API key`,
        error: `HTTP ${res.status}: Invalid API Key or Unauthorized`,
      };
    }

    // Fallback: Test chat completion endpoint with minimal payload
    const testGen = await generateWithCustomAI(config, 'test', {}, 0.1);
    if (testGen.success) {
      return {
        connected: true,
        message: `Successfully connected and generated response from ${config.name || config.baseUrl}`,
      };
    }

    return {
      connected: false,
      message: testGen.error || `HTTP ${res.status} from ${cleanUrl}`,
      error: testGen.error,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Connection failed: ${err?.message || 'Network error'}`,
      error: err?.message || 'Cannot reach endpoint',
    };
  }
}

/**
 * Fetches available models from an OpenAI-compatible custom provider endpoint.
 */
export async function getCustomAIModels(
  config: CustomAIProviderConfig
): Promise<{ success: boolean; models: string[]; error?: string }> {
  const cleanUrl = config.baseUrl.replace(/\/+$/, '');
  const headers = buildAuthHeaders(config);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${cleanUrl}/models`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        models: [],
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data: any = await res.json();
    if (data && Array.isArray(data.data)) {
      const models = data.data.map((m: any) => m.id || m.name).filter(Boolean);
      return { success: true, models };
    }

    return { success: false, models: [], error: 'Unexpected /models response format' };
  } catch (err: any) {
    return { success: false, models: [], error: err?.message || 'Failed to fetch models' };
  }
}

/**
 * Generates flashcard data using any Custom AI Provider (OpenAI compatible, DeepSeek, Groq, OpenRouter, etc.).
 */
export async function generateWithCustomAI(
  config: CustomAIProviderConfig,
  word: string,
  manualOverrides: ManualOverrides = {},
  temperature: number = 0.2
): Promise<CustomAIResponse> {
  const cleanWord = (word || '').trim();
  if (!cleanWord) {
    return { success: false, error: 'Word parameter is empty' };
  }

  const cleanUrl = (config.baseUrl || '').replace(/\/+$/, '');
  const endpoint = cleanUrl.endsWith('/chat/completions') ? cleanUrl : `${cleanUrl}/chat/completions`;
  const headers = buildAuthHeaders(config);

  const systemPrompt = `You are an expert lexicographer and English-Persian vocabulary flashcard generator.
Return ONLY valid JSON matching this exact schema:
{
  "word": "${cleanWord}",
  "phonetic": "/.../",
  "partOfSpeech": "noun | verb | adjective | adverb | idiom",
  "meaningFa": "fluent, precise Persian translation",
  "example": "A clear, natural, high-quality English sentence demonstrating the word",
  "translationFa": "Fluent Persian translation of the example sentence",
  "mnemonic": "A short, clever memory aid / coding / association technique"
}`;

  const userPrompt = `Generate the vocabulary flashcard JSON for the English word: "${cleanWord}".
${manualOverrides.meaningFa ? `User specified Persian meaning: "${manualOverrides.meaningFa}". Use this.` : ''}
${manualOverrides.example ? `User specified Example sentence: "${manualOverrides.example}". Use this.` : ''}
Output ONLY the JSON object. Do not include markdown code blocks (\`\`\`json), explanations, or surrounding text.`;

  const payload: Record<string, any> = {
    model: config.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: typeof config.temperature === 'number' ? config.temperature : temperature,
    response_format: { type: 'json_object' },
    ...(config.customBodyParams || {}),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          error: `Authentication failed (HTTP ${res.status}): Please check your API key for ${config.name || 'Custom AI'}. ${errText.slice(0, 100)}`,
        };
      }
      return {
        success: false,
        error: `Custom AI (${config.name || 'Endpoint'}) HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data: any = await res.json();
    let content = data?.choices?.[0]?.message?.content || '';

    if (!content && typeof data === 'string') {
      content = data;
    }

    if (!content) {
      return {
        success: false,
        error: 'Custom AI returned an empty response content',
        rawResponse: data,
      };
    }

    // Clean markdown code fence if returned
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(content);

    const cardData: CardData = {
      word: cleanWord,
      phonetic: manualOverrides.phonetic || parsed.phonetic || `/${cleanWord}/`,
      partOfSpeech: manualOverrides.partOfSpeech || parsed.partOfSpeech || 'word',
      meaningFa: manualOverrides.meaningFa || parsed.meaningFa || '',
      example: manualOverrides.example || parsed.example || `This is an example for ${cleanWord}.`,
      translationFa: manualOverrides.translationFa || parsed.translationFa || '',
      mnemonic: manualOverrides.mnemonic || parsed.mnemonic || '',
    };

    return {
      success: true,
      data: cardData,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Custom AI Generation error: ${err?.message || 'Network request failed'}`,
    };
  }
}
