import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Cờ Tướng Online - Kết Nối Những Người Đam Mê',
  description:
    'Website chơi cờ tướng trực tuyến đỉnh cao, thi đấu PvP, luyện tập với máy thông minh, trò chuyện realtime và gọi video kết nối kỳ thủ.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Thẻ html giữ nguyên class="dark" để mặc định mở web là màu đen
    <html lang="vi" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Noto+Serif+TC:wght@600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* Đã gỡ bỏ gradient cũ, thay bằng bg-white/dark:bg-black và text-slate-900/dark:text-white */}
      <body className="bg-white text-slate-900 dark:bg-black dark:text-white min-h-screen transition-colors duration-500 selection:bg-sky-500/20 selection:text-sky-600 dark:selection:bg-sky-500/30 dark:selection:text-sky-200">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}