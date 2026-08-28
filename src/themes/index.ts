import {
  ThemeDefinition,
  CardData,
  ThemeId,
  CustomCardBlock,
  getFrontCustomBlocks,
  getBackCustomBlocks,
} from '../types';
import { renderMarkdown, escapeHtml } from '../utils/markdown';
import { comicPopLightTheme } from './comic-pop-light';
import { comicPopDarkTheme } from './comic-pop-dark';
import { comicQuestLightTheme } from './comic-quest-light';
import { comicQuestDarkTheme } from './comic-quest-dark';
import { comicNotebookLightTheme } from './comic-notebook-light';
import { comicNotebookDarkTheme } from './comic-notebook-dark';
import { minimalLightTheme } from './minimal-light';
import { minimalDarkTheme } from './minimal-dark';
import {
  heroPopFrontSpellingHtml,
  duoQuestFrontSpellingHtml,
  indexNotebookFrontSpellingHtml,
  minimalFrontSpellingHtml,
} from './templates';

export const THEMES: Record<string, ThemeDefinition> = {
  // Light Themes (4)
  'comic-pop-light': comicPopLightTheme,
  'comic-quest-light': comicQuestLightTheme,
  'comic-notebook-light': comicNotebookLightTheme,
  'minimal-light': minimalLightTheme,

  // Dark Themes (4)
  'comic-pop-dark': comicPopDarkTheme,
  'comic-quest-dark': comicQuestDarkTheme,
  'comic-notebook-dark': comicNotebookDarkTheme,
  'minimal-dark': minimalDarkTheme,

  // Legacy Aliases for backwards compatibility
  'comic-manga-light': comicQuestLightTheme,
  'comic-manga-dark': comicQuestDarkTheme,
  'comic-minimal-light': minimalLightTheme,
  'comic-minimal-dark': minimalDarkTheme,
  'comic-strip-light': comicPopLightTheme,
  'comic-strip-dark': comicPopDarkTheme,
  'comic-arcade-light': comicQuestLightTheme,
  'comic-arcade-dark': comicQuestDarkTheme,
  'comic-light': comicPopLightTheme,
  'comic-dark': comicPopDarkTheme,
};

