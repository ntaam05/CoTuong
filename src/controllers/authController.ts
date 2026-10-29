import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export class AuthController {
  // Ensure default demo user exists (Nhật Tâm from screenshot)
  static async ensureDefaultUser() {
    try {
      const existing = await prisma.user.findUnique({
        where: { email: 'nhattam@gmail.com' },
      });
      if (!existing) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        return await prisma.user.create({
          data: {
            email: 'nhattam@gmail.com',
            password: hashedPassword,
            name: 'Nhật Tâm',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces',
            level: 12,
            xp: 320,
            wins: 98,
            losses: 45,
            draws: 13,
          },
        });
      }
      return existing;
    } catch (e) {
      console.error('Error ensuring default user:', e);
      return null;
    }
  }

  static async register(email: string, password: string, name: string, avatar?: string) {
    if (!email || !password || !name) {
      throw new Error('Vui lòng điền đầy đủ email, mật khẩu và họ tên');
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      throw new Error('Email này đã được đăng ký!');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        avatar:
          avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces',
        level: 1,
        xp: 100,
        wins: 0,
        losses: 0,
        draws: 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        level: true,
        xp: true,
        wins: true,
        losses: true,
        draws: true,
      },
    });

    return user;
  }

  static async login(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Vui lòng nhập email và mật khẩu');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  static async getUserProfile(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        level: true,
        xp: true,
        wins: true,
        losses: true,
        draws: true,
      },
    });
  }
}
