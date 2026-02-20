/**
 * Smart Money Concepts (SMC) Engine
 * Ported from LuxAlgo Pine Script v5 indicator
 *
 * Detects: BOS/CHoCH, Order Blocks, Fair Value Gaps, Equal Highs/Lows, Premium/Discount Zones
 */
import {
    Candle,
    SwingPoint,
    StructureBreak,
    OrderBlock,
    FairValueGap,
    EqualLevel,
    PremiumDiscountZone,
    SMCAnalysis,
} from './types';

// ─── Constants ───────────────────────────────────────────────────────────────

const BULLISH = 1;
const BEARISH = -1;
const BULLISH_LEG = 1;
const BEARISH_LEG = 0;

// ─── Pivot / Swing Point Detection ──────────────────────────────────────────

interface PivotState {
    currentLevel: number;
    lastLevel: number;
    crossed: boolean;
    barTime: number;
    barIndex: number;
}

function newPivotState(): PivotState {
    return { currentLevel: NaN, lastLevel: NaN, crossed: false, barTime: 0, barIndex: 0 };
}

/**
 * Detect the "leg" at each bar — mimics Pine Script's `leg(size)`.
 * Returns an array of leg values (0 = bearish leg, 1 = bullish leg) for each bar.
 */
function computeLegs(candles: Candle[], size: number): number[] {
    const legs: number[] = new Array(candles.length).fill(0);
    let currentLeg = 0;

    for (let i = size; i < candles.length; i++) {
        // Check if high[size] > highest of last `size` bars (i-size+1 .. i-1)
        let highestRecent = -Infinity;
        let lowestRecent = Infinity;
        for (let j = 0; j < size; j++) {
            highestRecent = Math.max(highestRecent, candles[i - j].high);
            lowestRecent = Math.min(lowestRecent, candles[i - j].low);
        }

        const pivotHigh = candles[i - size].high;
        const pivotLow = candles[i - size].low;

        if (pivotHigh > highestRecent) {
            currentLeg = BEARISH_LEG; // new bearish leg starts (found a swing high)
        } else if (pivotLow < lowestRecent) {
            currentLeg = BULLISH_LEG; // new bullish leg starts (found a swing low)
        }
        legs[i] = currentLeg;
    }
    return legs;
}

/**
 * Extract swing points from candle data using the leg method (Pine Script approach).
 * `size` parameter controls the lookback for the swing detection.
 */
export function detectSwingPointsSMC(candles: Candle[], size: number = 5): SwingPoint[] {
    const legs = computeLegs(candles, size);
    const swings: SwingPoint[] = [];

    for (let i = size + 1; i < candles.length; i++) {
        if (legs[i] !== legs[i - 1]) {
            // Leg changed — we have a new pivot at i - size
            const pivotIdx = i - size;
            if (legs[i] === BEARISH_LEG) {
                // Start of bearish leg → found a swing HIGH at pivotIdx
                swings.push({
                    price: candles[pivotIdx].high,
                    time: candles[pivotIdx].time,
                    type: 'high',
                    index: pivotIdx,
                });
            } else {
                // Start of bullish leg → found a swing LOW at pivotIdx
                swings.push({
                    price: candles[pivotIdx].low,
                    time: candles[pivotIdx].time,
                    type: 'low',
                    index: pivotIdx,
                });
            }
        }
    }
    return swings;
}

// ─── Structure Detection (BOS / CHoCH) ─────────────────────────────────────

/**
 * Detect BOS and CHoCH structure breaks.
 * Mimics Pine Script's `displayStructure()` function.
 *
 * Walk through candles, tracking the last swing-high pivot and swing-low pivot.
 * When price crosses above the swing high → bullish break (BOS if already bullish, CHoCH if was bearish).
 * When price crosses below the swing low → bearish break.
 */
