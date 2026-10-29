import { NextResponse } from 'next/server';
import { AuthController } from '@/controllers/authController';
import { HistoryController } from '@/controllers/historyController';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Ensure default user and sample match data exists
    const defaultUser = await AuthController.ensureDefaultUser();
    if (defaultUser) {
      await HistoryController.seedInitialMatches(defaultUser.id);
    }

    if (userId) {
      const user = await AuthController.getUserProfile(userId);
      return NextResponse.json({ success: true, user });
    }

    // If no userId queried, user is not logged in
    return NextResponse.json({ success: true, user: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, name, avatar } = body;

    // Fast 1-click Demo Login (Nhật Tâm)
    if (action === 'demo_login') {
      const defaultUser = await AuthController.ensureDefaultUser();
      if (!defaultUser) throw new Error('Không thể khởi tạo tài khoản mẫu');
      const { password: _, ...safeUser } = defaultUser;
      return NextResponse.json({ success: true, user: safeUser });
    }

    // Auto Anonymous Guest Login (for players joining via link)
    if (action === 'guest_login') {
      const guest = await AuthController.createGuestUser();
      return NextResponse.json({ success: true, user: guest });
    }

    if (action === 'register') {
      const user = await AuthController.register(email, password, name, avatar);
      return NextResponse.json({ success: true, user });
    }

    if (action === 'login') {
      const user = await AuthController.login(email, password);
      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
