import {
  ThemeDefinition,
  CardData,
  ThemeId,
  CustomCardBlock,
  MainBoxCustomizations,
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
import { botanicalLightTheme } from './botanical-light';
import { botanicalDarkTheme } from './botanical-dark';
import {
  heroPopFrontSpellingHtml,
  duoQuestFrontSpellingHtml,
  indexNotebookFrontSpellingHtml,
  minimalFrontSpellingHtml,
  botanicalFrontSpellingHtml,
} from './templates';

export const THEMES: Record<string, ThemeDefinition> = {
  // Light Themes (5)
  'comic-pop-light': comicPopLightTheme,
  'comic-quest-light': comicQuestLightTheme,
  'comic-notebook-light': comicNotebookLightTheme,
  'minimal-light': minimalLightTheme,
  'botanical-light': botanicalLightTheme,

  // Dark Themes (5)
  'comic-pop-dark': comicPopDarkTheme,
  'comic-quest-dark': comicQuestDarkTheme,
  'comic-notebook-dark': comicNotebookDarkTheme,
  'minimal-dark': minimalDarkTheme,
  'botanical-dark': botanicalDarkTheme,

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
    { id: 'botanical-light', name: 'Botanical Sage (Light)', desc: 'Matcha and sage palette with cream rounded boxes and serene organic aesthetics.' },
  ],
  dark: [
    { id: 'comic-pop-dark', name: 'Hero Pop (Dark)', desc: 'Midnight comic hero panels with bright amber and cyan action badges.' },
    { id: 'comic-quest-dark', name: 'Duo Quest (Dark)', desc: 'Midnight gamified educational card with glowing XP accents.' },
    { id: 'comic-notebook-dark', name: 'Index Notebook (Dark)', desc: 'Chalkboard study notebook with neon highlighters and sticky notes.' },
    { id: 'minimal-dark', name: 'Minimal (Dark)', desc: 'Distraction-free dark Anki card with restrained colors and subtle borders.' },
    { id: 'botanical-dark', name: 'Botanical Sage (Dark)', desc: 'Charcoal-olive night mode with dark sage surfaces and pale matcha typography.' },
  ],
};

