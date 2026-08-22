import React, { useState, useEffect } from 'react';
import { CardData, ThemeDefinition, ThemeId, CardType, AppTheme } from '../types';
import { THEMES, renderThemeHtml, getSpellingFrontHtml } from '../themes';
import { Eye, Sparkles, Volume2, Smartphone, Monitor, CheckCircle, HelpCircle } from 'lucide-react';

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
  appTheme = 'comic',
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('back');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewCardType, setPreviewCardType] = useState<CardType>(cardType);

  const isMinimalLight = appTheme === 'minimal-light';
  const isMinimalDark = appTheme === 'minimal-dark';
  const isMinimal = isMinimalLight || isMinimalDark;

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
    } else if (audioType === 'example_uk_normal' && displayData.exampleAudioUkNormalBase64) {
      playAudio(displayData.exampleAudioUkNormalBase64);
    } else if (audioType === 'word' && displayData.wordAudioBase64) {
      playAudio(displayData.wordAudioBase64);
    } else if (audioType === 'example' && displayData.exampleAudioBase64) {
      playAudio(displayData.exampleAudioBase64);
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
    <div className={`w-full flex flex-col h-full min-w-0 ${isMinimalDark ? 'text-zinc-100' : 'text-black'}`}>
      {/* Inject Selected Theme CSS */}
      <style>{theme.css}</style>

      {/* Preview Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Eye className={`w-4 h-4 ${isMinimal ? 'text-blue-500' : 'text-[#FF4B4B]'}`} />
          <span className={`text-xs ${isMinimal ? 'font-semibold text-slate-700 dark:text-zinc-300' : 'font-black uppercase tracking-wider text-black'}`}>
            {theme.name} • {previewCardType === 'spelling' ? 'Spelling Mode' : 'Normal Mode'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Card Type Toggle [ Normal | Spelling ] */}
          <div className={isMinimal ? 'inline-flex border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 rounded-md shadow-sm' : 'inline-flex border-2 border-black bg-white p-0.5 shadow-[2px_2px_0px_#000000]'}>
            <button
              type="button"
              onClick={() => setPreviewCardType('normal')}
              className={
                isMinimal
                  ? `px-2.5 py-0.5 text-xs font-medium rounded transition-all cursor-pointer ${
                      previewCardType === 'normal'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isMinimalDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`
                  : `px-2 py-0.5 text-[11px] font-black uppercase transition-all cursor-pointer ${
                      previewCardType === 'normal'
                        ? 'bg-[#4ADE80] text-black shadow-inner'
                        : 'bg-zinc-100 text-black hover:bg-zinc-200'
                    }`
              }
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setPreviewCardType('spelling')}
              className={
                isMinimal
                  ? `px-2.5 py-0.5 text-xs font-medium rounded transition-all cursor-pointer ${
                      previewCardType === 'spelling'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : isMinimalDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`
                  : `px-2 py-0.5 text-[11px] font-black uppercase transition-all cursor-pointer ${
                      previewCardType === 'spelling'
                        ? 'bg-[#C084FC] text-black shadow-inner'
                        : 'bg-zinc-100 text-black hover:bg-zinc-200'
                    }`
              }
            >
              Spelling
            </button>
          </div>

          {/* Desktop / Mobile Width Mode Toggle */}
          <div className={isMinimal ? 'inline-flex border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 rounded-md shadow-sm' : 'inline-flex border-2 border-black bg-white p-0.5 shadow-[2px_2px_0px_#000000]'}>
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              title="Desktop View (Full Width)"
              className={
                isMinimal
                  ? `p-1 text-xs font-medium rounded transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'desktop'
                        ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                    }`
                  : `p-1 text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'desktop' ? 'bg-[#38BDF8] text-black shadow-inner' : 'bg-zinc-100 text-black hover:bg-zinc-200'
                    }`
              }
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-bold uppercase">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              title="Mobile / AnkiDroid View (Narrow ~340px)"
              className={
                isMinimal
                  ? `p-1 text-xs font-medium rounded transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'mobile'
                        ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                    }`
                  : `p-1 text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'mobile' ? 'bg-[#38BDF8] text-black shadow-inner' : 'bg-zinc-100 text-black hover:bg-zinc-200'
                    }`
              }
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-bold uppercase">AnkiDroid</span>
            </button>
          </div>

          {/* Front / Back Toggle Buttons */}
          <div className={isMinimal ? 'inline-flex border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 gap-0.5 rounded-md shadow-sm' : 'inline-flex border-2 border-black bg-white p-0.5 gap-1 shadow-[2px_2px_0px_#000000]'}>
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={
                isMinimal
                  ? `text-xs px-2.5 py-0.5 font-medium rounded transition-all cursor-pointer ${
                      activeSide === 'front'
                        ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`
                  : `text-xs px-2.5 py-1 font-black uppercase transition-all cursor-pointer ${
                      activeSide === 'front'
                        ? 'bg-[#FFD93D] text-black shadow-inner'
                        : 'bg-zinc-100 text-black hover:bg-zinc-200'
                    }`
              }
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={
                isMinimal
                  ? `text-xs px-2.5 py-0.5 font-medium rounded transition-all cursor-pointer ${
                      activeSide === 'back'
                        ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`
                  : `text-xs px-2.5 py-1 font-black uppercase transition-all cursor-pointer ${
                      activeSide === 'back'
                        ? 'bg-[#FFD93D] text-black shadow-inner'
                        : 'bg-zinc-100 text-black hover:bg-zinc-200'
                    }`
              }
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('both')}
              className={
                isMinimal
                  ? `text-xs px-2.5 py-0.5 font-medium rounded transition-all cursor-pointer ${
                      activeSide === 'both'
                        ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`
                  : `text-xs px-2.5 py-1 font-black uppercase transition-all cursor-pointer ${
                      activeSide === 'both'
                        ? 'bg-[#FFD93D] text-black shadow-inner'
                        : 'bg-zinc-100 text-black hover:bg-zinc-200'
                    }`
              }
            >
              Both
            </button>
          </div>
        </div>
      </div>

      {/* Render Canvas (Exact Anki Template & CSS) */}
      <div
        onClick={handleCardClick}
        className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-6 py-2"
      >
        {(activeSide === 'front' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-black bg-[#38BDF8] px-2.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_#000000]">
                — FRONT CARD ({previewCardType.toUpperCase()}) —
              </div>
            )}
            <div
              className={`w-full transition-all duration-200 ${
                viewMode === 'mobile' ? 'max-w-[340px] border-x-2 border-dashed border-zinc-400 p-1' : 'max-w-md'
              }`}
              dangerouslySetInnerHTML={{ __html: frontRendered }}
            />
          </div>
        )}

        {(activeSide === 'back' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-black bg-[#4ADE80] px-2.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_#000000]">
                — BACK CARD —
              </div>
            )}
            <div
              className={`w-full transition-all duration-200 ${
                viewMode === 'mobile' ? 'max-w-[340px] border-x-2 border-dashed border-zinc-400 p-1' : 'max-w-md'
              }`}
              dangerouslySetInnerHTML={{ __html: backRendered }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
