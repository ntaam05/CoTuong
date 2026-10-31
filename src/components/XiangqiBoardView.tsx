'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BoardPosition, Move, PieceColor, Position } from '@/models/types';
import { XiangqiPiece } from './XiangqiPiece';
import { XiangqiEngine } from '@/models/XiangqiBoard';
import { Sparkles, Fish, CloudRain, Waves, Leaf, Wind, Image as ImageIcon, Palette, Aperture, X, Moon, Sun } from 'lucide-react';

interface XiangqiBoardViewProps {
  board: BoardPosition;
  currentTurn: PieceColor;
  playerColor?: PieceColor;
  isInteractive?: boolean;
  isCheck?: boolean;
  lastMove?: Move | null;
  onMakeMove?: (from: Position, to: Position) => void;
}

type ThemeType = 'classic' | 'dark' | 'light' | 'koi' | 'pond' | 'rain' | 'squid' | 'totoro' | 'white' | 'yinyang';

const THEMES: { id: ThemeType; label: string; icon: React.ElementType }[] = [
  { id: 'classic', label: 'Gỗ Cổ Điển', icon: Sparkles },
  { id: 'dark', label: 'Màn Đêm', icon: Moon },
  { id: 'light', label: 'Ban Ngày', icon: Sun },
  { id: 'koi', label: 'Hồ Cá Koi', icon: Fish },
  { id: 'pond', label: 'Hồ Nước', icon: ImageIcon },
  { id: 'rain', label: 'Mưa Rơi', icon: CloudRain },
  { id: 'squid', label: 'Mực Đại Dương', icon: Waves },
  { id: 'totoro', label: 'Totoro', icon: Leaf },
  { id: 'white', label: 'Sương Trắng', icon: Wind },
  { id: 'yinyang', label: 'Thái Cực', icon: Aperture },
];

const GIF_FILES: Record<string, string> = {
  koi: 'koi-bg.gif',
  pond: 'pond.gif',
  rain: 'rain.gif',
  squid: 'squid.gif',
  totoro: 'totoro.gif',
  white: 'white.gif',
  yinyang: 'yinyang.gif',
};

