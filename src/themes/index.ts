import { ThemeDefinition, CardData, ThemeId } from '../types';
import { comicPopLightTheme } from './comic-pop-light';
import { comicPopDarkTheme } from './comic-pop-dark';
import { comicStripLightTheme } from './comic-strip-light';
import { comicStripDarkTheme } from './comic-strip-dark';
import { comicMangaLightTheme } from './comic-manga-light';
import { comicMangaDarkTheme } from './comic-manga-dark';
import { comicMinimalLightTheme } from './comic-minimal-light';
import { comicMinimalDarkTheme } from './comic-minimal-dark';
import { comicArcadeLightTheme } from './comic-arcade-light';
import { comicArcadeDarkTheme } from './comic-arcade-dark';

export const THEMES: Record<string, ThemeDefinition> = {
  // 5 Light Themes
  'comic-pop-light': comicPopLightTheme,
  'comic-strip-light': comicStripLightTheme,
  'comic-manga-light': comicMangaLightTheme,
  'comic-minimal-light': comicMinimalLightTheme,
  'comic-arcade-light': comicArcadeLightTheme,

  // 5 Dark Themes
  'comic-pop-dark': comicPopDarkTheme,
  'comic-strip-dark': comicStripDarkTheme,
  'comic-manga-dark': comicMangaDarkTheme,
  'comic-minimal-dark': comicMinimalDarkTheme,
  'comic-arcade-dark': comicArcadeDarkTheme,

  // Legacy Aliases
  'comic-light': comicPopLightTheme,
  'comic-dark': comicPopDarkTheme,
};

export const THEME_GROUPS = {
  light: [
    { id: 'comic-pop-light', name: 'Pop Comic (Light)', desc: 'Vibrant pop-art comic panels with bold colors' },
    { id: 'comic-strip-light', name: 'Comic Strip (Light)', desc: 'Classic Sunday newspaper comic strip style' },
    { id: 'comic-manga-light', name: 'Graphic Novel (Light)', desc: 'High-contrast graphic novel and manga ink style' },
    { id: 'comic-minimal-light', name: 'Minimal Line (Light)', desc: 'Clean line-art comic panels with pastel badges' },
    { id: 'comic-arcade-light', name: 'Arcade Cartoon (Light)', desc: 'Playful retro arcade game & cartoon aesthetic' },
  ],
  dark: [
    { id: 'comic-pop-dark', name: 'Pop Comic (Dark)', desc: 'Midnight ink canvas with vibrant neon comic accents' },
    { id: 'comic-strip-dark', name: 'Comic Strip (Dark)', desc: 'Deep navy charcoal comic strip panels' },
    { id: 'comic-manga-dark', name: 'Graphic Novel (Dark)', desc: 'Pitch black graphic novel aesthetic with cyan ink' },
    { id: 'comic-minimal-dark', name: 'Minimal Line (Dark)', desc: 'Matte dark slate comic panels with delicate outlines' },
    { id: 'comic-arcade-dark', name: 'Arcade Cartoon (Dark)', desc: 'Neon 90s arcade cartoon card with magenta accents' },
  ],
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
    const makePreviewBtn = (target: string, label: string, b64?: string) => {
      if (b64) {
        return `<button type="button" class="comic-audio-btn preview-play-btn" data-audio-target="${target}" title="Play ${label}">▶ ${label}</button>`;
      }
      return `<button type="button" class="comic-audio-btn preview-play-btn" style="opacity: 0.35; cursor: not-allowed;" title="${label} (No audio)">▶ ${label}</button>`;
    };

    wordAudioUsNormal = makePreviewBtn('word_us_normal', 'Play', data.wordAudioUsNormalBase64 || data.wordAudioBase64);
    wordAudioUsSlow = makePreviewBtn('word_us_slow', 'Play', data.wordAudioUsSlowBase64);
    wordAudioUkNormal = makePreviewBtn('word_uk_normal', 'Play', data.wordAudioUkNormalBase64);
    wordAudioUkSlow = makePreviewBtn('word_uk_slow', 'Play', data.wordAudioUkSlowBase64);
    exampleAudioUsNormal = makePreviewBtn('example_us_normal', 'Play', data.exampleAudioUsNormalBase64 || data.exampleAudioBase64);
    exampleAudioUkNormal = makePreviewBtn('example_uk_normal', 'Play', data.exampleAudioUkNormalBase64);

    // Grouped fallback buttons
    const wordGroup = [
      data.wordAudioUsNormalBase64 || data.wordAudioBase64 ? makePreviewBtn('word_us_normal', '🇺🇸 Normal', data.wordAudioUsNormalBase64 || data.wordAudioBase64) : '',
      data.wordAudioUsSlowBase64 ? makePreviewBtn('word_us_slow', '🇺🇸 Slow', data.wordAudioUsSlowBase64) : '',
      data.wordAudioUkNormalBase64 ? makePreviewBtn('word_uk_normal', '🇬🇧 Normal', data.wordAudioUkNormalBase64) : '',
      data.wordAudioUkSlowBase64 ? makePreviewBtn('word_uk_slow', '🇬🇧 Slow', data.wordAudioUkSlowBase64) : '',
    ].filter(Boolean).join(' ');

    wordAudio = wordGroup || makePreviewBtn('word_us_normal', 'Audio', data.wordAudioBase64);

    const exampleGroup = [
      data.exampleAudioUsNormalBase64 || data.exampleAudioBase64 ? makePreviewBtn('example_us_normal', '🇺🇸 Example', data.exampleAudioUsNormalBase64 || data.exampleAudioBase64) : '',
      data.exampleAudioUkNormalBase64 ? makePreviewBtn('example_uk_normal', '🇬🇧 Example', data.exampleAudioUkNormalBase64) : '',
    ].filter(Boolean).join(' ');

    exampleAudio = exampleGroup || makePreviewBtn('example_us_normal', 'Example', data.exampleAudioBase64);
  } else {
    // In Anki: [sound:filename.ext]
    wordAudioUsNormal = data.wordAudioUsNormalFileName ? `[sound:${data.wordAudioUsNormalFileName}]` : (data.wordAudioFileName ? `[sound:${data.wordAudioFileName}]` : '');
    wordAudioUsSlow = data.wordAudioUsSlowFileName ? `[sound:${data.wordAudioUsSlowFileName}]` : '';
    wordAudioUkNormal = data.wordAudioUkNormalFileName ? `[sound:${data.wordAudioUkNormalFileName}]` : '';
    wordAudioUkSlow = data.wordAudioUkSlowFileName ? `[sound:${data.wordAudioUkSlowFileName}]` : '';
    exampleAudioUsNormal = data.exampleAudioUsNormalFileName ? `[sound:${data.exampleAudioUsNormalFileName}]` : (data.exampleAudioFileName ? `[sound:${data.exampleAudioFileName}]` : '');
    exampleAudioUkNormal = data.exampleAudioUkNormalFileName ? `[sound:${data.exampleAudioUkNormalFileName}]` : '';

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
