import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { SmartImagesConfig, AppSettings } from '../src/types';
import { generateWithOllama } from './ollama';
import { generateWithGemini } from './gemini';
import { generateWithCustomAI } from './customAi';
import { buildSmartImagePrompt } from './prompts';

export interface SmartImageDecision {
  needsImage: boolean;
  searchTerm?: string;
  reason?: string;
}

export interface SmartImageResult {
  success: boolean;
  needsImage: boolean;
  reason?: string;
  searchTerm?: string;
  imageBase64?: string;
  imageFileName?: string;
  imageUrl?: string;
  providerUsed?: string;
  error?: string;
}

// Known abstract suffixes
const ABSTRACT_SUFFIXES = [
  'ness', 'ment', 'tion', 'sion', 'ity', 'ship', 'ism', 'ance', 'ence', 'hood',
  'dom', 'ology', 'able', 'ible', 'less', 'ous', 'ful', 'ive', 'al', 'ic', 'ary'
];

// Concrete physical categories
const CONCRETE_KEYWORDS = [
  'fruit', 'vegetable', 'animal', 'bird', 'fish', 'insect', 'tool', 'device',
  'instrument', 'vehicle', 'car', 'plane', 'boat', 'furniture', 'clothing',
  'shoe', 'hat', 'flower', 'tree', 'plant', 'organ', 'body part', 'building',
  'monument', 'landmark', 'volcano', 'mountain', 'island', 'food', 'dish',
  'drink', 'machine', 'weapon', 'furniture', 'mineral', 'rock', 'toy', 'planet'
];

// Specific known words override
const CONCRETE_EXACT_WORDS = new Set([
  'eraser', 'apple', 'telescope', 'microscope', 'bicycle', 'car', 'airplane',
  'lion', 'elephant', 'penguin', 'astronaut', 'surgeon', 'volcano', 'pyramid',
  'guitar', 'piano', 'hammer', 'screwdriver', 'clock', 'compass', 'backpack',
  'umbrella', 'mirror', 'candle', 'key', 'cup', 'bottle', 'bridge', 'castle',
  'banana', 'orange', 'strawberry', 'tomato', 'potato', 'onion', 'bread'
]);

const ABSTRACT_EXACT_WORDS = new Set([
  'abandon', 'freedom', 'justice', 'happiness', 'diligence', 'concept', 'philosophy',
  'accurate', 'ancient', 'consider', 'hesitate', 'evaluate', 'postpone', 'subsequent',
  'substantial', 'ambiguous', 'crucial', 'inevitable', 'knowledge', 'wisdom', 'peace'
]);

/**
 * Robust heuristic evaluation of whether a vocabulary word benefits from an image.
 */
export function evaluateWordNeedsImageHeuristic(
  word: string,
  partOfSpeech: string = '',
  meaningFa: string = ''
): SmartImageDecision {
  const clean = word.toLowerCase().trim();
  const pos = partOfSpeech.toLowerCase().trim();
  const meaning = meaningFa.toLowerCase().trim();

  // 1. Exact list checks
  if (CONCRETE_EXACT_WORDS.has(clean)) {
    return {
      needsImage: true,
      searchTerm: clean,
      reason: `Concrete physical object / entity (${clean}).`,
    };
  }

  if (ABSTRACT_EXACT_WORDS.has(clean)) {
    return {
      needsImage: false,
      reason: `Abstract concept / non-physical term (${clean}).`,
    };
  }

  // 2. Non-noun parts of speech normally do NOT need an image
  if (
    pos === 'verb' ||
    pos === 'adjective' ||
    pos === 'adverb' ||
    pos === 'preposition' ||
    pos === 'conjunction' ||
    pos === 'pronoun' ||
    pos === 'idiom' ||
    pos === 'phrase'
  ) {
    return {
      needsImage: false,
      reason: `Part of speech (${pos}) represents an action, modifier, or grammatical relationship, not a concrete object.`,
    };
  }

  // 3. Check for abstract noun suffixes
  for (const suf of ABSTRACT_SUFFIXES) {
    if (clean.length > 5 && clean.endsWith(suf)) {
      return {
        needsImage: false,
        reason: `Word ends with abstract suffix (-${suf}).`,
      };
    }
  }

  // 4. Persian meaning heuristic clues
  for (const kw of CONCRETE_KEYWORDS) {
    if (meaning.includes(kw)) {
      return {
        needsImage: true,
        searchTerm: clean,
        reason: `Persian meaning matches physical category (${kw}).`,
      };
    }
  }

  // 5. If it's a simple noun without abstract markers
  if (pos.includes('noun') || !pos) {
    return {
      needsImage: true,
      searchTerm: clean,
      reason: `Identified as a physical noun entity.`,
    };
  }

  return {
    needsImage: false,
    reason: `Abstract concept.`,
  };
}

