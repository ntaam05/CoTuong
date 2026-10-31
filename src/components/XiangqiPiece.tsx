'use client';

import React from 'react';
import { Piece } from '@/models/types';

interface XiangqiPieceProps {
  piece: Piece;
  isSelected?: boolean;
  isCheck?: boolean;
  size?: number;
  isJustMoved?: boolean;
  moveDelta?: { dx: number; dy: number } | null;
  theme?: 'classic' | 'dark' | 'light' | 'koi' | 'pond' | 'rain' | 'squid' | 'totoro' | 'white' | 'yinyang';
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
  piece, isSelected = false, isCheck = false, size = 46, isJustMoved = false, moveDelta = null, theme = 'classic',
}) => {
  const isRed = piece.color === 'red';
  const char = PIECE_CHARS[piece.type]?.[piece.color] || '?';
  const moveStyle = isJustMoved && moveDelta ? ({ '--move-dx': `${moveDelta.dx}%`, '--move-dy': `${moveDelta.dy}%` } as React.CSSProperties) : {};
  const glowCheck = isCheck ? 'shadow-[0_0_20px_rgba(239,68,68,0.9)] ring-2 ring-red-500 scale-110 z-40' : '';
  const moveAnim = isJustMoved ? 'animate-piece-slide z-20' : '';

  // ==========================================
  // 1. CÁC THEME ẢNH ĐỘNG (GIF SKINS)
  // ==========================================

  // 1.1 KOI (Kính Pha Lê 3D)
  if (theme === 'koi') {
    const glow = glowCheck || (isSelected ? 'ring-[2px] ring-white/90 scale-110 z-30' : 'hover:scale-105 hover:ring-1 hover:ring-white/50 z-10');
    const shadow = isSelected ? `inset 0 4px 12px rgba(255,255,255,0.9), inset 0 -4px 10px rgba(0,0,0,0.3), 0 10px 20px ${isRed ? 'rgba(225,29,72,0.5)' : 'rgba(255,255,255,0.4)'}` : 'inset 0 4px 12px rgba(255,255,255,0.7), inset 0 -6px 12px rgba(0,0,0,0.6), 0 8px 15px rgba(0,0,0,0.5)';
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.52)}px`, boxShadow: shadow, ...moveStyle }} className={`relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-300 transform rounded-full backdrop-blur-md border ${isRed ? 'bg-rose-500/15 border-rose-200/50 text-rose-700' : 'bg-slate-600/15 border-slate-300/40 text-slate-800'} ${glow} ${moveAnim}`}>
        <div className="absolute inset-[3px] rounded-full border-[1.5px] border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.5)] pointer-events-none" />
        <div className="absolute top-[2%] left-[10%] w-[80%] h-[45%] bg-gradient-to-b from-white/95 via-white/30 to-transparent rounded-[50%] pointer-events-none" />
        <span style={{ fontFamily: '"Noto Serif TC", serif', lineHeight: 1 }} className="relative z-10 drop-shadow-[0_1.5px_1px_rgba(255,255,255,0.9)]">{char}</span>
      </div>
    );
  }

  // 1.2 POND (Ngọc Bích)
  if (theme === 'pond') {
    const glow = glowCheck || (isSelected ? 'ring-2 ring-emerald-300 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-30' : 'hover:scale-105 z-10 shadow-lg');
    const bg = isRed ? 'bg-gradient-to-br from-rose-100 to-rose-300 border-rose-400 text-rose-700' : 'bg-gradient-to-br from-emerald-100 to-emerald-300 border-emerald-400 text-emerald-900';
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.52)}px`, ...moveStyle }} className={`relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-300 transform rounded-full border-2 ${bg} ${glow} ${moveAnim}`}>
        <div className="absolute inset-[2px] rounded-full shadow-[inset_0_4px_6px_rgba(255,255,255,0.8),inset_0_-4px_6px_rgba(0,0,0,0.1)] pointer-events-none" />
        <span style={{ fontFamily: '"Noto Serif TC", serif', lineHeight: 1 }} className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">{char}</span>
      </div>
    );
  }

  // 1.3 RAIN (Giọt Nước Trong Suốt)
  if (theme === 'rain') {
    const glow = glowCheck || (isSelected ? 'ring-2 ring-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.6)] z-30' : 'hover:scale-105 z-10 shadow-[0_5px_15px_rgba(0,0,0,0.2)]');
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.52)}px`, ...moveStyle }} className={`relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-300 transform rounded-full bg-blue-400/10 backdrop-blur-sm border border-white/40 ${glow} ${moveAnim}`}>
        <div className="absolute top-[5%] left-[15%] w-[70%] h-[35%] bg-gradient-to-b from-white/80 to-transparent rounded-[50%] pointer-events-none" />
        <div className="absolute inset-[1px] rounded-full shadow-[inset_0_-4px_10px_rgba(255,255,255,0.4)] pointer-events-none" />
        <span style={{ fontFamily: '"Noto Serif TC", serif', lineHeight: 1 }} className={`relative z-10 ${isRed ? 'text-red-500' : 'text-slate-800'} drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]`}>{char}</span>
      </div>
    );
  }

  // 1.4 SQUID (Dạ Quang Đại Dương)
  if (theme === 'squid') {
    const glow = glowCheck || (isSelected ? `ring-2 scale-110 z-30 ${isRed ? 'ring-pink-400 shadow-[0_0_20px_#f472b6]' : 'ring-cyan-400 shadow-[0_0_20px_#22d3ee]'}` : 'hover:scale-105 z-10');
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.52)}px`, ...moveStyle }} className={`relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-300 transform rounded-full bg-slate-900/60 backdrop-blur-md border ${isRed ? 'border-pink-500/50' : 'border-cyan-400/50'} ${glow} ${moveAnim}`}>
        <span style={{ fontFamily: '"Noto Serif TC", serif', lineHeight: 1 }} className={`relative z-10 ${isRed ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,1)]' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,1)]'}`}>{char}</span>
      </div>
    );
  }

  // 1.5 TOTORO (Gỗ Mộc & Lá Cây)
  if (theme === 'totoro') {
    const glow = glowCheck || (isSelected ? 'ring-2 ring-lime-400 scale-110 z-30 shadow-[0_0_15px_rgba(132,204,22,0.5)]' : 'hover:scale-105 z-10 shadow-lg');
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.52)}px`, ...moveStyle }} className={`relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-300 transform rounded-full bg-[#8B5A2B] border-[2.5px] border-[#4CAF50] ${glow} ${moveAnim}`}>
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_rgba(0,0,0,0.6)] pointer-events-none" />
        <span style={{ fontFamily: '"Noto Serif TC", serif', lineHeight: 1 }} className={`relative z-10 ${isRed ? 'text-[#FFD700]' : 'text-white'} drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`}>{char}</span>
      </div>
    );
  }

  // 1.6 WHITE (Sương Trắng mờ)
  if (theme === 'white') {
    const glow = glowCheck || (isSelected ? 'ring-2 ring-sky-300 scale-110 z-30 shadow-[0_0_20px_rgba(255,255,255,1)]' : 'hover:scale-105 z-10 shadow-[0_4px_12px_rgba(255,255,255,0.2)]');
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.52)}px`, ...moveStyle }} className={`relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-300 transform rounded-full bg-white/40 backdrop-blur-lg border border-white/60 ${glow} ${moveAnim}`}>
        <span style={{ fontFamily: '"Noto Serif TC", serif', lineHeight: 1 }} className={`relative z-10 ${isRed ? 'text-rose-600' : 'text-slate-700'} drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]`}>{char}</span>
      </div>
    );
  }

  // 1.7 YINYANG (Đá Trắng Đen Nguyên Khối)
  if (theme === 'yinyang') {
    const glow = glowCheck || (isSelected ? 'ring-2 ring-amber-400 scale-110 z-30 shadow-xl' : 'hover:scale-105 z-10 shadow-lg');
    const bg = isRed ? 'bg-slate-50 border-slate-300 text-red-600' : 'bg-zinc-900 border-zinc-700 text-white';
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.52)}px`, ...moveStyle }} className={`relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-300 transform rounded-full border-[2px] ${bg} ${glow} ${moveAnim}`}>
        <div className="absolute inset-[2px] rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.4)] pointer-events-none" />
        <span style={{ fontFamily: '"Noto Serif TC", serif', lineHeight: 1 }} className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{char}</span>
      </div>
    );
  }

  // ==========================================
  // 2. CÁC THEME CƠ BẢN DƯỚI ĐÂY GIỮ NGUYÊN (Classic, Dark, Light)
  // ==========================================
  if (theme === 'classic') {
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.52)}px`, ...moveStyle }} className={`rounded-full relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-150 transform hover:scale-105 ${isRed ? 'piece-red' : 'piece-black'} ${isSelected ? 'piece-selected z-20' : ''} ${isCheck ? 'piece-check z-30' : ''} ${moveAnim}`}>
        <div className="absolute inset-[3px] rounded-full border border-black/15 pointer-events-none" style={{ boxShadow: isRed ? 'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -1px 2px rgba(120,60,20,0.5)' : 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.8)' }} />
        <div className="absolute inset-[5px] rounded-full pointer-events-none border border-dashed border-black/20" />
        <span style={{ fontFamily: '"Noto Serif TC", serif', lineHeight: 1 }} className="relative z-10 font-black tracking-tighter">{char}</span>
      </div>
    );
  }

  let glowClass = '';
  if (isCheck) glowClass = 'shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse scale-110 z-40 border-red-500';
  else if (isSelected) glowClass = 'shadow-[0_0_15px_rgba(56,189,248,0.6)] scale-110 z-30 border-sky-400';
  else if (isJustMoved) glowClass = 'shadow-[0_0_10px_rgba(16,185,129,0.5)] z-20 border-emerald-500/50';
  else glowClass = theme === 'dark' ? 'shadow-[0_6px_12px_rgba(0,0,0,0.8)] hover:scale-105 z-10' : 'shadow-[0_4px_10px_rgba(0,0,0,0.15)] hover:scale-105 z-10';

  const bgClass = theme === 'dark'
    ? (isRed ? 'bg-gradient-to-br from-red-950 to-red-900 border-red-800' : 'bg-gradient-to-br from-zinc-800 to-zinc-950 border-zinc-700')
    : (isRed ? 'bg-gradient-to-br from-white to-red-50 border-red-200' : 'bg-gradient-to-br from-white to-slate-100 border-slate-300');

  const textClass = theme === 'dark'
    ? (isRed ? 'text-red-400 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]' : 'text-zinc-300 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]')
    : (isRed ? 'text-red-600' : 'text-slate-800');

  return (
    <div style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.52)}px`, ...moveStyle }} className={`relative flex items-center justify-center font-bold select-none cursor-pointer transition-all duration-300 transform rounded-full border-2 ${bgClass} ${glowClass} ${isJustMoved ? 'animate-piece-slide' : ''}`}>
      <div className="absolute inset-[2px] rounded-full opacity-50 pointer-events-none" style={{ border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)' }} />
      {isSelected && <div className="absolute inset-[-6px] rounded-full border-[1.5px] border-dashed border-sky-400/70 animate-spin pointer-events-none" style={{ animationDuration: '4s' }} />}
      <span style={{ fontFamily: '"Noto Serif TC", serif', lineHeight: 1 }} className={`relative z-10 font-black tracking-tighter ${textClass}`}>{char}</span>
    </div>
  );
};