export function detectStructureBreaks(
    candles: Candle[],
    swingSize: number = 5,
    level: 'internal' | 'swing' = 'swing'
): StructureBreak[] {
    const structures: StructureBreak[] = [];
    const legs = computeLegs(candles, swingSize);

    const pivotHigh: PivotState = newPivotState();
    const pivotLow: PivotState = newPivotState();
    let trendBias = 0; // 0 = neutral, 1 = bullish, -1 = bearish

    for (let i = swingSize + 1; i < candles.length; i++) {
        // Detect new pivots
        if (legs[i] !== legs[i - 1]) {
            const pivotIdx = i - swingSize;
            if (legs[i] === BEARISH_LEG) {
                // New swing high
                pivotHigh.lastLevel = pivotHigh.currentLevel;
                pivotHigh.currentLevel = candles[pivotIdx].high;
                pivotHigh.crossed = false;
                pivotHigh.barTime = candles[pivotIdx].time;
                pivotHigh.barIndex = pivotIdx;
            } else {
                // New swing low
                pivotLow.lastLevel = pivotLow.currentLevel;
                pivotLow.currentLevel = candles[pivotIdx].low;
                pivotLow.crossed = false;
                pivotLow.barTime = candles[pivotIdx].time;
                pivotLow.barIndex = pivotIdx;
            }
        }

        // Check bullish break: close crosses above swing high
        if (
            !isNaN(pivotHigh.currentLevel) &&
            !pivotHigh.crossed &&
            candles[i].close > pivotHigh.currentLevel &&
            (i > 0 && candles[i - 1].close <= pivotHigh.currentLevel)
        ) {
            const type = trendBias === BEARISH ? 'CHoCH' : 'BOS';
            structures.push({
                type,
                direction: 'bullish',
                price: pivotHigh.currentLevel,
                breakIndex: i,
                pivotIndex: pivotHigh.barIndex,
                pivotTime: pivotHigh.barTime,
                breakTime: candles[i].time,
                level,
            });
            pivotHigh.crossed = true;
            trendBias = BULLISH;
        }

        // Check bearish break: close crosses below swing low
        if (
            !isNaN(pivotLow.currentLevel) &&
            !pivotLow.crossed &&
            candles[i].close < pivotLow.currentLevel &&
            (i > 0 && candles[i - 1].close >= pivotLow.currentLevel)
        ) {
            const type = trendBias === BULLISH ? 'CHoCH' : 'BOS';
            structures.push({
                type,
                direction: 'bearish',
                price: pivotLow.currentLevel,
                breakIndex: i,
                pivotIndex: pivotLow.barIndex,
                pivotTime: pivotLow.barTime,
                breakTime: candles[i].time,
                level,
            });
            pivotLow.crossed = true;
            trendBias = BEARISH;
        }
    }

    return structures;
}

// ─── Order Block Detection ──────────────────────────────────────────────────

/**
 * Compute ATR (Average True Range) for volatility measurement.
 */
function computeATR(candles: Candle[], period: number = 200): number[] {
    const atr: number[] = new Array(candles.length).fill(0);
    let sum = 0;

    for (let i = 0; i < candles.length; i++) {
        const tr = i === 0
            ? candles[i].high - candles[i].low
            : Math.max(
                candles[i].high - candles[i].low,
                Math.abs(candles[i].high - candles[i - 1].close),
                Math.abs(candles[i].low - candles[i - 1].close)
            );
        sum += tr;
        if (i >= period) {
            // Simple moving average of TR
            sum -= (i === period ? 0 : computeTR(candles, i - period));
        }
        atr[i] = sum / Math.min(i + 1, period);
    }
    return atr;
}

function computeTR(candles: Candle[], i: number): number {
    if (i === 0) return candles[0].high - candles[0].low;
    return Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
    );
}

/**
 * Detect Order Blocks based on structure breaks.
 * When a bullish structure break occurs, find the bearish candle (order block) before the pivot.
 * When a bearish structure break occurs, find the bullish candle (order block) before the pivot.
 *
 * Pine Script equivalent: `storeOrdeBlock()` + volatility filtering.
 */
export function detectOrderBlocks(
    candles: Candle[],
    structures: StructureBreak[],
    level: 'internal' | 'swing' = 'swing',
    maxBlocks: number = 10
): OrderBlock[] {
    const atr = computeATR(candles);
    const orderBlocks: OrderBlock[] = [];

    for (const struct of structures) {
        if (struct.level !== level) continue;

        const from = struct.pivotIndex;
        const to = struct.breakIndex;
        if (from < 0 || to >= candles.length || from >= to) continue;

        if (struct.direction === 'bullish') {
            // Bullish structure break → find the lowest low candle in range (bullish OB)
            let minIdx = from;
            let minLow = candles[from].low;
            for (let j = from; j < to; j++) {
                if (candles[j].low < minLow) {
                    minLow = candles[j].low;
                    minIdx = j;
                }
            }

            // Filter: Order block must be significant (range > some threshold)
            const obRange = candles[minIdx].high - candles[minIdx].low;
            if (obRange < atr[minIdx] * 0.1) continue; // Skip insignificant

            orderBlocks.push({
                high: candles[minIdx].high,
                low: candles[minIdx].low,
                time: candles[minIdx].time,
                index: minIdx,
                bias: 'bullish',
                mitigated: false,
                level,
            });
        } else {
            // Bearish structure break → find the highest high candle in range (bearish OB)
            let maxIdx = from;
            let maxHigh = candles[from].high;
            for (let j = from; j < to; j++) {
                if (candles[j].high > maxHigh) {
                    maxHigh = candles[j].high;
                    maxIdx = j;
                }
            }

            const obRange = candles[maxIdx].high - candles[maxIdx].low;
            if (obRange < atr[maxIdx] * 0.1) continue;

            orderBlocks.push({
                high: candles[maxIdx].high,
                low: candles[maxIdx].low,
                time: candles[maxIdx].time,
                index: maxIdx,
                bias: 'bearish',
                mitigated: false,
                level,
            });
        }
    }

    // Check mitigation: if price has traded through the OB after its creation
    for (const ob of orderBlocks) {
        for (let i = ob.index + 1; i < candles.length; i++) {
            if (ob.bias === 'bearish' && candles[i].high > ob.high) {
                ob.mitigated = true;
                break;
            }
            if (ob.bias === 'bullish' && candles[i].low < ob.low) {
                ob.mitigated = true;
                break;
            }
        }
    }

    // Return most recent unmitigated first, capped at maxBlocks
    const active = orderBlocks.filter(ob => !ob.mitigated);
    const mitigated = orderBlocks.filter(ob => ob.mitigated);
    return [...active.slice(-maxBlocks), ...mitigated.slice(-maxBlocks)];
}