export const XiangqiBoardView: React.FC<XiangqiBoardViewProps> = ({
  board, currentTurn, playerColor = 'red', isInteractive = true, isCheck = false, lastMove = null, onMakeMove,
}) => {
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [theme, setTheme] = useState<ThemeType>('totoro'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Thêm state mounted để dùng Portal an toàn trong Next.js
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const legalTargets: Position[] = selectedPos && isInteractive && board[selectedPos.row][selectedPos.col]?.color === currentTurn
      ? XiangqiEngine.getLegalMoves(board, selectedPos) : [];

  const handleCellClick = (r: number, c: number) => {
    if (!isInteractive) return;
    const clickedPiece = board[r][c];
    if (clickedPiece && clickedPiece.color === currentTurn) {
      if (playerColor && clickedPiece.color !== playerColor) return;
      setSelectedPos({ row: r, col: c });
      return;
    }
    if (selectedPos) {
      if (legalTargets.some((m) => m.row === r && m.col === c)) {
        onMakeMove?.(selectedPos, { row: r, col: c });
        setSelectedPos(null);
        return;
      }
    }
    setSelectedPos(null);
  };

  const isFlipped = playerColor === 'black';
  const isGifTheme = Object.keys(GIF_FILES).includes(theme);

  let boardBgStyle: React.CSSProperties = {};
  if (theme === 'classic') boardBgStyle = { backgroundColor: '#e6c280', backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255, 235, 190, 0.4) 0%, rgba(180, 130, 60, 0.25) 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139, 69, 19, 0.03) 3px, rgba(139, 69, 19, 0.03) 6px)` };
  else if (theme === 'dark') boardBgStyle = { backgroundColor: '#09090b', backgroundImage: `radial-gradient(circle at 50% 50%, #27272a 0%, #000000 100%)`, boxShadow: 'inset 0 0 50px rgba(0,0,0,1)' };
  else if (theme === 'light') boardBgStyle = { backgroundColor: '#f8fafc', backgroundImage: `radial-gradient(circle at 50% 50%, #ffffff 0%, #e2e8f0 100%)`, boxShadow: 'inset 0 0 30px rgba(0,0,0,0.05)' };
  else if (isGifTheme) boardBgStyle = { backgroundImage: `url('/images/${GIF_FILES[theme as string]}')`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 0 80px rgba(0,0,0,0.7)' };

  const strokeWidth = isGifTheme ? "1.5" : "3";
  const lineStroke = theme === 'classic' ? '#5c3818' : theme === 'dark' ? 'rgba(255,255,255,0.4)' : theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';

  let wrapperClass = "bg-gradient-to-b from-[#2a1a0f] via-[#1e130a] to-[#140c06] border-[#5c3a21]";
  if (theme === 'dark') wrapperClass = "bg-gradient-to-b from-[#18181b] via-[#09090b] to-[#000000] border-[#27272a] shadow-[0_20px_50px_rgba(0,0,0,0.9)]";
  if (theme === 'light') wrapperClass = "bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#f1f5f9] border-[#cbd5e1] shadow-[0_20px_50px_rgba(0,0,0,0.1)]";
  if (isGifTheme) wrapperClass = "bg-gradient-to-b from-[#292524] via-[#1c1917] to-[#0c0a09] p-2 border-[#44403c] shadow-[0_20px_50px_rgba(0,0,0,0.9)]";

  return (
    <>
      {/* KỸ THUẬT PORTAL: Đưa thẳng ảnh nền mờ ra ngoài thẻ <body> để thoát khỏi mọi stacking context */}
      {isGifTheme && mounted && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 pointer-events-none transition-all duration-1000 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/${GIF_FILES[theme as string]}')`,
            filter: 'blur(20px) brightness(0.4)',
            transform: 'scale(1.1)',
            zIndex: -50, // Cắm chặt ảnh nền này xuống đáy cùng của trình duyệt
          }}
        />,
        document.body
      )}

      {/* BÀN CỜ CHÍNH */}
      <div className={`relative z-10 p-4 md:p-6 rounded-2xl shadow-2xl border-4 max-w-full overflow-hidden select-none transition-all duration-700 mx-auto ${wrapperClass}`}>
        <style>{`
          .hide-scroll::-webkit-scrollbar { display: none; }
          .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {/* MENU ĐỔI GIAO DIỆN NẰM GÓC TRÁI */}
        <div className="absolute top-2 left-2 md:top-3 md:left-3 z-50 flex items-center" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className={`w-10 h-10 md:w-11 md:h-11 rounded-full backdrop-blur-md border transition-all flex items-center justify-center shadow-xl flex-shrink-0 z-20 ${theme === 'light' ? 'bg-white/90 border-slate-300 text-slate-800 hover:text-sky-500' : 'bg-slate-900/90 border-slate-700 text-white hover:text-amber-400'} hover:scale-105`}
            title="Chọn Giao Diện"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Palette className={`w-5 h-5 ${theme === 'light' ? 'text-sky-500' : 'text-emerald-400'}`} />}
          </button>

          <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out origin-left ${isMenuOpen ? 'max-w-[calc(100vw-80px)] md:max-w-[600px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'}`}>
            <div className={`flex items-center gap-1.5 p-1.5 backdrop-blur-md border rounded-full shadow-xl overflow-x-auto hide-scroll ${theme === 'light' ? 'bg-white/90 border-slate-300' : 'bg-slate-900/90 border-slate-700'}`}>
              {THEMES.map((t) => {
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setIsMenuOpen(false); }}
                    title={t.label}
                    className={`w-8 h-8 md:w-9 md:h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${
                      isActive 
                        ? (theme === 'light' ? 'bg-sky-500/20 text-sky-600 shadow-[inset_0_0_8px_rgba(14,165,233,0.3)]' : 'bg-sky-500/20 text-sky-400 shadow-[inset_0_0_8px_rgba(56,189,248,0.3)]') 
                        : (theme === 'light' ? 'text-slate-500 hover:bg-slate-200 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-700 hover:text-white')
                    }`}
                  >
                    <t.icon className="w-4 h-4 md:w-4.5 md:h-4.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`absolute inset-2 border-2 rounded-xl pointer-events-none transition-colors duration-700 ${theme === 'classic' ? 'border-[#8b5a2b]/40' : theme === 'dark' ? 'border-zinc-700/50' : theme === 'light' ? 'border-slate-300/50' : 'border-white/30'}`} />

        {/* KHU VỰC BÀN CỜ CHÍNH */}
        <div className="relative rounded-lg p-2 md:p-4 shadow-inner transition-all duration-700 overflow-hidden" style={boardBgStyle}>
          
          {isGifTheme && (
            <div className="absolute inset-0 pointer-events-none z-0 rounded-lg overflow-hidden">
              <div className={`absolute inset-0 transition-all duration-700 ${theme === 'rain' || theme === 'squid' ? 'bg-white/10 backdrop-blur-[8px]' : 'bg-white/5 backdrop-blur-[2px]'}`} />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-60 transform -skew-x-12 scale-150" />
              <div className="absolute inset-0 border-[2px] border-white/30 rounded-lg shadow-[inset_0_0_40px_rgba(255,255,255,0.2)]" />
            </div>
          )}

          <svg viewBox="0 0 720 800" className={`w-[320px] sm:w-[420px] md:w-[480px] lg:w-[540px] h-auto block mx-auto transition-all duration-700 relative z-10`}>
            <rect x="40" y="40" width="640" height="720" fill="none" stroke={lineStroke} strokeWidth={strokeWidth} />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((row) => ( <line key={`h-${row}`} x1="40" y1={40 + row * 80} x2="680" y2={40 + row * 80} stroke={lineStroke} strokeWidth={strokeWidth} /> ))}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => {
              const x = 40 + col * 80;
              if (col === 0 || col === 8) return <line key={`v-${col}`} x1={x} y1="40" x2={x} y2="760" stroke={lineStroke} strokeWidth={strokeWidth} />
              return ( <g key={`v-${col}`}> <line x1={x} y1="40" x2={x} y2="360" stroke={lineStroke} strokeWidth={strokeWidth} /> <line x1={x} y1="440" x2={x} y2="760" stroke={lineStroke} strokeWidth={strokeWidth} /> </g> );
            })}
            <line x1="280" y1="40" x2="440" y2="200" stroke={lineStroke} strokeWidth={strokeWidth} />
            <line x1="440" y1="40" x2="280" y2="200" stroke={lineStroke} strokeWidth={strokeWidth} />
            <line x1="280" y1="600" x2="440" y2="760" stroke={lineStroke} strokeWidth={strokeWidth} />
            <line x1="440" y1="600" x2="280" y2="760" stroke={lineStroke} strokeWidth={strokeWidth} />

            <text x="190" y="410" fill={theme === 'classic' ? '#8c5828' : theme === 'dark' ? 'rgba(255,255,255,0.3)' : theme === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)'} fontSize="34" fontFamily='"Noto Serif TC", serif' fontWeight="bold" letterSpacing="28" className="opacity-90 select-none transition-colors duration-700">楚河</text>
            <text x="450" y="410" fill={theme === 'classic' ? '#8c5828' : theme === 'dark' ? 'rgba(255,255,255,0.3)' : theme === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)'} fontSize="34" fontFamily='"Noto Serif TC", serif' fontWeight="bold" letterSpacing="28" className="opacity-90 select-none transition-colors duration-700">漢界</text>
          </svg>

          {/* LỚP CHỨA QUÂN CỜ */}
          <div className="absolute inset-2 md:inset-4 flex flex-col justify-between p-2 z-20">
            {Array.from({ length: 10 }).map((_, rIdx) => {
              const actualRow = isFlipped ? rIdx : 9 - rIdx;
              return (
                <div key={`row-${actualRow}`} className="flex justify-between items-center w-full">
                  {Array.from({ length: 9 }).map((_, cIdx) => {
                    const actualCol = isFlipped ? 8 - cIdx : cIdx;
                    const piece = board[actualRow][actualCol];

                    const isSelected = selectedPos?.row === actualRow && selectedPos?.col === actualCol;
                    const isTarget = legalTargets.some((m) => m.row === actualRow && m.col === actualCol);
                    const isLastMoveFrom = lastMove && lastMove.from.row === actualRow && lastMove.from.col === actualCol;
                    const isLastMoveTo = lastMove && lastMove.to.row === actualRow && lastMove.to.col === actualCol;
                    const isKingInCheck = isCheck && piece?.type === 'king' && piece?.color === currentTurn;

                    let moveDelta: { dx: number; dy: number } | null = null;
                    if (isLastMoveTo && lastMove) {
                      const fromDisplayRow = isFlipped ? lastMove.from.row : 9 - lastMove.from.row;
                      const fromDisplayCol = isFlipped ? 8 - lastMove.from.col : lastMove.from.col;
                      const toDisplayRow = isFlipped ? lastMove.to.row : 9 - lastMove.to.row;
                      const toDisplayCol = isFlipped ? 8 - lastMove.to.col : lastMove.to.col;
                      moveDelta = { dx: (fromDisplayCol - toDisplayCol) * 126, dy: (fromDisplayRow - toDisplayRow) * 126 };
                    }

                    return (
                      <div key={`cell-${actualRow}-${actualCol}`} onClick={() => handleCellClick(actualRow, actualCol)} className="relative w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center cursor-pointer group">
                        {(isLastMoveFrom || isLastMoveTo) && ( <div className={`absolute inset-0 rounded-full border-2 pointer-events-none animate-pulse ${theme === 'classic' ? 'bg-amber-400/35 border-amber-500/80' : theme === 'dark' ? 'bg-sky-500/20 border-sky-400/80' : theme === 'light' ? 'bg-sky-400/20 border-sky-500/80' : 'bg-white/20 border-white/60'}`} /> )}

                        {piece && (
                          <XiangqiPiece
                            key={isLastMoveTo ? `moved-${lastMove?.from.row}${lastMove?.from.col}->${lastMove?.to.row}${lastMove?.to.col}` : undefined}
                            piece={piece} isSelected={isSelected} isCheck={isKingInCheck} isJustMoved={!!isLastMoveTo} moveDelta={moveDelta} size={44} 
                            theme={theme}
                          />
                        )}

                        {isTarget && (
                          <div className="absolute z-30 flex items-center justify-center pointer-events-none">
                            {piece ? (
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[3px] animate-ping ${isGifTheme ? 'border-white bg-white/30' : theme === 'classic' ? 'border-emerald-500 bg-emerald-500/30' : 'border-rose-500 bg-rose-500/30'}`} />
                            ) : (
                              <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full group-hover:scale-125 transition-transform ${isGifTheme ? 'bg-white shadow-[0_0_15px_#fff]' : theme === 'classic' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : theme === 'dark' ? 'bg-sky-400 shadow-[0_0_15px_#38bdf8]' : 'bg-sky-500 shadow-[0_0_10px_#0ea5e9]'}`} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};