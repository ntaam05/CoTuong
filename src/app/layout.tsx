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
    <html lang="vi" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Noto+Serif+TC:wght@600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gradient-to-b from-[#11192e] via-[#0c1222] to-[#060911] text-[#f8fafc] min-h-screen selection:bg-amber-500/30 selection:text-amber-200">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
