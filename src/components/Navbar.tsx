'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  LogIn,
  LogOut,
  History,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from './AuthModal';
import { CreateRoomModal } from './CreateRoomModal';
import { JoinRoomModal } from './JoinRoomModal';

interface NavbarProps {
  onSearch?: (query: string) => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  onToggleSidebar,
  isSidebarCollapsed = false,
}) => {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [joinRoomOpen, setJoinRoomOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#0d121f]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Toggle Tabbar Icon */}
          <div className="flex items-center gap-4">
            {/* Toggle Tabbar / Sidebar Button (matching user request) */}
            {user && onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title={isSidebarCollapsed ? 'Mở rộng menu bên trái' : 'Ẩn menu bên trái'}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 hover:border-amber-500/40 transition shadow-sm"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-5 h-5 text-amber-400" />
                ) : (
                  <PanelLeftClose className="w-5 h-5" />
                )}
              </button>
            )}

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-[1.5px] shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
                <div className="w-full h-full rounded-full bg-[#16120b] flex items-center justify-center">
                  <span className="font-bold text-lg text-amber-400 font-serif">將</span>
                </div>
              </div>
              <span className="text-lg font-bold text-white tracking-wide group-hover:text-amber-400 transition hidden sm:inline">
                Cờ Tướng <span className="text-amber-400">Online</span>
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-300 ml-4">
              <Link
                href="/"
                className="text-amber-400 hover:text-amber-300 transition py-1 border-b-2 border-amber-400"
              >
                Trang chủ
              </Link>
              <Link
                href="/play/ai"
                className="hover:text-amber-300 transition py-1"
              >
                Chơi với máy
              </Link>
              <button
                onClick={() => setCreateRoomOpen(true)}
                className="hover:text-amber-300 transition py-1"
              >
                Tạo phòng
              </button>
              <button
                onClick={() => setJoinRoomOpen(true)}
                className="hover:text-amber-300 transition py-1"
              >
                Nhập mã phòng
              </button>
              <Link
                href="/history"
                className="hover:text-amber-300 transition py-1"
              >
                Lịch sử đấu
              </Link>
            </nav>
          </div>

          {/* Search, Notifications & User Profile */}
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative hidden md:block w-48 lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                placeholder="Tìm kiếm người chơi, phòng..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-full text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition"
              />
            </div>

            {/* Notifications Bell */}
            <button
              className="relative p-2 text-slate-400 hover:text-white transition rounded-full hover:bg-slate-800"
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            </button>

            {/* User Profile */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-800/80 transition"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-amber-500/60 object-cover"
                  />
                  <div className="hidden lg:block text-left text-xs">
                    <p className="font-bold text-slate-200 leading-tight">{user.name}</p>
                    <p className="text-[10px] text-amber-400/90 font-medium">Kỳ thủ</p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#161f30] border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs font-bold text-white">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/history"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-amber-400 hover:bg-slate-800/60 rounded-xl transition"
                    >
                      <History className="w-3.5 h-3.5" />
                      Lịch sử trận đấu
                    </Link>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-full shadow transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />

      <CreateRoomModal
        isOpen={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
      />

      <JoinRoomModal
        isOpen={joinRoomOpen}
        onClose={() => setJoinRoomOpen(false)}
      />
    </>
  );
};
