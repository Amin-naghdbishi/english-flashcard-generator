import React, { useState } from 'react';
import { CardData, ThemeDefinition } from '../types';
import { THEMES, renderThemeHtml } from '../themes';
import { Eye, Sparkles, Volume2 } from 'lucide-react';

interface CardPreviewProps {
  cardData: CardData | null;
  themeId?: 'comic-dark' | 'comic-light';
  emptyWordPlaceholder?: string;
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  cardData,
  themeId = 'comic-dark',
  emptyWordPlaceholder = 'abandon',
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('back');
  const theme: ThemeDefinition = THEMES[themeId] || THEMES['comic-dark'];

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
      playBase64Audio(displayData.wordAudioUsNormalBase64 || displayData.wordAudioBase64!);
    } else if (audioType === 'word_us_slow' && displayData.wordAudioUsSlowBase64) {
      playBase64Audio(displayData.wordAudioUsSlowBase64);
    } else if (audioType === 'word_uk_normal' && displayData.wordAudioUkNormalBase64) {
      playBase64Audio(displayData.wordAudioUkNormalBase64);
    } else if (audioType === 'word_uk_slow' && displayData.wordAudioUkSlowBase64) {
      playBase64Audio(displayData.wordAudioUkSlowBase64);
    } else if (audioType === 'example_us_normal' && (displayData.exampleAudioUsNormalBase64 || displayData.exampleAudioBase64)) {
      playBase64Audio(displayData.exampleAudioUsNormalBase64 || displayData.exampleAudioBase64!);
    } else if (audioType === 'example_uk_normal' && displayData.exampleAudioUkNormalBase64) {
      playBase64Audio(displayData.exampleAudioUkNormalBase64);
    } else if (audioType === 'word' && displayData.wordAudioBase64) {
      playBase64Audio(displayData.wordAudioBase64);
    } else if (audioType === 'example' && displayData.exampleAudioBase64) {
      playBase64Audio(displayData.exampleAudioBase64);
    }
  };

  const playBase64Audio = (base64Wav: string) => {
    try {
      const audioUrl = base64Wav.startsWith('data:')
        ? base64Wav
        : `data:audio/wav;base64,${base64Wav}`;
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#FF4B4B]" />
          <span className="text-xs font-black uppercase tracking-wider text-black">
            Live Anki Card Preview ({theme.name})
          </span>
        </div>

        {/* Front / Back Toggle Buttons */}
        <div className="inline-flex border-2 border-black bg-white p-0.5 gap-1 shadow-[2px_2px_0px_#000000]">
          <button
            type="button"
            onClick={() => setActiveSide('front')}
            className={`text-xs px-3 py-1 font-black uppercase transition-all cursor-pointer ${
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
            className={`text-xs px-3 py-1 font-black uppercase transition-all cursor-pointer ${
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
            className={`text-xs px-3 py-1 font-black uppercase transition-all cursor-pointer ${
              activeSide === 'both'
                ? 'bg-[#FFD93D] text-black shadow-inner'
                : 'bg-zinc-100 text-black hover:bg-zinc-200'
            }`}
          >
            Both
          </button>
        </div>
      </div>

      {/* Direct Piper Audio Controls if generated */}
      {hasAnyAudio && (
        <div className="mb-3 p-2 bg-white border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-wrap items-center justify-between gap-2 text-black text-xs font-bold">
          <div className="flex items-center gap-1.5 text-zinc-700">
            <Volume2 className="w-3.5 h-3.5 text-[#FF4B4B]" />
            <span>Piper Pronunciations:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(displayData.wordAudioUsNormalBase64 || displayData.wordAudioBase64) && (
              <button
                type="button"
                onClick={() => playBase64Audio((displayData.wordAudioUsNormalBase64 || displayData.wordAudioBase64)!)}
                className="bg-[#FFD93D] border border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1px_1px_0px_#000000] hover:bg-[#ffe066] cursor-pointer"
              >
                🇺🇸 US (1.0x)
              </button>
            )}
            {displayData.wordAudioUsSlowBase64 && (
              <button
                type="button"
                onClick={() => playBase64Audio(displayData.wordAudioUsSlowBase64!)}
                className="bg-[#fed7aa] border border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1px_1px_0px_#000000] hover:bg-[#ffedd5] cursor-pointer"
              >
                🐢 US Slow
              </button>
            )}
            {displayData.wordAudioUkNormalBase64 && (
              <button
                type="button"
                onClick={() => playBase64Audio(displayData.wordAudioUkNormalBase64!)}
                className="bg-[#38BDF8] border border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1px_1px_0px_#000000] hover:bg-[#7dd3fc] cursor-pointer"
              >
                🇬🇧 UK (1.0x)
              </button>
            )}
            {displayData.wordAudioUkSlowBase64 && (
              <button
                type="button"
                onClick={() => playBase64Audio(displayData.wordAudioUkSlowBase64!)}
                className="bg-[#bae6fd] border border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1px_1px_0px_#000000] hover:bg-[#e0f2fe] cursor-pointer"
              >
                🐢 UK Slow
              </button>
            )}
            {(displayData.exampleAudioUsNormalBase64 || displayData.exampleAudioBase64) && (
              <button
                type="button"
                onClick={() => playBase64Audio((displayData.exampleAudioUsNormalBase64 || displayData.exampleAudioBase64)!)}
                className="bg-[#4ADE80] border border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1px_1px_0px_#000000] hover:bg-[#86efac] cursor-pointer"
              >
                🇺🇸 Example
              </button>
            )}
            {displayData.exampleAudioUkNormalBase64 && (
              <button
                type="button"
                onClick={() => playBase64Audio(displayData.exampleAudioUkNormalBase64!)}
                className="bg-[#86efac] border border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1px_1px_0px_#000000] hover:bg-[#bbf7d0] cursor-pointer"
              >
                🇬🇧 Example
              </button>
            )}
          </div>
        </div>
      )}

      {/* Render Canvas (Exact Anki Template & CSS) */}
      <div
        onClick={handleCardClick}
        className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-6 py-2"
      >
        {(activeSide === 'front' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-black bg-[#38BDF8] px-2.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_#000000]">
                — FRONT TEMPLATE (ANKI) —
              </div>
            )}
            <div
              className="w-full max-w-md"
              dangerouslySetInnerHTML={{ __html: frontRendered }}
            />
          </div>
        )}

        {(activeSide === 'back' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-black bg-[#4ADE80] px-2.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_#000000]">
                — BACK TEMPLATE (ANKI) —
              </div>
            )}
            <div
              className="w-full max-w-md"
              dangerouslySetInnerHTML={{ __html: backRendered }}
            />
          </div>
        )}

        {/* Template Fidelity Notice */}
        <div className="text-center text-[11px] font-bold flex items-center justify-center gap-1.5 text-zinc-600 mt-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FFD93D]" />
          <span>100% Anki Template Fidelity: Uses identical HTML & CSS rendered in Anki with offline Piper TTS sound.</span>
        </div>
      </div>
    </div>
  );
};

