"use client";

import {Button} from "@/shared/ui/atoms/Button";

interface PlaybackControlsProps {
  onPlay: () => void;
  onStop: () => void;
  onClear: () => void;
  isPlaying: boolean;
  playAriaLabel: string;
  stopAriaLabel: string;
  clearAriaLabel: string;
  className?: string;
}

export function PlaybackControls({
  onPlay,
  onStop,
  onClear,
  isPlaying,
  playAriaLabel,
  stopAriaLabel,
  clearAriaLabel,
  className = "",
}: PlaybackControlsProps) {
  return (
    <div className={`flex gap-2 items-center ${className}`}>
      {isPlaying ? (
        <Button
          variant="accent"
          size="sm"
          ariaLabel={stopAriaLabel}
          onPress={onStop}
        >
          {stopAriaLabel}
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          ariaLabel={playAriaLabel}
          onPress={onPlay}
        >
          {playAriaLabel}
        </Button>
      )}
      <Button
        variant="bordered"
        size="sm"
        ariaLabel={clearAriaLabel}
        onPress={onClear}
      >
        {clearAriaLabel}
      </Button>
    </div>
  );
}
