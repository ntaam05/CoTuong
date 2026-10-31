'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot, PlusCircle, KeyRound, Users, User, Sun, Moon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';

interface RoomItem {
  id: string; code: string; name: string; status: string;
  host: { id: string; name: string; avatar: string; level: number };
  guest?: { id: string; name: string; avatar: string; level: number } | null;
}

interface MatchItem {
  id: string; redName: string; blackName: string; winner: string;
  mode: string; createdAt: string; totalMoves: number;
}

interface DashboardProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onCreateRoom, onJoinRoom }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // === TRẠNG THÁI SÁNG TỐI ===
  const [isDark, setIsDark] = useState(true);

  // Kích hoạt class 'dark' cho thẻ <html>
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.success) setRooms(data.rooms || []);
    } catch (e) { console.error(e); } finally { setLoadingRooms(false); }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/history?limit=6');
      const data = await res.json();
      if (data.success) setMatches(data.history || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchRooms(); fetchMatches();
    const socket = getSocket();
    socket.on('lobby-updated', fetchRooms);
    return () => { socket.off('lobby-updated'); };
  }, []);

  const totalGames = (user?.wins || 0) + (user?.losses || 0) + (user?.draws || 0);
  const wins = user?.wins ?? 0;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in duration-500">
      
      {/* 1. Header & Nút Gạt */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-zinc-800 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black transition-colors">
            <User className="w-7 h-7 text-slate-800 dark:text-zinc-200" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Xin chào, {user?.name || 'Kỳ Thủ'}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm font-medium text-slate-500 dark:text-zinc-400">
              <span>Trận: <strong className="text-slate-900 dark:text-white">{totalGames}</strong></span>
              <span>Thắng: <strong className="text-slate-900 dark:text-white">{wins}</strong></span>
              <span>Tỷ lệ: <strong className="text-slate-900 dark:text-white">{winRate}%</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsDark(!isDark)}
          className="relative w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-500 bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 flex-shrink-0"
        >
          <div className={`w-5 h-5 rounded-full bg-white dark:bg-black shadow-sm transform transition-transform duration-500 flex items-center justify-center ${isDark ? 'translate-x-7' : 'translate-x-0'}`}>
            {isDark ? <Moon className="w-3 h-3 text-slate-900 dark:text-white" /> : <Sun className="w-3 h-3 text-slate-900 dark:text-white" />}
          </div>
        </button>
      </div>

      {/* 2. Menu Chế Độ Chơi */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">Chế Độ Chơi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="group rounded-xl p-6 transition-all duration-300 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-500 shadow-sm">
            <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-slate-800 dark:text-zinc-200 group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Luyện Tập AI</h4>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">Đấu với máy để nâng cao kỳ nghệ.</p>
            <Link href="/play/ai" className="flex justify-center w-full py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm rounded-lg transition-transform active:scale-95">Chơi Đơn</Link>
          </div>

          <div className="group rounded-xl p-6 transition-all duration-300 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-500 shadow-sm">
            <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-slate-800 dark:text-zinc-200 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Tạo Phòng</h4>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">Mở phòng mới và chia sẻ mã mời.</p>
            <button onClick={onCreateRoom} className="w-full py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm rounded-lg transition-transform active:scale-95">Tạo Mới</button>
          </div>

          <div className="group rounded-xl p-6 transition-all duration-300 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-500 shadow-sm">
            <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-slate-800 dark:text-zinc-200 group-hover:scale-110 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Vào Bằng Mã</h4>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">Nhập mã 6 số để vào phòng nhanh.</p>
            <button onClick={onJoinRoom} className="w-full py-2.5 bg-transparent text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 font-bold text-sm rounded-lg transition-all active:scale-95">Nhập Mã</button>
          </div>
        </div>
      </div>

      {/* 3. Lịch Sử & Phòng Chờ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Lịch Sử Gần Đây</h3>
            <Link href="/history" className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white">Tất cả</Link>
          </div>
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            {matches.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-zinc-500">Chưa có trận đấu nào.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {matches.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${m.winner === 'draw' ? 'bg-slate-400' : 'bg-slate-900 dark:bg-white'}`} />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {m.redName} <span className="text-slate-400 font-normal mx-1">vs</span> {m.blackName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{m.mode.includes('ai') ? 'Đấu Máy' : 'Đấu Người'} • {m.totalMoves} nước</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
                      {m.winner === 'draw' ? 'Hòa' : m.winner === 'red' ? 'Đỏ thắng' : 'Đen thắng'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Phòng Trực Tuyến</h3>
            <button className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-opacity">Làm mới</button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {loadingRooms ? (
              <div className="p-8 text-center text-sm text-slate-500 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl">Đang tải...</div>
            ) : rooms.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 dark:border-zinc-700 rounded-xl">
                <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">Chưa có phòng nào.</p>
                <button onClick={onCreateRoom} className="mt-2 text-sm font-bold text-slate-900 dark:text-white underline">Tạo phòng ngay</button>
              </div>
            ) : (
              rooms.map((room) => {
                const isFull = (room.host ? 1 : 0) + (room.guest ? 1 : 0) >= 2;
                return (
                  <div key={room.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl gap-4 hover:border-slate-300 dark:hover:border-zinc-600 transition-colors shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">{room.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400">#{room.code}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {room.host.name}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {isFull ? '2/2' : '1/2'}</span>
                      </div>
                    </div>
                    <button onClick={() => router.push(`/room/${room.code}`)} className={`w-full sm:w-auto px-5 py-2 rounded-lg font-bold text-sm transition-transform active:scale-95 ${isFull ? 'bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-500' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>
                      {isFull ? 'Xem Trận' : 'Vào Chơi'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};