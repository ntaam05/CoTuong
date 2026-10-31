'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  LogIn,
  LogOut,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
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

  // === TRẠNG THÁI GẠT SÁNG / TỐI ===
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-black/95 backdrop-blur-md border-b border-black/10 dark:border-white/10 px-4 lg:px-8 py-3 transition-colors duration-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Toggle Tabbar Icon */}
          <div className="flex items-center gap-4">
            {user && onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title={isSidebarCollapsed ? 'Mở rộng menu bên trái' : 'Ẩn menu bên trái'}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white border border-black/10 dark:border-white/10 transition shadow-sm"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-5 h-5" />
                ) : (
                  <PanelLeftClose className="w-5 h-5" />
                )}
              </button>
            )}

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-full border border-black/20 dark:border-white/20 flex items-center justify-center group-hover:scale-105 transition">
                <span className="font-bold text-lg font-serif text-black dark:text-white">將</span>
              </div>
              <span className="text-lg font-bold text-black dark:text-white tracking-wide hidden sm:inline">
                Cờ Tướng <span className="text-slate-400 dark:text-zinc-500">Online</span>
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-black/70 dark:text-white/70 ml-4">
              <Link href="/" className="text-black dark:text-white transition py-1 border-b-2 border-black dark:border-white">
                Trang chủ
              </Link>
              <Link href="/play/ai" className="hover:text-black dark:hover:text-white transition py-1">
                Chơi với máy
              </Link>
              <button onClick={() => setCreateRoomOpen(true)} className="hover:text-black dark:hover:text-white transition py-1">
                Tạo phòng
              </button>
              <button onClick={() => setJoinRoomOpen(true)} className="hover:text-black dark:hover:text-white transition py-1">
                Nhập mã phòng
              </button>
              <Link href="/history" className="hover:text-black dark:hover:text-white transition py-1">
                Lịch sử đấu
              </Link>
            </nav>
          </div>

          {/* Search, Notifications, Theme Toggle & User Profile */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative hidden md:block w-48 lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                placeholder="Tìm kiếm người chơi, phòng..."
                className="w-full pl-9 pr-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-xs text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black dark:focus:border-white transition"
              />
            </div>

            {/* NÚT GẠT SÁNG / TỐI (TOGGLE SWITCH) */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="relative w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-500 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 flex-shrink-0"
              title="Đổi giao diện Sáng/Tối"
            >
              <div
                className={`w-5 h-5 rounded-full bg-black dark:bg-white shadow-md transform transition-transform duration-500 flex items-center justify-center ${
                  isDark ? 'translate-x-7' : 'translate-x-0'
                }`}
              >
                {isDark ? (
                  <Moon className="w-3 h-3 text-white dark:text-black" />
                ) : (
                  <Sun className="w-3 h-3 text-white dark:text-black" />
                )}
              </div>
            </button>

            {/* Notifications Bell */}
            <button
              className="relative p-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition rounded-full hover:bg-black/5 dark:hover:bg-white/5"
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
                  className="flex items-center gap-2.5 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-black/20 dark:border-white/20 object-cover"
                  />
                  <div className="hidden lg:block text-left text-xs">
                    <p className="font-bold text-black dark:text-white leading-tight">{user.name}</p>
                    <p className="text-[10px] text-black/50 dark:text-white/50 font-medium">Kỳ thủ</p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-black/10 dark:border-white/10 mb-1">
                      <p className="text-xs font-bold text-black dark:text-white">{user.name}</p>
                      <p className="text-[11px] text-black/50 dark:text-white/50 truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/history"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition"
                    >
                      <History className="w-3.5 h-3.5" />
                      Lịch sử trận đấu
                    </Link>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
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
                className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white dark:bg-white dark:text-black font-bold text-xs rounded-full shadow transition active:scale-95"
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