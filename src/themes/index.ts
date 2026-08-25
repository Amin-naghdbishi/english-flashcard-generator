import { ThemeDefinition, CardData, ThemeId } from '../types';
import { comicPopLightTheme } from './comic-pop-light';
import { comicPopDarkTheme } from './comic-pop-dark';
import { comicStripLightTheme } from './comic-strip-light';
import { comicStripDarkTheme } from './comic-strip-dark';
import { comicQuestLightTheme } from './comic-quest-light';
import { comicQuestDarkTheme } from './comic-quest-dark';
import { comicNotebookLightTheme } from './comic-notebook-light';
import { comicNotebookDarkTheme } from './comic-notebook-dark';
import { comicArcadeLightTheme } from './comic-arcade-light';
import { comicArcadeDarkTheme } from './comic-arcade-dark';
import { minimalLightTheme } from './minimal-light';
import { minimalDarkTheme } from './minimal-dark';
import {
  heroPopFrontSpellingHtml,
  storyStripFrontSpellingHtml,
  duoQuestFrontSpellingHtml,
  indexNotebookFrontSpellingHtml,
  arcadeRetroFrontSpellingHtml,
  minimalFrontSpellingHtml,
} from './templates';

export const THEMES: Record<string, ThemeDefinition> = {
  // Light Themes
  'comic-pop-light': comicPopLightTheme,
  'comic-strip-light': comicStripLightTheme,
  'comic-quest-light': comicQuestLightTheme,
  'comic-notebook-light': comicNotebookLightTheme,
  'comic-arcade-light': comicArcadeLightTheme,
  'minimal-light': minimalLightTheme,

  // Dark Themes
  'comic-pop-dark': comicPopDarkTheme,
  'comic-strip-dark': comicStripDarkTheme,
  'comic-quest-dark': comicQuestDarkTheme,
  'comic-notebook-dark': comicNotebookDarkTheme,
  'comic-arcade-dark': comicArcadeDarkTheme,
  'minimal-dark': minimalDarkTheme,

  // Legacy Aliases
  'comic-manga-light': comicQuestLightTheme,
  'comic-manga-dark': comicQuestDarkTheme,
  'comic-minimal-light': minimalLightTheme,
  'comic-minimal-dark': minimalDarkTheme,
  'comic-light': comicPopLightTheme,
  'comic-dark': comicPopDarkTheme,
};

export const THEME_GROUPS = {
  light: [
    { id: 'comic-pop-light', name: 'Hero Pop (Light)', desc: 'Bold comic hero cards with halftone badges and speech balloons.' },
    { id: 'comic-strip-light', name: 'Story Strip (Light)', desc: '3-panel Sunday newspaper comic layout with dialogue panels.' },
    { id: 'comic-quest-light', name: 'Duo Quest (Light)', desc: 'Playful Duolingo-inspired learning UX with chunky 3D buttons.' },
    { id: 'comic-notebook-light', name: 'Index Notebook (Light)', desc: 'Ruled paper notebook with sticky index tabs and washi tape.' },
    { id: 'comic-arcade-light', name: 'Arcade Retro (Light)', desc: '90s pixel arcade cabinet style with HUD bars and coin buttons.' },
    { id: 'minimal-light', name: 'Minimal (Light)', desc: 'Clean, distraction-free classic Anki design with subtle borders.' },
  ],
  dark: [
    { id: 'comic-pop-dark', name: 'Hero Pop (Dark)', desc: 'Midnight comic hero panels with bright amber and cyan action badges.' },
    { id: 'comic-strip-dark', name: 'Story Strip (Dark)', desc: 'Deep navy comic strip panels with speech bubbles and dialogue frames.' },
    { id: 'comic-quest-dark', name: 'Duo Quest (Dark)', desc: 'Midnight gamified educational card with glowing XP accents.' },
    { id: 'comic-notebook-dark', name: 'Index Notebook (Dark)', desc: 'Chalkboard study notebook with neon highlighters and sticky notes.' },
    { id: 'comic-arcade-dark', name: 'Arcade Retro (Dark)', desc: 'Vibrant neon 90s arcade cyberpunk interface with glowing terminals.' },
    { id: 'minimal-dark', name: 'Minimal (Dark)', desc: 'Distraction-free dark Anki card with restrained colors and subtle borders.' },
  ],
};