// ─── Fair Value Gap Detection ───────────────────────────────────────────────

/**
 * Detect Fair Value Gaps (FVGs).
 * A bullish FVG exists when candle[i].low > candle[i-2].high (gap up with candle[i-1] body inside).
 * A bearish FVG exists when candle[i].high < candle[i-2].low (gap down).
 */
export function detectFairValueGaps(candles: Candle[], autoThreshold: boolean = true): FairValueGap[] {
    const fvgs: FairValueGap[] = [];

    // Compute average bar delta for threshold filtering
    let cumulativeDelta = 0;
    let barCount = 0;

    for (let i = 2; i < candles.length; i++) {
        const barDelta = Math.abs(candles[i - 1].close - candles[i - 1].open) / (candles[i - 1].open * 100);
        cumulativeDelta += barDelta;
        barCount++;
        const threshold = autoThreshold ? (cumulativeDelta / barCount) * 2 : 0;

        const currentLow = candles[i].low;
        const currentHigh = candles[i].high;
        const prevClose = candles[i - 1].close;
        const prevOpen = candles[i - 1].open;
        const prev2High = candles[i - 2].high;
        const prev2Low = candles[i - 2].low;
        const midBarDelta = Math.abs(prevClose - prevOpen) / (prevOpen * 100);

        // Bullish FVG: current low > 2-bars-ago high AND mid candle closed above it
        if (currentLow > prev2High && prevClose > prev2High && midBarDelta > threshold) {
            fvgs.push({
                top: currentLow,
                bottom: prev2High,
                bias: 'bullish',
                index: i - 1,
                time: candles[i - 1].time,
                mitigated: false,
            });
        }

        // Bearish FVG: current high < 2-bars-ago low AND mid candle closed below it
        if (currentHigh < prev2Low && prevClose < prev2Low && midBarDelta > threshold) {
            fvgs.push({
                top: prev2Low,
                bottom: currentHigh,
                bias: 'bearish',
                index: i - 1,
                time: candles[i - 1].time,
                mitigated: false,
            });
        }
    }

    // Check mitigation
    for (const fvg of fvgs) {
        for (let i = fvg.index + 2; i < candles.length; i++) {
            if (fvg.bias === 'bullish' && candles[i].low < fvg.bottom) {
                fvg.mitigated = true;
                break;
            }
            if (fvg.bias === 'bearish' && candles[i].high > fvg.top) {
                fvg.mitigated = true;
                break;
            }
        }
    }

    return fvgs;
}

// ─── Equal Highs / Equal Lows Detection ────────────────────────────────────

/**
 * Detect Equal Highs and Equal Lows.
 * Two consecutive swing highs/lows that are within a threshold (based on ATR) are considered "equal".
 */
export function detectEqualHighsLows(
    candles: Candle[],
    swings: SwingPoint[],
    thresholdMultiplier: number = 0.1
): EqualLevel[] {
    const levels: EqualLevel[] = [];
    const atr = computeATR(candles, 200);

    const highs = swings.filter(s => s.type === 'high');
    const lows = swings.filter(s => s.type === 'low');

    // Check consecutive swing highs for equality
    for (let i = 1; i < highs.length; i++) {
        const atrValue = atr[highs[i].index] || 1;
        if (Math.abs(highs[i].price - highs[i - 1].price) < thresholdMultiplier * atrValue) {
            levels.push({
                price: (highs[i].price + highs[i - 1].price) / 2,
                type: 'EQH',
                index1: highs[i - 1].index,
                index2: highs[i].index,
                time1: highs[i - 1].time,
                time2: highs[i].time,
            });
        }
    }

    // Check consecutive swing lows for equality
    for (let i = 1; i < lows.length; i++) {
        const atrValue = atr[lows[i].index] || 1;
        if (Math.abs(lows[i].price - lows[i - 1].price) < thresholdMultiplier * atrValue) {
            levels.push({
                price: (lows[i].price + lows[i - 1].price) / 2,
                type: 'EQL',
                index1: lows[i - 1].index,
                index2: lows[i].index,
                time1: lows[i - 1].time,
                time2: lows[i].time,
            });
        }
    }

    return levels;
}

