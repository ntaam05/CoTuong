'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { UserSession } from '@/models/types';

interface ChatMessage {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    avatar: string;
  };
  text: string;
  createdAt: string;
}

interface ChatBoxProps {
  socket: Socket | null;
  roomCode: string;
  roomId?: string;
  currentUser: UserSession | null;
  initialMessages?: ChatMessage[];
}

const QUICK_MESSAGES = [
  'Xin chào kỳ thủ! 🤝',
  'Nước cờ hay lắm! 👏',
  'Cẩn thận chiếu bí đấy nhé! ⚔️',
  'Xin cầu hòa được không? 🏳️',
  'Chúc bạn may mắn ván sau! ☕',
];

export const ChatBox: React.FC<ChatBoxProps> = ({
  socket,
  roomCode,
  roomId,
  currentUser,
  initialMessages = [],
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('new-message', handleNewMessage);
    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket]);

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !currentUser || !socket) return;

    socket.emit('send-message', {
      roomCode,
      roomId,
      userId: currentUser.id,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
      text,
    });

    if (!textToSend) {
      setInputText('');
    }
    setShowQuick(false);
  };

  return (
    <div className="flex flex-col h-[340px] bg-[#121824]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Trò Chuyện Realtime
          </h3>
        </div>
        <button
          onClick={() => setShowQuick(!showQuick)}
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
        >
          <Smile className="w-3.5 h-3.5" />
          Tin nhanh
        </button>
      </div>

      {/* Quick message shortcuts bar */}
      {showQuick && (
        <div className="mb-2 p-2 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap gap-1.5 animate-fadeIn">
          {QUICK_MESSAGES.map((msg, i) => (
            <button
              key={i}
              onClick={() => handleSend(msg)}
              className="text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              {msg}
            </button>
          ))}
        </div>
      )}

      {/* Message List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-center italic text-[11px]">
            Chưa có tin nhắn nào. Hãy gửi lời chào đến đối thủ!
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.userId === currentUser?.id;
            return (
              <div
                key={m.id || idx}
                className={`flex gap-2 items-start ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <img
                  src={
                    m.user?.avatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop'
                  }
                  alt={m.user?.name || 'User'}
                  className="w-6 h-6 rounded-full border border-slate-700 object-cover mt-0.5"
                />
                <div
                  className={`max-w-[75%] rounded-xl px-2.5 py-1.5 ${
                    isMe
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  {!isMe && (
                    <div className="text-[10px] font-semibold text-amber-400 mb-0.5">
                      {m.user?.name || 'Đối thủ'}
                    </div>
                  )}
                  <p className="break-words leading-relaxed">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input box */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Nhập tin nhắn..."
          className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
        />
        <button
          onClick={() => handleSend()}
          className="p-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl transition shadow active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
