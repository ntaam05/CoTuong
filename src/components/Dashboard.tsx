'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot,
  PlusCircle,
  KeyRound,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';

interface RoomItem {
  id: string;
  code: string;
  name: string;
  status: string;
  host: { id: string; name: string; avatar: string; level: number };
  guest?: { id: string; name: string; avatar: string; level: number } | null;
}

interface MatchItem {
  id: string;
  redName: string;
  blackName: string;
  winner: string;
  mode: string;
  createdAt: string;
  totalMoves: number;
}

interface DashboardProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onCreateRoom,
  onJoinRoom,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Fetch waiting rooms from database
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Fetch recent matches from database
  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/history?limit=6');
      const data = await res.json();
      if (data.success) {
        setMatches(data.history || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchMatches();

    const socket = getSocket();
    socket.on('lobby-updated', () => {
      fetchRooms();
    });

    return () => {
      socket.off('lobby-updated');
    };
  }, []);

  // Compute player stats
  const totalGames = (user?.wins || 0) + (user?.losses || 0) + (user?.draws || 0);
  const wins = user?.wins ?? 0;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <div
      id="dashboard-section"
      className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6"
    >
      {/* 1. Welcome User Banner with Refined Gradient & No EXP Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#17223b] via-[#12192c] to-[#0a0f1d] border border-amber-500/25 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {/* Subtle ambient lighting inside banner */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-xl">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
                Xin chào, {user?.name || 'Kỳ Thủ'} 👋
              </h2>
              <p className="text-xs sm:text-sm text-slate-300/80 mt-1.5 leading-relaxed">
                Chúc bạn có những ván cờ thật vui, kịch tính và thăng hoa cùng chiến thuật!
              </p>
            </div>

            {/* 3 Stats Badges (Trận đấu, Thắng, Tỷ lệ thắng) */}
            <div className="flex items-center gap-3 sm:gap-4 pt-1">
              <div className="px-5 py-2.5 bg-gradient-to-b from-[#141d30]/90 to-[#0d1424]/90 border border-slate-700/60 rounded-2xl shadow-inner text-center">
                <p className="text-[11px] text-slate-400 font-medium">Trận đấu</p>
                <p className="text-base sm:text-lg font-black text-white">{totalGames}</p>
              </div>

              <div className="px-5 py-2.5 bg-gradient-to-b from-[#141d30]/90 to-[#0d1424]/90 border border-slate-700/60 rounded-2xl shadow-inner text-center">
                <p className="text-[11px] text-slate-400 font-medium">Thắng</p>
                <p className="text-base sm:text-lg font-black text-emerald-400">{wins}</p>
              </div>

              <div className="px-5 py-2.5 bg-gradient-to-b from-[#141d30]/90 to-[#0d1424]/90 border border-slate-700/60 rounded-2xl shadow-inner text-center">
                <p className="text-[11px] text-slate-400 font-medium">Tỷ lệ thắng</p>
                <p className="text-base sm:text-lg font-black text-amber-400">{winRate}%</p>
              </div>
            </div>
          </div>

          {/* Right illustration of circular Chinese board with pieces */}
          <div className="hidden md:flex relative shrink-0 items-center justify-center">
            <div className="w-40 h-40 rounded-full border border-amber-500/25 bg-gradient-to-b from-[#1a140d] to-[#0f0c08] shadow-[0_0_40px_rgba(217,119,6,0.15)] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-2 rounded-full border border-amber-500/15" />
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full piece-red flex items-center justify-center font-serif text-xl font-black shadow-lg">
                  帥
                </div>
                <div className="w-14 h-14 rounded-full piece-black flex items-center justify-center font-serif text-xl font-black shadow-lg">
                  將
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Game Modes: Chơi với máy, Tạo phòng, Tham gia phòng (Bỏ chơi online generic) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white tracking-wide">Chế độ chơi</h3>
          <Link
            href="/history"
            className="text-xs text-slate-400 hover:text-amber-400 transition"
          >
            Lịch sử đấu &gt;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Chơi với máy */}
          <div className="bg-gradient-to-b from-[#162035]/90 via-[#101728]/90 to-[#0a0f1d]/90 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-lg group">
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition">
                <Bot className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                Chơi với máy
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Luyện tập trí tuệ từ cấp độ Dễ đến Khó với AI thông minh.
              </p>
            </div>
            <Link
              href="/play/ai"
              className="mt-6 w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl text-center shadow-md transition active:scale-95"
            >
              Bắt đầu
            </Link>
          </div>

          {/* Tạo phòng */}
          <div className="bg-gradient-to-b from-[#162035]/90 via-[#101728]/90 to-[#0a0f1d]/90 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-lg group">
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                Tạo phòng
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tạo phòng riêng, chia sẻ mã phòng để bạn bè cùng tham gia thi đấu.
              </p>
            </div>
            <button
              onClick={onCreateRoom}
              className="mt-6 w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl text-center shadow-md transition active:scale-95"
            >
              Tạo phòng
            </button>
          </div>

          {/* Tham gia phòng */}
          <div className="bg-gradient-to-b from-[#162035]/90 via-[#101728]/90 to-[#0a0f1d]/90 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-lg group">
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                Tham gia phòng
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nhập mã phòng (6 ký tự) để nhanh chóng vào trận đấu đối kháng.
              </p>
            </div>
            <button
              onClick={onJoinRoom}
              className="mt-6 w-full py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs rounded-xl text-center border border-slate-700/80 transition active:scale-95"
            >
              Nhập mã
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Sections: Phòng chơi đang chờ & Trận đấu gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phòng chơi đang chờ (KHÔNG DÙNG DATAMOCK) */}
        <div className="bg-gradient-to-b from-[#151f34]/90 via-[#101627]/90 to-[#0b0f1c]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Phòng chơi đang chờ</h3>
            </div>
            <button
              onClick={onCreateRoom}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition"
            >
              + Tạo phòng mới
            </button>
          </div>

          {loadingRooms ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Đang tải danh sách phòng...
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-800/80 rounded-xl bg-slate-950/30">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
              <p className="text-xs text-slate-400 font-medium mb-1">
                Hiện chưa có phòng nào đang chờ
              </p>
              <p className="text-[11px] text-slate-500 mb-4">
                Hãy bấm tạo phòng để mời đối thủ hoặc tạo mã thi đấu!
              </p>
              <button
                onClick={onCreateRoom}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
              >
                Tạo phòng ngay
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {rooms.map((room) => {
                const playerCount = (room.host ? 1 : 0) + (room.guest ? 1 : 0);
                const isFull = playerCount >= 2;

                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          room.status === 'playing' ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{room.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">
                            #{room.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Chủ phòng: {room.host.name} • {playerCount}/2{' '}
                          {room.status === 'playing' ? 'Đang chơi' : 'Đang chờ'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push(`/room/${room.code}`)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isFull
                          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold shadow'
                      }`}
                    >
                      {isFull ? 'Theo dõi' : 'Tham gia'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trận đấu gần đây */}
        <div className="bg-gradient-to-b from-[#151f34]/90 via-[#101627]/90 to-[#0b0f1c]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-800/80">
            <h3 className="text-sm font-bold text-white">Trận đấu gần đây</h3>
            <Link
              href="/history"
              className="text-xs text-slate-400 hover:text-amber-400 transition"
            >
              Xem tất cả &gt;
            </Link>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {matches.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Chưa có dữ liệu trận đấu nào.
              </div>
            ) : (
              matches.map((m) => {
                const isRedWin = m.winner === 'red';
                const isDraw = m.winner === 'draw';

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-300">
                        {m.redName.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {m.redName} <span className="text-slate-500">vs</span> {m.blackName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {m.mode === 'ai_easy'
                            ? 'Máy (Dễ)'
                            : m.mode === 'ai_hard'
                            ? 'Máy (Khó)'
                            : 'Phòng PvP'}
                          {' • '}
                          {m.totalMoves} nước
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isDraw
                              ? 'bg-slate-700 text-slate-300'
                              : isRedWin
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isDraw ? 'Hòa' : isRedWin ? 'Đỏ thắng' : 'Đen thắng'}
                        </span>
                      </div>
                      <Link
                        href="/history"
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                      >
                        Xem lại
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Challenge Banner */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 sm:p-8 border border-amber-500/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          backgroundImage: `url('/images/banner-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#090d18]/85 backdrop-blur-[2px]" />
        <div className="relative z-10">
          <h4 className="text-lg sm:text-xl font-bold text-white mb-1">Thử thách bản thân</h4>
          <p className="text-xs sm:text-sm text-slate-300">
            Rèn luyện tư duy chiến thuật đỉnh cao cùng cờ tướng truyền thống!
          </p>
        </div>
        <div className="relative z-10">
          <button
            onClick={onCreateRoom}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition active:scale-95"
          >
            Tạo phòng ngay
          </button>
        </div>
      </div>

      {/* 5. Footer */}
      <footer className="pt-8 pb-4 border-t border-slate-800/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-400 font-serif font-bold">
            將
          </div>
          <span className="font-semibold text-slate-300">Cờ Tướng Online</span>
          <span>• Kết nối đam mê - Thách thức bản thân</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-amber-400 transition">Hướng dẫn</a>
          <a href="#" className="hover:text-amber-400 transition">Điều khoản</a>
          <a href="#" className="hover:text-amber-400 transition">Liên hệ</a>
        </div>
      </footer>
    </div>
  );
};
