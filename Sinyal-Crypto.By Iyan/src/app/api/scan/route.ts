import { NextResponse } from 'next/server';
import { fetchCandles, scanForSetup } from '@/lib/strategy';
import { Signal } from '@/lib/types';

const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT'];

export async function GET() {
    const signals: Signal[] = [];

    const timeframes = ['4h', '1h'];

    try {
        const promises = SYMBOLS.flatMap(symbol =>
            timeframes.map(async (tf) => {
                const candles = await fetchCandles(symbol, tf, 200);
                console.log("candles", candles.length);
                const signal = scanForSetup(symbol, candles);
                console.log("signal", signal?.reason || 'none');
                if (signal) {
                    // Strip heavy smcAnalysis from the signal list response (chart fetches its own)
                    const { smcAnalysis, ...lightSignal } = signal;
                    return { ...lightSignal, symbol: `${symbol} (${tf})` };
                }
                return null;
            })
        );

        const results = await Promise.all(promises);
        console.log("results count:", results.filter(Boolean).length);
        const validSignals = results.filter(s => s !== null) as Signal[];

        return NextResponse.json({ signals: validSignals });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to scan markets' }, { status: 500 });
    }
}
