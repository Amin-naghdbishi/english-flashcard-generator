import https from 'https';
import http from 'http';
import crypto from 'crypto';

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
  error?: string;
}

/**
 * Heuristic list of abstract words/suffixes that typically DO NOT benefit from an image
 */
const ABSTRACT_SUFFIXES = [
  'ness', 'ment', 'tion', 'sion', 'ity', 'ship', 'ism', 'ance', 'ence', 'hood',
  'dom', 'ology', 'able', 'ible', 'less', 'ous', 'ful'
];

const COMMON_CONCRETE_CATEGORIES = [
  'animal', 'food', 'fruit', 'vegetable', 'tool', 'vehicle', 'furniture', 'clothing',
  'body part', 'device', 'instrument', 'plant', 'building', 'object', 'flower'
];

/**
 * Determine if a word is concrete and benefits from a smart image.
 * Uses word POS, heuristics, or AI analysis.
 */
export function evaluateWordNeedsImage(
  word: string,
  partOfSpeech: string = '',
  meaningFa: string = ''
): SmartImageDecision {
  const clean = word.toLowerCase().trim();

  // Basic POS filter
  if (['preposition', 'conjunction', 'pronoun', 'interjection', 'modal verb', 'determiner'].includes(partOfSpeech.toLowerCase())) {
    return {
      needsImage: false,
      reason: `Part of speech (${partOfSpeech}) is abstract grammatical function.`,
    };
  }

  // Suffix check for abstract nouns/adjectives
  for (const suf of ABSTRACT_SUFFIXES) {
    if (clean.length > 5 && clean.endsWith(suf)) {
      return {
        needsImage: false,
        reason: `Word has abstract suffix (-${suf}).`,
      };
    }
  }

  // Concrete words benefit from imagery
  if (partOfSpeech.toLowerCase().includes('noun') || !partOfSpeech) {
    return {
      needsImage: true,
      searchTerm: clean,
      reason: `Concrete physical noun/concept benefits from visual memory anchor.`,
    };
  }

  return {
    needsImage: false,
    reason: `Abstract word concept.`,
  };
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
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&pithumbsize=500&titles=${encodeURIComponent(searchTerm)}`;
    const { buffer } = await downloadBinary(url);
    const json = JSON.parse(buffer.toString('utf-8'));
    const pages = json?.query?.pages;

    if (pages) {
      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId];
        if (page?.thumbnail?.source) {
          return page.thumbnail.source;
        }
      }
    }
  } catch (err) {
    // Continue to next search provider
  }
  return null;
}

/**
 * Searches Wikimedia Commons direct file search API
 */
async function searchCommonsImage(searchTerm: string): Promise<string | null> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(searchTerm)}&gsrlimit=3&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&format=json`;
    const { buffer } = await downloadBinary(url);
    const json = JSON.parse(buffer.toString('utf-8'));
    const pages = json?.query?.pages;

    if (pages) {
      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId];
        const info = page?.imageinfo?.[0];
        if (info?.thumburl || info?.url) {
          const imgUrl = info.thumburl || info.url;
          if (imgUrl.match(/\.(jpg|jpeg|png|webp)/i)) {
            return imgUrl;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Main Smart Images pipeline:
 * 1. Evaluates if word needs an image
 * 2. Searches online image providers
 * 3. Downloads, validates, and encodes as base64 with unique media filename
 */
export async function getSmartImage(
  word: string,
  partOfSpeech: string = '',
  meaningFa: string = '',
  enabled: boolean = true
): Promise<SmartImageResult> {
  if (!enabled) {
    return {
      success: true,
      needsImage: false,
      reason: 'Smart Images feature is disabled in Settings.',
    };
  }

  const decision = evaluateWordNeedsImage(word, partOfSpeech, meaningFa);
  if (!decision.needsImage) {
    return {
      success: true,
      needsImage: false,
      reason: decision.reason,
    };
  }

  const query = decision.searchTerm || word;

  try {
    // 1. Try Wikipedia / Wikimedia
    let imageUrl = await searchWikipediaImage(query);
    if (!imageUrl) {
      imageUrl = await searchCommonsImage(query);
    }

    if (!imageUrl) {
      return {
        success: false,
        needsImage: true,
        searchTerm: query,
        reason: 'Image search returned no clear visual match.',
      };
    }

    // 2. Download Image Binary
    const { buffer, contentType } = await downloadBinary(imageUrl);
    if (buffer.length < 500) {
      return {
        success: false,
        needsImage: true,
        searchTerm: query,
        reason: 'Image downloaded was too small or corrupted.',
      };
    }

    const base64 = buffer.toString('base64');
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 8);
    const safeWord = word.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const imageFileName = `img_${safeWord}_${hash}.${ext}`;

    return {
      success: true,
      needsImage: true,
      searchTerm: query,
      reason: decision.reason,
      imageUrl,
      imageBase64: base64,
      imageFileName,
    };
  } catch (err: any) {
    return {
      success: false,
      needsImage: true,
      searchTerm: query,
      error: `Failed to download image: ${err.message}`,
    };
  }
}
