import React, { useState, useRef } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { useAppTheme } from '../context/ThemeContext';

interface AudioPlayerProps {
  base64Wav?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  base64Wav,
  label,
  className = '',
  size = 'md',
}) => {
  const { isDark } = useAppTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!base64Wav) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
    audioRef.current = audio;

    setIsPlaying(true);
    audio.play().catch((err) => {
      console.error('Audio play error:', err);
      setIsPlaying(false);
    });

    audio.onended = () => {
      setIsPlaying(false);
    };

    audio.onerror = () => {
      setIsPlaying(false);
    };
  };

  const isSmall = size === 'sm';

  const btnClasses = base64Wav
    ? isDark
      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-md font-medium cursor-pointer shadow-xs transition-colors'
      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-md font-medium cursor-pointer shadow-xs transition-colors'
    : isDark
    ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 rounded-md font-medium cursor-not-allowed opacity-60'
    : 'bg-zinc-50 text-zinc-400 border border-zinc-200 rounded-md font-medium cursor-not-allowed opacity-60';

  return (
    <button
      type="button"
      onClick={handlePlay}
      disabled={!base64Wav}
      title={base64Wav ? 'Play Audio' : 'Audio not generated yet'}
      className={`inline-flex items-center gap-1.5 transition-all select-none ${btnClasses} ${
        isSmall ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-1.5'
      } ${className}`}
    >
      {isPlaying ? (
        <Loader2 className={`animate-spin ${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-500`} />
      ) : (
        <Volume2 className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
      )}
      <span>{label || (isPlaying ? 'Playing...' : 'Audio')}</span>
    </button>
  );
};