// ─── Premium / Discount Zones ───────────────────────────────────────────────

/**
 * Calculate Premium, Equilibrium, and Discount zones from trailing swing extremes.
 * Premium = top 5% of the range
 * Discount = bottom 5% of the range
 * Equilibrium = middle ~5% of the range
 */
export function calculatePremiumDiscount(
    candles: Candle[],
    swings: SwingPoint[]
): PremiumDiscountZone | null {
    if (swings.length < 2) return null;

    // Find the most recent significant swing high and low
    const recentHighs = swings.filter(s => s.type === 'high');
    const recentLows = swings.filter(s => s.type === 'low');

    if (recentHighs.length === 0 || recentLows.length === 0) return null;

    // Track trailing extremes
    let trailingHigh = -Infinity;
    let trailingLow = Infinity;
    let startIdx = Math.max(
        recentHighs[recentHighs.length - 1].index,
        recentLows[recentLows.length - 1].index
    );

    // Use the last significant structure range
    const lastHigh = recentHighs[recentHighs.length - 1];
    const lastLow = recentLows[recentLows.length - 1];

    // Trailing from the older of the two most recent swing points
    const trailFrom = Math.min(lastHigh.index, lastLow.index);

    for (let i = trailFrom; i < candles.length; i++) {
        trailingHigh = Math.max(trailingHigh, candles[i].high);
        trailingLow = Math.min(trailingLow, candles[i].low);
    }

    if (trailingHigh <= trailingLow) return null;

    const range = trailingHigh - trailingLow;

    return {
        swingHigh: trailingHigh,
        swingLow: trailingLow,
        premium: {
            top: trailingHigh,
            bottom: trailingHigh - range * 0.05,
        },
        equilibrium: {
            top: trailingLow + range * 0.525,
            bottom: trailingLow + range * 0.475,
        },
        discount: {
            top: trailingLow + range * 0.05,
            bottom: trailingLow,
        },
        startIndex: trailFrom,
        startTime: candles[trailFrom].time,
    };
}

// ─── Trend Detection ────────────────────────────────────────────────────────

function determineTrend(structures: StructureBreak[]): 'bullish' | 'bearish' | 'neutral' {
    if (structures.length === 0) return 'neutral';
    const last = structures[structures.length - 1];
    return last.direction;
}

// ─── Master Analysis Function ───────────────────────────────────────────────

/**
 * Run full SMC analysis on candle data.
 * This is the main entry point that performs all detections.
 */
export function analyzeSMC(candles: Candle[]): SMCAnalysis {
    if (candles.length < 20) {
        return {
            swingPoints: [],
            structures: [],
            orderBlocks: [],
            fairValueGaps: [],
            equalLevels: [],
            premiumDiscount: null,
            trend: 'neutral',
            internalTrend: 'neutral',
        };
    }

    // 1) Detect swing points (two levels: internal=5, swing=50)
    const internalSwings = detectSwingPointsSMC(candles, 5);
    const swingSwings = detectSwingPointsSMC(candles, Math.min(50, Math.floor(candles.length / 5)));
    const allSwings = [...internalSwings, ...swingSwings].sort((a, b) => a.index - b.index);

    // 2) Detect structure breaks
    const internalStructures = detectStructureBreaks(candles, 5, 'internal');
    const swingStructures = detectStructureBreaks(candles, Math.min(50, Math.floor(candles.length / 5)), 'swing');
    const allStructures = [...internalStructures, ...swingStructures].sort((a, b) => a.breakIndex - b.breakIndex);

    // 3) Detect Order Blocks
    const internalOBs = detectOrderBlocks(candles, internalStructures, 'internal', 5);
    const swingOBs = detectOrderBlocks(candles, swingStructures, 'swing', 5);
    const allOBs = [...internalOBs, ...swingOBs];

    // 4) Detect Fair Value Gaps
    const fvgs = detectFairValueGaps(candles);

    // 5) Detect Equal Highs / Equal Lows
    const equalLevels = detectEqualHighsLows(candles, swingSwings);

    // 6) Premium / Discount Zones
    const premiumDiscount = calculatePremiumDiscount(candles, swingSwings);

    // 7) Determine trends
    const swingTrend = determineTrend(swingStructures);
    const internalTrend = determineTrend(internalStructures);

    return {
        swingPoints: allSwings,
        structures: allStructures,
        orderBlocks: allOBs,
        fairValueGaps: fvgs,
        equalLevels,
        premiumDiscount,
        trend: swingTrend,
        internalTrend,
    };
}