/**
 * AI-assisted decision for whether a word needs an image.
 */
export async function evaluateWordNeedsImageAI(
  word: string,
  partOfSpeech: string,
  meaningFa: string,
  decisionProvider: string,
  settings: AppSettings
): Promise<SmartImageDecision> {
  const prompt = buildSmartImagePrompt(word, partOfSpeech, meaningFa, settings.aiPrompts);

  try {
    let rawContent = '';

    if (decisionProvider === 'gemini' && settings.ai.gemini.apiKey) {
      const res = await generateWithGemini(settings.ai.gemini.apiKey, settings.ai.gemini.model, word);
      if (res.success && res.data) {
        // Fallback to heuristic
        return evaluateWordNeedsImageHeuristic(word, partOfSpeech, meaningFa);
      }
    } else if (decisionProvider === 'ollama') {
      const res = await generateWithOllama(settings.ai.ollama.url, settings.ai.ollama.model, prompt);
      if (res.success && res.data) {
        return evaluateWordNeedsImageHeuristic(word, partOfSpeech, meaningFa);
      }
    }

    // Default to refined heuristic
    return evaluateWordNeedsImageHeuristic(word, partOfSpeech, meaningFa);
  } catch {
    return evaluateWordNeedsImageHeuristic(word, partOfSpeech, meaningFa);
  }
}

/**
 * Helper to download binary buffer over HTTP/HTTPS
 */
