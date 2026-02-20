export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface SwingPoint {
    price: number;
    time: number;
    type: 'high' | 'low';
    index: number;
}

// SMC Structure Break (BOS / CHoCH)
export interface StructureBreak {
    type: 'BOS' | 'CHoCH';
    direction: 'bullish' | 'bearish';
    price: number;       // the structure level that was broken
    breakIndex: number;  // candle index where the break occurred
    pivotIndex: number;  // candle index of the original pivot
    pivotTime: number;
    breakTime: number;
    level: 'internal' | 'swing';
}

// Order Block
export interface OrderBlock {
    high: number;
    low: number;
    time: number;
    index: number;
    bias: 'bullish' | 'bearish';
    mitigated: boolean;
    level: 'internal' | 'swing';
}

// Fair Value Gap
export interface FairValueGap {
    top: number;
    bottom: number;
    bias: 'bullish' | 'bearish';
    index: number;
    time: number;
    mitigated: boolean;
}

// Equal Highs / Equal Lows
export interface EqualLevel {
    price: number;
    type: 'EQH' | 'EQL';
    index1: number;
    index2: number;
    time1: number;
    time2: number;
}

// Premium / Discount Zone
export interface PremiumDiscountZone {
    swingHigh: number;
    swingLow: number;
    premium: { top: number; bottom: number };
    equilibrium: { top: number; bottom: number };
    discount: { top: number; bottom: number };
    startIndex: number;
    startTime: number;
}

// Full SMC Analysis Result
export interface SMCAnalysis {
    swingPoints: SwingPoint[];
    structures: StructureBreak[];
    orderBlocks: OrderBlock[];
    fairValueGaps: FairValueGap[];
    equalLevels: EqualLevel[];
    premiumDiscount: PremiumDiscountZone | null;
    trend: 'bullish' | 'bearish' | 'neutral';
    internalTrend: 'bullish' | 'bearish' | 'neutral';
}

export interface Signal {
    symbol: string;
    type: 'LONG' | 'SHORT';
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    reason: string;
    timestamp: number;
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    mssPrice?: number;
    mssIndex?: number;
    snrPrice?: number;
    // New SMC fields
    smcAnalysis?: SMCAnalysis;
}

export interface SNRLevel {
    price: number;
    strength: number;
    type: 'support' | 'resistance' | 'both';
}
