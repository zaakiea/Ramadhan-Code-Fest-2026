import { ArrowDown, ArrowUp, Zap, Target, ShieldAlert } from 'lucide-react';
import { Signal } from '@/lib/types';

interface SignalCardProps {
    signal: Signal;
    onClick: () => void;
}

export function SignalCard({ signal, onClick }: SignalCardProps) {
    const isLong = signal.type === 'LONG';
    const profit = ((Math.abs(signal.takeProfit - signal.entryPrice) / signal.entryPrice) * 100).toFixed(2);
    const loss = ((Math.abs(signal.stopLoss - signal.entryPrice) / signal.entryPrice) * 100).toFixed(2);
    const rr = (Number(profit) / Number(loss)).toFixed(2);

    return (
        <div
            onClick={onClick}
            className={`cursor-pointer group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl 
            ${isLong ? 'bg-gradient-to-br from-gray-900 to-green-900/20 border border-green-500/30 hover:border-green-500/60'
                    : 'bg-gradient-to-br from-gray-900 to-red-900/20 border border-red-500/30 hover:border-red-500/60'}
            backdrop-blur-xl`}
        >
            <div className="absolute inset-0 bg-noise opacity-5"></div>

            <div className="relative z-10 flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        {signal.symbol}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {signal.type}
                        </span>
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">{new Date(signal.timestamp).toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-full ${isLong ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} group-hover:scale-110 transition-transform`}>
                    {isLong ? <ArrowUp size={24} /> : <ArrowDown size={24} />}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-1">
                    <p className="text-gray-500 text-xs uppercase flex items-center gap-1"><Zap size={12} /> Entry</p>
                    <p className="text-white font-mono font-semibold">{signal.entryPrice.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500 text-xs uppercase flex items-center gap-1"><Target size={12} /> TP</p>
                    <p className="text-green-400 font-mono font-semibold">{signal.takeProfit.toFixed(4)}</p>
                    <p className="text-green-500/50 text-[10px]">{profit}%</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500 text-xs uppercase flex items-center gap-1"><ShieldAlert size={12} /> SL</p>
                    <p className="text-red-400 font-mono font-semibold">{signal.stopLoss.toFixed(4)}</p>
                    <p className="text-red-500/50 text-[10px]">{loss}%</p>
                </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800 pt-3">
                <span>R:R {rr}</span>
                <span className="italic">{signal.reason}</span>
            </div>
        </div>
    );
}
