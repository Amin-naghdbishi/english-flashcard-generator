import { ThemeDefinition, CardData } from '../types';
import { comicDarkTheme } from './comic-dark';
import { comicLightTheme } from './comic-light';

export const THEMES: Record<string, ThemeDefinition> = {
  'comic-dark': comicDarkTheme,
  'comic-light': comicLightTheme,
};

export function renderThemeHtml(
  templateHtml: string,
  data: CardData,
  options?: {
    isPreview?: boolean;
    audioPlayerHtml?: { word?: string; example?: string };
  }
): string {
  let html = templateHtml;

  let wordAudio = '';
  let exampleAudio = '';
  let wordAudioUsNormal = '';
  let wordAudioUsSlow = '';
  let wordAudioUkNormal = '';
  let wordAudioUkSlow = '';
  let exampleAudioUsNormal = '';
  let exampleAudioUkNormal = '';

  if (options?.isPreview) {
    // Helper to generate preview buttons
    const makePreviewBtn = (target: string, label: string, b64?: string) => {
      if (b64) {
        return `<button type="button" class="comic-audio-btn preview-play-btn" data-audio-target="${target}" title="Play ${label}">🔊 ${label}</button>`;
      }
      return `<span class="comic-audio-btn" style="opacity: 0.4; cursor: not-allowed;">🔊 ${label}</span>`;
    };

    wordAudioUsNormal = makePreviewBtn('word_us_normal', '🇺🇸 US', data.wordAudioUsNormalBase64 || data.wordAudioBase64);
    wordAudioUsSlow = makePreviewBtn('word_us_slow', '🐢 Slow', data.wordAudioUsSlowBase64);
    wordAudioUkNormal = makePreviewBtn('word_uk_normal', '🇬🇧 UK', data.wordAudioUkNormalBase64);
    wordAudioUkSlow = makePreviewBtn('word_uk_slow', '🐢 UK Slow', data.wordAudioUkSlowBase64);
    exampleAudioUsNormal = makePreviewBtn('example_us_normal', '🇺🇸 Example', data.exampleAudioUsNormalBase64 || data.exampleAudioBase64);
    exampleAudioUkNormal = makePreviewBtn('example_uk_normal', '🇬🇧 Example', data.exampleAudioUkNormalBase64);

    // Grouped primary buttons for default template tags
    const wordGroup = [
      data.wordAudioUsNormalBase64 || data.wordAudioBase64 ? makePreviewBtn('word_us_normal', '🇺🇸 US (1.0x)', data.wordAudioUsNormalBase64 || data.wordAudioBase64) : '',
      data.wordAudioUsSlowBase64 ? makePreviewBtn('word_us_slow', '🐢 US (1.25x)', data.wordAudioUsSlowBase64) : '',
      data.wordAudioUkNormalBase64 ? makePreviewBtn('word_uk_normal', '🇬🇧 UK (1.0x)', data.wordAudioUkNormalBase64) : '',
      data.wordAudioUkSlowBase64 ? makePreviewBtn('word_uk_slow', '🐢 UK (1.25x)', data.wordAudioUkSlowBase64) : '',
    ].filter(Boolean).join(' ');

    wordAudio = wordGroup || makePreviewBtn('word_us_normal', 'Piper Audio', data.wordAudioBase64);

    const exampleGroup = [
      data.exampleAudioUsNormalBase64 || data.exampleAudioBase64 ? makePreviewBtn('example_us_normal', '🇺🇸 US', data.exampleAudioUsNormalBase64 || data.exampleAudioBase64) : '',
      data.exampleAudioUkNormalBase64 ? makePreviewBtn('example_uk_normal', '🇬🇧 UK', data.exampleAudioUkNormalBase64) : '',
    ].filter(Boolean).join(' ');

    exampleAudio = exampleGroup || makePreviewBtn('example_us_normal', 'Example Audio', data.exampleAudioBase64);
  } else {
    // In Anki: [sound:filename.wav]
    wordAudioUsNormal = data.wordAudioUsNormalFileName ? `[sound:${data.wordAudioUsNormalFileName}]` : (data.wordAudioFileName ? `[sound:${data.wordAudioFileName}]` : '');
    wordAudioUsSlow = data.wordAudioUsSlowFileName ? `[sound:${data.wordAudioUsSlowFileName}]` : '';
    wordAudioUkNormal = data.wordAudioUkNormalFileName ? `[sound:${data.wordAudioUkNormalFileName}]` : '';
    wordAudioUkSlow = data.wordAudioUkSlowFileName ? `[sound:${data.wordAudioUkSlowFileName}]` : '';
    exampleAudioUsNormal = data.exampleAudioUsNormalFileName ? `[sound:${data.exampleAudioUsNormalFileName}]` : (data.exampleAudioFileName ? `[sound:${data.exampleAudioFileName}]` : '');
    exampleAudioUkNormal = data.exampleAudioUkNormalFileName ? `[sound:${data.exampleAudioUkNormalFileName}]` : '';

    // Legacy composite tags
    const allWordSounds = [wordAudioUsNormal, wordAudioUsSlow, wordAudioUkNormal, wordAudioUkSlow].filter(Boolean).join(' ');
    wordAudio = allWordSounds || (data.wordAudioFileName ? `[sound:${data.wordAudioFileName}]` : '');

    const allExampleSounds = [exampleAudioUsNormal, exampleAudioUkNormal].filter(Boolean).join(' ');
    exampleAudio = allExampleSounds || (data.exampleAudioFileName ? `[sound:${data.exampleAudioFileName}]` : '');
  }

  const replacements: Record<string, string> = {
    '{{Word}}': escapeHtml(data.word || ''),
    '{{Phonetic}}': escapeHtml(data.phonetic || '/.../'),
    '{{PartOfSpeech}}': escapeHtml(data.partOfSpeech || 'word'),
    '{{Meaning}}': escapeHtml(data.meaningFa || ''),
    '{{Example}}': escapeHtml(data.example || ''),
    '{{Translation}}': escapeHtml(data.translationFa || ''),
    '{{Mnemonic}}': escapeHtml(data.mnemonic || ''),
    '{{WordAudio}}': wordAudio,
    '{{ExampleAudio}}': exampleAudio,
    '{{WordAudioUsNormal}}': wordAudioUsNormal,
    '{{WordAudioUsSlow}}': wordAudioUsSlow,
    '{{WordAudioUkNormal}}': wordAudioUkNormal,
    '{{WordAudioUkSlow}}': wordAudioUkSlow,
    '{{ExampleAudioUsNormal}}': exampleAudioUsNormal,
    '{{ExampleAudioUkNormal}}': exampleAudioUkNormal,
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(key, value);
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

