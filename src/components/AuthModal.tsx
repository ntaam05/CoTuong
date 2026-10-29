'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ShieldAlert } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1a233a] via-[#121929] to-[#0b101c] border border-amber-500/25 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition p-1 rounded-full hover:bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800/80 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 pb-3 text-sm font-bold transition border-b-2 ${
              isLogin
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 pb-3 text-sm font-bold transition border-b-2 ${
              !isLogin
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Đăng Ký
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Họ và tên kỳ thủ
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Gmail / Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading
                ? 'Đang xử lý...'
                : isLogin
                ? 'Đăng Nhập'
                : 'Đăng Ký'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
