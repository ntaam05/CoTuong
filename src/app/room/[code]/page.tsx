'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Shield,
  Play,
  Flag,
  Handshake,
  Trophy,
  Volume2,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BoardPosition, Move, PieceColor, Position, UserSession } from '@/models/types';
import { XiangqiEngine } from '@/models/XiangqiBoard';
import { XiangqiBoardView } from '@/components/XiangqiBoardView';
import { VideoCall } from '@/components/VideoCall';
import { ChatBox } from '@/components/ChatBox';
import { sounds } from '@/lib/sound';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

export default function PvPRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [undoPending, setUndoPending] = useState(false);
  const [incomingUndoRequest, setIncomingUndoRequest] = useState<{
    requesterColor: PieceColor;
    requesterName: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multiplayer Room State from Socket
  const [roomState, setRoomState] = useState<{
    hostSocketId: string | null;
    guestSocketId: string | null;
    hostUser: UserSession | null;
    guestUser: UserSession | null;
    hostReady: boolean;
    guestReady: boolean;
    isPlaying: boolean;
  }>({
    hostSocketId: null,
    guestSocketId: null,
    hostUser: null,
    guestUser: null,
    hostReady: true,
    guestReady: false,
    isPlaying: false,
  });

  // Game Play State
  const [board, setBoard] = useState<BoardPosition>(XiangqiEngine.getInitialBoard());
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('red');
  const [playerColor, setPlayerColor] = useState<PieceColor>('red');
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [isCheck, setIsCheck] = useState(false);
  const [gameOver, setGameOver] = useState<{
    winner: PieceColor | 'draw';
    reason: string;
  } | null>(null);

  // Timers
  const [redTime, setRedTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const socketRef = useRef<any>(null);
  const moveHistoryRef = useRef<Move[]>([]);
  const playerColorRef = useRef<PieceColor>(playerColor);
  const gameStartTimeRef = useRef<number>(gameStartTime);
  const roomStateRef = useRef(roomState);
  const hasRegisteredGuestRef = useRef(false);

  useEffect(() => {
    moveHistoryRef.current = moveHistory;
  }, [moveHistory]);

  useEffect(() => {
    playerColorRef.current = playerColor;
  }, [playerColor]);

  useEffect(() => {
    gameStartTimeRef.current = gameStartTime;
  }, [gameStartTime]);

  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  // Fetch initial room data from API
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        const data = await res.json();
        if (data.success && data.room) {
          setRoomData(data.room);
          setRedTime(data.room.timeControl || 600);
          setBlackTime(data.room.timeControl || 600);
        } else {
          router.push('/');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [code, router]);

  // Connect to Socket.IO once roomData and user are ready
  useEffect(() => {
    if (!user || !roomData) return;

    const socket = getSocket();
    socketRef.current = socket;

    // Join room
    socket.emit('join-room', {
      roomCode: code,
      user,
    });

    // Also call API to register guest once if not host
    if (
      roomData.hostId !== user.id &&
      (!roomData.guestId || roomData.guestId === user.id) &&
      !hasRegisteredGuestRef.current
    ) {
      hasRegisteredGuestRef.current = true;
      fetch(`/api/rooms/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', userId: user.id }),
      }).catch((e) => console.warn('Guest join notice:', e));
    }

    // Listen to room state updates
    socket.on('room-state', (state: any) => {
      setRoomState(state);
    });

    // Listen to game start
    socket.on('game-started', ({ redPlayer, blackPlayer, timeControl }: any) => {
      setBoard(XiangqiEngine.getInitialBoard());
      setCurrentTurn('red');
      setMoveHistory([]);
      setLastMove(null);
      setIsCheck(false);
      setGameOver(null);
      setGameStartTime(Date.now());
      setRedTime(timeControl || 600);
      setBlackTime(timeControl || 600);

      const myColor: PieceColor = user.id === redPlayer?.id ? 'red' : 'black';
      setPlayerColor(myColor);

      setRoomState((prev) => ({
        ...prev,
        isPlaying: true,
      }));
    });

    // Listen to opponent moves
    socket.on('opponent-moved', ({ move, board: nextBoard, nextTurn, isCheck: oppCheck }: any) => {
      setBoard(nextBoard);
      setLastMove(move);
      setMoveHistory((prev) => [...prev, move]);
      setCurrentTurn(nextTurn);
      setIsCheck(oppCheck);

      if (move.captured) {
        sounds.playCapture();
      } else {
        sounds.playMove();
      }
      if (oppCheck) {
        sounds.playCheck();
      }

      // Check if self has no legal moves
      const myMoves = XiangqiEngine.getAllLegalMoves(nextBoard, nextTurn);
      if (myMoves.length === 0) {
        const oppColor = nextTurn === 'red' ? 'black' : 'red';
        socket.emit('game-finished', {
          roomCode: code,
          winner: oppColor,
          redUser: roomStateRef.current.hostUser,
          blackUser: roomStateRef.current.guestUser,
          moves: [...moveHistoryRef.current, move],
          duration: Math.round((Date.now() - gameStartTimeRef.current) / 1000),
          reason: 'Chiếu bí',
        });
      }
    });

    // Listen to game ended
    socket.on('game-ended', ({ winner, reason }: any) => {
      setGameOver({ winner, reason });
      if (winner === playerColorRef.current) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        sounds.playVictory();
      }
    });

    // Undo requested by opponent
    socket.on('undo-requested', (data: { requesterColor: PieceColor; requesterName: string }) => {
      setIncomingUndoRequest(data);
      sounds.playCheck();
    });

    // Undo accepted by opponent
    socket.on('undo-accepted', ({ requesterColor }: { requesterColor: PieceColor }) => {
      setMoveHistory((prevHistory) => {
        let stepsToRevert = 1;
        const lastM = prevHistory[prevHistory.length - 1];
        if (lastM && lastM.piece.color === requesterColor) {
          stepsToRevert = 1;
        } else if (prevHistory.length >= 2) {
          stepsToRevert = 2;
        }

        const newHistory = prevHistory.slice(0, Math.max(0, prevHistory.length - stepsToRevert));
        let curBoard = XiangqiEngine.getInitialBoard();
        for (const m of newHistory) {
          const res = XiangqiEngine.applyMove(curBoard, m.from, m.to);
          curBoard = res.nextBoard;
        }

        setBoard(curBoard);
        setLastMove(newHistory.length > 0 ? newHistory[newHistory.length - 1] : null);
        setCurrentTurn(requesterColor);
        setIsCheck(XiangqiEngine.isInCheck(curBoard, requesterColor));
        sounds.playMove();

        return newHistory;
      });

      setToastMessage('Nước cờ đã được hoàn tác thành công!');
      setUndoPending(false);
    });

    // Undo declined by opponent
    socket.on('undo-declined', () => {
      setToastMessage('Đối thủ không đồng ý cho bạn đi lại nước cờ.');
      setUndoPending(false);
    });

    // Room closed by host
    socket.on('room-closed', (data: { reason: string }) => {
      alert(data?.reason || 'Chủ phòng đã rời phòng. Phòng thi đấu đã bị hủy.');
      router.push('/');
    });

    // Guest left
    socket.on('guest-left', () => {
      setToastMessage('Người chơi đối thủ đã rời khỏi phòng.');
    });

    return () => {
      socket.off('room-state');
      socket.off('game-started');
      socket.off('opponent-moved');
      socket.off('game-ended');
      socket.off('undo-requested');
      socket.off('undo-accepted');
      socket.off('undo-declined');
      socket.off('room-closed');
      socket.off('guest-left');
    };
  }, [user, roomData?.id, code, router]);

  // Timers countdown
  useEffect(() => {
    if (!roomState.isPlaying || gameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (currentTurn === 'red') {
        setRedTime((t) => {
          if (t <= 1) {
            handleTimeout('red');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime((t) => {
          if (t <= 1) {
            handleTimeout('black');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomState.isPlaying, gameOver, currentTurn]);

  const handleTimeout = (loserColor: PieceColor) => {
    const winnerColor = loserColor === 'red' ? 'black' : 'red';
    socketRef.current?.emit('game-finished', {
      roomCode: code,
      winner: winnerColor,
      redUser: roomState.hostUser,
      blackUser: roomState.guestUser,
      moves: moveHistory,
      duration: Math.round((Date.now() - gameStartTime) / 1000),
      reason: 'Hết thời gian',
    });
  };

  const isHost = user?.id === roomData?.hostId;
  const isGuest = user?.id !== roomData?.hostId;

  // Toggle ready status
  const handleToggleReady = () => {
    const newReady = !roomState.guestReady;
    socketRef.current?.emit('player-ready', {
      roomCode: code,
      userId: user?.id,
      isReady: newReady,
    });
  };

  // Host starts the game (only when guest is ready!)
  const handleStartGame = () => {
    if (!roomState.guestReady) return;
    socketRef.current?.emit('start-game', { roomCode: code });
  };

  // Player makes a move in PvP
  const handleMakeMove = (from: Position, to: Position) => {
    if (!roomState.isPlaying || gameOver || currentTurn !== playerColor) return;

    try {
      const { nextBoard, move, isCheck: checkNow } = XiangqiEngine.applyMove(
        board,
        from,
        to
      );

      if (move.captured) {
        sounds.playCapture();
      } else {
        sounds.playMove();
      }
      if (checkNow) {
        sounds.playCheck();
      }

      setBoard(nextBoard);
      setLastMove(move);
      setMoveHistory((prev) => [...prev, move]);
      setIsCheck(checkNow);

      const nextTurn = playerColor === 'red' ? 'black' : 'red';
      setCurrentTurn(nextTurn);

      // Emit to opponent
      socketRef.current?.emit('make-move', {
        roomCode: code,
        move,
        board: nextBoard,
        nextTurn,
        isCheck: checkNow,
        isCheckmate: false,
      });

      // Check if opponent has any legal moves
      const oppMoves = XiangqiEngine.getAllLegalMoves(nextBoard, nextTurn);
      if (oppMoves.length === 0) {
        socketRef.current?.emit('game-finished', {
          roomCode: code,
          winner: playerColor,
          redUser: roomState.hostUser,
          blackUser: roomState.guestUser,
          moves: [...moveHistory, move],
          duration: Math.round((Date.now() - gameStartTime) / 1000),
          reason: 'Chiếu bí',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Resign Click -> Open Confirmation Modal
  const handleResignClick = () => {
    if (!roomState.isPlaying || gameOver) return;
    setShowResignConfirm(true);
  };

  const executeResign = () => {
    setShowResignConfirm(false);
    if (!roomState.isPlaying || gameOver) return;
    socketRef.current?.emit('resign', {
      roomCode: code,
      resignerColor: playerColor,
      redUser: roomState.hostUser,
      blackUser: roomState.guestUser,
      moves: moveHistory,
      duration: Math.round((Date.now() - gameStartTime) / 1000),
    });
  };

  // Offer draw
  const handleOfferDraw = () => {
    if (!roomState.isPlaying || gameOver) return;
    alert('Đã gửi đề nghị cầu hòa đến đối thủ');
    socketRef.current?.emit('offer-draw', {
      roomCode: code,
      color: playerColor,
    });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLeaveRoom = async () => {
    if (isHost) {
      if (
        confirm(
          'Bạn là chủ phòng. Nếu bạn rời đi, phòng thi đấu sẽ bị hủy hoàn toàn và biến mất. Bạn có chắc muốn rời không?'
        )
      ) {
        if (socketRef.current) {
          socketRef.current.emit('leave-room', { roomCode: code, userId: user?.id });
        }
        try {
          await fetch(`/api/rooms/${code}`, { method: 'DELETE' });
        } catch (e) {}
        router.push('/');
      }
    } else {
      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomCode: code, userId: user?.id });
      }
      router.push('/');
    }
  };

  // Request undo in PvP (must be confirmed by opponent)
  const handleRequestUndo = () => {
    if (!roomState.isPlaying || gameOver || moveHistory.length === 0 || undoPending) return;
    socketRef.current?.emit('request-undo', {
      roomCode: code,
      requesterColor: playerColor,
      requesterName: user?.name || (playerColor === 'red' ? 'Kỳ thủ Đỏ' : 'Kỳ thủ Đen'),
    });
    setUndoPending(true);
    setToastMessage('Đã gửi yêu cầu xin đi lại nước cờ, vui lòng chờ đối thủ...');
  };

  const handleRespondUndo = (accepted: boolean) => {
    if (!incomingUndoRequest) return;
    socketRef.current?.emit('respond-undo', {
      roomCode: code,
      accepted,
      requesterColor: incomingUndoRequest.requesterColor,
    });
    setIncomingUndoRequest(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#11192e] via-[#0c1222] to-[#060911] flex items-center justify-center text-amber-400 font-semibold">
        Đang tải thông tin phòng...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#11192e] via-[#0c1222] to-[#060911] text-white p-3 sm:p-6 flex flex-col">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <button
          onClick={handleLeaveRoom}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-rose-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Rời phòng
        </button>

        {/* Room Info & Code Badge */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white hidden sm:inline">
            {roomData?.name}
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700/80 rounded-full">
            <span className="text-xs text-slate-400">Mã phòng:</span>
            <span className="font-mono font-bold text-xs text-amber-400">{code}</span>
            <button
              onClick={copyRoomCode}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Sao chép mã phòng"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        {/* Left: Chessboard & Players (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          {/* Opponent Card */}
          <div className="w-full max-w-[540px] flex items-center justify-between px-4 py-2.5 mb-2 bg-[#121824]/80 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <img
                src={
                  (isHost ? roomState.guestUser?.avatar : roomState.hostUser?.avatar) ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'
                }
                alt="Opponent"
                className="w-9 h-9 rounded-full border border-slate-700 object-cover"
              />
              <div>
                <p className="text-xs font-bold text-white">
                  {(isHost ? roomState.guestUser?.name : roomState.hostUser?.name) ||
                    'Đang chờ đối thủ...'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {playerColor === 'red' ? 'Cầm quân Đen' : 'Cầm quân Đỏ'}
                </p>
              </div>
            </div>

            <div className="font-mono text-xs px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-300">
              {formatTime(playerColor === 'red' ? blackTime : redTime)}
            </div>
          </div>

          {/* Chessboard View */}
          <div className="relative">
            <XiangqiBoardView
              board={board}
              currentTurn={currentTurn}
              playerColor={playerColor}
              isInteractive={roomState.isPlaying && !gameOver && currentTurn === playerColor}
              isCheck={isCheck}
              lastMove={lastMove}
              onMakeMove={handleMakeMove}
            />

            {/* Waiting / Ready Overlay before Game Starts */}
            {!roomState.isPlaying && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
                  <Users className="w-8 h-8" />
                </div>

                <h3 className="text-lg font-bold text-white mb-1">
                  {roomState.guestUser ? 'Sẵn Sàng Trận Đấu' : 'Đang Chờ Đối Thủ Vào Phòng'}
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mb-6">
                  {roomState.guestUser
                    ? 'Khách đã vào phòng. Khi khách bấm Sẵn sàng, chủ phòng có thể bắt đầu chơi.'
                    : `Chia sẻ mã phòng [${code}] để bạn bè tham gia thi đấu!`}
                </p>

                {/* Ready & Start Action Buttons */}
                <div className="space-y-3 w-full max-w-xs">
                  {/* Guest Ready Button */}
                  {isGuest && (
                    <button
                      onClick={handleToggleReady}
                      className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition active:scale-95 ${
                        roomState.guestReady
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400'
                      }`}
                    >
                      {roomState.guestReady ? '✓ Bạn Đã Sẵn Sàng' : 'Bấm Để Sẵn Sàng'}
                    </button>
                  )}

                  {/* Host Start Button (Only enabled when Guest is Ready!) */}
                  {isHost && (
                    <button
                      onClick={handleStartGame}
                      disabled={!roomState.guestUser || !roomState.guestReady}
                      className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${
                        roomState.guestUser && roomState.guestReady
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      {!roomState.guestUser
                        ? 'Chờ người chơi...'
                        : !roomState.guestReady
                        ? 'Chờ khách Sẵn Sàng...'
                        : 'Bắt Đầu Trận Đấu Ngay!'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Self Player Card */}
          <div className="w-full max-w-[540px] flex items-center justify-between px-4 py-2.5 mt-2 bg-[#121824]/80 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'}
                alt="Self"
                className="w-9 h-9 rounded-full border border-amber-500/50 object-cover"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white">{user?.name || 'Bạn'}</p>
                  {isHost && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold">
                      Chủ phòng
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-400">
                  {playerColor === 'red' ? 'Cầm quân Đỏ (Đi trước)' : 'Cầm quân Đen (Đi sau)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {roomState.isPlaying && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRequestUndo}
                    disabled={moveHistory.length === 0 || undoPending}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-400 rounded-lg text-xs flex items-center gap-1.5 transition font-semibold"
                    title="Xin đi lại nước cờ (đối thủ cần đồng ý)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{undoPending ? 'Đang xin...' : 'Xin đi lại'}</span>
                  </button>
                  <button
                    onClick={handleOfferDraw}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                    title="Cầu hòa"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResignClick}
                    className="p-1.5 bg-slate-800 hover:bg-rose-950/40 text-rose-400 rounded-lg text-xs"
                    title="Đầu hàng"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="font-mono text-xs px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-bold">
                {formatTime(playerColor === 'red' ? redTime : blackTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: WebRTC Video Call & Chat & Move list (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. WebRTC Video Call Component */}
          <VideoCall
            socket={socketRef.current}
            roomCode={code}
            isHost={isHost}
            opponentName={
              (isHost ? roomState.guestUser?.name : roomState.hostUser?.name) || 'Đối thủ'
            }
          />

          {/* 2. Real-time Chat Box (Saves to Database via Prisma) */}
          <ChatBox
            socket={socketRef.current}
            roomCode={code}
            roomId={roomData?.id}
            currentUser={user}
            initialMessages={roomData?.messages || []}
          />

          {/* 3. Move History notation */}
          <div className="bg-[#121824]/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 pb-2 border-b border-slate-800">
              Nước đi ({moveHistory.length})
            </h4>
            <div className="max-h-28 overflow-y-auto font-mono text-xs space-y-1">
              {moveHistory.length === 0 ? (
                <div className="text-slate-500 italic text-[11px] text-center py-2">
                  Trận đấu chưa bắt đầu
                </div>
              ) : (
                moveHistory.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5 px-2 text-[11px]">
                    <span className="text-slate-500">#{idx + 1}</span>
                    <span className={m.piece.color === 'red' ? 'text-rose-400' : 'text-slate-300'}>
                      {m.notation}
                    </span>
                    {m.isCheck && <span className="text-rose-500 font-bold">Chiếu!</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#161f30] to-[#0f172a] border border-amber-500/40 rounded-3xl p-6 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              {gameOver.winner === playerColor
                ? 'Chúc Mừng Chiến Thắng! 🎉'
                : gameOver.winner === 'draw'
                ? 'Ván Đấu Hòa 🤝'
                : 'Thất Bại Ván Đấu ☕'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">{gameOver.reason}</p>

            <div className="space-y-2">
              <Link
                href="/history"
                className="block w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
              >
                Xem Lịch Sử Trận Đấu
              </Link>
              <Link
                href="/"
                className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
              >
                Về Trang Chủ
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Undo Request Modal */}
      {incomingUndoRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-gradient-to-b from-[#182338] via-[#12192b] to-[#0d1424] border border-amber-500/35 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-3 text-amber-400">
              <RotateCcw className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Đối Thủ Xin Đi Lại Nước Cờ</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Kỳ thủ <span className="font-bold text-amber-400">{incomingUndoRequest.requesterName}</span> (
              {incomingUndoRequest.requesterColor === 'red' ? 'Quân Đỏ' : 'Quân Đen'}) xin được đi lại
              nước cờ vừa rồi. Bạn có đồng ý không?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRespondUndo(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
              >
                Từ chối
              </button>
              <button
                onClick={() => handleRespondUndo(true)}
                className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resigning */}
      {showResignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#1e1724] to-[#120f18] border border-rose-500/50 rounded-3xl p-6 text-center shadow-2xl relative">
            <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Flag className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1.5">
              Xác Nhận Đầu Hàng?
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn nhận thua ván cờ này không? Chiến thắng sẽ được trao cho đối thủ.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowResignConfirm(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
              >
                Hủy / Đánh Tiếp
              </button>
              <button
                type="button"
                onClick={executeResign}
                className="py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition"
              >
                Chấp Nhận Thua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-slate-900/95 border border-amber-500/50 text-amber-300 text-xs font-semibold rounded-2xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fadeIn">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
