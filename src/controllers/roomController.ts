import { prisma } from '@/lib/prisma';

export class RoomController {
  // Generate a random 6-character room code (e.g. A7K9P2)
  static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create a new PvP room
  static async createRoom(params: {
    name: string;
    hostId: string;
    timeControl?: number;
  }) {
    let code = this.generateRoomCode();
    // Ensure code is unique
    let existing = await prisma.room.findUnique({ where: { code } });
    while (existing) {
      code = this.generateRoomCode();
      existing = await prisma.room.findUnique({ where: { code } });
    }

    const room = await prisma.room.create({
      data: {
        code,
        name: params.name || `Phòng ${code}`,
        hostId: params.hostId,
        timeControl: params.timeControl || 600,
        status: 'waiting',
        hostReady: true,
        guestReady: false,
      },
      include: {
        host: {
          select: { id: true, name: true, avatar: true, level: true },
        },
        guest: {
          select: { id: true, name: true, avatar: true, level: true },
        },
      },
    });

    return room;
  }

  // Get active rooms waiting for opponent (shown on homepage "Phòng chơi đang chờ")
  static async getWaitingRooms() {
    return await prisma.room.findMany({
      where: {
        status: { in: ['waiting', 'playing'] },
      },
      include: {
        host: {
          select: { id: true, name: true, avatar: true, level: true },
        },
        guest: {
          select: { id: true, name: true, avatar: true, level: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  // Get room by code
  static async getRoomByCode(code: string) {
    return await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        host: {
          select: { id: true, name: true, avatar: true, level: true },
        },
        guest: {
          select: { id: true, name: true, avatar: true, level: true },
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });
  }

  // Guest joins room
  static async joinRoom(code: string, guestId: string) {
    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!room) {
      throw new Error('Phòng không tồn tại hoặc đã kết thúc');
    }

    if (room.hostId === guestId) {
      return room;
    }

    if (room.guestId && room.guestId !== guestId) {
      throw new Error('Phòng đã đủ 2 người chơi');
    }

    return await prisma.room.update({
      where: { id: room.id },
      data: {
        guestId,
        guestReady: false,
      },
      include: {
        host: { select: { id: true, name: true, avatar: true, level: true } },
        guest: { select: { id: true, name: true, avatar: true, level: true } },
      },
    });
  }

  // Toggle ready status
  static async setReady(roomId: string, userId: string, isReady: boolean) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error('Không tìm thấy phòng');

    if (room.guestId === userId) {
      return await prisma.room.update({
        where: { id: roomId },
        data: { guestReady: isReady },
        include: {
          host: { select: { id: true, name: true, avatar: true, level: true } },
          guest: { select: { id: true, name: true, avatar: true, level: true } },
        },
      });
    }

    if (room.hostId === userId) {
      return await prisma.room.update({
        where: { id: roomId },
        data: { hostReady: isReady },
        include: {
          host: { select: { id: true, name: true, avatar: true, level: true } },
          guest: { select: { id: true, name: true, avatar: true, level: true } },
        },
      });
    }

    return room;
  }

  // Delete room completely when host leaves
  static async deleteRoom(code: string) {
    try {
      const room = await prisma.room.findUnique({
        where: { code: code.toUpperCase() },
      });
      if (room) {
        await prisma.room.delete({
          where: { id: room.id },
        });
        return true;
      }
    } catch (e) {
      console.error('Error deleting room:', e);
    }
    return false;
  }
}
