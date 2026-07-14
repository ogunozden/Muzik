"use client";

import {tokens} from "@/shared/tokens";
import {Badge} from "@/shared/ui/atoms/Badge";

interface NoteChipProps {
  noteName: string;
  octave?: number;
  ariaLabel: string;
  color?: "primary" | "secondary" | "accent";
  className?: string;
}

export function NoteChip({
  noteName,
  octave,
  ariaLabel,
  color = "primary",
  className = "",
}: NoteChipProps) {
  const displayText = octave !== undefined ? `${noteName}${octave}` : noteName;

  return (
    <Badge
      color={color}
      ariaLabel={ariaLabel}
      className={`${tokens.spacing.xs} ${className}`}
    >
      {displayText}
    </Badge>
  );
}
