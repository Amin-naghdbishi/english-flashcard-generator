import https from 'https';
import http from 'http';

export interface DictionaryLookupResult {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaningFa?: string;
  definitionEn?: string;
  example?: string;
  sourceUsed?: string;
  error?: string;
}

/**
 * Helper to fetch HTTP/HTTPS JSON or text
 */
function fetchUrl(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8',
          ...headers,
        },
        timeout: 6000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 100)}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Dictionary request timed out'));
    });
  });
}

/**
 * 1. Free Dictionary API (English definitions, IPA, parts of speech, examples)
 * Endpoint: https://api.dictionaryapi.dev/api/v2/entries/en/<word>
 */
export async function lookupFreeDictionary(word: string): Promise<DictionaryLookupResult> {
  try {
    const cleanWord = word.trim().toLowerCase();
    const rawJson = await fetchUrl(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
    const parsed = JSON.parse(rawJson);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { word, error: 'No entry found in Free Dictionary' };
    }

    const firstEntry = parsed[0];
    const phonetic = firstEntry.phonetic || firstEntry.phonetics?.find((p: any) => p.text)?.text || '';
    
    let partOfSpeech = '';
    let definitionEn = '';
    let example = '';

    if (Array.isArray(firstEntry.meanings) && firstEntry.meanings.length > 0) {
      const firstMeaning = firstEntry.meanings[0];
      partOfSpeech = firstMeaning.partOfSpeech || '';

      if (Array.isArray(firstMeaning.definitions) && firstMeaning.definitions.length > 0) {
        const firstDef = firstMeaning.definitions[0];
        definitionEn = firstDef.definition || '';
        example = firstDef.example || '';
      }
    }

    return {
      word,
      phonetic,
      partOfSpeech,
      definitionEn,
      example,
      sourceUsed: 'Free Dictionary API',
    };
  } catch (err: any) {
    return { word, error: `Free Dictionary lookup failed: ${err.message}` };
  }
}

/**
 * 2. Abadis Persian Dictionary (https://abadis.ir/entofa/<word>/)
 * Extracts Persian meaning from Abadis dictionary HTML.
 */
export async function lookupAbadis(word: string): Promise<DictionaryLookupResult> {
  try {
    const cleanWord = word.trim().toLowerCase();
    const url = `https://abadis.ir/entofa/${encodeURIComponent(cleanWord)}/`;
    const html = await fetchUrl(url);

    // Look for Persian definitions in Abadis markup:
    // Abadis typically puts primary meanings in: <div class="desc ..."> or <div class="box ..."> or <span>
    // We parse Persian text patterns inside definition blocks
    const faMatches: string[] = [];

    // Match Persian meaning paragraphs / spans
    const regexMeaning = /<div class=["']desc["']>([\s\S]*?)<\/div>/i;
    const matchDesc = html.match(regexMeaning);
    let meaningText = '';

    if (matchDesc && matchDesc[1]) {
      meaningText = matchDesc[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&zwnj;/g, '‌')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (!meaningText) {
      // Fallback pattern matching Persian characters
      const regexFaWords = /<a [^>]*href=["']\/fatofa\/[^"']*["'][^>]*>([\u0600-\u06FF\s‌]+)<\/a>/gi;
      let m;
      while ((m = regexFaWords.exec(html)) !== null) {
        const item = m[1].trim();
        if (item && !faMatches.includes(item)) {
          faMatches.push(item);
        }
        if (faMatches.length >= 4) break;
      }
      if (faMatches.length > 0) {
        meaningText = faMatches.join('، ');
      }
    }

    if (!meaningText) {
      // Search general text in definition items
      const regexGeneral = /<span class=["']fa["']>([\u0600-\u06FF\s‌،]+)<\/span>/i;
      const genMatch = html.match(regexGeneral);
      if (genMatch && genMatch[1]) {
        meaningText = genMatch[1].trim();
      }
    }

    if (!meaningText) {
      return { word, error: 'No Persian meaning found on Abadis for this word' };
    }

    return {
      word,
      meaningFa: meaningText,
      sourceUsed: 'Abadis Persian Dictionary',
    };
  } catch (err: any) {
    return { word, error: `Abadis lookup failed: ${err.message}` };
  }
}

/**
 * Aggregates dictionary data based on configured preferences.
 */
export async function getDictionaryData(
  word: string,
  config: {
    meaningFaSource?: 'ai' | 'abadis' | 'freedict';
    definitionEnSource?: 'ai' | 'freedict' | 'wiktionary';
    exampleSource?: 'ai' | 'freedict';
  }
): Promise<{
  phonetic?: string;
  partOfSpeech?: string;
  meaningFa?: string;
  definitionEn?: string;
  example?: string;
  sources: string[];
}> {
  const sources: string[] = [];
  let phonetic: string | undefined;
  let partOfSpeech: string | undefined;
  let meaningFa: string | undefined;
  let definitionEn: string | undefined;
  let example: string | undefined;

  // 1. Fetch Abadis if Persian Meaning is set to Abadis
  if (config.meaningFaSource === 'abadis') {
    const abadisRes = await lookupAbadis(word);
    if (abadisRes.meaningFa) {
      meaningFa = abadisRes.meaningFa;
      sources.push('Abadis');
    }
  }

  // 2. Fetch Free Dictionary if English definition, example, or phonetic is requested
  if (config.definitionEnSource === 'freedict' || config.exampleSource === 'freedict') {
    const freeDictRes = await lookupFreeDictionary(word);
    if (!freeDictRes.error) {
      if (freeDictRes.phonetic) phonetic = freeDictRes.phonetic;
      if (freeDictRes.partOfSpeech) partOfSpeech = freeDictRes.partOfSpeech;
      if (config.definitionEnSource === 'freedict' && freeDictRes.definitionEn) {
        definitionEn = freeDictRes.definitionEn;
      }
      if (config.exampleSource === 'freedict' && freeDictRes.example) {
        example = freeDictRes.example;
      }
      sources.push('Free Dictionary');
    }
  }

  return {
    phonetic,
    partOfSpeech,
    meaningFa,
    definitionEn,
    example,
    sources,
  };
}
