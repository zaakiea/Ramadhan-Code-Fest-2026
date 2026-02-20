import ccxt from 'ccxt';
import { Candle, Signal } from './types';
import { analyzeSMC } from './smc';

// Initialize exchange (public data only)
const exchange = new ccxt.bybit({
    enableRateLimit: true,
    timeout: 20000,
});

export async function fetchCandles(symbol: string, timeframe: string = '1h', limit: number = 500): Promise<Candle[]> {
    try {
        console.log(`Fetching ${symbol} ${timeframe}...`);
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        console.log(`Fetched ${ohlcv.length} candles for ${symbol} ${timeframe}`);
        return ohlcv.map(c => ({
            time: c[0] as number,
            open: c[1] as number,
            high: c[2] as number,
            low: c[3] as number,
            close: c[4] as number,
            volume: c[5] as number,
        }));
    } catch (error) {
        console.error(`Error fetching candles for ${symbol}:`, error);
        return [];
    }
}

/**
 * Scan a symbol for trading setups using the full SMC engine.
 * Generates signals based on:
 *  - Recent BOS/CHoCH structure breaks
 *  - Active (unmitigated) Order Blocks
 *  - Fair Value Gaps near price
 *  - Premium/Discount zone confluence
 */
export function scanForSetup(symbol: string, candles: Candle[]): Signal | null {
    console.log(`Scanning ${symbol} with ${candles.length} candles (SMC engine)...`);
    if (candles.length < 50) return null;

    const smc = analyzeSMC(candles);
    const lastCandle = candles[candles.length - 1];
    const price = lastCandle.close;

    console.log(`${symbol}: Structures=${smc.structures.length}, OBs=${smc.orderBlocks.length}, FVGs=${smc.fairValueGaps.length}, Trend=${smc.trend}, Internal=${smc.internalTrend}`);

    // ── Look for recent structure breaks (CHoCH has higher priority) ──
    const recentStructures = smc.structures.filter(
        s => s.breakIndex >= candles.length - 30 // within last 30 candles
    );

    if (recentStructures.length === 0) {
        console.log(`${symbol}: No recent structure breaks found.`);
        return null;
    }

    // Get the most recent structure break
    const latestStructure = recentStructures[recentStructures.length - 1];
    console.log(`${symbol}: Latest structure: ${latestStructure.type} ${latestStructure.direction} @ ${latestStructure.price}`);

    // ── Find active (unmitigated) Order Blocks for confluence ──
    const activeOBs = smc.orderBlocks.filter(ob => !ob.mitigated);

    // ── Find active (unmitigated) FVGs ──
    const activeFVGs = smc.fairValueGaps.filter(fvg => !fvg.mitigated);

    // ── Zone context ──
    const zone = smc.premiumDiscount;
    const inPremium = zone ? price > zone.equilibrium.top : false;
    const inDiscount = zone ? price < zone.equilibrium.bottom : false;

    // ── Signal Generation ──
    const PROXIMITY = 0.03; // 3% proximity threshold

    if (latestStructure.direction === 'bearish') {
        // ═══ BEARISH SETUP ═══
        // Look for bearish OB near current price (price retesting up into OB)
        const relevantOB = activeOBs.find(ob =>
            ob.bias === 'bearish' &&
            price >= ob.low * (1 - PROXIMITY) &&
            price <= ob.high * (1 + PROXIMITY)
        );

        // Look for bearish FVG near price
        const relevantFVG = activeFVGs.find(fvg =>
            fvg.bias === 'bearish' &&
            price >= fvg.bottom * (1 - PROXIMITY) &&
            price <= fvg.top * (1 + PROXIMITY)
        );

        // Build reason string
        const reasons: string[] = [`${latestStructure.type} Bearish`];
        let entryPrice = price;
        let slBase = price;

        if (relevantOB) {
            reasons.push('Order Block Retest');
            entryPrice = relevantOB.high; // entry at top of OB
            slBase = relevantOB.high;
        }
        if (relevantFVG) {
            reasons.push('FVG Zone');
        }
        if (inPremium) {
            reasons.push('Premium Zone');
        }

        // Need at least structure + one confluence
        if (reasons.length < 2 && !relevantOB) {
            // Try looser OB match
            const looseOB = activeOBs.find(ob =>
                ob.bias === 'bearish' &&
                ob.index > latestStructure.pivotIndex - 10
            );
            if (looseOB) {
                reasons.push('Nearby OB');
                slBase = looseOB.high;
            }
        }

        if (reasons.length >= 2) {
            // Find swing high before break for SL
            const swingHighForSL = smc.swingPoints
                .filter(s => s.type === 'high' && s.index <= latestStructure.breakIndex)
                .pop();

            const sl = swingHighForSL
                ? swingHighForSL.price * 1.002 // small buffer above swing high
                : slBase * 1.02;

            const risk = sl - entryPrice;
            const tp = entryPrice - risk * 2; // 1:2 RR

            console.log(`Signal: ${symbol} SHORT — ${reasons.join(' + ')}`);
            return {
                symbol,
                type: 'SHORT',
                entryPrice: Math.round(entryPrice * 100) / 100,
                stopLoss: Math.round(sl * 100) / 100,
                takeProfit: Math.round(tp * 100) / 100,
                reason: reasons.join(' + '),
                timestamp: Date.now(),
                status: 'PENDING',
                mssPrice: latestStructure.price,
                mssIndex: latestStructure.breakIndex,
                smcAnalysis: smc,
            };
        }
    } else if (latestStructure.direction === 'bullish') {
        // ═══ BULLISH SETUP ═══
        const relevantOB = activeOBs.find(ob =>
            ob.bias === 'bullish' &&
            price >= ob.low * (1 - PROXIMITY) &&
            price <= ob.high * (1 + PROXIMITY)
        );

        const relevantFVG = activeFVGs.find(fvg =>
            fvg.bias === 'bullish' &&
            price >= fvg.bottom * (1 - PROXIMITY) &&
            price <= fvg.top * (1 + PROXIMITY)
        );

        const reasons: string[] = [`${latestStructure.type} Bullish`];
        let entryPrice = price;
        let slBase = price;

        if (relevantOB) {
            reasons.push('Order Block Retest');
            entryPrice = relevantOB.low;
            slBase = relevantOB.low;
        }
        if (relevantFVG) {
            reasons.push('FVG Zone');
        }
        if (inDiscount) {
            reasons.push('Discount Zone');
        }

        if (reasons.length < 2 && !relevantOB) {
            const looseOB = activeOBs.find(ob =>
                ob.bias === 'bullish' &&
                ob.index > latestStructure.pivotIndex - 10
            );
            if (looseOB) {
                reasons.push('Nearby OB');
                slBase = looseOB.low;
            }
        }

        if (reasons.length >= 2) {
            const swingLowForSL = smc.swingPoints
                .filter(s => s.type === 'low' && s.index <= latestStructure.breakIndex)
                .pop();

            const sl = swingLowForSL
                ? swingLowForSL.price * 0.998
                : slBase * 0.98;

            const risk = entryPrice - sl;
            const tp = entryPrice + risk * 2;

            console.log(`Signal: ${symbol} LONG — ${reasons.join(' + ')}`);
            return {
                symbol,
                type: 'LONG',
                entryPrice: Math.round(entryPrice * 100) / 100,
                stopLoss: Math.round(sl * 100) / 100,
                takeProfit: Math.round(tp * 100) / 100,
                reason: reasons.join(' + '),
                timestamp: Date.now(),
                status: 'PENDING',
                mssPrice: latestStructure.price,
                mssIndex: latestStructure.breakIndex,
                smcAnalysis: smc,
            };
        }
    }

    console.log(`${symbol}: No confluence found for signal generation.`);
    return null;
}
