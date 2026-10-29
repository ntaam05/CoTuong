'use client';

import React from 'react';
import {
  Play,
  ChevronRight,
  Monitor,
  Swords,
  Users,
  Bot,
  PlusCircle,
  MessageSquare,
  Sparkles,
  Zap,
  ShieldCheck,
  Layout,
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
}) => {
  const scrollToFeatures = () => {
    const el = document.getElementById('features-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#0f172a] via-[#0b101d] to-[#070a12] text-white selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Landing Header / Navbar */}
      <header className="sticky top-0 z-40 w-full bg-[#0d1322]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-[1.5px] shadow-lg shadow-amber-500/20">
                <div className="w-full h-full rounded-full bg-[#16120b] flex items-center justify-center">
                  <span className="font-bold text-lg text-amber-400 font-serif">將</span>
                </div>
              </div>
              <span className="text-lg font-bold text-white tracking-wide">
                Cờ Tướng <span className="text-amber-400">Online</span>
              </span>
            </div>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
              <a href="#" className="text-amber-400 hover:text-amber-300 transition">
                Trang chủ
              </a>
              <button
                onClick={scrollToFeatures}
                className="hover:text-amber-300 transition"
              >
                Tính năng
              </button>
              <a href="#guide" className="hover:text-amber-300 transition">
                Hướng dẫn
              </a>
              <a href="#ranking" className="hover:text-amber-300 transition">
                Xếp hạng
              </a>
            </nav>
          </div>

          {/* Right: Login & Register Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-slate-200 border border-slate-700/80 hover:border-slate-600 font-bold text-xs rounded-xl transition shadow-sm"
            >
              Đăng nhập
            </button>
            <button
              onClick={onOpenRegister}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95"
            >
              Đăng ký
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative min-h-[580px] lg:min-h-[660px] flex items-center justify-start overflow-hidden rounded-3xl mx-2 sm:mx-6 my-4 border border-amber-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ backgroundImage: `url('/images/hero-bg.jpg')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b101c] via-[#0b101c]/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b101c] via-transparent to-[#0b101c]/60" />
        </div>

        <div className="relative z-10 max-w-2xl px-6 sm:px-12 py-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-6 backdrop-blur-sm">
            <span>◊</span>
            <span>Truyền thống và Hiện đại</span>
            <span className="w-4 h-4 rounded bg-rose-600/80 text-[10px] text-white flex items-center justify-center font-serif">
              印
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none mb-3">
            Cờ Tướng <span className="text-gold-gradient">Online</span>
          </h1>

          <h2 className="text-2xl sm:text-3xl font-bold text-amber-100/90 tracking-normal mb-5">
            Kết nối những người đam mê
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 max-w-xl font-normal">
            Thưởng thức những ván cờ kịch tính với bạn bè hoặc người chơi trên toàn quốc.
            Thử thách bản thân, nâng cao kỹ năng và trở thành kỳ thủ hàng đầu!
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-12">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm rounded-2xl shadow-xl shadow-amber-500/25 active:scale-95 transition"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Bắt đầu ngay
            </button>

            <button
              onClick={scrollToFeatures}
              className="flex items-center gap-2 px-5 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-white font-semibold text-sm rounded-2xl border border-slate-700/80 backdrop-blur-sm transition"
            >
              Tìm hiểu thêm
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          {/* 3 badges below matching Image 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-700/50">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Chơi đối kháng</p>
                <p className="text-[11px] text-slate-400">Tạo & Nhập mã phòng</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Luyện tập với máy</p>
                <p className="text-[11px] text-slate-400">Cấp độ Dễ & Khó</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Cộng đồng lớn</p>
                <p className="text-[11px] text-slate-400">Năng động & Giao lưu</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section "Tính năng nổi bật" (Bỏ chơi online generic, giữ 3 tính năng trọng tâm) */}
      <section id="features-section" className="px-4 sm:px-8 py-16 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide mb-1">
            Tính năng nổi bật
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Trải nghiệm cờ tướng theo cách của bạn
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Chơi với máy */}
          <div
            onClick={onOpenLogin}
            className="group cursor-pointer bg-gradient-to-b from-[#151f35]/90 via-[#101729]/90 to-[#0a0f1d]/90 hover:from-[#1b2844]/90 hover:to-[#121a2e]/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 group-hover:scale-110 transition">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 group-hover:text-amber-300 transition">
              Chơi với máy
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Từ dễ đến khó, rèn luyện kỹ năng mọi lúc mọi nơi cùng trí tuệ nhân tạo tính toán nước đi chuẩn xác.
            </p>
          </div>

          {/* Card 2: Tạo / Tham gia phòng */}
          <div
            onClick={onOpenLogin}
            className="group cursor-pointer bg-gradient-to-b from-[#151f35]/90 via-[#101729]/90 to-[#0a0f1d]/90 hover:from-[#1b2844]/90 hover:to-[#121a2e]/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 group-hover:text-amber-300 transition">
              Tạo / Tham gia phòng
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tạo phòng riêng, chia sẻ mã phòng 6 ký tự để mời bạn bè cùng so tài và xem phòng chờ trực tiếp.
            </p>
          </div>

          {/* Card 3: Chat & Video realtime */}
          <div
            onClick={onOpenLogin}
            className="group cursor-pointer bg-gradient-to-b from-[#151f35]/90 via-[#101729]/90 to-[#0a0f1d]/90 hover:from-[#1b2844]/90 hover:to-[#121a2e]/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 group-hover:text-amber-300 transition">
              Chat & Video Call Realtime
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trò chuyện và gọi video call webcam trực tiếp, mang đến cảm giác thi đấu chân thực nhất.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Banner "Không chỉ là một trò chơi" */}
      <section className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        <div
          className="relative rounded-2xl overflow-hidden p-8 sm:p-12 border border-amber-500/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6"
          style={{
            backgroundImage: `url('/images/banner-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-[#070b14]/85 backdrop-blur-[2px]" />

          <div className="relative z-10">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Không chỉ là một trò chơi
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Đó là nơi kết nối, học hỏi và phát triển tư duy chiến lược đỉnh cao.
            </p>
          </div>

          <div className="relative z-10">
            <button
              onClick={onOpenLogin}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition active:scale-95"
            >
              Tham gia ngay
            </button>
          </div>
        </div>
      </section>

      {/* 5. Section "Giao diện đẹp mắt - Trải nghiệm mượt mà" */}
      <section className="px-4 sm:px-8 py-16 max-w-7xl mx-auto">
        <div className="mb-10 text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide mb-1">
            Giao diện đẹp mắt - Trải nghiệm mượt mà
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Thiết kế hiện đại, tối ưu cho mọi thiết bị, mang đến trải nghiệm tuyệt vời nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Device Mockup (7 cols) */}
          <div className="lg:col-span-7 relative group">
            <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-slate-950">
              <img
                src="/images/device-mockup.jpg"
                alt="Xiangqi Device Mockup"
                className="w-full h-auto object-cover group-hover:scale-102 transition duration-500"
              />
            </div>
          </div>

          {/* Right: 4 Feature Highlights with gradient boxes (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#141d30]/90 to-[#0d1424]/90 border border-slate-800/80 flex items-start gap-3.5 hover:border-amber-500/30 transition shadow-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">Tối ưu đa nền tảng</h4>
                <p className="text-xs text-slate-400">Chơi mượt mà trên cả máy tính, máy tính bảng và điện thoại.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#141d30]/90 to-[#0d1424]/90 border border-slate-800/80 flex items-start gap-3.5 hover:border-amber-500/30 transition shadow-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">Giao diện hiện đại</h4>
                <p className="text-xs text-slate-400">Đơn giản, tinh tế, dễ sử dụng cho mọi lứa tuổi kỳ thủ.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#141d30]/90 to-[#0d1424]/90 border border-slate-800/80 flex items-start gap-3.5 hover:border-amber-500/30 transition shadow-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">Hiệu năng ổn định</h4>
                <p className="text-xs text-slate-400">Kết nối Socket.IO realtime, không giật lag, tính toán nước đi chuẩn xác.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#141d30]/90 to-[#0d1424]/90 border border-slate-800/80 flex items-start gap-3.5 hover:border-amber-500/30 transition shadow-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">Bảo mật thông tin</h4>
                <p className="text-xs text-slate-400">An toàn, bảo mật dữ liệu người dùng với cơ sở dữ liệu Prisma.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Bottom Banner "Sẵn sàng bắt đầu hành trình của bạn?" */}
      <section className="px-4 sm:px-8 py-8 max-w-7xl mx-auto">
        <div
          className="relative rounded-3xl overflow-hidden p-8 sm:p-12 border border-amber-500/20 shadow-2xl text-center"
          style={{
            backgroundImage: `url('/images/banner-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-[#070a12]/85 backdrop-blur-[2px]" />

          <div className="relative z-10 max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              Sẵn sàng bắt đầu hành trình của bạn?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-6">
              Đăng ký ngay để trải nghiệm những ván cờ đỉnh cao và so tài cùng cộng đồng kỳ thủ!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onOpenRegister}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition active:scale-95"
              >
                Đăng ký miễn phí
              </button>

              <button
                onClick={onOpenLogin}
                className="px-6 py-3 bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-700 transition"
              >
                Đăng nhập
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Landing Footer */}
      <footer className="pt-10 pb-6 border-t border-slate-800/80 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs text-amber-400 font-serif font-bold">
            將
          </div>
          <span className="font-bold text-slate-200">Cờ Tướng Online</span>
          <span>• Kết nối đam mê - Thách thức bản thân</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-amber-400 transition">Trang chủ</a>
          <button onClick={scrollToFeatures} className="hover:text-amber-400 transition">Tính năng</button>
          <a href="#" className="hover:text-amber-400 transition">Hướng dẫn</a>
          <a href="#" className="hover:text-amber-400 transition">Điều khoản</a>
          <a href="#" className="hover:text-amber-400 transition">Liên hệ</a>
        </div>
      </footer>
    </div>
  );
};
