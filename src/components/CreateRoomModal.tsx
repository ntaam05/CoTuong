'use client';

import React, { useState } from 'react';
import { X, Clock, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [timeMinutes, setTimeMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName.trim() || `Phòng của ${user?.name || 'Kỳ Thủ'}`,
          hostId: user?.id,
          timeControl: timeMinutes * 60,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Không thể tạo phòng');
      }

      onClose();
      router.push(`/room/${data.room.code}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#161f30] to-[#0f172a] border border-amber-500/30 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            將
          </div>
          <h2 className="text-xl font-bold text-white">Tạo Phòng Chơi Mới</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tên phòng
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="VD: Phòng Cao Thủ, Giao lưu học hỏi..."
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
              maxLength={40}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Thời gian mỗi bên
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setTimeMinutes(mins)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    timeMinutes === mins
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {mins} phút
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading ? 'Đang tạo phòng...' : 'Tạo phòng & Vào chơi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