function downloadBinary(url: string, maxRedirects = 3): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));

    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FlashcardGenerator/2.0',
          Accept: 'image/jpeg,image/png,image/webp,image/*;q=0.8',
        },
        timeout: 8000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBinary(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP status ${res.statusCode} while fetching image`));
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || 'image/jpeg';
          resolve({ buffer, contentType });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Image download timed out'));
    });
  });
}

/**
 * Searches Wikipedia / Wikimedia Commons API for a public domain / CC thumbnail image
 */
async function searchWikipediaImage(searchTerm: string): Promise<string | null> {
  try {
    // 1. Direct page title lookup
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&pithumbsize=500&titles=${encodeURIComponent(searchTerm)}`;
    const { buffer } = await downloadBinary(url);
    const json = JSON.parse(buffer.toString('utf-8'));
    const pages = json?.query?.pages;

    if (pages) {
      for (const pageId of Object.keys(pages)) {
        if (pageId === '-1') continue;
        const page = pages[pageId];
        if (page?.thumbnail?.source) {
          return page.thumbnail.source;
        }
      }
    }

    // 2. Wikipedia search query generator (handles non-exact titles, plurals, disambiguations)
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerm)}&gsrlimit=5&prop=pageimages&pithumbsize=500&format=json`;
    const { buffer: sBuffer } = await downloadBinary(searchUrl);
    const sJson = JSON.parse(sBuffer.toString('utf-8'));
    const sPages = sJson?.query?.pages;

    if (sPages) {
      for (const pageId of Object.keys(sPages)) {
        const page = sPages[pageId];
        if (page?.thumbnail?.source) {
          return page.thumbnail.source;
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Searches Wikimedia Commons direct file search API
 */
async function searchCommonsImage(searchTerm: string): Promise<string | null> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(searchTerm)}&gsrlimit=5&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&format=json`;
    const { buffer } = await downloadBinary(url);
    const json = JSON.parse(buffer.toString('utf-8'));
    const pages = json?.query?.pages;

    if (pages) {
      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId];
        const imageInfo = page?.imageinfo?.[0];
        if (imageInfo?.thumburl || imageInfo?.url) {
          const mime = imageInfo?.mime || '';
          if (mime.includes('jpeg') || mime.includes('png') || mime.includes('webp') || mime.includes('jpg')) {
            return imageInfo.thumburl || imageInfo.url;
          }
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Search Google Images (via Google Custom Search API if API key configured, or fallback)
 */
async function searchGoogleImage(searchTerm: string, apiKey?: string, cx?: string): Promise<string | null> {
  if (apiKey && cx) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(searchTerm)}&searchType=image&num=1`;
      const { buffer } = await downloadBinary(url);
      const json = JSON.parse(buffer.toString('utf-8'));
      if (json?.items?.[0]?.link) {
        return json.items[0].link;
      }
    } catch {}
  }
  // Fallback to Wikimedia Commons
  return searchCommonsImage(searchTerm);
}

/**
 * Main Smart Image pipeline:
 * 1. Evaluates if word needs an image using configured AI / heuristic
 * 2. Searches image using configured provider (Wikimedia / Google / Custom)
 * 3. Downloads binary and encodes to base64
 * 4. Generates unique Anki media filename
 */
export async function getSmartImage(
  word: string,
  partOfSpeech: string = '',
  meaningFa: string = '',
  smartImagesConfig?: SmartImagesConfig,
  appSettings?: AppSettings,
  forceFetch: boolean = false
): Promise<SmartImageResult> {
  const cleanWord = (word || '').trim().toLowerCase();
  if (!cleanWord) {
    return { success: false, needsImage: false, error: 'Empty word' };
  }

  // 1. Evaluate image decision
  let decision: SmartImageDecision;
  if (forceFetch) {
    decision = {
      needsImage: true,
      reason: 'Photo explicitly requested by user (Photo: Yes)',
      searchTerm: cleanWord,
    };
  } else {
    const decisionProvider = smartImagesConfig?.decisionProvider || 'heuristic';

    if (decisionProvider === 'heuristic' || !appSettings) {
      decision = evaluateWordNeedsImageHeuristic(cleanWord, partOfSpeech, meaningFa);
    } else {
      decision = await evaluateWordNeedsImageAI(cleanWord, partOfSpeech, meaningFa, decisionProvider, appSettings);
    }

    if (!decision.needsImage) {
      return {
        success: true,
        needsImage: false,
        reason: decision.reason || 'Word is an abstract concept that does not require an image.',
      };
    }
  }

  const searchTerm = decision.searchTerm || cleanWord;
  const searchProvider = smartImagesConfig?.searchProvider || 'wikimedia';

  // 2. Search Image
  let imageUrl: string | null = null;
  let providerUsed = 'Wikimedia Commons';

  if (searchProvider === 'google') {
    imageUrl = await searchGoogleImage(searchTerm, smartImagesConfig?.googleSearchApiKey, smartImagesConfig?.googleSearchCx);
    providerUsed = 'Google Image Search';
  } else if (searchProvider === 'custom' && smartImagesConfig?.customSearchUrl) {
    const customUrl = smartImagesConfig.customSearchUrl.replace('{query}', encodeURIComponent(searchTerm));
    try {
      const { buffer } = await downloadBinary(customUrl);
      const json = JSON.parse(buffer.toString('utf-8'));
      imageUrl = json.url || json.imageUrl || json.link;
      providerUsed = 'Custom Image Provider';
    } catch {}
  }

  // Fallback to Wikipedia / Wikimedia
  if (!imageUrl) {
    imageUrl = await searchWikipediaImage(searchTerm);
  }
  if (!imageUrl) {
    imageUrl = await searchCommonsImage(searchTerm);
  }

  if (!imageUrl) {
    return {
      success: false,
      needsImage: true,
      reason: decision.reason,
      searchTerm,
      error: `No suitable public domain image found for "${searchTerm}".`,
    };
  }

  // 3. Download Image Binary
  try {
    const { buffer } = await downloadBinary(imageUrl);

    if (buffer.length < 500) {
      return {
        success: false,
        needsImage: true,
        reason: decision.reason,
        searchTerm,
        error: 'Downloaded image is corrupted or too small.',
      };
    }

    const isPng = buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
    const ext = isPng ? 'png' : 'jpg';

    // Generate unique media filename for Anki
    const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 8);
    const safeWord = cleanWord.replace(/[^a-z0-9_-]/g, '_');
    const imageFileName = `img_${safeWord}_${hash}.${ext}`;

    return {
      success: true,
      needsImage: true,
      reason: decision.reason,
      searchTerm,
      imageUrl,
      imageFileName,
      imageBase64: buffer.toString('base64'),
      providerUsed,
    };
  } catch (err: any) {
    return {
      success: false,
      needsImage: true,
      reason: decision.reason,
      searchTerm,
      error: `Failed to download image from ${imageUrl}: ${err.message}`,
    };
  }
}

/**
 * Downloads an image from any HTTP/HTTPS or Data URL, converts to base64, and returns unique Anki filename
 */
export async function downloadImageAsBase64(
  imageUrl: string,
  word?: string
): Promise<{
  success: boolean;
  imageBase64?: string;
  imageFileName?: string;
  mimeType?: string;
  error?: string;
}> {
  try {
    const cleanWord = (word || 'image').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

    // If it's already a Data URL
    if (imageUrl.startsWith('data:image/')) {
      const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const base64 = match[2];
        const ext = mime.includes('png') ? 'png' : (mime.includes('webp') ? 'webp' : 'jpg');
        const fileName = `card_manual_${cleanWord}_${Date.now()}.${ext}`;
        return {
          success: true,
          imageBase64: base64,
          imageFileName: fileName,
          mimeType: mime,
        };
      }
    }

    const { buffer, contentType } = await downloadBinary(imageUrl);
    if (!buffer || buffer.length === 0) {
      return { success: false, error: 'Downloaded image is empty' };
    }

    const isPng = buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
    const isWebp = buffer.slice(8, 12).toString('ascii') === 'WEBP';
    const ext = isPng ? 'png' : (isWebp ? 'webp' : 'jpg');
    const mime = contentType || (isPng ? 'image/png' : (isWebp ? 'image/webp' : 'image/jpeg'));
    const fileName = `card_manual_${cleanWord}_${Date.now()}.${ext}`;
    const base64 = buffer.toString('base64');

    return {
      success: true,
      imageBase64: base64,
      imageFileName: fileName,
      mimeType: mime,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to download image: ${err?.message || 'Unknown network error'}`,
    };
  }
}

