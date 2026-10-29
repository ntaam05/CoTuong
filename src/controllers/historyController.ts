import { prisma } from '@/lib/prisma';

export class HistoryController {
  // Record completed match into database
  static async recordGame(params: {
    roomCode?: string;
    redPlayerId?: string;
    redName: string;
    blackPlayerId?: string;
    blackName: string;
    mode: 'ai_easy' | 'ai_hard' | 'pvp';
    winner: 'red' | 'black' | 'draw';
    moves: any[];
    duration?: number;
  }) {
    const safeMoves = Array.isArray(params.moves) ? params.moves : [];
    const history = await prisma.gameHistory.create({
      data: {
        roomCode: params.roomCode,
        redPlayerId: params.redPlayerId || null,
        redName: params.redName,
        blackPlayerId: params.blackPlayerId || null,
        blackName: params.blackName,
        mode: params.mode,
        winner: params.winner,
        moves: JSON.stringify(safeMoves),
        totalMoves: safeMoves.length,
        duration: params.duration || 180,
      },
    });

    // Update user stats safely if registered player exists
    if (params.redPlayerId) {
      try {
        const isWin = params.winner === 'red';
        const isDraw = params.winner === 'draw';
        await prisma.user.update({
          where: { id: params.redPlayerId },
          data: {
            wins: isWin ? { increment: 1 } : undefined,
            losses: !isWin && !isDraw ? { increment: 1 } : undefined,
            draws: isDraw ? { increment: 1 } : undefined,
            xp: { increment: isWin ? 50 : 20 },
          },
        });
      } catch (err) {
        console.warn('Could not update red player stats (guest or non-existent user):', err);
      }
    }

    if (params.blackPlayerId) {
      try {
        const isWin = params.winner === 'black';
        const isDraw = params.winner === 'draw';
        await prisma.user.update({
          where: { id: params.blackPlayerId },
          data: {
            wins: isWin ? { increment: 1 } : undefined,
            losses: !isWin && !isDraw ? { increment: 1 } : undefined,
            draws: isDraw ? { increment: 1 } : undefined,
            xp: { increment: isWin ? 50 : 20 },
          },
        });
      } catch (err) {
        console.warn('Could not update black player stats (guest or non-existent user):', err);
      }
    }

    return history;
  }

  // Get match history
  static async getHistory(limit = 20, userId?: string) {
    const where = userId
      ? {
          OR: [{ redPlayerId: userId }, { blackPlayerId: userId }],
        }
      : {};

    return await prisma.gameHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        redPlayer: { select: { id: true, name: true, avatar: true } },
        blackPlayer: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  // Get specific game for replay
  static async getGameById(id: string) {
    const game = await prisma.gameHistory.findUnique({
      where: { id },
      include: {
        redPlayer: { select: { id: true, name: true, avatar: true } },
        blackPlayer: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!game) return null;

    return {
      ...game,
      moves: JSON.parse(game.moves || '[]'),
    };
  }

  // Seed sample games matching the user's screenshot
  static async seedInitialMatches(defaultUserId: string) {
    const count = await prisma.gameHistory.count();
    if (count > 0) return;

    const samples = [
      {
        redName: 'Bạn (Nhật Tâm)',
        blackName: 'LongVũ',
        redPlayerId: defaultUserId,
        mode: 'pvp' as const,
        winner: 'red' as const,
        moves: [
          { notation: 'Pháo 2 bình 5', moveNumber: 1 },
          { notation: 'Mã 8 tiến 7', moveNumber: 2 },
          { notation: 'Mã 2 tiến 3', moveNumber: 3 },
          { notation: 'Xe 9 bình 8', moveNumber: 4 },
        ],
        duration: 420,
      },
      {
        redName: 'Bạn (Nhật Tâm)',
        blackName: 'MinhKhang',
        redPlayerId: defaultUserId,
        mode: 'pvp' as const,
        winner: 'black' as const,
        moves: [
          { notation: 'Binh 7 tiến 1', moveNumber: 1 },
          { notation: 'Pháo 2 bình 5', moveNumber: 2 },
          { notation: 'Tượng 3 tiến 5', moveNumber: 3 },
        ],
        duration: 610,
      },
      {
        redName: 'Bạn (Nhật Tâm)',
        blackName: 'Máy (Khó)',
        redPlayerId: defaultUserId,
        mode: 'ai_hard' as const,
        winner: 'red' as const,
        moves: [
          { notation: 'Pháo 8 bình 5', moveNumber: 1 },
          { notation: 'Mã 2 tiến 3', moveNumber: 2 },
          { notation: 'Xe 9 tiến 1', moveNumber: 3 },
          { notation: 'Pháo 8 bình 6', moveNumber: 4 },
        ],
        duration: 350,
      },
      {
        redName: 'Tuấn Anh',
        blackName: 'Bạn (Nhật Tâm)',
        blackPlayerId: defaultUserId,
        mode: 'pvp' as const,
        winner: 'black' as const,
        moves: [
          { notation: 'Pháo 2 bình 5', moveNumber: 1 },
          { notation: 'Pháo 8 bình 5', moveNumber: 2 },
        ],
        duration: 280,
      },
      {
        redName: 'Bảo Ngọc',
        blackName: 'Bạn (Nhật Tâm)',
        blackPlayerId: defaultUserId,
        mode: 'pvp' as const,
        winner: 'red' as const,
        moves: [
          { notation: 'Mã 2 tiến 3', moveNumber: 1 },
          { notation: 'Mã 8 tiến 7', moveNumber: 2 },
        ],
        duration: 520,
      },
    ];

    for (const s of samples) {
      await prisma.gameHistory.create({
        data: {
          redName: s.redName,
          blackName: s.blackName,
          redPlayerId: s.redPlayerId || null,
          blackPlayerId: s.blackPlayerId || null,
          mode: s.mode,
          winner: s.winner,
          moves: JSON.stringify(s.moves),
          totalMoves: s.moves.length,
          duration: s.duration,
        },
      });
    }
  }
}
