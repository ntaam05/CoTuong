'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Lớp nền mờ (Backdrop) */}
      <div 
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Khung Modal Chính */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        
        {/* Nút Đóng Góc Phải */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch */}
        <div className="flex">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-4 text-sm font-bold transition-colors border-b-2 ${
              isLogin
                ? 'bg-white dark:bg-[#09090b] border-sky-500 text-sky-600 dark:text-sky-400'
                : 'bg-slate-50 dark:bg-zinc-900/50 border-transparent text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-4 text-sm font-bold transition-colors border-b-2 ${
              !isLogin
                ? 'bg-white dark:bg-[#09090b] border-sky-500 text-sky-600 dark:text-sky-400'
                : 'bg-slate-50 dark:bg-zinc-900/50 border-transparent text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tạo Tài Khoản
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-medium rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input: Tên (Chỉ khi Đăng Ký) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Họ và Tên</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#09090b] border border-slate-300 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600 shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Input: Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#09090b] border border-slate-300 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600 shadow-sm"
                />
              </div>
            </div>

            {/* Input: Mật khẩu */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Mật khẩu</label>
                {isLogin && <button type="button" className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">Quên mật khẩu?</button>}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#09090b] border border-slate-300 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600 shadow-sm"
                />
              </div>
            </div>

            {/* Nút Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-lg shadow-sm active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : isLogin ? 'Vào Game' : 'Đăng Ký Tài Khoản'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};