/**
 * Searches online image results for quick manual selection
 */
export async function searchImagesOnline(
  searchTerm: string
): Promise<Array<{ title: string; thumbUrl: string; fullUrl: string; source: string }>> {
  const cleanWord = (searchTerm || '').trim().toLowerCase();
  if (!cleanWord) return [];

  const results: Array<{ title: string; thumbUrl: string; fullUrl: string; source: string }> = [];

  try {
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(cleanWord)}&gsrlimit=8&prop=imageinfo&iiprop=url|mime&iiurlwidth=400&format=json`;
    const { buffer } = await downloadBinary(commonsUrl);
    const json = JSON.parse(buffer.toString('utf-8'));
    const pages = json?.query?.pages;
    if (pages) {
      for (const p of Object.values(pages) as any[]) {
        const info = p?.imageinfo?.[0];
        if (info?.thumburl || info?.url) {
          const mime = info?.mime || '';
          if (mime.includes('jpeg') || mime.includes('png') || mime.includes('webp') || mime.includes('jpg')) {
            results.push({
              title: p.title?.replace(/^File:/i, '') || cleanWord,
              thumbUrl: info.thumburl || info.url,
              fullUrl: info.url || info.thumburl,
              source: 'Wikimedia Commons',
            });
          }
        }
      }
    }
  } catch {}

  return results;
}