export function getSpellingFrontHtml(themeId: ThemeId): string {
  switch (themeId) {
    case 'botanical-light':
    case 'botanical-dark':
      return botanicalFrontSpellingHtml;
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

export function getHarmonizedBorder(hexColor?: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return 'rgba(255, 255, 255, 0.2)';
  let c = hexColor.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  let r = parseInt(c.substring(0, 2), 16) || 0;
  let g = parseInt(c.substring(2, 4), 16) || 0;
  let b = parseInt(c.substring(4, 6), 16) || 0;
  const isLight = (r * 299 + g * 587 + b * 114) / 1000 >= 140;
  const shift = isLight ? -35 : 45;
  r = Math.min(255, Math.max(0, r + shift));
  g = Math.min(255, Math.max(0, g + shift));
  b = Math.min(255, Math.max(0, b + shift));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
    const textColor = block.textColor || getContrastTextColor(bgColor);
    const borderColor = block.borderColor || getHarmonizedBorder(bgColor);
    const badgeBg = textColor === '#0f172a' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.2)';
    const badgeBorder = textColor === '#0f172a' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)';
    const dir = block.dir || (isRTLText(content) ? 'rtl' : 'ltr');
    const contentHtml = content ? renderMarkdown(content) : '';

    let blockHtml = '';

    switch (themeId) {
      case 'botanical-light':
      case 'botanical-dark':
        blockHtml = `
<div class="botanical-custom-block custom-card-block" style="background-color: ${bgColor} !important; color: ${textColor} !important; border: 1.5px solid ${borderColor} !important; border-radius: 18px !important; margin-top: 8px !important;">
  ${title ? `<div class="botanical-custom-title" style="color: ${textColor}; font-weight: 800; font-size: 13px; margin-bottom: 6px; letter-spacing: 0.3px;">${escapeHtml(title)}</div>` : ''}
  ${contentHtml ? `<div class="botanical-custom-content" dir="${dir}" style="color: ${textColor}; font-size: 14px; line-height: 1.5;">${contentHtml}</div>` : ''}
</div>`;
        break;

      case 'comic-pop-light':
      case 'comic-pop-dark':
      case 'comic-light':
      case 'comic-dark':
        blockHtml = `
<div class="comic-mnemonic-box custom-card-block" style="background-color: ${bgColor} !important; color: ${textColor} !important; border: 2px solid ${borderColor} !important; border-left: 6px solid ${borderColor} !important; margin-top: 8px !important;">
  ${title ? `<span class="box-label" style="background-color: ${badgeBg}; color: ${textColor}; border: 2px solid ${badgeBorder}; font-weight: 900;">${escapeHtml(title)}</span>` : ''}
  ${contentHtml ? `<div class="custom-block-content" dir="${dir}" style="color: ${textColor};">${contentHtml}</div>` : ''}
</div>`;
        break;

      case 'comic-quest-light':
      case 'comic-quest-dark':
      case 'comic-manga-light':
      case 'comic-manga-dark':
        blockHtml = `
<div class="quest-mnemonic-card custom-card-block" style="background-color: ${bgColor} !important; color: ${textColor} !important; border-color: ${borderColor} !important; box-shadow: 0 4px 0 ${borderColor} !important; margin-top: 8px !important;">
  ${title ? `<span class="quest-tag-purple" style="background-color: ${badgeBg}; color: ${textColor}; font-weight: 800;">${escapeHtml(title)}</span>` : ''}
  ${contentHtml ? `<div class="quest-custom-content" dir="${dir}" style="color: ${textColor};">${contentHtml}</div>` : ''}
</div>`;
        break;

      case 'comic-notebook-light':
      case 'comic-notebook-dark':
        blockHtml = `
<div class="notebook-washi-mnemonic custom-card-block" style="background-color: ${bgColor} !important; color: ${textColor} !important; border-color: ${borderColor} !important; margin-top: 8px !important;">
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
<div class="minimal-mnemonic-block custom-card-block" style="background-color: ${bgColor} !important; color: ${textColor} !important; border-color: ${borderColor} !important; margin-top: 8px !important;">
  ${title ? `<div class="minimal-mnemonic-label" style="color: ${textColor}; font-weight: 700; opacity: 0.9;">${escapeHtml(title)}</div>` : ''}
  ${contentHtml ? `<div class="minimal-custom-content" dir="${dir}" style="color: ${textColor};">${contentHtml}</div>` : ''}
</div>`;
        break;
    }

    renderedBlocks.push(blockHtml);
  }

  return renderedBlocks.join('\n');
}

