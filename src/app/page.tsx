'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LandingPage } from '@/components/LandingPage';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { JoinRoomModal } from '@/components/JoinRoomModal';
import { AuthModal } from '@/components/AuthModal';

export default function HomePage() {
  const { user, loading } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [joinRoomOpen, setJoinRoomOpen] = useState(false);

  // Tabbar / Sidebar Collapse state (Matching user requirement)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Loading indicator while auth is verified
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#11192e] via-[#0c1222] to-[#060911] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
          <span className="text-xs text-amber-400 font-semibold font-serif">
            Cờ Tướng Online...
          </span>
        </div>
      </div>
    );
  }

  // 1. GIAO DIỆN LANDING PAGE (Khi chưa đăng nhập - Đúng theo Hình 1)
  if (!user) {
    return (
      <>
        <LandingPage
          onOpenLogin={() => {
            setAuthMode('login');
            setAuthModalOpen(true);
          }}
          onOpenRegister={() => {
            setAuthMode('register');
            setAuthModalOpen(true);
          }}
        />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultMode={authMode}
        />
      </>
    );
  }

  // 2. GIAO DIỆN TRANG CHỦ / DASHBOARD (Sau khi Login - Đúng theo Hình 2 với Menu bên trái & Icon ẩn/hiện)
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#11192e] via-[#0c1222] to-[#060911] flex">
      {/* Menu / Tabbar bên trái có nút ẩn/hiện */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onCreateRoom={() => setCreateRoomOpen(true)}
        onJoinRoom={() => setJoinRoomOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Khu vực nội dung chính */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 pb-16">
          <Dashboard
            onCreateRoom={() => setCreateRoomOpen(true)}
            onJoinRoom={() => setJoinRoomOpen(true)}
          />
        </main>
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
      />
      <JoinRoomModal
        isOpen={joinRoomOpen}
        onClose={() => setJoinRoomOpen(false)}
      />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
