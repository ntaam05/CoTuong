import { NextResponse } from 'next/server';
import { RoomController } from '@/controllers/roomController';
import { AuthController } from '@/controllers/authController';

export async function GET() {
  try {
    const rooms = await RoomController.getWaitingRooms();
    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { name, hostId, timeControl } = body;

    if (!hostId) {
      const defaultUser = await AuthController.ensureDefaultUser();
      hostId = defaultUser?.id;
    }

    if (!hostId) {
      return NextResponse.json({ success: false, error: 'Chưa có thông tin người dùng' }, { status: 401 });
    }

    const room = await RoomController.createRoom({
      name: name || 'Phòng Cờ Tướng',
      hostId,
      timeControl: timeControl || 600,
    });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
