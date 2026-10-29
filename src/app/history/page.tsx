'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  History,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trophy,
  Swords,
  Bot,
  Play,
} from 'lucide-react';
import { BoardPosition, Move } from '@/models/types';
import { XiangqiEngine } from '@/models/XiangqiBoard';
import { XiangqiBoardView } from '@/components/XiangqiBoardView';

interface GameRecord {
  id: string;
  roomCode?: string;
  redName: string;
  blackName: string;
  mode: string;
  winner: string;
  moves: string;
  totalMoves: number;
  duration: number;
  createdAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pvp' | 'ai'>('all');

  // Replay modal state
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
  const [parsedMoves, setParsedMoves] = useState<Move[]>([]);
  const [replayMoveIndex, setReplayMoveIndex] = useState(0);
  const [replayBoard, setReplayBoard] = useState<BoardPosition>(
    XiangqiEngine.getInitialBoard()
  );

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history?limit=50');
      const data = await res.json();
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Open Replay Modal
  const openReplay = (game: GameRecord) => {
    try {
      const moves: Move[] = JSON.parse(game.moves || '[]');
      setSelectedGame(game);
      setParsedMoves(moves);
      setReplayMoveIndex(0);
      setReplayBoard(XiangqiEngine.getInitialBoard());
    } catch (e) {
      console.error('Error parsing moves:', e);
    }
  };

  // Recompute board to specific move index
  const goToMove = (index: number) => {
    if (index < 0 || index > parsedMoves.length) return;

    let b = XiangqiEngine.getInitialBoard();
    for (let i = 0; i < index; i++) {
      const m = parsedMoves[i];
      if (m?.from && m?.to) {
        const res = XiangqiEngine.applyMove(b, m.from, m.to);
        b = res.nextBoard;
      }
    }

    setReplayBoard(b);
    setReplayMoveIndex(index);
  };

  const filteredHistory = history.filter((g) => {
    if (selectedFilter === 'pvp') return g.mode === 'pvp';
    if (selectedFilter === 'ai') return g.mode.startsWith('ai_');
    return true;
  });

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins} phút ${s > 0 ? `${s}s` : ''}`;
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#11192e] via-[#0c1222] to-[#060911] text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại trang chủ
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Lịch Sử Trận Đấu</h1>
              <p className="text-xs text-slate-400">
                Lưu trữ toàn bộ dữ liệu các ván đấu cờ tướng vào database
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedFilter('pvp')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedFilter === 'pvp'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chơi PvP
            </button>
            <button
              onClick={() => setSelectedFilter('ai')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedFilter === 'ai'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chơi với máy
            </button>
          </div>
        </div>

        {/* Content Table / Card List */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            Đang tải lịch sử ván cờ từ database...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Chưa có lịch sử ván cờ nào được ghi nhận.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((game) => {
              const isRedWin = game.winner === 'red';
              const isDraw = game.winner === 'draw';

              return (
                <div
                  key={game.id}
                  className="bg-[#121824]/90 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-lg"
                >
                  {/* Left: Players & Mode */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                      {game.mode === 'pvp' ? (
                        <Swords className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5 text-teal-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">
                          {game.redName}
                        </span>
                        <span className="text-xs text-rose-500 font-serif font-black">
                          (Đỏ)
                        </span>
                        <span className="text-xs text-slate-500">vs</span>
                        <span className="text-sm font-bold text-white">
                          {game.blackName}
                        </span>
                        <span className="text-xs text-slate-400 font-serif font-black">
                          (Đen)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(game.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(game.duration)}
                        </span>
                        <span>• {game.totalMoves} nước đi</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Winner badge & Replay button */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        isDraw
                          ? 'bg-slate-700 text-slate-200'
                          : isRedWin
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isDraw
                        ? 'Hòa ván'
                        : isRedWin
                        ? `Thắng: ${game.redName}`
                        : `Thắng: ${game.blackName}`}
                    </span>

                    <button
                      onClick={() => openReplay(game)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-slate-950" />
                      Xem lại ván cờ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Replay Modal */}
      {selectedGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#161f30] to-[#0f172a] border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Xem Lại Ván Cờ:</span>
                  <span className="text-amber-400">
                    {selectedGame.redName} vs {selectedGame.blackName}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Nước đi hiện tại: {replayMoveIndex} / {parsedMoves.length}
                  {replayMoveIndex > 0 &&
                    parsedMoves[replayMoveIndex - 1]?.notation && (
                      <span className="ml-2 text-amber-300 font-semibold font-mono">
                        ({parsedMoves[replayMoveIndex - 1].notation})
                      </span>
                    )}
                </p>
              </div>

              <button
                onClick={() => setSelectedGame(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
            </div>

            {/* Board & Move Controller */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Chessboard View (8 cols) */}
              <div className="md:col-span-8 flex justify-center">
                <XiangqiBoardView
                  board={replayBoard}
                  currentTurn={replayMoveIndex % 2 === 0 ? 'red' : 'black'}
                  playerColor="red"
                  isInteractive={false}
                  lastMove={replayMoveIndex > 0 ? parsedMoves[replayMoveIndex - 1] : null}
                />
              </div>

              {/* Controls & Move notation list (4 cols) */}
              <div className="md:col-span-4 space-y-4">
                {/* Step Navigation Controls */}
                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-slate-300 text-center uppercase tracking-wider">
                    Điều Khiển Nước Đi
                  </p>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => goToMove(0)}
                      disabled={replayMoveIndex === 0}
                      className="py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded-xl flex items-center justify-center font-bold"
                      title="Về đầu ván"
                    >
                      |&lt;
                    </button>
                    <button
                      onClick={() => goToMove(replayMoveIndex - 1)}
                      disabled={replayMoveIndex <= 0}
                      className="py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded-xl flex items-center justify-center font-bold"
                      title="Lùi 1 nước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => goToMove(replayMoveIndex + 1)}
                      disabled={replayMoveIndex >= parsedMoves.length}
                      className="py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded-xl flex items-center justify-center font-bold"
                      title="Tiến 1 nước"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => goToMove(parsedMoves.length)}
                      disabled={replayMoveIndex === parsedMoves.length}
                      className="py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded-xl flex items-center justify-center font-bold"
                      title="Đến cuối ván"
                    >
                      &gt;|
                    </button>
                  </div>
                </div>

                {/* Move list */}
                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl max-h-64 overflow-y-auto space-y-1 text-xs font-mono">
                  {parsedMoves.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToMove(idx + 1)}
                      className={`w-full flex items-center justify-between px-2.5 py-1 rounded transition text-left ${
                        replayMoveIndex === idx + 1
                          ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40'
                          : 'text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <span>#{idx + 1}</span>
                      <span>{m.notation || 'Nước đi'}</span>
                      {m.captured && (
                        <span className="text-[10px] text-rose-400">Ăn quân</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
