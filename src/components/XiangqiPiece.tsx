'use client';

import React from 'react';
import { Piece } from '@/models/types';

interface XiangqiPieceProps {
  piece: Piece;
  isSelected?: boolean;
  isCheck?: boolean;
  size?: number; // pixel size
  isJustMoved?: boolean;
  moveDelta?: { dx: number; dy: number } | null;
}

const PIECE_CHARS: Record<string, { red: string; black: string }> = {
  king: { red: '帥', black: '將' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '傌', black: '馬' },
  rook: { red: '俥', black: '車' },
  cannon: { red: '炮', black: '砲' },
  pawn: { red: '兵', black: '卒' },
};

export const XiangqiPiece: React.FC<XiangqiPieceProps> = ({
  piece,
  isSelected = false,
  isCheck = false,
  size = 46,
  isJustMoved = false,
  moveDelta = null,
}) => {
  const isRed = piece.color === 'red';
  const char = PIECE_CHARS[piece.type]?.[piece.color] || '?';

  const moveStyle =
    isJustMoved && moveDelta
      ? ({
          '--move-dx': `${moveDelta.dx}%`,
          '--move-dy': `${moveDelta.dy}%`,
        } as React.CSSProperties)
      : {};

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.round(size * 0.52)}px`,
        ...moveStyle,
      }}
      className={`rounded-full relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-150 transform hover:scale-105 ${
        isRed ? 'piece-red' : 'piece-black'
      } ${isSelected ? 'piece-selected z-20' : ''} ${
        isCheck ? 'piece-check z-30' : ''
      } ${isJustMoved ? 'animate-piece-slide z-20' : ''}`}
    >
      {/* Outer wooden border groove */}
      <div
        className="absolute inset-[3px] rounded-full border border-black/15 pointer-events-none"
        style={{
          boxShadow: isRed
            ? 'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -1px 2px rgba(120,60,20,0.5)'
            : 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.8)',
        }}
      />

      {/* Inner circular line characteristic of traditional pieces */}
      <div
        className="absolute inset-[5px] rounded-full pointer-events-none"
        style={{
          border: isRed ? '1px dashed rgba(185, 28, 28, 0.4)' : '1px dashed rgba(203, 213, 225, 0.3)',
        }}
      />

      {/* Calligraphy Character */}
      <span
        style={{
          fontFamily: '"Noto Serif TC", serif',
          lineHeight: 1,
        }}
        className="relative z-10 font-black tracking-tighter"
      >
        {char}
      </span>
    </div>
  );
};