export const THEME_GROUPS = {
  light: [
    { id: 'comic-pop-light', name: 'Hero Pop (Light)', desc: 'Bold comic hero cards with halftone badges and action balloons.' },
    { id: 'comic-quest-light', name: 'Duo Quest (Light)', desc: 'Playful Duolingo-inspired learning UX with chunky 3D buttons.' },
    { id: 'comic-notebook-light', name: 'Index Notebook (Light)', desc: 'Ruled paper notebook with sticky index tabs and washi tape.' },
    { id: 'minimal-light', name: 'Minimal (Light)', desc: 'Clean, distraction-free classic Anki design with subtle borders.' },
  ],
  dark: [
    { id: 'comic-pop-dark', name: 'Hero Pop (Dark)', desc: 'Midnight comic hero panels with bright amber and cyan action badges.' },
    { id: 'comic-quest-dark', name: 'Duo Quest (Dark)', desc: 'Midnight gamified educational card with glowing XP accents.' },
    { id: 'comic-notebook-dark', name: 'Index Notebook (Dark)', desc: 'Chalkboard study notebook with neon highlighters and sticky notes.' },
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
    case 'comic-quest-light':
    case 'comic-quest-dark':
    case 'comic-manga-light':
    case 'comic-manga-dark':
      return duoQuestFrontSpellingHtml;
    case 'comic-notebook-light':
    case 'comic-notebook-dark':
      return indexNotebookFrontSpellingHtml;
    case 'minimal-light':
    case 'minimal-dark':
    case 'comic-minimal-light':
    case 'comic-minimal-dark':
    default:
      return minimalFrontSpellingHtml;
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

export function getContrastTextColor(hexColor?: string): string {
  if (!hexColor) return '#ffffff';
  let c = hexColor.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0f172a' : '#f8fafc';
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

    const bgColor = block.color || '#1E293B';
    const textColor = getContrastTextColor(bgColor);
    const badgeBg = textColor === '#0f172a' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.2)';
    const badgeBorder = textColor === '#0f172a' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)';
    const dir = block.dir || (isRTLText(content) ? 'rtl' : 'ltr');
    const contentHtml = content ? renderMarkdown(content) : '';

    let blockHtml = '';

    switch (themeId) {
      case 'comic-pop-light':
      case 'comic-pop-dark':
      case 'comic-light':
      case 'comic-dark':
        blockHtml = `
<div class="comic-mnemonic-box custom-card-block" style="background-color: ${bgColor} !important; color: ${textColor} !important; margin-top: 14px;">
  ${title ? `<span class="box-label" style="background-color: ${badgeBg}; color: ${textColor}; border: 2px solid ${badgeBorder}; font-weight: 900;">${escapeHtml(title)}</span>` : ''}
  ${contentHtml ? `<div class="custom-block-content" dir="${dir}" style="color: ${textColor};">${contentHtml}</div>` : ''}
</div>`;
        break;

      case 'comic-quest-light':
      case 'comic-quest-dark':
      case 'comic-manga-light':
      case 'comic-manga-dark':
        blockHtml = `
<div class="quest-mnemonic-card custom-card-block" style="background-color: ${bgColor} !important; color: ${textColor} !important; margin-top: 14px;">
  ${title ? `<span class="quest-tag-purple" style="background-color: ${badgeBg}; color: ${textColor}; font-weight: 800;">${escapeHtml(title)}</span>` : ''}
  ${contentHtml ? `<div class="quest-custom-content" dir="${dir}" style="color: ${textColor};">${contentHtml}</div>` : ''}
</div>`;
        break;

      case 'comic-notebook-light':
      case 'comic-notebook-dark':
        blockHtml = `
<div class="notebook-washi-mnemonic custom-card-block" style="background-color: ${bgColor} !important; color: ${textColor} !important; margin-top: 14px;">
  ${title ? `<span class="washi-title" style="color: ${textColor}; font-weight: 800;">📌 ${escapeHtml(title)}</span>` : ''}
  ${contentHtml ? `<div class="washi-text" dir="${dir}" style="color: ${textColor};">${contentHtml}</div>` : ''}
</div>`;
        break;

      case 'minimal-light':
      case 'minimal-dark':
      case 'comic-minimal-light':
      case 'comic-minimal-dark':
      default:
        blockHtml = `
<div class="minimal-mnemonic-block custom-card-block" style="background-color: ${bgColor} !important; color: ${textColor} !important; margin-top: 14px;">
  ${title ? `<div class="minimal-mnemonic-label" style="color: ${textColor}; font-weight: 700; opacity: 0.9;">${escapeHtml(title)}</div>` : ''}
  ${contentHtml ? `<div class="minimal-custom-content" dir="${dir}" style="color: ${textColor};">${contentHtml}</div>` : ''}
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

    const allWordSounds = [
      wordAudioUsNormal,
      wordAudioUsSlow,
      wordAudioUkNormal,
      wordAudioUkSlow,
    ].filter(Boolean).join(' ');
    wordAudio = allWordSounds || (data.wordAudioFileName ? `[sound:${data.wordAudioFileName}]` : '');

    const allExampleSounds = [
      exampleAudioUsNormal,
      exampleAudioUsSlow,
      exampleAudioUkNormal,
      exampleAudioUkSlow,
    ].filter(Boolean).join(' ');
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

  // 4. Custom Sections / Blocks strictly filtered by side using unified helpers
  const activeThemeId = options?.themeId || 'comic-pop-dark';
  const frontBlocks = getFrontCustomBlocks(data);
  const backBlocks = getBackCustomBlocks(data);

  const customFrontSectionsHtml = renderCustomBlocksHtml(frontBlocks, activeThemeId);
  const customBackSectionsHtml = renderCustomBlocksHtml(backBlocks, activeThemeId);
  const customSectionsHtml = renderCustomBlocksHtml(backBlocks, activeThemeId);

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

  // Handle CustomFrontSections conditional tags
  if (customFrontSectionsHtml) {
    html = html.replace(/\{\{#CustomFrontSections\}\}/g, '');
    html = html.replace(/\{\{\/CustomFrontSections\}\}/g, '');
    html = html.replaceAll('{{CustomFrontSections}}', customFrontSectionsHtml);
  } else {
    html = html.replace(/\{\{#CustomFrontSections\}\}[\s\S]*?\{\{\/CustomFrontSections\}\}/g, '');
    html = html.replaceAll('{{CustomFrontSections}}', '');
  }

  // Handle CustomBackSections conditional tags
  if (customBackSectionsHtml) {
    html = html.replace(/\{\{#CustomBackSections\}\}/g, '');
    html = html.replace(/\{\{\/CustomBackSections\}\}/g, '');
    html = html.replaceAll('{{CustomBackSections}}', customBackSectionsHtml);
    html = html.replace(/\{\{\^CustomBackSections\}\}[\s\S]*?\{\{\/CustomBackSections\}\}/g, '');
  } else {
    html = html.replace(/\{\{#CustomBackSections\}\}[\s\S]*?\{\{\/CustomBackSections\}\}/g, '');
    html = html.replaceAll('{{CustomBackSections}}', '');
    html = html.replace(/\{\{\^CustomBackSections\}\}/g, '');
    html = html.replace(/\{\{\/CustomBackSections\}\}/g, '');
  }

  // Handle CustomSections conditional tags (legacy/universal)
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
  padding: 12px 14px !important;
}

.custom-block-header {
  margin-bottom: 8px !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.custom-block-content, .quest-custom-content, .notebook-custom-content, .minimal-custom-content {
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
