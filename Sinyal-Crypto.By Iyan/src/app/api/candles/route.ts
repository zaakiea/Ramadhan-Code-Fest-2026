import { NextResponse } from 'next/server';
import { fetchCandles } from '@/lib/strategy';
import { analyzeSMC } from '@/lib/smc';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const timeframe = searchParams.get('timeframe') || '1h';

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const candles = await fetchCandles(symbol, timeframe, 500);
        const smcAnalysis = analyzeSMC(candles);
        return NextResponse.json({ candles, smcAnalysis });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch candles' }, { status: 500 });
    }
}