export function getSpellingFrontHtml(themeId: ThemeId): string {
  switch (themeId) {
    case 'comic-pop-light':
    case 'comic-pop-dark':
    case 'comic-light':
    case 'comic-dark':
      return heroPopFrontSpellingHtml;
    case 'comic-strip-light':
    case 'comic-strip-dark':
      return storyStripFrontSpellingHtml;
    case 'comic-quest-light':
    case 'comic-quest-dark':
    case 'comic-manga-light':
    case 'comic-manga-dark':
      return duoQuestFrontSpellingHtml;
    case 'comic-notebook-light':
    case 'comic-notebook-dark':
      return indexNotebookFrontSpellingHtml;
    case 'comic-arcade-light':
    case 'comic-arcade-dark':
      return arcadeRetroFrontSpellingHtml;
    case 'minimal-light':
    case 'minimal-dark':
    case 'comic-minimal-light':
    case 'comic-minimal-dark':
      return minimalFrontSpellingHtml;
    default:
      return heroPopFrontSpellingHtml;
  }
}

/**
 * Creates blanked sentence for spelling exercises by replacing the word (and inflections) with ______
 */
export function makeSpellingSentence(sentence: string, targetWord: string): string {
  if (!sentence) return '______';
  if (!targetWord) return sentence;

  const cleanWord = targetWord.trim();
  // Match word boundary variations (e.g. abandon, abandons, abandoned, abandoning)
  const regex = new RegExp(`\\b${cleanWord}(?:ed|ing|s|es|d)?\\b`, 'gi');
  if (regex.test(sentence)) {
    return sentence.replace(regex, '______');
  }

  // Fallback: simple case-insensitive replacement
  const directIdx = sentence.toLowerCase().indexOf(cleanWord.toLowerCase());
  if (directIdx !== -1) {
    return (
      sentence.slice(0, directIdx) +
      '______' +
      sentence.slice(directIdx + cleanWord.length)
    );
  }

  return `${sentence} [ ______ ]`;
}

