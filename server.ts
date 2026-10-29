import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from './src/lib/prisma';
import { HistoryController } from './src/controllers/historyController';
import { ChatController } from './src/controllers/chatController';
import { RoomController } from './src/controllers/roomController';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
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

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room
    socket.on('join-room', async ({ roomCode, user }) => {
      const code = roomCode.toUpperCase();
      socket.join(`room:${code}`);

      let state = roomState.get(code);
      if (!state) {
        state = {
          code,
          hostSocketId: socket.id,
          guestSocketId: null,
          hostUser: user,
          guestUser: null,
          hostReady: true,
          guestReady: false,
          isPlaying: false,
        };
        roomState.set(code, state);
      } else {
        if (!state.hostSocketId || state.hostUser?.id === user.id) {
          state.hostSocketId = socket.id;
          state.hostUser = user;
        } else if (!state.guestSocketId || state.guestUser?.id === user.id) {
          state.guestSocketId = socket.id;
          state.guestUser = user;
        }
      }

      // Notify clients in the room
      io.to(`room:${code}`).emit('room-state', state);

      // Notify lobby of updated rooms
      io.emit('lobby-updated');
    });

    // Player Ready toggle
    socket.on('player-ready', async ({ roomCode, userId, isReady }) => {
      const code = roomCode.toUpperCase();
      const state = roomState.get(code);
      if (state) {
        if (state.guestUser?.id === userId) {
          state.guestReady = isReady;
        } else if (state.hostUser?.id === userId) {
          state.hostReady = isReady;
        }
        io.to(`room:${code}`).emit('room-state', state);
      }
    });

    // Host starts game (only allowed when guest is ready)
    socket.on('start-game', async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const state = roomState.get(code);
      if (state && state.hostSocketId === socket.id && state.guestReady) {
        state.isPlaying = true;
        // Update database room status
        try {
          await prisma.room.update({
            where: { code },
            data: { status: 'playing' },
          });
        } catch (e) {
          console.error('Error updating room status:', e);
        }

        io.to(`room:${code}`).emit('game-started', {
          redPlayer: state.hostUser,
          blackPlayer: state.guestUser,
          timeControl: 600,
        });

        io.emit('lobby-updated');
      }
    });

    // Move piece
    socket.on('make-move', ({ roomCode, move, board, nextTurn, isCheck, isCheckmate }) => {
      const code = roomCode.toUpperCase();
      socket.to(`room:${code}`).emit('opponent-moved', {
        move,
        board,
        nextTurn,
        isCheck,
        isCheckmate,
      });
    });

    // Chat message
    socket.on('send-message', async ({ roomCode, roomId, userId, user, text }) => {
      const code = roomCode.toUpperCase();
      try {
        if (roomId && userId) {
          await ChatController.sendMessage(roomId, userId, text);
        }
      } catch (e) {
        console.error('Error saving chat message:', e);
      }

      io.to(`room:${code}`).emit('new-message', {
        id: Date.now().toString(),
        userId,
        user,
        text,
        createdAt: new Date().toISOString(),
      });
    });

    // Resign
    socket.on('resign', async ({ roomCode, resignerColor, redUser, blackUser, moves, duration }) => {
      const code = roomCode.toUpperCase();
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
        console.error('Error saving resigned game:', e);
      }

      io.to(`room:${code}`).emit('game-ended', {
        winner,
        reason: 'resigned',
        resignerColor,
      });
    });

    // Game completed naturally (checkmate or timeout)
    socket.on('game-finished', async ({ roomCode, winner, redUser, blackUser, moves, duration, reason }) => {
      const code = roomCode.toUpperCase();
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
        console.error('Error saving finished game:', e);
      }

      io.to(`room:${code}`).emit('game-ended', {
        winner,
        reason: reason || 'checkmate',
      });
    });

    // Draw offer
    socket.on('offer-draw', ({ roomCode, color }) => {
      const code = roomCode.toUpperCase();
      socket.to(`room:${code}`).emit('draw-offered', { color });
    });

    socket.on('respond-draw', async ({ roomCode, accepted, redUser, blackUser, moves, duration }) => {
      const code = roomCode.toUpperCase();
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
        } catch (e) {
          console.error('Error recording draw game:', e);
        }

        io.to(`room:${code}`).emit('game-ended', {
          winner: 'draw',
          reason: 'draw_agreed',
        });
      } else {
        socket.to(`room:${code}`).emit('draw-declined');
      }
    });

    // -------------------------------------------------------------
    // WebRTC Video Call Signaling for PvP
    // -------------------------------------------------------------
    socket.on('webrtc-call-request', ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      socket.to(`room:${code}`).emit('webrtc-incoming-call', {
        from: socket.id,
      });
    });

    socket.on('webrtc-offer', ({ roomCode, offer }) => {
      const code = roomCode.toUpperCase();
      socket.to(`room:${code}`).emit('webrtc-offer-received', {
        offer,
        from: socket.id,
      });
    });

    socket.on('webrtc-answer', ({ roomCode, answer }) => {
      const code = roomCode.toUpperCase();
      socket.to(`room:${code}`).emit('webrtc-answer-received', {
        answer,
        from: socket.id,
      });
    });

    socket.on('webrtc-ice-candidate', ({ roomCode, candidate }) => {
      const code = roomCode.toUpperCase();
      socket.to(`room:${code}`).emit('webrtc-ice-candidate-received', {
        candidate,
      });
    });

    socket.on('webrtc-end-call', ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      socket.to(`room:${code}`).emit('webrtc-call-ended');
    });

    // -------------------------------------------------------------
    // PvP Move Undo (Requires opponent confirmation)
    // -------------------------------------------------------------
    socket.on('request-undo', ({ roomCode, requesterColor, requesterName }) => {
      const code = roomCode.toUpperCase();
      socket.to(`room:${code}`).emit('undo-requested', {
        requesterColor,
        requesterName,
      });
    });

    socket.on('respond-undo', ({ roomCode, accepted, requesterColor }) => {
      const code = roomCode.toUpperCase();
      if (accepted) {
        io.to(`room:${code}`).emit('undo-accepted', { requesterColor });
      } else {
        socket.to(`room:${code}`).emit('undo-declined');
      }
    });

    // Leave room explicitly (if host leaves, delete room immediately)
    socket.on('leave-room', async ({ roomCode, userId }) => {
      const code = roomCode.toUpperCase();
      const state = roomState.get(code);
      if (state) {
        if (state.hostUser?.id === userId || state.hostSocketId === socket.id) {
          // Host left: room is deleted from DB and memory
          try {
            await RoomController.deleteRoom(code);
          } catch (e) {
            console.error('Error deleting room on host leave:', e);
          }
          roomState.delete(code);
          io.to(`room:${code}`).emit('room-closed', {
            reason: 'Chủ phòng đã rời phòng. Phòng thi đấu đã bị hủy.',
          });
          io.emit('lobby-updated');
        } else if (state.guestUser?.id === userId || state.guestSocketId === socket.id) {
          // Guest left: reset guest slot
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
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Find rooms where this socket was a player
      for (const [code, state] of roomState.entries()) {
        if (state.hostSocketId === socket.id) {
          // Host disconnected: delete room from DB & memory
          try {
            await RoomController.deleteRoom(code);
          } catch (e) {
            console.error('Error deleting room on host disconnect:', e);
          }
          roomState.delete(code);
          io.to(`room:${code}`).emit('room-closed', {
            reason: 'Chủ phòng đã rời phòng. Phòng thi đấu đã bị hủy.',
          });
          io.emit('lobby-updated');
        } else if (state.guestSocketId === socket.id) {
          state.guestSocketId = null;
          state.guestReady = false;
          state.guestUser = null;
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
    });
  });

  server.listen(port, () => {
    console.log(`> Xiangqi Online ready on http://${hostname}:${port}`);
  });
});
