"use client";

import { useEffect, useRef, useCallback } from 'react';
import {
    createChart,
    createSeriesMarkers,
    ColorType,
    IChartApi,
    ISeriesApi,
    CandlestickSeries,
    LineSeries,
    Time,
    LineStyle,
} from 'lightweight-charts';
import { Candle, Signal, SMCAnalysis } from '@/lib/types';

interface ChartContainerProps {
    candles: Candle[];
    signal?: Signal;
    smcAnalysis?: SMCAnalysis;
}

// Color palette (matching LuxAlgo style)
const COLORS = {
    bullBOS: '#089981',
    bearBOS: '#F23645',
    bullCHoCH: '#089981',
    bearCHoCH: '#F23645',
    bullOB: 'rgba(49, 121, 245, 0.25)',
    bearOB: 'rgba(247, 124, 128, 0.25)',
    bullOBBorder: 'rgba(49, 121, 245, 0.6)',
    bearOBBorder: 'rgba(247, 124, 128, 0.6)',
    bullFVG: 'rgba(0, 255, 104, 0.12)',
    bearFVG: 'rgba(255, 0, 8, 0.12)',
    eqh: '#F23645',
    eql: '#089981',
    premium: 'rgba(242, 54, 69, 0.08)',
    discount: 'rgba(8, 153, 129, 0.08)',
    equilibrium: 'rgba(135, 139, 148, 0.08)',
};

