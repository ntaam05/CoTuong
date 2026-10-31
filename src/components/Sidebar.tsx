'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Bot,
  PlusCircle,
  KeyRound,
  User,
  History,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCreateRoom?: () => void;
  onJoinRoom?: () => void;
  onOpenAuth?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onCreateRoom,
  onJoinRoom,
  onOpenAuth,
}) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Trang chủ', icon: Home, href: '/', active: pathname === '/' },
    { label: 'Chơi với máy', icon: Bot, href: '/play/ai', active: pathname === '/play/ai' },
    { label: 'Tạo phòng', icon: PlusCircle, onClick: onCreateRoom },
    { label: 'Tham gia phòng', icon: KeyRound, onClick: onJoinRoom },
    { label: 'Lịch sử', icon: History, href: '/history', active: pathname === '/history' },
    { label: 'Hồ sơ', icon: User, onClick: onOpenAuth },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col bg-white dark:bg-black border-r border-black/10 dark:border-white/10 p-3 shrink-0 min-h-screen transition-all duration-300 relative z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand & Toggle Header */}
      <div className={`flex items-center mb-6 px-2 py-1 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2.5 group overflow-hidden">
            <div className="w-8 h-8 rounded-full border border-black/20 dark:border-white/20 flex items-center justify-center shrink-0">
              <span className="font-bold text-base font-serif text-black dark:text-white">將</span>
            </div>
            <span className="text-base font-bold text-black dark:text-white tracking-wide truncate">
              Cờ Tướng <span className="text-slate-400 dark:text-zinc-500">Online</span>
            </span>
          </Link>
        )}

        {/* Toggle Icon button */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white border border-black/10 dark:border-white/10 transition"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav List */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const content = (
            <div
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                isCollapsed ? 'justify-center' : ''
              } ${
                item.active
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </div>
          );

          if (item.href) {
            return (
              <Link key={idx} href={item.href}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={item.onClick}
              className="w-full text-left cursor-pointer"
            >
              {content}
            </button>
          );
        })}
      </nav>

      {/* Bottom version badge */}
      {!isCollapsed ? (
        <div className="p-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-[11px] text-black/60 dark:text-white/60 text-center">
          <p className="font-semibold text-black dark:text-white">Cờ Tướng Online</p>
          <p className="text-[10px] text-slate-500">Minimalist Edition</p>
        </div>
      ) : (
        <div className="flex justify-center p-2 text-black/40 dark:text-white/40">
          <span className="font-serif font-bold text-sm">將</span>
        </div>
      )}
    </aside>
  );
};