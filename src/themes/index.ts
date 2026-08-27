import { ThemeDefinition, CardData, ThemeId, CustomCardBlock } from '../types';
import { renderMarkdown, escapeHtml } from '../utils/markdown';
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

export function isRTLText(text?: string): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

export function renderCustomBlocksHtml(
  customBlocks: CustomCardBlock[] | undefined | null,
  themeId: ThemeId = 'comic-pop-dark'
): string {
  if (!customBlocks || !Array.isArray(customBlocks) || customBlocks.length === 0) {
    return '';
  }

  const renderedBlocks: string[] = [];

  for (const block of customBlocks) {
    const title = (block.title || '').trim();
    const content = (block.content || '').trim();
    if (!title && !content) continue;

    const accentColor = block.color || '#38BDF8';
    const dir = block.dir || (isRTLText(content) ? 'rtl' : 'ltr');
    const contentHtml = renderMarkdown(content);

    let blockHtml = '';

    switch (themeId) {
      case 'comic-pop-light':
      case 'comic-pop-dark':
      case 'comic-light':
      case 'comic-dark':
        blockHtml = `
<div class="comic-mnemonic-box custom-card-block" style="border-left: 6px solid ${accentColor}; margin-top: 14px;">
  <span class="box-label" style="background-color: ${accentColor}; color: #000000; font-weight: 900;">${escapeHtml(title)}</span>
  <div class="custom-block-content" dir="${dir}">${contentHtml}</div>
</div>`;
        break;

      case 'comic-strip-light':
      case 'comic-strip-dark':
        blockHtml = `
<div class="strip-panel panel-custom custom-card-block" style="border-top: 5px solid ${accentColor}; margin-top: 14px;">
  <div class="panel-tag" style="background-color: ${accentColor}; color: #ffffff; font-weight: 900;">${escapeHtml(title)}</div>
  <div class="custom-block-content" dir="${dir}">${contentHtml}</div>
</div>`;
        break;

      case 'comic-quest-light':
      case 'comic-quest-dark':
      case 'comic-manga-light':
      case 'comic-manga-dark':
        blockHtml = `
<div class="quest-mnemonic-card custom-card-block" style="border-left: 6px solid ${accentColor}; margin-top: 14px;">
  <span class="quest-tag-purple" style="background-color: ${accentColor}; color: #ffffff; font-weight: 800;">${escapeHtml(title)}</span>
  <div class="quest-custom-content" dir="${dir}">${contentHtml}</div>
</div>`;
        break;

      case 'comic-notebook-light':
      case 'comic-notebook-dark':
        blockHtml = `
<div class="notebook-washi-mnemonic custom-card-block" style="border-left: 5px solid ${accentColor}; margin-top: 14px;">
  <span class="washi-title" style="color: ${accentColor}; font-weight: 800;">📌 ${escapeHtml(title)}</span>
  <div class="washi-text" dir="${dir}">${contentHtml}</div>
</div>`;
        break;

      case 'comic-arcade-light':
      case 'comic-arcade-dark':
        blockHtml = `
<div class="arcade-powerup-box custom-card-block" style="border-color: ${accentColor}; box-shadow: 0 0 12px ${accentColor}40; margin-top: 14px;">
  <div class="quest-terminal-header" style="color: ${accentColor}; font-weight: 800;">★ ${escapeHtml(title)}</div>
  <div class="arcade-custom-content" dir="${dir}">${contentHtml}</div>
</div>`;
        break;

      case 'minimal-light':
      case 'minimal-dark':
      case 'comic-minimal-light':
      case 'comic-minimal-dark':
      default:
        blockHtml = `
<div class="minimal-mnemonic-block custom-card-block" style="border-left: 4px solid ${accentColor}; margin-top: 14px;">
  <div class="minimal-mnemonic-label" style="color: ${accentColor}; font-weight: 700;">${escapeHtml(title)}</div>
  <div class="minimal-custom-content" dir="${dir}">${contentHtml}</div>
</div>`;
        break;
    }

    renderedBlocks.push(blockHtml);
  }

  return renderedBlocks.join('\n');
}

export function renderThemeHtml(
  templateHtml: string,
  data: CardData,
  options?: {
    isPreview?: boolean;
    cardType?: 'normal' | 'spelling';
    themeId?: ThemeId;
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

  // 4. Custom Sections / Blocks
  const activeThemeId = options?.themeId || 'comic-pop-dark';
  const customSectionsHtml = renderCustomBlocksHtml(data.customBlocks, activeThemeId);

  const replacements: Record<string, string> = {
    '{{Word}}': escapeHtml(data.word || ''),
    '{{Phonetic}}': escapeHtml(data.phonetic || '/.../'),
    '{{PartOfSpeech}}': escapeHtml(data.partOfSpeech || 'word'),
    '{{Meaning}}': renderMarkdown(data.meaningFa || ''),
    '{{Example}}': renderMarkdown(data.example || ''),
    '{{Translation}}': renderMarkdown(data.translationFa || ''),
    '{{Mnemonic}}': renderMarkdown(data.mnemonic || ''),
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

  // Handle CustomSections conditional tags
  if (customSectionsHtml) {
    html = html.replace(/\{\{#CustomSections\}\}/g, '');
    html = html.replace(/\{\{\/CustomSections\}\}/g, '');
    html = html.replaceAll('{{CustomSections}}', customSectionsHtml);
  } else {
    html = html.replace(/\{\{#CustomSections\}\}[\s\S]*?\{\{\/CustomSections\}\}/g, '');
    html = html.replaceAll('{{CustomSections}}', '');
  }

  return html;
}

export const SHARED_CARD_CSS = `
/* Shared Markdown & Custom Blocks CSS */
.custom-card-block {
  margin-top: 14px !important;
  box-sizing: border-box !important;
  position: relative !important;
  transition: all 0.2s ease !important;
}

.custom-block-header {
  margin-bottom: 8px !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.custom-block-content, .quest-custom-content, .notebook-custom-content, .arcade-custom-content, .minimal-custom-content {
  font-size: 14px !important;
  line-height: 1.65 !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

.card-inline-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-size: 0.9em !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  background-color: rgba(128, 128, 128, 0.2) !important;
  border: 1px solid rgba(128, 128, 128, 0.3) !important;
}

.card-bullet-list, .card-number-list {
  margin: 6px 0 !important;
  padding-inline-start: 24px !important;
}

.card-bullet-list li, .card-number-list li {
  margin-bottom: 4px !important;
  line-height: 1.5 !important;
}

.card-link {
  color: #38bdf8 !important;
  text-decoration: underline !important;
}
`;
