import { NextResponse } from 'next/server';
import { HistoryController } from '@/controllers/historyController';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const game = await HistoryController.getGameById(id);
    if (!game) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy ván cờ' }, { status: 404 });
    }
    return NextResponse.json({ success: true, game });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
