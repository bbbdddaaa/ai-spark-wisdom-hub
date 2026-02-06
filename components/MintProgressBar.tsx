import { Zap, TrendingUp } from 'lucide-react';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, MINT_CONTROLLER_ABI } from '../lib/web3Config';

interface MintProgressBarProps {
  variant?: 'compact' | 'detailed';
  className?: string;
}

export default function MintProgressBar({ variant = 'detailed', className = '' }: MintProgressBarProps) {
  const { data: totalMintedUsers } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'totalMintedUsers',
  });

  const { data: remainingSlots } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'remainingSlots',
  });

  const MAX_SLOTS = 2000;
  const minted = Number(totalMintedUsers || 0);
  const remaining = Number(remainingSlots || MAX_SLOTS);
  const percentage = (minted / MAX_SLOTS) * 100;

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Zap className="text-indigo-600" size={16} />
            <span className="text-xs font-bold text-slate-700">Mint Progress</span>
          </div>
          <span className="text-xs font-black text-indigo-600">
            {minted} / {MAX_SLOTS}
          </span>
        </div>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-500">
          <span>{percentage.toFixed(1)}% minted</span>
          <span>{remaining} slots left</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-3xl border border-indigo-100 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2.5 rounded-xl">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-900">Mint Progress</h4>
            <p className="text-xs text-slate-500">Top 2000 exclusive opportunity</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900">{minted}</div>
          <div className="text-[10px] text-slate-400 font-bold">/ {MAX_SLOTS} total</div>
        </div>
      </div>

      <div className="relative">
        <div className="h-4 bg-white/50 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 rounded-full relative"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
        <div className="absolute top-0 right-0 -mt-1 -mr-1">
          <TrendingUp className="text-indigo-600" size={16} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-white/60 backdrop-blur p-3 rounded-xl text-center">
          <div className="text-xs text-slate-500 mb-1">Minted</div>
          <div className="text-lg font-black text-indigo-600">{minted}</div>
        </div>
        <div className="bg-white/60 backdrop-blur p-3 rounded-xl text-center">
          <div className="text-xs text-slate-500 mb-1">Remaining</div>
          <div className="text-lg font-black text-purple-600">{remaining}</div>
        </div>
        <div className="bg-white/60 backdrop-blur p-3 rounded-xl text-center">
          <div className="text-xs text-slate-500 mb-1">Progress</div>
          <div className="text-lg font-black text-pink-600">{percentage.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center space-x-2 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-slate-600 font-bold">Live data from blockchain</span>
        </div>
      </div>
    </div>
  );
}