export function ChartContainer({ candles, signal, smcAnalysis }: ChartContainerProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

    const tpZoneRef = useRef<HTMLDivElement>(null);
    const slZoneRef = useRef<HTMLDivElement>(null);
    const obOverlaysRef = useRef<HTMLDivElement>(null);
    const fvgOverlaysRef = useRef<HTMLDivElement>(null);
    const zoneOverlaysRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);

    const fmt = (n: number) =>
        n >= 1000 ? n.toFixed(2) : n >= 1 ? n.toFixed(4) : n.toFixed(6);

    const updateZoneOverlays = useCallback(() => {
        const series = candleSeriesRef.current;
        const chart = chartRef.current;
        if (!series || !chart) return;

        // ── TP/SL zone overlays ──
        if (signal) {
            const tpY = series.priceToCoordinate(signal.takeProfit);
            const entryY = series.priceToCoordinate(signal.entryPrice);
            const slY = series.priceToCoordinate(signal.stopLoss);

            if (tpY !== null && entryY !== null && slY !== null) {
                if (tpZoneRef.current) {
                    const top = Math.min(tpY, entryY);
                    const height = Math.abs(tpY - entryY);
                    tpZoneRef.current.style.top = `${top}px`;
                    tpZoneRef.current.style.height = `${Math.max(height, 2)}px`;
                    tpZoneRef.current.style.opacity = '1';
                }
                if (slZoneRef.current) {
                    const top = Math.min(entryY, slY);
                    const height = Math.abs(slY - entryY);
                    slZoneRef.current.style.top = `${top}px`;
                    slZoneRef.current.style.height = `${Math.max(height, 2)}px`;
                    slZoneRef.current.style.opacity = '1';
                }
            }
        }

        // ── Order Block overlays ──
        if (smcAnalysis && obOverlaysRef.current) {
            const activeOBs = smcAnalysis.orderBlocks.filter(ob => !ob.mitigated);
            const children = obOverlaysRef.current.children;
            for (let i = 0; i < children.length; i++) {
                const el = children[i] as HTMLDivElement;
                const obIdx = parseInt(el.dataset.obIdx || '-1');
                if (obIdx < 0 || obIdx >= activeOBs.length) {
                    el.style.opacity = '0';
                    continue;
                }
                const ob = activeOBs[obIdx];
                const topY = series.priceToCoordinate(ob.high);
                const bottomY = series.priceToCoordinate(ob.low);
                if (topY === null || bottomY === null) {
                    el.style.opacity = '0';
                    continue;
                }
                const top = Math.min(topY, bottomY);
                const height = Math.abs(topY - bottomY);
                el.style.top = `${top}px`;
                el.style.height = `${Math.max(height, 2)}px`;
                el.style.opacity = '1';
            }
        }

        // ── FVG overlays ──
        if (smcAnalysis && fvgOverlaysRef.current) {
            const activeFVGs = smcAnalysis.fairValueGaps.filter(fvg => !fvg.mitigated);
            const children = fvgOverlaysRef.current.children;
            for (let i = 0; i < children.length; i++) {
                const el = children[i] as HTMLDivElement;
                const fvgIdx = parseInt(el.dataset.fvgIdx || '-1');
                if (fvgIdx < 0 || fvgIdx >= activeFVGs.length) {
                    el.style.opacity = '0';
                    continue;
                }
                const fvg = activeFVGs[fvgIdx];
                const topY = series.priceToCoordinate(fvg.top);
                const bottomY = series.priceToCoordinate(fvg.bottom);
                if (topY === null || bottomY === null) {
                    el.style.opacity = '0';
                    continue;
                }
                const top = Math.min(topY, bottomY);
                const height = Math.abs(topY - bottomY);
                el.style.top = `${top}px`;
                el.style.height = `${Math.max(height, 2)}px`;
                el.style.opacity = '1';
            }
        }

        // ── Premium/Discount zone overlays ──
        if (smcAnalysis?.premiumDiscount && zoneOverlaysRef.current) {
            const pd = smcAnalysis.premiumDiscount;
            const zones = [
                { top: pd.premium.top, bottom: pd.premium.bottom, idx: 0 },
                { top: pd.equilibrium.top, bottom: pd.equilibrium.bottom, idx: 1 },
                { top: pd.discount.top, bottom: pd.discount.bottom, idx: 2 },
            ];
            const children = zoneOverlaysRef.current.children;
            for (let i = 0; i < children.length && i < zones.length; i++) {
                const el = children[i] as HTMLDivElement;
                const zone = zones[i];
                const topY = series.priceToCoordinate(zone.top);
                const bottomY = series.priceToCoordinate(zone.bottom);
                if (topY === null || bottomY === null) {
                    el.style.opacity = '0';
                    continue;
                }
                const top = Math.min(topY, bottomY);
                const height = Math.abs(topY - bottomY);
                el.style.top = `${top}px`;
                el.style.height = `${Math.max(height, 2)}px`;
                el.style.opacity = '1';
            }
        }
    }, [signal, smcAnalysis]);

    const scheduleUpdate = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updateZoneOverlays);
    }, [updateZoneOverlays]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Hide overlays initially
        if (tpZoneRef.current) tpZoneRef.current.style.opacity = '0';
        if (slZoneRef.current) slZoneRef.current.style.opacity = '0';

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0b0f19' },
                textColor: '#d1d5db',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.4)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.4)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
            crosshair: { mode: 1 },
            timeScale: { borderColor: '#485c7b' },
            rightPriceScale: { borderColor: '#485c7b' },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        const data = candles.map(c => ({
            ...c,
            time: (c.time / 1000) as Time,
        }));

        candlestickSeries.setData(data);
        chartRef.current = chart;
        candleSeriesRef.current = candlestickSeries;

        // ── SMC Structure Lines (BOS / CHoCH) ──
        if (smcAnalysis) {
            // Only show recent structures (last 20) to avoid clutter
            const recentStructures = smcAnalysis.structures.slice(-20);

            for (const struct of recentStructures) {
                if (struct.pivotIndex >= data.length || struct.breakIndex >= data.length) continue;

                const isCHoCH = struct.type === 'CHoCH';
                const isBullish = struct.direction === 'bullish';
                const color = isBullish ? COLORS.bullBOS : COLORS.bearBOS;

                const structLine = chart.addSeries(LineSeries, {
                    color,
                    lineWidth: isCHoCH ? 2 : 1,
                    lineStyle: isCHoCH ? LineStyle.LargeDashed : LineStyle.Dashed,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    crosshairMarkerVisible: false,
                });

                structLine.setData([
                    { time: data[struct.pivotIndex].time, value: struct.price },
                    { time: data[struct.breakIndex].time, value: struct.price },
                ]);
            }

            // ── Structure Markers ──
            const markers: any[] = [];

            for (const struct of recentStructures) {
                if (struct.breakIndex >= data.length) continue;
                const isBullish = struct.direction === 'bullish';

                markers.push({
                    time: data[struct.breakIndex].time,
                    position: isBullish ? 'belowBar' : 'aboveBar',
                    color: isBullish ? COLORS.bullBOS : COLORS.bearBOS,
                    shape: struct.type === 'CHoCH' ? 'arrowUp' : 'square',
                    text: `${struct.type}`,
                    size: struct.level === 'swing' ? 1 : 0,
                });
            }

            // ── EQH/EQL Markers ──
            for (const eq of smcAnalysis.equalLevels) {
                if (eq.index2 >= data.length) continue;
                markers.push({
                    time: data[eq.index2].time,
                    position: eq.type === 'EQH' ? 'aboveBar' : 'belowBar',
                    color: eq.type === 'EQH' ? COLORS.eqh : COLORS.eql,
                    shape: 'circle',
                    text: eq.type,
                    size: 0,
                });
            }

            // Sort by time and apply markers
            markers.sort((a, b) => (a.time as number) - (b.time as number));
            if (markers.length > 0) {
                createSeriesMarkers(candlestickSeries, markers);
            }
        }

        // ── Signal-specific overlays ──
        if (signal) {
            // Entry price line
            candlestickSeries.createPriceLine({
                price: signal.entryPrice,
                color: '#fbbf24',
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'ENTRY',
            });

            // TP price line
            candlestickSeries.createPriceLine({
                price: signal.takeProfit,
                color: '#4ade80',
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'TP',
            });

            // SL price line
            candlestickSeries.createPriceLine({
                price: signal.stopLoss,
                color: '#f87171',
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'SL',
            });

            chart.timeScale().fitContent();
            chart.timeScale().subscribeVisibleTimeRangeChange(scheduleUpdate);

            setTimeout(scheduleUpdate, 150);
            setTimeout(scheduleUpdate, 400);
        } else {
            chart.timeScale().fitContent();
        }

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
                scheduleUpdate();
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
        };
    }, [candles, signal, smcAnalysis, scheduleUpdate]);

    const rr = signal
        ? (() => {
            const risk = Math.abs(signal.entryPrice - signal.stopLoss);
            const reward = Math.abs(signal.takeProfit - signal.entryPrice);
            return risk > 0 ? (reward / risk).toFixed(2) : '—';
        })()
        : null;

    const activeOBs = smcAnalysis?.orderBlocks.filter(ob => !ob.mitigated) || [];
    const activeFVGs = smcAnalysis?.fairValueGaps.filter(fvg => !fvg.mitigated).slice(-10) || [];

    return (
        <div className="w-full relative bg-[#0b0f19] rounded-xl border border-gray-800 shadow-2xl overflow-hidden">

            {/* Chart canvas */}
            <div ref={chartContainerRef} className="w-full h-[500px]" />

            {/* ── TP Zone overlay ── */}
            {signal && (
                <div
                    ref={tpZoneRef}
                    className="absolute left-0 pointer-events-none transition-none"
                    style={{
                        opacity: 0,
                        right: '60px',
                        background: 'rgba(74, 222, 128, 0.10)',
                        borderTop: '2px solid rgba(74, 222, 128, 0.7)',
                        borderBottom: '2px solid rgba(74, 222, 128, 0.3)',
                        boxShadow: 'inset 0 0 20px rgba(74, 222, 128, 0.05)',
                    }}
                >
                    <div className="absolute left-3 top-1.5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[10px] font-bold text-green-400 tracking-widest uppercase">
                            TP Zone
                        </span>
                        <span className="text-[10px] text-green-500 font-mono ml-1">
                            {fmt(signal.takeProfit)}
                        </span>
                    </div>
                </div>
            )}

            {/* ── SL Zone overlay ── */}
            {signal && (
                <div
                    ref={slZoneRef}
                    className="absolute left-0 pointer-events-none transition-none"
                    style={{
                        opacity: 0,
                        right: '60px',
                        background: 'rgba(248, 113, 113, 0.10)',
                        borderTop: '2px solid rgba(248, 113, 113, 0.3)',
                        borderBottom: '2px solid rgba(248, 113, 113, 0.7)',
                        boxShadow: 'inset 0 0 20px rgba(248, 113, 113, 0.05)',
                    }}
                >
                    <div className="absolute left-3 bottom-1.5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase">
                            SL Zone
                        </span>
                        <span className="text-[10px] text-red-500 font-mono ml-1">
                            {fmt(signal.stopLoss)}
                        </span>
                    </div>
                </div>
            )}

            {/* ── Order Block overlays ── */}
            <div ref={obOverlaysRef} className="pointer-events-none">
                {activeOBs.slice(0, 10).map((ob, i) => (
                    <div
                        key={`ob-${i}`}
                        data-ob-idx={i}
                        className="absolute left-0 transition-none"
                        style={{
                            opacity: 0,
                            right: '60px',
                            background: ob.bias === 'bullish' ? COLORS.bullOB : COLORS.bearOB,
                            borderTop: `1px solid ${ob.bias === 'bullish' ? COLORS.bullOBBorder : COLORS.bearOBBorder}`,
                            borderBottom: `1px solid ${ob.bias === 'bullish' ? COLORS.bullOBBorder : COLORS.bearOBBorder}`,
                        }}
                    >
                        <div className="absolute right-16 top-0.5">
                            <span className={`text-[9px] font-bold tracking-wider uppercase ${ob.bias === 'bullish' ? 'text-blue-400' : 'text-red-400'}`}>
                                {ob.level === 'swing' ? 'S-' : ''}OB
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── FVG overlays ── */}
            <div ref={fvgOverlaysRef} className="pointer-events-none">
                {activeFVGs.map((fvg, i) => (
                    <div
                        key={`fvg-${i}`}
                        data-fvg-idx={i}
                        className="absolute left-0 transition-none"
                        style={{
                            opacity: 0,
                            right: '60px',
                            background: fvg.bias === 'bullish' ? COLORS.bullFVG : COLORS.bearFVG,
                        }}
                    >
                        <div className="absolute right-16 top-0.5">
                            <span className={`text-[9px] font-bold tracking-wider uppercase ${fvg.bias === 'bullish' ? 'text-green-400/60' : 'text-red-400/60'}`}>
                                FVG
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Premium/Discount Zone overlays ── */}
            {smcAnalysis?.premiumDiscount && (
                <div ref={zoneOverlaysRef} className="pointer-events-none">
                    <div className="absolute left-0 transition-none" style={{ opacity: 0, right: '60px', background: COLORS.premium }}>
                        <div className="absolute left-3 top-0.5"><span className="text-[9px] font-bold text-red-300/50 tracking-wider">PREMIUM</span></div>
                    </div>
                    <div className="absolute left-0 transition-none" style={{ opacity: 0, right: '60px', background: COLORS.equilibrium }}>
                        <div className="absolute left-3 top-0.5"><span className="text-[9px] font-bold text-gray-400/50 tracking-wider">EQUILIBRIUM</span></div>
                    </div>
                    <div className="absolute left-0 transition-none" style={{ opacity: 0, right: '60px', background: COLORS.discount }}>
                        <div className="absolute left-3 top-0.5"><span className="text-[9px] font-bold text-green-300/50 tracking-wider">DISCOUNT</span></div>
                    </div>
                </div>
            )}

            {/* ── Legend panel (top-right) ── */}
            {signal && (
                <div className="absolute top-3 right-3 pointer-events-none select-none z-10">
                    <div className="bg-[#0d1117]/85 backdrop-blur-sm border border-gray-700/60 rounded-lg overflow-hidden text-xs w-56">

                        {/* Header */}
                        <div className={`px-3 py-2 flex items-center justify-between font-bold
                            ${signal.type === 'LONG'
                                ? 'bg-green-500/15 border-b border-green-500/30'
                                : 'bg-red-500/15 border-b border-red-500/30'
                            }`}>
                            <span className="text-white font-semibold">{signal.symbol}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider
                                ${signal.type === 'LONG'
                                    ? 'bg-green-500/30 text-green-300'
                                    : 'bg-red-500/30 text-red-300'
                                }`}>
                                {signal.type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                            </span>
                        </div>

                        {/* Price levels */}
                        <div className="px-3 py-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-[2px] bg-green-400" />
                                    <span className="text-green-400 font-semibold">TP</span>
                                </div>
                                <span className="text-green-300 font-mono">{fmt(signal.takeProfit)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-[2px] bg-amber-400" style={{ borderTop: '2px dashed #fbbf24', background: 'transparent' }} />
                                    <span className="text-amber-400 font-semibold">Entry</span>
                                </div>
                                <span className="text-amber-300 font-mono">{fmt(signal.entryPrice)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-[2px] bg-red-400" />
                                    <span className="text-red-400 font-semibold">SL</span>
                                </div>
                                <span className="text-red-300 font-mono">{fmt(signal.stopLoss)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-gray-700/50">
                                <span className="text-gray-500">R : R</span>
                                <span className="text-cyan-400 font-mono font-bold">1 : {rr}</span>
                            </div>
                        </div>

                        {/* SMC Structure legend */}
                        <div className="px-3 py-2 border-t border-gray-700/50 space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-[2px]" style={{ borderTop: '2px dashed #089981' }} />
                                <span className="text-[10px] text-emerald-400 font-semibold">BOS</span>
                                <span className="text-gray-600 ml-auto text-[9px]">Break of Structure</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-[2px]" style={{ borderTop: '2px dashed #F23645' }} />
                                <span className="text-[10px] text-red-400 font-semibold">CHoCH</span>
                                <span className="text-gray-600 ml-auto text-[9px]">Change of Character</span>
                            </div>
                            {activeOBs.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-2 bg-blue-500/40 border border-blue-500/60 rounded-[2px]" />
                                    <span className="text-[10px] text-blue-400 font-semibold">OB</span>
                                    <span className="text-gray-600 ml-auto text-[9px]">{activeOBs.length} active</span>
                                </div>
                            )}
                            {activeFVGs.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-2 bg-green-500/20 border border-green-500/40 rounded-[2px]" />
                                    <span className="text-[10px] text-green-400 font-semibold">FVG</span>
                                    <span className="text-gray-600 ml-auto text-[9px]">{activeFVGs.length} active</span>
                                </div>
                            )}
                        </div>

                        {/* Reason */}
                        <div className="px-3 py-1.5 border-t border-gray-700/50 bg-white/[0.02]">
                            <span className="text-[10px] text-gray-500">{signal.reason}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
