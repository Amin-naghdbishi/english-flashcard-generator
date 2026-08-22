import React, { useState, useRef } from 'react';
import { Volume2, Loader2, Play } from 'lucide-react';

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

  return (
    <button
      type="button"
      onClick={handlePlay}
      disabled={!base64Wav}
      title={base64Wav ? 'Play Audio' : 'Audio not generated yet'}
      className={`inline-flex items-center gap-1.5 font-black uppercase transition-all select-none border-2 border-black ${
        base64Wav
          ? 'bg-amber-400 text-black hover:bg-amber-300 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_#000000] cursor-pointer'
          : 'bg-zinc-700 text-zinc-400 border-zinc-900 cursor-not-allowed opacity-60'
      } ${isSmall ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-1.5'} ${className}`}
    >
      {isPlaying ? (
        <Loader2 className={`animate-spin ${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-black`} />
      ) : (
        <Volume2 className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
      )}
      <span>{label || (isPlaying ? 'Playing...' : 'Audio')}</span>
    </button>
  );
};