export function renderThemeHtml(
  templateHtml: string,
  data: CardData,
  options?: {
    isPreview?: boolean;
    cardType?: 'normal' | 'spelling';
  }
): string {
  let html = templateHtml;

  // 1. Audio formatting
  let wordAudio = '';
  let exampleAudio = '';
  let wordAudioUsNormal = '';
  let wordAudioUsSlow = '';
  let wordAudioUkNormal = '';
  let wordAudioUkSlow = '';
  let exampleAudioUsNormal = '';
  let exampleAudioUsSlow = '';
  let exampleAudioUkNormal = '';
  let exampleAudioUkSlow = '';

  if (options?.isPreview) {
    const makePreviewBtn = (target: string, label: string, b64?: string) => {
      if (b64) {
        return `<button type="button" class="comic-audio-btn preview-play-btn" data-audio-target="${target}" title="Play ${label}">▶ ${label}</button>`;
      }
      return '';
    };

    wordAudioUsNormal = makePreviewBtn('word_us_normal', '🇺🇸 Normal', data.wordAudioUsNormalBase64 || data.wordAudioBase64);
    wordAudioUsSlow = makePreviewBtn('word_us_slow', '🇺🇸 Slow', data.wordAudioUsSlowBase64);
    wordAudioUkNormal = makePreviewBtn('word_uk_normal', '🇬🇧 Normal', data.wordAudioUkNormalBase64);
    wordAudioUkSlow = makePreviewBtn('word_uk_slow', '🇬🇧 Slow', data.wordAudioUkSlowBase64);
    exampleAudioUsNormal = makePreviewBtn('example_us_normal', '🇺🇸 Ex Normal', data.exampleAudioUsNormalBase64 || data.exampleAudioBase64);
    exampleAudioUsSlow = makePreviewBtn('example_us_slow', '🇺🇸 Ex Slow', data.exampleAudioUsSlowBase64);
    exampleAudioUkNormal = makePreviewBtn('example_uk_normal', '🇬🇧 Ex Normal', data.exampleAudioUkNormalBase64);
    exampleAudioUkSlow = makePreviewBtn('example_uk_slow', '🇬🇧 Ex Slow', data.exampleAudioUkSlowBase64);

    const wordGroup = [
      wordAudioUsNormal,
      wordAudioUsSlow,
      wordAudioUkNormal,
      wordAudioUkSlow,
    ].filter(Boolean).join(' ');

    wordAudio = wordGroup || (data.wordAudioBase64 ? makePreviewBtn('word_us_normal', '🇺🇸 Word', data.wordAudioBase64) : '');

    const exampleGroup = [
      exampleAudioUsNormal,
      exampleAudioUsSlow,
      exampleAudioUkNormal,
      exampleAudioUkSlow,
    ].filter(Boolean).join(' ');

    exampleAudio = exampleGroup || (data.exampleAudioBase64 ? makePreviewBtn('example_us_normal', '🇺🇸 Example', data.exampleAudioBase64) : '');
  } else {
    // In Anki: [sound:filename.ext] (only if generated/present)
    wordAudioUsNormal = data.wordAudioUsNormalFileName ? `[sound:${data.wordAudioUsNormalFileName}]` : '';
    wordAudioUsSlow = data.wordAudioUsSlowFileName ? `[sound:${data.wordAudioUsSlowFileName}]` : '';
    wordAudioUkNormal = data.wordAudioUkNormalFileName ? `[sound:${data.wordAudioUkNormalFileName}]` : '';
    wordAudioUkSlow = data.wordAudioUkSlowFileName ? `[sound:${data.wordAudioUkSlowFileName}]` : '';
    exampleAudioUsNormal = data.exampleAudioUsNormalFileName ? `[sound:${data.exampleAudioUsNormalFileName}]` : '';
    exampleAudioUsSlow = data.exampleAudioUsSlowFileName ? `[sound:${data.exampleAudioUsSlowFileName}]` : '';
    exampleAudioUkNormal = data.exampleAudioUkNormalFileName ? `[sound:${data.exampleAudioUkNormalFileName}]` : '';
    exampleAudioUkSlow = data.exampleAudioUkSlowFileName ? `[sound:${data.exampleAudioUkSlowFileName}]` : '';

    const allWordSounds = [wordAudioUsNormal, wordAudioUsSlow, wordAudioUkNormal, wordAudioUkSlow].filter(Boolean).join(' ');
    wordAudio = allWordSounds || (data.wordAudioFileName ? `[sound:${data.wordAudioFileName}]` : '');

    const allExampleSounds = [exampleAudioUsNormal, exampleAudioUsSlow, exampleAudioUkNormal, exampleAudioUkSlow].filter(Boolean).join(' ');
    exampleAudio = allExampleSounds || (data.exampleAudioFileName ? `[sound:${data.exampleAudioFileName}]` : '');
  }

  // 2. Image formatting
  let cardImageHtml = '';
  if (options?.isPreview && data.imageBase64) {
    const isPng = data.imageBase64.startsWith('iVBORw0KGgo');
    const mime = isPng ? 'image/png' : 'image/jpeg';
    cardImageHtml = `<img src="data:${mime};base64,${data.imageBase64}" class="card-illustration" alt="${escapeHtml(data.word)}" />`;
  } else if (data.imageFileName) {
    cardImageHtml = `<img src="${data.imageFileName}" class="card-illustration" alt="${escapeHtml(data.word)}" />`;
  }

  // 3. Spelling sentence
  const spellingSentence = data.spellingSentence || makeSpellingSentence(data.example || '', data.word || '');

  const replacements: Record<string, string> = {
    '{{Word}}': escapeHtml(data.word || ''),
    '{{Phonetic}}': escapeHtml(data.phonetic || '/.../'),
    '{{PartOfSpeech}}': escapeHtml(data.partOfSpeech || 'word'),
    '{{Meaning}}': escapeHtml(data.meaningFa || ''),
    '{{Example}}': escapeHtml(data.example || ''),
    '{{Translation}}': escapeHtml(data.translationFa || ''),
    '{{Mnemonic}}': escapeHtml(data.mnemonic || ''),
    '{{CardImage}}': cardImageHtml,
    '{{SpellingSentence}}': escapeHtml(spellingSentence),
    '{{WordAudio}}': wordAudio,
    '{{ExampleAudio}}': exampleAudio,
    '{{WordAudioUsNormal}}': wordAudioUsNormal,
    '{{WordAudioUsSlow}}': wordAudioUsSlow,
    '{{WordAudioUkNormal}}': wordAudioUkNormal,
    '{{WordAudioUkSlow}}': wordAudioUkSlow,
    '{{ExampleAudioUsNormal}}': exampleAudioUsNormal,
    '{{ExampleAudioUsSlow}}': exampleAudioUsSlow,
    '{{ExampleAudioUkNormal}}': exampleAudioUkNormal,
    '{{ExampleAudioUkSlow}}': exampleAudioUkSlow,
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
