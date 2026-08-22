import React, { useState } from 'react';
import { CardData, ThemeDefinition, ThemeId } from '../types';
import { THEMES, renderThemeHtml } from '../themes';
import { Eye, Sparkles, Volume2, Smartphone, Monitor } from 'lucide-react';

interface CardPreviewProps {
  cardData: CardData | null;
  themeId?: ThemeId;
  emptyWordPlaceholder?: string;
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  cardData,
  themeId = 'comic-pop-dark',
  emptyWordPlaceholder = 'abandon',
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('back');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const theme: ThemeDefinition = THEMES[themeId] || THEMES['comic-pop-dark'] || THEMES['comic-dark'];

  // Default display data if empty
  const displayData: CardData = cardData || {
    word: emptyWordPlaceholder,
    phonetic: '/əˈbændən/',
    partOfSpeech: 'verb',
    meaningFa: 'رها کردن، ترک کردن، دست کشیدن از',
    example: 'He had to abandon his car in the heavy snowstorm.',
    translationFa: 'او مجبور شد در طوفان شدید برف ماشینش را رها کند.',
    mnemonic: 'A-BANDON: A band on the run abandons their instruments.',
    wordAudioBase64: undefined,
    exampleAudioBase64: undefined,
  };

  // Play audio when clicking audio buttons rendered in theme HTML
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
        // Detect if MP3 or WAV
        const isMp3 = displayData.wordAudioUsNormalFileName?.endsWith('.mp3') ||
                      displayData.exampleAudioUsNormalFileName?.endsWith('.mp3') ||
                      !base64Data.startsWith('UklGR'); // 'RIFF' in base64 is UklGR
        const mime = isMp3 ? 'audio/mpeg' : 'audio/wav';
        audioUrl = `data:${mime};base64,${base64Data}`;
      }
      const audio = new Audio(audioUrl);
      audio.play().catch((err) => console.error('Audio play error:', err));
    } catch (e) {
      console.error('Failed to create Audio instance:', e);
    }
  };

  const frontRendered = renderThemeHtml(theme.frontHtml, displayData, { isPreview: true });
  const backRendered = renderThemeHtml(theme.backHtml, displayData, { isPreview: true });

  const hasAnyAudio = !!(
    displayData.wordAudioUsNormalBase64 ||
    displayData.wordAudioUsSlowBase64 ||
    displayData.wordAudioUkNormalBase64 ||
    displayData.wordAudioUkSlowBase64 ||
    displayData.exampleAudioUsNormalBase64 ||
    displayData.exampleAudioUkNormalBase64 ||
    displayData.wordAudioBase64 ||
    displayData.exampleAudioBase64
  );

  return (
    <div className="w-full flex flex-col h-full">
      {/* Inject Theme CSS into page */}
      <style>{theme.css}</style>

      {/* Preview Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#FF4B4B]" />
          <span className="text-xs font-black uppercase tracking-wider text-black">
            Card Preview ({theme.name})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile / Desktop Width Mode Toggle */}
          <div className="inline-flex border-2 border-black bg-white p-0.5 shadow-[2px_2px_0px_#000000]">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              title="Desktop View (Full Width)"
              className={`p-1 text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'desktop' ? 'bg-[#38BDF8] text-black shadow-inner' : 'bg-zinc-100 text-black hover:bg-zinc-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-black uppercase">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              title="Mobile / AnkiDroid View (Narrow ~340px)"
              className={`p-1 text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'mobile' ? 'bg-[#38BDF8] text-black shadow-inner' : 'bg-zinc-100 text-black hover:bg-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-black uppercase">AnkiDroid</span>
            </button>
          </div>

          {/* Front / Back Toggle Buttons */}
          <div className="inline-flex border-2 border-black bg-white p-0.5 gap-1 shadow-[2px_2px_0px_#000000]">
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`text-xs px-2.5 py-1 font-black uppercase transition-all cursor-pointer ${
                activeSide === 'front'
                  ? 'bg-[#FFD93D] text-black shadow-inner'
                  : 'bg-zinc-100 text-black hover:bg-zinc-200'
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`text-xs px-2.5 py-1 font-black uppercase transition-all cursor-pointer ${
                activeSide === 'back'
                  ? 'bg-[#FFD93D] text-black shadow-inner'
                  : 'bg-zinc-100 text-black hover:bg-zinc-200'
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('both')}
              className={`text-xs px-2.5 py-1 font-black uppercase transition-all cursor-pointer ${
                activeSide === 'both'
                  ? 'bg-[#FFD93D] text-black shadow-inner'
                  : 'bg-zinc-100 text-black hover:bg-zinc-200'
              }`}
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
                — FRONT CARD —
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
