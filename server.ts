import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from './src/lib/prisma';
import { HistoryController } from './src/controllers/historyController';
import { ChatController } from './src/controllers/chatController';
import { RoomController } from './src/controllers/roomController';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Track active rooms in memory
  // roomCode -> { hostSocketId, guestSocketId, hostUser, guestUser, hostReady, guestReady, isPlaying }
  const roomState = new Map<string, any>();

  const getValidCode = (roomCode: any): string | null => {
    if (!roomCode || typeof roomCode !== 'string') return null;
    const trimmed = roomCode.trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  };

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room
    socket.on('join-room', async ({ roomCode, user }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;

        socket.join(`room:${code}`);

        let state = roomState.get(code);
        if (!state) {
          state = {
            code,
            hostSocketId: socket.id,
            guestSocketId: null,
            hostUser: user || null,
            guestUser: null,
            hostReady: true,
            guestReady: false,
            isPlaying: false,
          };
          roomState.set(code, state);
        } else {
          // Check if this socket or user is already known
          const isHostUser = user?.id && state.hostUser?.id && state.hostUser.id === user.id;
          const isGuestUser = user?.id && state.guestUser?.id && state.guestUser.id === user.id;

          if (isHostUser || (!state.hostSocketId && state.guestSocketId !== socket.id)) {
            state.hostSocketId = socket.id;
            if (user) state.hostUser = user;
          } else if (isGuestUser || (!state.guestSocketId && state.hostSocketId !== socket.id)) {
            state.guestSocketId = socket.id;
            if (user) state.guestUser = user;
          }
        }

        // Notify clients in the room
        io.to(`room:${code}`).emit('room-state', state);

        // Notify lobby of updated rooms
        io.emit('lobby-updated');
      } catch (err) {
        console.error('Error in join-room socket handler:', err);
      }
    });

    // Player Ready toggle
    socket.on('player-ready', async ({ roomCode, userId, isReady }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;

        const state = roomState.get(code);
        if (state) {
          if (state.guestUser?.id && state.guestUser.id === userId) {
            state.guestReady = isReady;
          } else if (state.hostUser?.id && state.hostUser.id === userId) {
            state.hostReady = isReady;
          } else if (socket.id === state.guestSocketId) {
            state.guestReady = isReady;
          } else if (socket.id === state.hostSocketId) {
            state.hostReady = isReady;
          }
          io.to(`room:${code}`).emit('room-state', state);
        }
      } catch (err) {
        console.error('Error in player-ready socket handler:', err);
      }
    });

    // Host starts game (only allowed when guest is ready)
    socket.on('start-game', async ({ roomCode }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;

        const state = roomState.get(code);
        if (state && state.hostSocketId === socket.id && state.guestReady) {
          state.isPlaying = true;
          // Update database room status safely
          try {
            await prisma.room.update({
              where: { code },
              data: { status: 'playing' },
            });
          } catch (e) {
            console.warn('Notice: room status in DB not updated:', e);
          }

          io.to(`room:${code}`).emit('game-started', {
            redPlayer: state.hostUser,
            blackPlayer: state.guestUser,
            timeControl: 600,
          });

          io.emit('lobby-updated');
        }
      } catch (err) {
        console.error('Error in start-game socket handler:', err);
      }
    });

    // Move piece
    socket.on('make-move', ({ roomCode, move, board, nextTurn, isCheck, isCheckmate }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;

        socket.to(`room:${code}`).emit('opponent-moved', {
          move,
          board,
          nextTurn,
          isCheck,
          isCheckmate,
        });
      } catch (err) {
        console.error('Error in make-move socket handler:', err);
      }
    });

    // Chat message
    socket.on('send-message', async ({ roomCode, roomId, userId, user, text }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;

        if (roomId && userId) {
          try {
            await ChatController.sendMessage(roomId, userId, text);
          } catch (e) {
            console.warn('Notice: chat message DB save skipped:', e);
          }
        }

        io.to(`room:${code}`).emit('new-message', {
          id: Date.now().toString(),
          userId,
          user,
          text,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error in send-message socket handler:', err);
      }
    });

    // Resign
    socket.on('resign', async ({ roomCode, resignerColor, redUser, blackUser, moves, duration }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;

        const winner = resignerColor === 'red' ? 'black' : 'red';

        try {
          await HistoryController.recordGame({
            roomCode: code,
            redPlayerId: redUser?.id,
            redName: redUser?.name || 'Kỳ thủ Đỏ',
            blackPlayerId: blackUser?.id,
            blackName: blackUser?.name || 'Kỳ thủ Đen',
            mode: 'pvp',
            winner,
            moves: moves || [],
            duration: duration || 120,
          });

          await prisma.room.update({
            where: { code },
            data: { status: 'finished' },
          });
        } catch (e) {
          console.warn('Notice: game history DB record error:', e);
        }

        io.to(`room:${code}`).emit('game-ended', {
          winner,
          reason: 'resigned',
          resignerColor,
        });
      } catch (err) {
        console.error('Error in resign socket handler:', err);
      }
    });

    // Game completed naturally (checkmate or timeout)
    socket.on('game-finished', async ({ roomCode, winner, redUser, blackUser, moves, duration, reason }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;

        try {
          await HistoryController.recordGame({
            roomCode: code,
            redPlayerId: redUser?.id,
            redName: redUser?.name || 'Kỳ thủ Đỏ',
            blackPlayerId: blackUser?.id,
            blackName: blackUser?.name || 'Kỳ thủ Đen',
            mode: 'pvp',
            winner,
            moves: moves || [],
            duration: duration || 180,
          });

          await prisma.room.update({
            where: { code },
            data: { status: 'finished' },
          });
        } catch (e) {
          console.warn('Notice: finished game DB record error:', e);
        }

        io.to(`room:${code}`).emit('game-ended', {
          winner,
          reason: reason || 'checkmate',
        });
      } catch (err) {
        console.error('Error in game-finished socket handler:', err);
      }
    });

    // Draw offer
    socket.on('offer-draw', ({ roomCode, color }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;
        socket.to(`room:${code}`).emit('draw-offered', { color });
      } catch (err) {
        console.error('Error in offer-draw socket handler:', err);
      }
    });

    socket.on('respond-draw', async ({ roomCode, accepted, redUser, blackUser, moves, duration }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;

        if (accepted) {
          try {
            await HistoryController.recordGame({
              roomCode: code,
              redPlayerId: redUser?.id,
              redName: redUser?.name || 'Kỳ thủ Đỏ',
              blackPlayerId: blackUser?.id,
              blackName: blackUser?.name || 'Kỳ thủ Đen',
              mode: 'pvp',
              winner: 'draw',
              moves: moves || [],
              duration: duration || 180,
            });

            await prisma.room.update({
              where: { code },
              data: { status: 'finished' },
            });
          } catch (e) {
            console.warn('Notice: draw game DB record error:', e);
          }

          io.to(`room:${code}`).emit('game-ended', {
            winner: 'draw',
            reason: 'draw_agreed',
          });
        } else {
          socket.to(`room:${code}`).emit('draw-declined');
        }
      } catch (err) {
        console.error('Error in respond-draw socket handler:', err);
      }
    });

    // WebRTC Signaling
    socket.on('webrtc-video-ready', ({ roomCode }) => {
      const code = getValidCode(roomCode);
      if (code) socket.to(`room:${code}`).emit('webrtc-video-ready', { from: socket.id });
    });

    socket.on('webrtc-video-disabled', ({ roomCode }) => {
      const code = getValidCode(roomCode);
      if (code) socket.to(`room:${code}`).emit('webrtc-video-disabled', { from: socket.id });
    });

    socket.on('webrtc-call-request', ({ roomCode }) => {
      const code = getValidCode(roomCode);
      if (code) socket.to(`room:${code}`).emit('webrtc-incoming-call', { from: socket.id });
    });

    socket.on('webrtc-call-accepted', ({ roomCode }) => {
      const code = getValidCode(roomCode);
      if (code) socket.to(`room:${code}`).emit('webrtc-call-accepted', { from: socket.id });
    });

    socket.on('webrtc-call-declined', ({ roomCode }) => {
      const code = getValidCode(roomCode);
      if (code) socket.to(`room:${code}`).emit('webrtc-call-declined', { from: socket.id });
    });

    socket.on('webrtc-offer', ({ roomCode, offer }) => {
      const code = getValidCode(roomCode);
      if (code) socket.to(`room:${code}`).emit('webrtc-offer-received', { offer, from: socket.id });
    });

    socket.on('webrtc-answer', ({ roomCode, answer }) => {
      const code = getValidCode(roomCode);
      if (code) socket.to(`room:${code}`).emit('webrtc-answer-received', { answer, from: socket.id });
    });

    socket.on('webrtc-ice-candidate', ({ roomCode, candidate }) => {
      const code = getValidCode(roomCode);
      if (code) socket.to(`room:${code}`).emit('webrtc-ice-candidate-received', { candidate });
    });

    socket.on('webrtc-end-call', ({ roomCode }) => {
      const code = getValidCode(roomCode);
      if (code) socket.to(`room:${code}`).emit('webrtc-call-ended');
    });

    // PvP Move Undo
    socket.on('request-undo', ({ roomCode, requesterColor, requesterName }) => {
      const code = getValidCode(roomCode);
      if (code) {
        socket.to(`room:${code}`).emit('undo-requested', {
          requesterColor,
          requesterName,
        });
      }
    });

    socket.on('respond-undo', ({ roomCode, accepted, requesterColor }) => {
      const code = getValidCode(roomCode);
      if (code) {
        if (accepted) {
          io.to(`room:${code}`).emit('undo-accepted', { requesterColor });
        } else {
          socket.to(`room:${code}`).emit('undo-declined');
        }
      }
    });

    // Leave room explicitly
    socket.on('leave-room', async ({ roomCode, userId }) => {
      try {
        const code = getValidCode(roomCode);
        if (!code) return;

        const state = roomState.get(code);
        if (state) {
          const isHost = (userId && state.hostUser?.id === userId) || state.hostSocketId === socket.id;
          const isGuest = (userId && state.guestUser?.id === userId) || state.guestSocketId === socket.id;

          if (isHost) {
            try {
              await RoomController.deleteRoom(code);
            } catch (e) {
              console.warn('Notice: room delete error:', e);
            }
            roomState.delete(code);
            io.to(`room:${code}`).emit('room-closed', {
              reason: 'Chủ phòng đã rời phòng. Phòng thi đấu đã bị hủy.',
            });
            io.emit('lobby-updated');
          } else if (isGuest) {
            state.guestUser = null;
            state.guestSocketId = null;
            state.guestReady = false;
            try {
              await prisma.room.update({
                where: { code },
                data: { guestId: null, guestReady: false },
              });
            } catch (e) {}
            io.to(`room:${code}`).emit('guest-left');
            io.to(`room:${code}`).emit('room-state', state);
            io.emit('lobby-updated');
          }
        }
      } catch (err) {
        console.error('Error in leave-room socket handler:', err);
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      try {
        for (const [code, state] of roomState.entries()) {
          if (state.hostSocketId === socket.id) {
            // Only destroy room if game was not playing yet; if playing, keep state alive for reconnect
            if (!state.isPlaying) {
              try {
                await RoomController.deleteRoom(code);
              } catch (e) {}
              roomState.delete(code);
              io.to(`room:${code}`).emit('room-closed', {
                reason: 'Chủ phòng đã rời phòng. Phòng thi đấu đã bị hủy.',
              });
              io.emit('lobby-updated');
            } else {
              state.hostSocketId = null;
              io.to(`room:${code}`).emit('toast', {
                message: 'Chủ phòng tạm thời mất kết nối mạng.',
              });
            }
          } else if (state.guestSocketId === socket.id) {
            state.guestSocketId = null;
            state.guestReady = false;
            if (!state.isPlaying) {
              state.guestUser = null;
              try {
                await prisma.room.update({
                  where: { code },
                  data: { guestId: null, guestReady: false },
                });
              } catch (e) {}
            }
            io.to(`room:${code}`).emit('guest-left');
            io.to(`room:${code}`).emit('room-state', state);
            io.emit('lobby-updated');
          }
        }
      } catch (err) {
        console.error('Error in disconnect cleanup:', err);
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Xiangqi Online ready on http://${hostname}:${port}`);
  });
});
