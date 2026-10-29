'use client';

import React from 'react';
import Link from 'next/link';
import {
  Play,
  ChevronRight,
  Globe,
  Swords,
  Users,
  Trophy,
  Bot,
  PlusCircle,
  KeyRound,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

interface HeroLandingProps {
  onPlayOnline: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onScrollToDashboard: () => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({
  onPlayOnline,
  onCreateRoom,
  onJoinRoom,
  onScrollToDashboard,
}) => {
  return (
    <div className="w-full">
      {/* 1. Hero Section with Cinematic Background */}
      <section className="relative min-h-[620px] lg:min-h-[720px] flex items-center justify-start overflow-hidden rounded-3xl mx-2 sm:mx-4 my-2 border border-amber-500/20 shadow-2xl">
        {/* Background Image with dark oriental overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url('/images/hero-bg.jpg')`,
          }}
        >
          {/* Gradient overlays to guarantee maximum readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f19] via-[#0b0f19]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-[#0b0f19]/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-2xl px-6 sm:px-12 py-16">
          {/* Traditional Seal Tagline */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-6 backdrop-blur-sm">
            <span>◊</span>
            <span>Truyền thống và Hiện đại</span>
            <span className="w-4 h-4 rounded bg-rose-600/80 text-[10px] text-white flex items-center justify-center font-serif">
              印
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none mb-3">
            Cờ Tướng <span className="text-gold-gradient">Online</span>
          </h1>

          {/* Subheading */}
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-100/90 tracking-normal mb-5">
            Kết nối những người đam mê
          </h2>

          {/* Description */}
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 max-w-xl font-normal">
            Thưởng thức những ván cờ kịch tính với bạn bè hoặc người chơi trên toàn quốc.
            Thử thách bản thân, nâng cao kỹ năng và trở thành kỳ thủ hàng đầu!
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <button
              onClick={onPlayOnline}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/25 active:scale-95 transition-all duration-200"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Bắt đầu ngay
            </button>

            <button
              onClick={onScrollToDashboard}
              className="flex items-center gap-2 px-5 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-white font-semibold text-sm sm:text-base rounded-2xl border border-slate-700/80 backdrop-blur-sm transition-all"
            >
              Tìm hiểu thêm
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-700/50">
            <div className="flex items-start gap-2.5">
              <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">Chơi online</p>
                <p className="text-[11px] text-slate-400">Mọi lúc, mọi nơi</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Swords className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">Đa dạng chế độ</p>
                <p className="text-[11px] text-slate-400">Với máy, với người</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Users className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">Cộng đồng lớn</p>
                <p className="text-[11px] text-slate-400">Năng động sôi nổi</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Trophy className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">Xếp hạng hấp dẫn</p>
                <p className="text-[11px] text-slate-400">Nhận thưởng kỳ thủ</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Explore Game Modes (Khám phá các chế độ chơi) */}
      <section className="px-4 sm:px-8 py-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-0.5 bg-amber-500" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                Khám phá các chế độ chơi
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Từ luyện tập đến thi đấu, bạn có thể tìm thấy chế độ chơi phù hợp với mình.
            </p>
          </div>

          <button
            onClick={onScrollToDashboard}
            className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 transition"
          >
            Xem tất cả
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5 Mode Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Chơi với người */}
          <div
            onClick={onPlayOnline}
            className="group cursor-pointer bg-[#121824]/80 hover:bg-[#182133] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-amber-300 transition">
                Chơi với người
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Tham gia đấu trường trực tuyến và so tài cùng những người chơi khác.
              </p>
            </div>
            <div className="flex justify-end">
              <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2: Chơi với máy */}
          <Link
            href="/play/ai"
            className="group cursor-pointer bg-[#121824]/80 hover:bg-[#182133] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 group-hover:scale-110 transition">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-amber-300 transition">
                Chơi với máy
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Luyện tập kỹ năng với nhiều cấp độ thông minh từ Dễ đến Khó.
              </p>
            </div>
            <div className="flex justify-end">
              <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Card 3: Tạo phòng */}
          <div
            onClick={onCreateRoom}
            className="group cursor-pointer bg-[#121824]/80 hover:bg-[#182133] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition">
                <PlusCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-amber-300 transition">
                Tạo phòng
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Tạo phòng riêng để mời bạn bè cùng chơi và thách đấu theo ý muốn.
              </p>
            </div>
            <div className="flex justify-end">
              <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 4: Tham gia phòng */}
          <div
            onClick={onJoinRoom}
            className="group cursor-pointer bg-[#121824]/80 hover:bg-[#182133] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-amber-300 transition">
                Tham gia phòng
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Nhập mã phòng (6 ký tự) để nhanh chóng tham gia trận đấu bạn bè.
              </p>
            </div>
            <div className="flex justify-end">
              <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 5: Chat & Video Call */}
          <div
            onClick={onPlayOnline}
            className="group cursor-pointer bg-[#121824]/80 hover:bg-[#182133] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-amber-300 transition">
                Chat & Video Call
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Trò chuyện realtime và gọi video webcam sống động khi thi đấu PvP.
              </p>
            </div>
            <div className="flex justify-end">
              <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Wide Inspiration Banner */}
      <section className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        <div
          className="relative rounded-2xl overflow-hidden p-8 sm:p-10 border border-amber-500/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6"
          style={{
            backgroundImage: `url('/images/banner-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-[#0b0f19]/80 backdrop-blur-[2px]" />

          <div className="relative z-10">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-serif">◈</span>
              Không chỉ là một trò chơi
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
              Đó là nơi kết nối, giao lưu học hỏi và phát triển tư duy chiến thuật đỉnh cao của các kỳ thủ!
            </p>
          </div>

          <div className="relative z-10">
            <button
              onClick={onScrollToDashboard}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center gap-2 whitespace-nowrap"
            >
              Khám phá ngay
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
