import { prisma } from '@/lib/prisma';

export class ChatController {
  // Save chat message to database
  static async sendMessage(roomId: string, userId: string, text: string) {
    if (!text || !text.trim()) return null;

    return await prisma.message.create({
      data: {
        roomId,
        userId,
        text: text.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  }

  // Get chat history for a room
  static async getRoomMessages(roomId: string) {
    return await prisma.message.findMany({
      where: { roomId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }
}