export function renderMainBoxStyles(
  mainBoxStyles?: MainBoxCustomizations | null,
  themeId: ThemeId = 'comic-pop-dark'
): string {
  if (!mainBoxStyles) return '';
  const { meaning, definition, example, mnemonic } = mainBoxStyles;
  if (!meaning && !definition && !example && !mnemonic) return '';

  const cssRules: string[] = [];
  const scriptLines: string[] = [];

  // 1. Meaning Box
  if (meaning) {
    const bg = meaning.bgColor;
    const tc = meaning.textColor || (bg ? getContrastTextColor(bg) : undefined);
    const bc = meaning.borderColor || (bg ? getHarmonizedBorder(bg) : undefined);
    if (bg || tc || bc) {
      const parts = [];
      if (bg) parts.push(`background-color: ${bg} !important;`);
      if (bc) parts.push(`border-color: ${bc} !important; border-left-color: ${bc} !important;`);
      if (tc) parts.push(`color: ${tc} !important;`);
      cssRules.push(`.comic-meaning-box, .quest-meaning-banner, .notebook-highlighter-meaning, .minimal-meaning-block, .botanical-meaning-box { ${parts.join(' ')} }`);
      if (tc) {
        cssRules.push(`.comic-meaning-box *, .quest-meaning-banner *, .notebook-highlighter-meaning *, .minimal-meaning-block *, .botanical-meaning-box * { color: ${tc} !important; }`);
      }
    }
    if (meaning.title?.trim()) {
      scriptLines.push(`setBoxTitle(['.label-meaning', '.meaning-quest-label', '.highlighter-label', '.minimal-meaning-label', '.botanical-meaning-title'], ${JSON.stringify(meaning.title.trim())});`);
    }
  }

  // 2. English Definition Box
  if (definition) {
    const bg = definition.bgColor;
    const tc = definition.textColor || (bg ? getContrastTextColor(bg) : undefined);
    const bc = definition.borderColor || (bg ? getHarmonizedBorder(bg) : undefined);
    if (bg || tc || bc) {
      const parts = [];
      if (bg) parts.push(`background-color: ${bg} !important;`);
      if (bc) parts.push(`border-color: ${bc} !important; border-left-color: ${bc} !important;`);
      if (tc) parts.push(`color: ${tc} !important;`);
      cssRules.push(`.comic-definition-box, .quest-definition-card, .notebook-definition-note, .minimal-definition-block, .botanical-definition-box { ${parts.join(' ')} }`);
      if (tc) {
        cssRules.push(`.comic-definition-box *, .quest-definition-card *, .notebook-definition-note *, .minimal-definition-block *, .botanical-definition-box * { color: ${tc} !important; }`);
      }
    }
    if (definition.title?.trim()) {
      scriptLines.push(`setBoxTitle(['.label-definition', '.quest-tag-blue', '.notebook-definition-title', '.minimal-definition-label', '.botanical-definition-title'], ${JSON.stringify(definition.title.trim())});`);
    }
  }

  // 3. Example Box
  if (example) {
    const bg = example.bgColor;
    const tc = example.textColor || (bg ? getContrastTextColor(bg) : undefined);
    const bc = example.borderColor || (bg ? getHarmonizedBorder(bg) : undefined);
    if (bg || tc || bc) {
      const parts = [];
      if (bg) parts.push(`background-color: ${bg} !important;`);
      if (bc) parts.push(`border-color: ${bc} !important; border-left-color: ${bc} !important;`);
      if (tc) parts.push(`color: ${tc} !important;`);
      cssRules.push(`.comic-example-box, .quest-example-card, .notebook-sticky-example, .minimal-example-block, .botanical-example-box { ${parts.join(' ')} }`);
      if (tc) {
        cssRules.push(`.comic-example-box *, .quest-example-card *, .notebook-sticky-example *, .minimal-example-block *, .botanical-example-box * { color: ${tc} !important; }`);
      }
    }
    if (example.title?.trim()) {
      scriptLines.push(`setBoxTitle(['.label-example', '.example-quest-header .quest-tag', '.sticky-title', '.minimal-example-label', '.botanical-example-title'], ${JSON.stringify(example.title.trim())});`);
    }
  }

  // 4. Mnemonic Box
  if (mnemonic) {
    const bg = mnemonic.bgColor;
    const tc = mnemonic.textColor || (bg ? getContrastTextColor(bg) : undefined);
    const bc = mnemonic.borderColor || (bg ? getHarmonizedBorder(bg) : undefined);
    if (bg || tc || bc) {
      const parts = [];
      if (bg) parts.push(`background-color: ${bg} !important;`);
      if (bc) parts.push(`border-color: ${bc} !important; border-left-color: ${bc} !important;`);
      if (tc) parts.push(`color: ${tc} !important;`);
      cssRules.push(`.comic-mnemonic-box, .quest-mnemonic-card, .notebook-washi-mnemonic, .minimal-mnemonic-block, .botanical-mnemonic-box { ${parts.join(' ')} }`);
      if (tc) {
        cssRules.push(`.comic-mnemonic-box *, .quest-mnemonic-card *, .notebook-washi-mnemonic *, .minimal-mnemonic-block *, .botanical-mnemonic-box * { color: ${tc} !important; }`);
      }
    }
    if (mnemonic.title?.trim()) {
      scriptLines.push(`setBoxTitle(['.label-memory', '.quest-tag-purple', '.washi-title', '.minimal-mnemonic-label', '.botanical-mnemonic-title'], ${JSON.stringify(mnemonic.title.trim())});`);
    }
  }

  let result = '';
  if (cssRules.length > 0) {
    result += `<style>\n${cssRules.join('\n')}\n</style>\n`;
  }
  if (scriptLines.length > 0) {
    result += `<script>
(function() {
  function setBoxTitle(selectors, text) {
    if (!text) return;
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) {
        els[j].textContent = text;
      }
    }
  }
  ${scriptLines.join('\n  ')}
})();
</script>\n`;
  }

  return result;
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
    const isBotanical = options?.themeId?.includes('botanical');
    const makePreviewBtn = (target: string, label: string, b64?: string) => {
      if (b64) {
        if (isBotanical) {
          return `<button type="button" class="botanical-play-btn preview-play-btn" data-audio-target="${target}" title="Play ${label}"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="8 5 19 12 8 19 8 5" fill="#FFFFFF"/></svg></button>`;
        }
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
    '{{EnglishDefinition}}': renderMarkdown(data.definitionEn || ''),
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

  // Handle EnglishDefinition conditional tags
  if (data.definitionEn && data.definitionEn.trim()) {
    html = html.replace(/\{\{#EnglishDefinition\}\}/g, '');
    html = html.replace(/\{\{\/EnglishDefinition\}\}/g, '');
  } else {
    html = html.replace(/\{\{#EnglishDefinition\}\}[\s\S]*?\{\{\/EnglishDefinition\}\}/g, '');
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
    // 1. Strip inverted fallback block FIRST before removing any closing tags
    html = html.replace(/\{\{\^CustomBackSections\}\}[\s\S]*?\{\{\/CustomBackSections\}\}/g, '');
    // 2. Unwrap normal section and insert content
    html = html.replace(/\{\{#CustomBackSections\}\}/g, '');
    html = html.replace(/\{\{\/CustomBackSections\}\}/g, '');
    html = html.replaceAll('{{CustomBackSections}}', customBackSectionsHtml);
    // 3. Clear any remnant CustomSections tag
    html = html.replace(/\{\{#CustomSections\}\}[\s\S]*?\{\{\/CustomSections\}\}/g, '');
    html = html.replaceAll('{{CustomSections}}', '');
  } else {
    html = html.replace(/\{\{#CustomBackSections\}\}[\s\S]*?\{\{\/CustomBackSections\}\}/g, '');
    html = html.replaceAll('{{CustomBackSections}}', '');
    html = html.replace(/\{\{\^CustomBackSections\}\}/g, '');
    html = html.replace(/\{\{\/CustomBackSections\}\}/g, '');
    // Handle fallback CustomSections if older card uses it
    html = html.replace(/\{\{#CustomSections\}\}[\s\S]*?\{\{\/CustomSections\}\}/g, '');
    html = html.replaceAll('{{CustomSections}}', '');
  }

  // Handle MainBoxStyles conditional tags
  const mainBoxStylesHtml = renderMainBoxStyles(data.mainBoxStyles, activeThemeId);
  if (mainBoxStylesHtml) {
    html = html.replace(/\{\{#MainBoxStyles\}\}/g, '');
    html = html.replace(/\{\{\/MainBoxStyles\}\}/g, '');
    html = html.replaceAll('{{MainBoxStyles}}', mainBoxStylesHtml);
  } else {
    html = html.replace(/\{\{#MainBoxStyles\}\}[\s\S]*?\{\{\/MainBoxStyles\}\}/g, '');
    html = html.replaceAll('{{MainBoxStyles}}', '');
  }

  return html;
}

export const SHARED_CARD_CSS = `
/* Shared HTML & Custom Blocks CSS */
.custom-card-block {
  margin-top: 8px !important;
  box-sizing: border-box !important;
  position: relative !important;
  transition: all 0.2s ease !important;
  padding: 10px 14px !important;
}

.custom-card-block + .custom-card-block {
  margin-top: 8px !important;
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

.card-bullet-list, .card-number-list,
.custom-block-content ul, .quest-custom-content ul, .notebook-custom-content ul, .minimal-custom-content ul,
.custom-block-content ol, .quest-custom-content ol, .notebook-custom-content ol, .minimal-custom-content ol {
  margin: 6px 0 !important;
  padding-inline-start: 24px !important;
}

.card-bullet-list li, .card-number-list li,
.custom-block-content li, .quest-custom-content li, .notebook-custom-content li, .minimal-custom-content li {
  margin-bottom: 4px !important;
  line-height: 1.5 !important;
}

.card-link {
  color: #38bdf8 !important;
  text-decoration: underline !important;
}
`;
