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

  const [undosLeft, setUndosLeft] = useState(5);
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [setupColor, setSetupColor] = useState<PieceColor>('red');
  const [setupDifficulty, setSetupDifficulty] = useState<'easy' | 'hard'>('easy');
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [checkmateInfo, setCheckmateInfo] = useState<{
    winner: PieceColor;
    reason: string;
  } | null>(null);
  const [isModalDismissed, setIsModalDismissed] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const movesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGameStartTime(Date.now());
  }, []);

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
    setUndosLeft(5);

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

  useEffect(() => {
    movesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moveHistory]);

  const makeAiMove = (
    currentBoard: BoardPosition,
    aiSide: PieceColor,
    diff: 'easy' | 'hard'
  ) => {
    setIsAiThinking(true);

    setTimeout(() => {
      const bestMove = XiangqiAI.getBestMove(currentBoard, aiSide, diff);
      if (!bestMove) {
        handleGameEnd(playerColor, 'Đối thủ hết nước đi (Chiếu bí)');
        setIsAiThinking(false);
        return;
      }

      const { nextBoard, move, isCheck: checkNow } = XiangqiEngine.applyMove(
        currentBoard,
        bestMove.from,
        bestMove.to
      );

      if (move.captured) sounds.playCapture();
      else sounds.playMove();
      if (checkNow) sounds.playCheck();

      setBoard(nextBoard);
      setLastMove(move);
      setMoveHistory((prev) => [...prev, move]);
      setIsCheck(checkNow);

      const nextTurn = aiSide === 'red' ? 'black' : 'red';
      setCurrentTurn(nextTurn);
      setIsAiThinking(false);

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

  const handlePlayerMove = (from: Position, to: Position) => {
    if (gameOver || isAiThinking || currentTurn !== playerColor) return;

    try {
      const { nextBoard, move, isCheck: checkNow } = XiangqiEngine.applyMove(
        board,
        from,
        to
      );

      if (move.captured) sounds.playCapture();
      else sounds.playMove();
      if (checkNow) sounds.playCheck();

      setBoard(nextBoard);
      setLastMove(move);
      setMoveHistory((prev) => [...prev, move]);
      setIsCheck(checkNow);

      const aiSide: PieceColor = playerColor === 'red' ? 'black' : 'red';
      setCurrentTurn(aiSide);

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

      makeAiMove(nextBoard, aiSide, difficulty);
    } catch (err) {
      console.error('Invalid move:', err);
    }
  };

  const handleUndo = () => {
    if (undosLeft <= 0 || moveHistory.length < 2 || isAiThinking || gameOver) return;

    setUndosLeft((prev) => prev - 1);

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
    // THAY ĐỔI 1: Bỏ background gradient cứng nhắc để nhường chỗ cho nền GIF và Dark Mode
    <div className="min-h-screen text-slate-900 dark:text-white p-3 sm:p-6 flex flex-col transition-colors duration-500">
      
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between pb-4 mb-4 border-b border-black/10 dark:border-white/10 transition-colors">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại trang chủ
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSetupModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-full text-black dark:text-white text-xs font-bold transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Đổi Cài Đặt</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 rounded-full text-teal-600 dark:text-teal-400 text-xs font-bold transition-colors">
            <Bot className="w-3.5 h-3.5" />
            <span>Máy ({difficulty === 'easy' ? 'Dễ' : 'Khó'})</span>
          </div>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 relative z-10">
        
        {/* Left: Chessboard */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          
          {/* Opponent Card (AI) */}
          <div className="w-full max-w-[540px] flex items-center justify-between px-4 py-2.5 mb-2 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-xl transition-colors shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 transition-colors">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white transition-colors">
                    Trí Tuệ Nhân Tạo
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 font-semibold border border-black/5 dark:border-white/5 transition-colors">
                    {difficulty === 'easy' ? 'Cấp Dễ' : 'Cấp Khó'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 transition-colors">
                  {playerColor === 'red' ? 'Cầm quân Đen' : 'Cầm quân Đỏ'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAiThinking ? (
                <span className="text-[11px] px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-full font-bold animate-pulse transition-colors">
                  Máy đang tính...
                </span>
              ) : currentTurn !== playerColor && !gameOver ? (
                <span className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-black/5 dark:border-white/5 rounded-full font-semibold transition-colors">
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

            {/* Notifications... (Giữ nguyên) */}
            {isCheck && !gameOver && !checkmateInfo && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-2.5 bg-rose-600 text-white font-extrabold text-sm rounded-full shadow-lg backdrop-blur-sm animate-bounce z-40 border border-rose-400">
                ⚔️ CHIẾU TƯỚNG!
              </div>
            )}
            {checkmateInfo && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-4 bg-black/90 border-2 border-rose-500 text-white rounded-2xl shadow-2xl backdrop-blur-md text-center z-40 animate-pulse max-w-xs">
                <div className="text-lg font-black text-rose-400 mb-1">⚔️ CHIẾU BÍ! ⚔️</div>
                <p className="text-[11px] text-rose-200/90 leading-relaxed font-medium">{checkmateInfo.reason}</p>
              </div>
            )}
          </div>

          {/* Player Card (Self) */}
          <div className="w-full max-w-[540px] flex items-center justify-between px-4 py-2.5 mt-2 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-xl transition-colors shadow-sm">
            <div className="flex items-center gap-3">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'}
                alt="Player"
                className="w-9 h-9 rounded-full border border-black/20 dark:border-white/20 object-cover"
              />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white transition-colors">{user?.name || 'Bạn'}</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 transition-colors">
                  {playerColor === 'red' ? 'Cầm quân Đỏ (Đi trước)' : 'Cầm quân Đen (Đi sau)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentTurn === playerColor && !gameOver && (
                <span className="text-[11px] px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full font-bold animate-pulse transition-colors">
                  Đến lượt bạn đi
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Controls & Move History */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-black/5 dark:border-white/5">
              <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-black dark:bg-white" />
                <span>Điều Khiển</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center gap-2 transition-colors">
                <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <div className="truncate">
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">Độ khó máy</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {difficulty === 'easy' ? 'Dễ (Tập sự)' : 'Khó (Cao thủ)'}
                  </p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center gap-2 transition-colors">
                <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${playerColor === 'red' ? 'bg-rose-500' : 'bg-slate-700 dark:bg-slate-300'}`} />
                <div className="truncate">
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">Quân của bạn</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {playerColor === 'red' ? 'Đỏ (Đi trước)' : 'Đen (Đi sau)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undosLeft <= 0 || moveHistory.length < 2 || isAiThinking || !!gameOver}
                className="py-2.5 px-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 disabled:opacity-30 text-slate-900 dark:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Lùi ({undosLeft})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                className="py-2.5 px-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-900 dark:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cài Đặt</span>
              </button>

              <button
                type="button"
                onClick={handleResignClick}
                disabled={!!gameOver}
                className="py-2.5 px-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 disabled:opacity-30 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Đầu hàng</span>
              </button>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-sm h-[310px] flex flex-col transition-colors">
            <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2 pb-2 border-b border-black/5 dark:border-white/5">
              Biên Bản Nước Đi ({moveHistory.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
              {moveHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-500 italic text-xs">Chưa có nước đi nào</div>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                  const redMove = moveHistory[i * 2];
                  const blackMove = moveHistory[i * 2 + 1];
                  return (
                    <div key={i} className="flex items-center justify-between py-1 px-2 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <span className="w-8 text-slate-500 dark:text-zinc-500">{i + 1}.</span>
                      <span className="flex-1 text-rose-600 dark:text-rose-400">{redMove?.notation}</span>
                      <span className="flex-1 text-slate-700 dark:text-zinc-300">{blackMove?.notation || ''}</span>
                    </div>
                  );
                })
              )}
              <div ref={movesEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Các Modals (Giữ nguyên logic của bạn) */}
      {gameOver && !isModalDismissed && (
        // Modal báo kết quả...
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-[#09090b] border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{gameOver.winner === playerColor ? 'Chiến Thắng!' : 'Thất Bại'}</h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mb-6">{gameOver.reason}</p>
            <div className="space-y-3">
              <button onClick={() => startNewGame()} className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-bold text-sm rounded-xl">Chơi Ván Mới</button>
              <button onClick={() => setIsModalDismissed(true)} className="w-full py-3 bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold text-sm rounded-xl">Xem Lại Bàn Cờ</button>
            </div>
          </div>
        </div>
      )}

      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white dark:bg-[#09090b] border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Thiết Lập Trận Đấu</h2>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">1. Chọn phe:</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSetupColor('red')} className={`p-3 rounded-2xl border transition-colors ${setupColor === 'red' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-500 text-rose-600' : 'bg-transparent border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400'}`}>
                  <span className="font-bold">Quân Đỏ</span>
                </button>
                <button onClick={() => setSetupColor('black')} className={`p-3 rounded-2xl border transition-colors ${setupColor === 'black' ? 'bg-slate-100 dark:bg-white/10 border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'bg-transparent border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400'}`}>
                  <span className="font-bold">Quân Đen</span>
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">2. Độ khó:</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSetupDifficulty('easy')} className={`p-3 rounded-2xl border transition-colors ${setupDifficulty === 'easy' ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-500 text-teal-600' : 'bg-transparent border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400'}`}>
                  <span className="font-bold">Dễ (Tập Sự)</span>
                </button>
                <button onClick={() => setSetupDifficulty('hard')} className={`p-3 rounded-2xl border transition-colors ${setupDifficulty === 'hard' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 text-amber-600' : 'bg-transparent border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400'}`}>
                  <span className="font-bold">Khó (Cao Thủ)</span>
                </button>
              </div>
            </div>

            <button onClick={handleConfirmSetup} className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl active:scale-95 transition-transform">
              Vào Bàn Cờ Ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}