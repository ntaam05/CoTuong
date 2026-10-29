import { NextResponse } from 'next/server';
import { HistoryController } from '@/controllers/historyController';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const history = await HistoryController.getHistory(limit, userId);
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const history = await HistoryController.recordGame(body);
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
