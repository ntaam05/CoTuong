import { NextResponse } from 'next/server';
import { RoomController } from '@/controllers/roomController';

export async function GET(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const room = await RoomController.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy phòng' }, { status: 404 });
    }
    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await req.json();
    const { action, userId, isReady } = body;

    if (action === 'join') {
      const room = await RoomController.joinRoom(code, userId);
      return NextResponse.json({ success: true, room });
    }

    if (action === 'ready') {
      const room = await RoomController.getRoomByCode(code);
      if (!room) throw new Error('Không tìm thấy phòng');
      const updated = await RoomController.setReady(room.id, userId, !!isReady);
      return NextResponse.json({ success: true, room: updated });
    }

    return NextResponse.json({ success: false, error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    await RoomController.deleteRoom(code);
    return NextResponse.json({ success: true, message: 'Phòng đã được xóa thành công' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
