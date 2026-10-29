import { NextResponse } from 'next/server';
import { ChatController } from '@/controllers/chatController';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Thiếu roomId' }, { status: 400 });
    }

    const messages = await ChatController.getRoomMessages(roomId);
    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, userId, text } = body;
    if (!roomId || !userId || !text) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin' }, { status: 400 });
    }

    const message = await ChatController.sendMessage(roomId, userId, text);
    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
