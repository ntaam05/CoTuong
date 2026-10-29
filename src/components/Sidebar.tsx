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
      className={`hidden lg:flex flex-col bg-gradient-to-b from-[#101728] via-[#0c1220] to-[#070a12] border-r border-slate-800/80 p-3 shrink-0 min-h-screen transition-all duration-300 relative z-30 shadow-2xl ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand & Toggle Header */}
      <div className={`flex items-center mb-6 px-2 py-1 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2.5 group overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-[1.5px] shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full rounded-full bg-[#16120b] flex items-center justify-center">
                <span className="font-bold text-base text-amber-400 font-serif">將</span>
              </div>
            </div>
            <span className="text-base font-bold text-white tracking-wide group-hover:text-amber-400 transition truncate">
              Cờ Tướng <span className="text-amber-400">Online</span>
            </span>
          </Link>
        )}

        {/* Toggle Icon button */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/30 transition shadow-sm"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-amber-400" />
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
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
        <div className="p-3 bg-gradient-to-b from-[#141b2d] to-[#0c1220] border border-slate-800/80 rounded-xl text-[11px] text-slate-400 text-center">
          <p className="font-semibold text-slate-300">Cờ Tướng Online</p>
          <p className="text-[10px] text-amber-500/80">Truyền Thống & Hiện Đại</p>
        </div>
      ) : (
        <div className="flex justify-center p-2 text-slate-500">
          <span className="font-serif font-bold text-amber-400/80 text-sm">將</span>
        </div>
      )}
    </aside>
  );
};
