'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot,
  RotateCcw,
  Flag,
  Volume2,
  Trophy,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BoardPosition, Move, PieceColor, Position } from '@/models/types';
import { XiangqiEngine } from '@/models/XiangqiBoard';
import { XiangqiAI } from '@/models/XiangqiAI';
import { XiangqiBoardView } from '@/components/XiangqiBoardView';
import { sounds } from '@/lib/sound';
import { useAuth } from '@/context/AuthContext';

export const dynamic = 'force-dynamic';

export default function PlayAiPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [board, setBoard] = useState<BoardPosition>(XiangqiEngine.getInitialBoard());
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('red');
  const [playerColor, setPlayerColor] = useState<PieceColor>('red');
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [isCheck, setIsCheck] = useState(false);
  const [gameOver, setGameOver] = useState<{
    winner: PieceColor | 'draw';
    reason: string;
  } | null>(null);

  // Remaining undos (user allowed max 5 times against AI)
  const [undosLeft, setUndosLeft] = useState(5);

  // Setup Modal before entering board (matching user requirement)
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [setupColor, setSetupColor] = useState<PieceColor>('red');
  const [setupDifficulty, setSetupDifficulty] = useState<'easy' | 'hard'>('easy');

  // Confirmation modal for resigning
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // Checkmate dramatic alert before showing game-over modal
  const [checkmateInfo, setCheckmateInfo] = useState<{
    winner: PieceColor;
    reason: string;
  } | null>(null);

  // Allow reviewing board without modal blocking
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const movesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGameStartTime(Date.now());
  }, []);

  // Initialize new game
  const startNewGame = (color: PieceColor = playerColor, diff: 'easy' | 'hard' = difficulty) => {
    const initial = XiangqiEngine.getInitialBoard();
    setBoard(initial);
    setCurrentTurn('red');
    setPlayerColor(color);
    setDifficulty(diff);
    setMoveHistory([]);
    setLastMove(null);
    setIsCheck(false);
    setGameOver(null);
    setCheckmateInfo(null);
    setIsModalDismissed(false);
    setShowResignConfirm(false);
    setGameStartTime(Date.now());
    setIsAiThinking(false);
    setUndosLeft(5); // Reset 5 undos each game

    // If player chose Black, AI makes first move as Red
    if (color === 'black') {
      setTimeout(() => {
        makeAiMove(initial, 'red', diff);
      }, 500);
    }
  };

  const handleConfirmSetup = () => {
    setShowSetupModal(false);
    startNewGame(setupColor, setupDifficulty);
  };

  // Scroll move list on change
  useEffect(() => {
    movesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moveHistory]);

  // Execute AI move
  const makeAiMove = (
    currentBoard: BoardPosition,
    aiSide: PieceColor,
    diff: 'easy' | 'hard'
  ) => {
    setIsAiThinking(true);

    setTimeout(() => {
      const bestMove = XiangqiAI.getBestMove(currentBoard, aiSide, diff);
      if (!bestMove) {
        // AI has no legal moves -> player wins
        handleGameEnd(playerColor, 'Đối thủ hết nước đi (Chiếu bí)');
        setIsAiThinking(false);
        return;
      }

      const { nextBoard, move, isCheck: checkNow } = XiangqiEngine.applyMove(
        currentBoard,
        bestMove.from,
        bestMove.to
      );

      // Play sound effect
      if (move.captured) {
        sounds.playCapture();
      } else {
        sounds.playMove();
      }
      if (checkNow) {
        sounds.playCheck();
      }

      setBoard(nextBoard);
      setLastMove(move);
      setMoveHistory((prev) => [...prev, move]);
      setIsCheck(checkNow);

      const nextTurn = aiSide === 'red' ? 'black' : 'red';
      setCurrentTurn(nextTurn);
      setIsAiThinking(false);

      // Check if player has any moves (Checkmate)
      const playerMoves = XiangqiEngine.getAllLegalMoves(nextBoard, nextTurn);
      if (playerMoves.length === 0) {
        setCheckmateInfo({
          winner: aiSide,
          reason: 'Chiếu bí! Tướng của bạn đã bị vây hãm, không còn nước đi hợp lệ nào để thoát chiếu.',
        });
        sounds.playCheck();
        setTimeout(() => {
          handleGameEnd(aiSide, 'Chiếu bí! Tướng của bạn bị vây hãm, không còn nước đi hợp lệ.');
        }, 2200);
      }
    }, 650);
  };

  // Player makes a move
  const handlePlayerMove = (from: Position, to: Position) => {
    if (gameOver || isAiThinking || currentTurn !== playerColor) return;

    try {
      const { nextBoard, move, isCheck: checkNow } = XiangqiEngine.applyMove(
        board,
        from,
        to
      );

      // Play sounds
      if (move.captured) {
        sounds.playCapture();
      } else {
        sounds.playMove();
      }
      if (checkNow) {
        sounds.playCheck();
      }

      setBoard(nextBoard);
      setLastMove(move);
      setMoveHistory((prev) => [...prev, move]);
      setIsCheck(checkNow);

      const aiSide: PieceColor = playerColor === 'red' ? 'black' : 'red';
      setCurrentTurn(aiSide);

      // Check if AI has legal moves (Player delivered Checkmate)
      const aiMoves = XiangqiEngine.getAllLegalMoves(nextBoard, aiSide);
      if (aiMoves.length === 0) {
        setCheckmateInfo({
          winner: playerColor,
          reason: 'Tuyệt chiêu chiếu bí! Bạn đã vây hãm tướng đối phương hoàn hảo, AI không còn nước đi thoát.',
        });
        sounds.playVictory();
        setTimeout(() => {
          handleGameEnd(playerColor, 'Chiếu bí! Đối thủ không còn nước đi hợp lệ.');
        }, 2200);
        return;
      }

      // Schedule AI move
      makeAiMove(nextBoard, aiSide, difficulty);
    } catch (err) {
      console.error('Invalid move:', err);
    }
  };

  // Undo last move (undo player's move + AI's response, max 5 times per game)
  const handleUndo = () => {
    if (undosLeft <= 0 || moveHistory.length < 2 || isAiThinking || gameOver) return;

    setUndosLeft((prev) => prev - 1);

    // Reset board from start and replay up to length - 2
    let curBoard = XiangqiEngine.getInitialBoard();
    const newHistory = moveHistory.slice(0, moveHistory.length - 2);

    for (const m of newHistory) {
      const res = XiangqiEngine.applyMove(curBoard, m.from, m.to);
      curBoard = res.nextBoard;
    }

    setBoard(curBoard);
    setMoveHistory(newHistory);
    setLastMove(newHistory.length > 0 ? newHistory[newHistory.length - 1] : null);
    setCurrentTurn(playerColor);
    setIsCheck(XiangqiEngine.isInCheck(curBoard, playerColor));
    sounds.playMove();
  };

  // Resign Click -> Open Confirm Dialog
  const handleResignClick = () => {
    if (gameOver) return;
    setShowResignConfirm(true);
  };

  const executeResign = () => {
    setShowResignConfirm(false);
    if (gameOver) return;
    const aiColor = playerColor === 'red' ? 'black' : 'red';
    handleGameEnd(aiColor, 'Bạn đã chủ động xin nhận thua ván cờ này.');
  };

  // Save game to database via Prisma and update stats
  const handleGameEnd = async (winner: PieceColor | 'draw', reason: string) => {
    setGameOver({ winner, reason });

    const isWin = winner === playerColor;
    if (isWin) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      sounds.playVictory();
    }

    const duration = Math.round((Date.now() - gameStartTime) / 1000);

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redPlayerId: playerColor === 'red' ? user?.id : undefined,
          redName: playerColor === 'red' ? user?.name || 'Bạn' : `Máy (${difficulty === 'easy' ? 'Dễ' : 'Khó'})`,
          blackPlayerId: playerColor === 'black' ? user?.id : undefined,
          blackName: playerColor === 'black' ? user?.name || 'Bạn' : `Máy (${difficulty === 'easy' ? 'Dễ' : 'Khó'})`,
          mode: difficulty === 'easy' ? 'ai_easy' : 'ai_hard',
          winner,
          moves: moveHistory,
          duration,
        }),
      });

      refreshUser();
    } catch (e) {
      console.error('Error saving match:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#11192e] via-[#0c1222] to-[#060911] text-white p-3 sm:p-6 flex flex-col">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại trang chủ
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSetupModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-xs font-bold transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Đổi Cài Đặt</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/30 rounded-full text-teal-400 text-xs font-bold">
            <Bot className="w-3.5 h-3.5" />
            <span>Máy ({difficulty === 'easy' ? 'Dễ' : 'Khó'})</span>
          </div>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        {/* Left: Chessboard (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          {/* Opponent Card (AI) */}
          <div className="w-full max-w-[540px] flex items-center justify-between px-4 py-2.5 mb-2 bg-[#121824]/80 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-white">
                    Trí Tuệ Nhân Tạo
                  </p>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-teal-300 font-semibold">
                    {difficulty === 'easy' ? 'Cấp Dễ' : 'Cấp Khó'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {playerColor === 'red' ? 'Cầm quân Đen' : 'Cầm quân Đỏ'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAiThinking ? (
                <span className="text-[11px] px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full font-bold animate-pulse">
                  Máy đang tính toán...
                </span>
              ) : currentTurn !== playerColor && !gameOver ? (
                <span className="text-[11px] px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full font-semibold">
                  Lượt của máy
                </span>
              ) : null}
            </div>
          </div>

          {/* Interactive Chessboard */}
          <div className="relative">
            <XiangqiBoardView
              board={board}
              currentTurn={currentTurn}
              playerColor={playerColor}
              isInteractive={!gameOver && !isAiThinking && currentTurn === playerColor}
              isCheck={isCheck}
              lastMove={lastMove}
              onMakeMove={handlePlayerMove}
            />

            {/* Check overlay notification */}
            {isCheck && !gameOver && !checkmateInfo && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-extrabold text-sm rounded-full shadow-[0_0_30px_rgba(244,63,94,0.7)] backdrop-blur-sm animate-bounce z-40 border border-rose-400/50 flex items-center gap-2">
                <span>⚔️</span>
                <span>CHIẾU TƯỚNG!</span>
              </div>
            )}

            {/* Checkmate Dramatic Banner (giving time to understand the loss) */}
            {checkmateInfo && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-4 bg-gradient-to-b from-[#1c1214]/95 via-[#2a0e14]/95 to-[#12080a]/95 border-2 border-rose-500 text-white rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.8)] backdrop-blur-md text-center z-40 animate-pulse max-w-xs">
                <div className="flex items-center justify-center gap-2 text-lg font-black text-rose-300 mb-1">
                  <span>⚔️</span>
                  <span>CHIẾU BÍ! HẾT CỜ!</span>
                  <span>⚔️</span>
                </div>
                <p className="text-[11px] text-rose-200/90 leading-relaxed font-medium">
                  {checkmateInfo.reason}
                </p>
              </div>
            )}
          </div>

          {/* Player Card (Self) */}
          <div className="w-full max-w-[540px] flex items-center justify-between px-4 py-2.5 mt-2 bg-[#121824]/80 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <img
                src={
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'
                }
                alt="Player"
                className="w-9 h-9 rounded-full border border-amber-500/50 object-cover"
              />
              <div>
                <p className="text-xs font-bold text-white">{user?.name || 'Bạn (Nhật Tâm)'}</p>
                <p className="text-[11px] text-amber-400">
                  {playerColor === 'red' ? 'Cầm quân Đỏ (Đi trước)' : 'Cầm quân Đen (Đi sau)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentTurn === playerColor && !gameOver && (
                <span className="text-[11px] px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full font-bold animate-pulse">
                  Đến lượt bạn đi
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Controls & Move History (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Game Controls Card */}
          <div className="bg-[#121824]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Điều Khiển Trận Đấu</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold border border-slate-700/60">
                Chơi với máy
              </span>
            </div>

            {/* Match Status Info */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                <Bot className="w-4 h-4 text-teal-400 shrink-0" />
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 leading-tight">Độ khó máy</p>
                  <p className="text-xs font-bold text-teal-300 truncate">
                    {difficulty === 'easy' ? 'Dễ (Tập sự)' : 'Khó (Cao thủ)'}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${playerColor === 'red' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-slate-300 shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`} />
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 leading-tight">Quân của bạn</p>
                  <p className="text-xs font-bold text-white truncate">
                    {playerColor === 'red' ? 'Quân Đỏ (Đi trước)' : 'Quân Đen (Đi sau)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undosLeft <= 0 || moveHistory.length < 2 || isAiThinking || !!gameOver}
                className="py-2.5 px-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition active:scale-95"
                title={undosLeft <= 0 ? 'Đã hết lượt đi lại (tối đa 5 lần)' : `Còn ${undosLeft}/5 lượt đi lại`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Đi lại ({undosLeft}/5)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                className="py-2.5 px-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đổi cài đặt</span>
              </button>

              <button
                type="button"
                onClick={handleResignClick}
                disabled={!!gameOver}
                className="py-2.5 px-2 bg-slate-900 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition disabled:opacity-40 active:scale-95"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Đầu hàng</span>
              </button>
            </div>
          </div>

          {/* Move History / Notation Box */}
          <div className="bg-[#121824]/90 border border-slate-800 rounded-2xl p-5 shadow-xl h-[310px] flex flex-col">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 pb-2 border-b border-slate-800">
              Biên Bản Nước Đi ({moveHistory.length} nước)
            </h3>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
              {moveHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 italic text-xs">
                  Chưa có nước đi nào
                </div>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                  const redMove = moveHistory[i * 2];
                  const blackMove = moveHistory[i * 2 + 1];

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-900/60 transition"
                    >
                      <span className="w-8 text-slate-500">{i + 1}.</span>
                      <span className="flex-1 text-rose-400">{redMove?.notation}</span>
                      <span className="flex-1 text-slate-300">
                        {blackMove?.notation || ''}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={movesEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal (Hidden when dismissed so player can review board) */}
      {gameOver && !isModalDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-gradient-to-b from-[#18233a] via-[#131b2e] to-[#0a0f1d] border border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative">
            {/* Result Icon */}
            <div
              className={`w-20 h-20 mx-auto mb-4 rounded-3xl p-1 flex items-center justify-center shadow-xl ${
                gameOver.winner === playerColor
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-amber-500/30'
                  : gameOver.winner === 'draw'
                  ? 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-blue-500/30'
                  : 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-rose-500/30'
              }`}
            >
              {gameOver.winner === playerColor ? (
                <Trophy className="w-10 h-10" />
              ) : gameOver.winner === 'draw' ? (
                <ShieldCheck className="w-10 h-10" />
              ) : (
                <Bot className="w-10 h-10" />
              )}
            </div>

            {/* Result Title */}
            <h2 className="text-2xl font-black text-white mb-2 tracking-wide">
              {gameOver.winner === playerColor
                ? 'Chúc Mừng Chiến Thắng! 🎉'
                : gameOver.winner === 'draw'
                ? 'Ván Cờ Bất Phân Thắng Bại 🤝'
                : 'Thất Bại! Hãy Thử Lại Ván Khác ☕'}
            </h2>

            {/* Reason Box */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl mb-5">
              <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                {gameOver.reason}
              </p>
            </div>

            {/* Match Stats Summary */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 mb-6 text-center">
              <div>
                <p className="text-[10px] text-slate-400">Số nước đi</p>
                <p className="text-sm font-bold text-white">{moveHistory.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Cấp độ máy</p>
                <p className="text-sm font-bold text-teal-400">
                  {difficulty === 'easy' ? 'Dễ' : 'Khó'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Quân cờ</p>
                <p className="text-sm font-bold text-rose-400">
                  {playerColor === 'red' ? 'Đỏ' : 'Đen'}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => startNewGame()}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/25 active:scale-95 transition"
              >
                Chơi Ván Mới Ngay
              </button>

              <button
                type="button"
                onClick={() => setIsModalDismissed(true)}
                className="w-full py-2.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>👁️ Xem Lại Bàn Cờ Cuối Cùng</span>
              </button>

              <Link
                href="/history"
                className="block w-full py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition"
              >
                Xem Lịch Sử Trận Đấu
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating Review Banner when user dismissed the Game Over modal to inspect the board */}
      {gameOver && isModalDismissed && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[92%] bg-gradient-to-r from-[#18233a] via-[#1a2035] to-[#18233a] border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Ván cờ đã kết thúc</p>
              <p className="text-[11px] text-slate-300 line-clamp-1">{gameOver.reason}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalDismissed(false)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
            >
              Mở Kết Quả
            </button>
            <button
              type="button"
              onClick={() => startNewGame()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition"
            >
              Ván Mới
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resigning */}
      {showResignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#1e1724] to-[#120f18] border border-rose-500/50 rounded-3xl p-6 text-center shadow-2xl relative">
            <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Flag className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1.5">
              Xác Nhận Đầu Hàng?
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn chịu thua ván cờ này không? Kết quả thất bại sẽ được ghi nhận.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowResignConfirm(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
              >
                Hủy / Đánh Tiếp
              </button>
              <button
                type="button"
                onClick={executeResign}
                className="py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition"
              >
                Chấp Nhận Thua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chọn Quân Cờ & Độ Khó Trước Khi Vào Bàn Cờ */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#18233a] via-[#12192b] to-[#0a0f1d] border border-amber-500/35 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1.5px] mx-auto mb-3 shadow-lg shadow-amber-500/20">
                <div className="w-full h-full rounded-2xl bg-[#14100a] flex items-center justify-center">
                  <span className="font-serif font-black text-xl text-amber-400">將</span>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                Thiết Lập Trận Đấu Với Máy
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Chọn quân cờ và cấp độ thử thách rồi vào thẳng bàn cờ
              </p>
            </div>

            {/* Step 1: Chọn quân cờ */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                1. Chọn phe / quân cờ của bạn:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Quân Đỏ */}
                <button
                  type="button"
                  onClick={() => setSetupColor('red')}
                  className={`p-3.5 rounded-2xl border transition flex flex-col items-center gap-2 relative ${
                    setupColor === 'red'
                      ? 'bg-rose-500/15 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full piece-red flex items-center justify-center font-serif text-xl font-black shadow-md">
                    帥
                  </div>
                  <span className="text-xs font-bold text-white">Quân Đỏ</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                    Đi trước (Tấn công)
                  </span>
                </button>

                {/* Quân Đen */}
                <button
                  type="button"
                  onClick={() => setSetupColor('black')}
                  className={`p-3.5 rounded-2xl border transition flex flex-col items-center gap-2 relative ${
                    setupColor === 'black'
                      ? 'bg-slate-700/30 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full piece-black flex items-center justify-center font-serif text-xl font-black shadow-md">
                    將
                  </div>
                  <span className="text-xs font-bold text-white">Quân Đen</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 font-semibold">
                    Đi sau (Phản đòn)
                  </span>
                </button>
              </div>
            </div>

            {/* Step 2: Chọn mức độ khó */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                2. Chọn mức độ thử thách:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Dễ */}
                <button
                  type="button"
                  onClick={() => setSetupDifficulty('easy')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    setupDifficulty === 'easy'
                      ? 'bg-teal-500/15 border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.2)]'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-xs font-bold text-white">Dễ (Tập Sự)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Nước đi giải trí, phù hợp cho người mới làm quen.
                  </p>
                </button>

                {/* Khó */}
                <button
                  type="button"
                  onClick={() => setSetupDifficulty('hard')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    setupDifficulty === 'hard'
                      ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-bold text-white">Khó (Cao Thủ)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    AI Minimax tính toán sâu, chiến thuật sắc bén.
                  </p>
                </button>
              </div>
            </div>

            {/* Note about 5 undos */}
            <div className="mb-6 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Trong ván đấu, bạn có tối đa <strong>5 lượt đi lại</strong> nước cờ!</span>
            </div>

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleConfirmSetup}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/25 active:scale-[0.99] transition flex items-center justify-center gap-2"
            >
              <span>Vào Bàn Cờ Ngay</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
