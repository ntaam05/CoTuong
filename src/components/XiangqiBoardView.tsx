'use client';

import React, { useState } from 'react';
import { BoardPosition, Move, PieceColor, Position } from '@/models/types';
import { XiangqiPiece } from './XiangqiPiece';
import { XiangqiEngine } from '@/models/XiangqiBoard';

interface XiangqiBoardViewProps {
  board: BoardPosition;
  currentTurn: PieceColor;
  playerColor?: PieceColor; // default 'red' (bottom)
  isInteractive?: boolean;
  isCheck?: boolean;
  lastMove?: Move | null;
  onMakeMove?: (from: Position, to: Position) => void;
}

export const XiangqiBoardView: React.FC<XiangqiBoardViewProps> = ({
  board,
  currentTurn,
  playerColor = 'red',
  isInteractive = true,
  isCheck = false,
  lastMove = null,
  onMakeMove,
}) => {
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);

  // Compute legal moves for the selected piece
  const legalTargets: Position[] =
    selectedPos && isInteractive && board[selectedPos.row][selectedPos.col]?.color === currentTurn
      ? XiangqiEngine.getLegalMoves(board, selectedPos)
      : [];

  const handleCellClick = (r: number, c: number) => {
    if (!isInteractive) return;

    const clickedPiece = board[r][c];

    // If an own piece is clicked, select it
    if (clickedPiece && clickedPiece.color === currentTurn) {
      if (playerColor && clickedPiece.color !== playerColor) {
        // In online/pvp mode, player can only move their own assigned color
        return;
      }
      setSelectedPos({ row: r, col: c });
      return;
    }

    // If a piece was already selected, check if clicked position is a valid target
    if (selectedPos) {
      const isLegal = legalTargets.some((m) => m.row === r && m.col === c);
      if (isLegal) {
        onMakeMove?.(selectedPos, { row: r, col: c });
        setSelectedPos(null);
        return;
      }
    }

    // Otherwise clear selection
    setSelectedPos(null);
  };

  // Flip coordinate rendering if player is playing Black
  const isFlipped = playerColor === 'black';

  // Helper to convert internal board row/col to display index
  const displayRow = (r: number) => (isFlipped ? r : 9 - r);
  const displayCol = (c: number) => (isFlipped ? 8 - c : c);

  return (
    <div className="relative p-4 md:p-6 rounded-2xl bg-gradient-to-b from-[#2a1a0f] via-[#1e130a] to-[#140c06] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-[#5c3a21] max-w-full overflow-hidden select-none">
      {/* Decorative Outer Border */}
      <div className="absolute inset-2 border-2 border-[#8b5a2b]/40 rounded-xl pointer-events-none" />

      {/* Board Table Surface */}
      <div
        className="relative bg-[#deb887]/90 rounded-lg p-2 md:p-4 shadow-inner"
        style={{
          backgroundColor: '#e6c280',
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255, 235, 190, 0.4) 0%, rgba(180, 130, 60, 0.25) 100%),
            repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139, 69, 19, 0.03) 3px, rgba(139, 69, 19, 0.03) 6px)
          `,
        }}
      >
        {/* SVG Board Lines */}
        <svg
          viewBox="0 0 720 800"
          className="w-[320px] sm:w-[420px] md:w-[480px] lg:w-[540px] h-auto block mx-auto drop-shadow-sm"
        >
          {/* Border */}
          <rect
            x="40"
            y="40"
            width="640"
            height="720"
            fill="none"
            stroke="#5c3818"
            strokeWidth="4"
          />

          {/* Horizontal lines */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((row) => (
            <line
              key={`h-${row}`}
              x1="40"
              y1={40 + row * 80}
              x2="680"
              y2={40 + row * 80}
              stroke="#5c3818"
              strokeWidth="2"
            />
          ))}

          {/* Vertical lines: Row 0..4 (top section) and Row 5..9 (bottom section) */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => {
            const x = 40 + col * 80;
            if (col === 0 || col === 8) {
              // Outer edges run continuously across the river
              return (
                <line
                  key={`v-${col}`}
                  x1={x}
                  y1="40"
                  x2={x}
                  y2="760"
                  stroke="#5c3818"
                  strokeWidth="2"
                />
              );
            }
            return (
              <g key={`v-${col}`}>
                {/* Top bank */}
                <line x1={x} y1="40" x2={x} y2="360" stroke="#5c3818" strokeWidth="2" />
                {/* Bottom bank */}
                <line x1={x} y1="440" x2={x} y2="760" stroke="#5c3818" strokeWidth="2" />
              </g>
            );
          })}

          {/* Palace diagonal crosses */}
          {/* Top Palace (cols 3..5, rows 0..2) */}
          <line x1="280" y1="40" x2="440" y2="200" stroke="#5c3818" strokeWidth="2" />
          <line x1="440" y1="40" x2="280" y2="200" stroke="#5c3818" strokeWidth="2" />

          {/* Bottom Palace (cols 3..5, rows 7..9) */}
          <line x1="280" y1="600" x2="440" y2="760" stroke="#5c3818" strokeWidth="2" />
          <line x1="440" y1="600" x2="280" y2="760" stroke="#5c3818" strokeWidth="2" />

          {/* River Watermark: "楚河" and "漢界" */}
          <text
            x="190"
            y="410"
            fill="#8c5828"
            fontSize="34"
            fontFamily='"Noto Serif TC", serif'
            fontWeight="bold"
            letterSpacing="28"
            className="opacity-75 select-none"
          >
            楚河
          </text>
          <text
            x="450"
            y="410"
            fill="#8c5828"
            fontSize="34"
            fontFamily='"Noto Serif TC", serif'
            fontWeight="bold"
            letterSpacing="28"
            className="opacity-75 select-none"
          >
            漢界
          </text>
        </svg>

        {/* 10x9 Grid of Interactive Intersections */}
        <div className="absolute inset-2 md:inset-4 flex flex-col justify-between p-2">
          {Array.from({ length: 10 }).map((_, rIdx) => {
            const actualRow = isFlipped ? rIdx : 9 - rIdx;

            return (
              <div
                key={`row-${actualRow}`}
                className="flex justify-between items-center w-full"
              >
                {Array.from({ length: 9 }).map((_, cIdx) => {
                  const actualCol = isFlipped ? 8 - cIdx : cIdx;
                  const piece = board[actualRow][actualCol];

                  const isSelected =
                    selectedPos?.row === actualRow && selectedPos?.col === actualCol;

                  const isTarget = legalTargets.some(
                    (m) => m.row === actualRow && m.col === actualCol
                  );

                  const isLastMoveFrom =
                    lastMove &&
                    lastMove.from.row === actualRow &&
                    lastMove.from.col === actualCol;

                  const isLastMoveTo =
                    lastMove &&
                    lastMove.to.row === actualRow &&
                    lastMove.to.col === actualCol;

                  let moveDelta: { dx: number; dy: number } | null = null;
                  if (isLastMoveTo && lastMove) {
                    const fromDisplayRow = isFlipped ? lastMove.from.row : 9 - lastMove.from.row;
                    const fromDisplayCol = isFlipped ? 8 - lastMove.from.col : lastMove.from.col;
                    const toDisplayRow = isFlipped ? lastMove.to.row : 9 - lastMove.to.row;
                    const toDisplayCol = isFlipped ? 8 - lastMove.to.col : lastMove.to.col;

                    moveDelta = {
                      dx: (fromDisplayCol - toDisplayCol) * 126,
                      dy: (fromDisplayRow - toDisplayRow) * 126,
                    };
                  }

                  const isKingInCheck =
                    isCheck &&
                    piece?.type === 'king' &&
                    piece?.color === currentTurn;

                  return (
                    <div
                      key={`cell-${actualRow}-${actualCol}`}
                      onClick={() => handleCellClick(actualRow, actualCol)}
                      className="relative w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center cursor-pointer group"
                    >
                      {/* Last move indicator */}
                      {(isLastMoveFrom || isLastMoveTo) && (
                        <div className="absolute inset-0 rounded-full bg-amber-400/35 border-2 border-amber-500/80 pointer-events-none animate-pulse" />
                      )}

                      {/* Piece with smooth movement animation */}
                      {piece && (
                        <XiangqiPiece
                          key={
                            isLastMoveTo
                              ? `moved-${lastMove?.from.row}${lastMove?.from.col}->${lastMove?.to.row}${lastMove?.to.col}`
                              : undefined
                          }
                          piece={piece}
                          isSelected={isSelected}
                          isCheck={isKingInCheck}
                          isJustMoved={!!isLastMoveTo}
                          moveDelta={moveDelta}
                          size={44}
                        />
                      )}

                      {/* Legal Move Dot */}
                      {isTarget && (
                        <div className="absolute z-30 flex items-center justify-center pointer-events-none">
                          {piece ? (
                            // Target contains enemy piece to capture: glowing capture ring
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-3 border-emerald-500 bg-emerald-500/30 animate-ping" />
                          ) : (
                            // Empty square: green/gold glowing dot
                            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] group-hover:scale-125 transition-transform" />
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
  );
};
