"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { tokens } from "@/lib/tokens";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`${tokens.radius.lg} ${tokens.colors.background.surface} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: CardProps) {
  return (
    <div {...props} className={`px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", ...props }: CardProps) {
  return (
    <div {...props} className={className}>
      {children}
    </div>
  );
}
