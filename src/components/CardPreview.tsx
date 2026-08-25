import React, { useState, useEffect } from 'react';
import { CardData, ThemeDefinition, ThemeId, CardType, AppTheme } from '../types';
import { THEMES, renderThemeHtml, getSpellingFrontHtml } from '../themes';
import { Eye, Smartphone, Monitor } from 'lucide-react';
import { useAppTheme } from '../context/ThemeContext';

interface CardPreviewProps {
  cardData: CardData | null;
  themeId?: ThemeId;
  cardType?: CardType;
  emptyWordPlaceholder?: string;
  appTheme?: AppTheme;
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  cardData,
  themeId = 'comic-pop-dark',
  cardType = 'normal',
  emptyWordPlaceholder = 'eraser',
  appTheme: propTheme,
}) => {
  const themeContext = useAppTheme();
  const isDark = (propTheme || themeContext.appTheme) === 'anki-dark';

  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('back');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewCardType, setPreviewCardType] = useState<CardType>(cardType);

  useEffect(() => {
    if (cardData?.cardType) {
      setPreviewCardType(cardData.cardType);
    } else if (cardType) {
      setPreviewCardType(cardType);
    }
  }, [cardData?.cardType, cardType]);

  const theme: ThemeDefinition = THEMES[themeId] || THEMES['comic-pop-dark'] || THEMES['comic-dark'];

  // Default rich display data if empty
  const displayData: CardData = cardData || {
    word: emptyWordPlaceholder,
    phonetic: '/ɪˈreɪzər/',
    partOfSpeech: 'noun',
    meaningFa: 'پاک‌کن، ابزار پاک کردن',
    example: 'I made a pencil mistake and need an eraser.',
    translationFa: 'من با مداد اشتباه نوشتم و به یک پاک‌کن نیاز دارم.',
    mnemonic: 'ERASE-ER: It erases errors easily on paper.',
    cardType: previewCardType,
    spellingSentence: 'I made a pencil mistake and need an ______.',
    imageBase64: undefined,
  };

  // Play audio when clicking preview audio buttons
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('[data-audio-target]');
    if (!target) return;

    const audioType = target.getAttribute('data-audio-target');
    if (audioType === 'word_us_normal' && (displayData.wordAudioUsNormalBase64 || displayData.wordAudioBase64)) {
      playAudio(displayData.wordAudioUsNormalBase64 || displayData.wordAudioBase64!);
    } else if (audioType === 'word_us_slow' && displayData.wordAudioUsSlowBase64) {
      playAudio(displayData.wordAudioUsSlowBase64);
    } else if (audioType === 'word_uk_normal' && displayData.wordAudioUkNormalBase64) {
      playAudio(displayData.wordAudioUkNormalBase64);
    } else if (audioType === 'word_uk_slow' && displayData.wordAudioUkSlowBase64) {
      playAudio(displayData.wordAudioUkSlowBase64);
    } else if (audioType === 'example_us_normal' && (displayData.exampleAudioUsNormalBase64 || displayData.exampleAudioBase64)) {
      playAudio(displayData.exampleAudioUsNormalBase64 || displayData.exampleAudioBase64!);
    } else if (audioType === 'example_us_slow' && displayData.exampleAudioUsSlowBase64) {
      playAudio(displayData.exampleAudioUsSlowBase64);
    } else if (audioType === 'example_uk_normal' && displayData.exampleAudioUkNormalBase64) {
      playAudio(displayData.exampleAudioUkNormalBase64);
    } else if (audioType === 'example_uk_slow' && displayData.exampleAudioUkSlowBase64) {
      playAudio(displayData.exampleAudioUkSlowBase64);
    } else if (audioType === 'word' && displayData.wordAudioBase64) {
      playAudio(displayData.wordAudioBase64);
    } else if (audioType === 'example' && displayData.exampleAudioBase64) {
      playAudio(displayData.exampleAudioBase64);
    }
  };

  // Support interactive spelling check directly inside Live Preview
  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const activeEl = document.activeElement as HTMLInputElement;
      if (activeEl && activeEl.id === 'spelling-input') {
        e.preventDefault();
        const container = activeEl.closest('.spelling-card, .spelling-strip, .spelling-quest, .spelling-notebook, .spelling-arcade, .spelling-minimal, .comic-card-wrapper');
        if (container) {
          const btn = container.querySelector('.spelling-check-btn') as HTMLElement;
          if (btn) btn.click();
        }
      }
    }
  };

  const handleGlobalCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleCardClick(e);

    const checkBtn = (e.target as HTMLElement).closest('.spelling-check-btn');
    if (checkBtn) {
      const container = checkBtn.closest('.spelling-card, .spelling-strip, .spelling-quest, .spelling-notebook, .spelling-arcade, .spelling-minimal, .comic-card-wrapper');
      if (container) {
        const input = container.querySelector('#spelling-input') as HTMLInputElement;
        const result = container.querySelector('#spelling-result') as HTMLElement;
        const targetEl = container.querySelector('#spelling-target-word') as HTMLElement;
        const target = (targetEl ? (targetEl.innerText || targetEl.textContent) : displayData.word).trim().toLowerCase();
        if (input && result && target) {
          const typed = input.value.trim();
          if (!typed) {
            result.className = 'spelling-result is-empty';
            result.innerHTML = '<span class="spelling-empty-msg">⚠️ Please type your answer first!</span>';
            return;
          }
          if (typed.toLowerCase() === target) {
            result.className = 'spelling-result is-correct';
            result.innerHTML = `<div class="spelling-success-badge">✓ EXCELLENT! PERFECT SPELLING!</div><div class="spelling-word-reveal">${target}</div>`;
            input.classList.remove('has-error');
            input.classList.add('is-valid');
          } else {
            result.className = 'spelling-result is-incorrect';
            result.innerHTML = `<div class="spelling-error-badge">✕ INCORRECT SPELLING</div><div class="spelling-compare-box"><div class="spelling-user-typed"><span class="spelling-label">You typed:</span> <del class="spelling-mistake">${typed}</del></div><div class="spelling-correct-ans"><span class="spelling-label">Correct spelling:</span> <strong class="spelling-exact">${target}</strong></div></div>`;
            input.classList.add('has-error');
            input.classList.remove('is-valid');
          }
        }
      }
    }
  };

  const playAudio = (base64Data: string) => {
    try {
      let audioUrl = base64Data;
      if (!audioUrl.startsWith('data:')) {
        const isMp3 = !base64Data.startsWith('UklGR');
        const mime = isMp3 ? 'audio/mpeg' : 'audio/wav';
        audioUrl = `data:${mime};base64,${base64Data}`;
      }
      const audio = new Audio(audioUrl);
      audio.play().catch((err) => console.error('Audio play error:', err));
    } catch (e) {
      console.error('Failed to create Audio instance:', e);
    }
  };

  const frontTemplate = previewCardType === 'spelling' ? getSpellingFrontHtml(theme.id) : theme.frontHtml;
  const frontRendered = renderThemeHtml(frontTemplate, { ...displayData, cardType: previewCardType }, { isPreview: true, cardType: previewCardType });
  const backRendered = renderThemeHtml(theme.backHtml, { ...displayData, cardType: previewCardType }, { isPreview: true, cardType: previewCardType });

  return (
    <div className={`w-full flex flex-col h-full min-w-0 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      {/* Inject Selected Card Theme CSS (isolated to the card content) */}
      <style>{theme.css}</style>

      {/* Preview Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-500" />
          <span className={`text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {theme.name} • {previewCardType === 'spelling' ? 'Spelling Challenge' : 'Vocabulary'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Card Type Toggle [ Normal | Spelling ] */}
          <div className={`inline-flex border p-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
            <button
              type="button"
              onClick={() => setPreviewCardType('normal')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                previewCardType === 'normal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setPreviewCardType('spelling')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                previewCardType === 'spelling'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Spelling
            </button>
          </div>

          {/* Desktop / Mobile Width Mode Toggle */}
          <div className={`inline-flex border p-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              title="Desktop View (Full Width)"
              className={`p-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'desktop'
                  ? isDark
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-200 text-zinc-900'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-medium">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              title="Mobile / AnkiDroid View (~340px)"
              className={`p-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'mobile'
                  ? isDark
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-200 text-zinc-900'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-medium">AnkiDroid</span>
            </button>
          </div>

          {/* Front / Back Toggle Buttons */}
          <div className={`inline-flex border p-0.5 gap-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`text-xs px-2.5 py-1 font-medium rounded transition-colors cursor-pointer ${
                activeSide === 'front'
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-white font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-700'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`text-xs px-2.5 py-1 font-medium rounded transition-colors cursor-pointer ${
                activeSide === 'back'
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-white font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-700'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('both')}
              className={`text-xs px-2.5 py-1 font-medium rounded transition-colors cursor-pointer ${
                activeSide === 'both'
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-white font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-700'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Both
            </button>
          </div>
        </div>
      </div>

      {/* Render Canvas (Exact Anki Template & CSS) */}
      <div
        onClick={handleGlobalCardClick}
        onKeyDown={handleCardKeyDown}
        className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-6 py-2"
      >
        {(activeSide === 'front' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <div
                className={`mb-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border shadow-xs ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                — FRONT CARD ({previewCardType.toUpperCase()}) —
              </div>
            )}
            <div
              className={`w-full transition-all duration-200 ${
                viewMode === 'mobile'
                  ? `max-w-[340px] border-x-2 border-dashed ${isDark ? 'border-zinc-700' : 'border-zinc-300'} p-1`
                  : 'max-w-md'
              }`}
              dangerouslySetInnerHTML={{ __html: frontRendered }}
            />
          </div>
        )}

        {(activeSide === 'back' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <div
                className={`mb-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border shadow-xs ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                — BACK CARD —
              </div>
            )}
            <div
              className={`w-full transition-all duration-200 ${
                viewMode === 'mobile'
                  ? `max-w-[340px] border-x-2 border-dashed ${isDark ? 'border-zinc-700' : 'border-zinc-300'} p-1`
                  : 'max-w-md'
              }`}
              dangerouslySetInnerHTML={{ __html: backRendered }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
