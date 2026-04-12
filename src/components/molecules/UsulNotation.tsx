"use client";

import {memo} from "react";
import {tokens} from "@/lib/tokens";
import {UsulSymbol as UsulSymbolType} from "@/types";

interface UsulNotationProps {
  symbols: UsulSymbolType[];
  beats: number;
  className?: string;
}

function UsulNotationComponent({symbols, beats, className = ""}: UsulNotationProps) {
  const getBeatDisplay = (symbol: UsulSymbolType["symbol"]) => {
    switch (symbol) {
      case "dum":
        return {top: "●", bottom: "−"};
      case "tek":
        return {top: "−", bottom: "●"};
      case "ke":
        return {top: "−", bottom: "◐"};
      case "":
        return {top: "", bottom: ""};
      default:
        return {top: "", bottom: ""};
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div 
        className={`p-4 ${tokens.colors.background.base} ${tokens.radius.md} overflow-x-auto`}
        role="img"
        aria-label={`${beats} beat rhythm pattern`}
      >
        <div className="flex gap-1 min-w-max">
          {symbols.map((symbol, idx) => {
            const display = getBeatDisplay(symbol.symbol);
            const beatWidth = symbol.timeValue * 48;
            
            return (
              <div
                key={`${symbol.symbol}-${idx}`}
                className="flex flex-col items-center"
                style={{width: `${beatWidth}px`}}
              >
                <div className={`text-2xl h-8 flex items-center justify-center ${tokens.colors.text.primary}`}>
                  {display.top}
                </div>
                
                <div 
                  className={`w-full h-0.5 ${tokens.colors.text.secondary}`}
                  style={{opacity: 0.3}}
                />
                
                <div 
                  className={`w-0.5 h-8 ${tokens.colors.text.secondary}`}
                  style={{opacity: 0.5}}
                />
                
                <div 
                  className={`w-full h-0.5 ${tokens.colors.text.secondary}`}
                  style={{opacity: 0.3}}
                />
                
                <div className={`text-2xl h-8 flex items-center justify-center ${tokens.colors.text.primary}`}>
                  {display.bottom}
                </div>
                
                {symbol.isAccent && (
                  <div 
                    className={`w-1 h-1 rounded-full mt-1 ${tokens.colors.accent.base}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className={`flex justify-center gap-8 text-xs ${tokens.colors.text.secondary}`}>
        <div className="flex items-center gap-1">
          <span className="text-lg">●</span>
          <span>Üst Satır: Sağ Diz (Düm)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">●</span>
          <span>Alt Satır: Sol Diz (Tek)</span>
        </div>
      </div>
    </div>
  );
}

export const UsulNotation = memo(UsulNotationComponent);
