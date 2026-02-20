"use client";

import { useEffect, useState } from 'react';
import { Signal, Candle, SMCAnalysis } from '@/lib/types';
import { SignalCard } from '@/components/SignalCard';
import { ChartContainer } from '@/components/ChartContainer';
import { Loader2, RefreshCw } from 'lucide-react';

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [chartData, setChartData] = useState<Candle[]>([]);
  const [chartSMC, setChartSMC] = useState<SMCAnalysis | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const scanMarket = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scan');
      const data = await res.json();
      if (data.signals) {
        setSignals(data.signals);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setScanning(false);
    }
  };

  const loadSignalChart = async (signal: Signal) => {
    setLoading(true);
    setSelectedSignal(signal);
    try {
      // Extract clean symbol (remove timeframe annotation)
      const symbol = signal.symbol.replace(/\s*\(.*\)/, '');
      const tfMatch = signal.symbol.match(/\((\w+)\)/);
      const timeframe = tfMatch ? tfMatch[1] : '1h';

      const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`);
      const data = await res.json();
      setChartData(data.candles || []);
      setChartSMC(data.smcAnalysis);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanMarket();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-8 font-sans selection:bg-purple-500/30">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Signal<span className="font-light text-white">Flow</span>
          </h1>
          <p className="text-gray-400 mt-2">SMC Engine — BOS · CHoCH · OB · FVG · EQH/EQL</p>
        </div>
        <button
          onClick={scanMarket}
          disabled={scanning}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw className={scanning ? "animate-spin" : ""} size={18} />
          {scanning ? "Scanning Markets..." : "Scan Now"}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Signal List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Active Signals ({signals.length})</h2>
          <div className="space-y-4 h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
            {signals.length === 0 && !scanning && (
              <div className="text-gray-600 text-center py-10">No signals found. Market is quiet...</div>
            )}
            {signals.map((signal, idx) => (
              <SignalCard
                key={idx}
                signal={signal}
                onClick={() => loadSignalChart(signal)}
              />
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="lg:col-span-2">
          {selectedSignal && chartData.length > 0 ? (
            <div className="animate-in fade-in duration-500">
              <ChartContainer candles={chartData} signal={selectedSignal} smcAnalysis={chartSMC} />

              <div className="mt-6 p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                <h3 className="text-lg font-bold mb-2">SMC Analysis</h3>
                <p className="text-gray-400 leading-relaxed">
                  Detected <strong>{selectedSignal.type}</strong> setup on {selectedSignal.symbol}.{' '}
                  <strong>{selectedSignal.reason}</strong>.{' '}
                  Entry: <span className="text-amber-400 font-mono">{selectedSignal.entryPrice}</span>,{' '}
                  SL: <span className="text-red-400 font-mono">{selectedSignal.stopLoss}</span>,{' '}
                  TP: <span className="text-green-400 font-mono">{selectedSignal.takeProfit}</span>.
                </p>
                {chartSMC && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Trend: {chartSMC.trend}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {chartSMC.structures.length} Structures
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {chartSMC.orderBlocks.filter(ob => !ob.mitigated).length} Active OBs
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {chartSMC.fairValueGaps.filter(f => !f.mitigated).length} Active FVGs
                    </span>
                    {chartSMC.equalLevels.length > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        {chartSMC.equalLevels.length} EQH/EQL
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[500px] flex items-center justify-center border border-dashed border-gray-800 rounded-xl bg-gray-900/20 text-gray-500">
              {loading ? <Loader2 className="animate-spin" size={32} /> : "Select a signal to view SMC analysis"}
            </div>
          )}
        </div>
      </div>

      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>
    </main>
  );
}
