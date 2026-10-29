'use client';

import React, { useState } from 'react';
import { X, KeyRound, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setError('Vui lòng nhập đúng mã phòng');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/rooms/${cleanCode}`);
      const data = await res.json();
      if (!data.success || !data.room) {
        throw new Error('Không tìm thấy phòng với mã này');
      }

      onClose();
      router.push(`/room/${cleanCode}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#161f30] to-[#0f172a] border border-amber-500/30 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <KeyRound className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-white">Tham Gia Bằng Mã</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mã phòng (6 ký tự)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: A7K9P2"
              maxLength={8}
              className="w-full text-center tracking-widest font-mono font-bold text-lg px-3.5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
              autoFocus
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading ? 'Đang kiểm tra...' : 'Vào phòng ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
