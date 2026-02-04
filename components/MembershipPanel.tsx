import { useEffect, useState } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Crown, Loader, CheckCircle, Calendar, Coins, AlertCircle, Droplets } from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import {
  CONTRACT_ADDRESSES,
  MEMBERSHIP_MANAGER_ABI,
  USDT_ABI,
  MOCK_USDT_ABI,
  MEMBERSHIP_COST_USDT,
} from '../lib/web3Config';

const TEST_CHAIN_IDS = [31337, 11155111]; // Hardhat, Sepolia

interface MembershipPanelProps {
  onPurchaseSuccess?: () => void;
  onClose?: () => void;
}

export default function MembershipPanel({ onPurchaseSuccess, onClose }: MembershipPanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [fauceting, setFauceting] = useState(false);
  const showFaucet = TEST_CHAIN_IDS.includes(chainId) && !!CONTRACT_ADDRESSES.USDT;

  const { data: membershipData, refetch: refetchMembership } = useReadContract({
    address: CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER as `0x${string}`,
    abi: MEMBERSHIP_MANAGER_ABI,
    functionName: 'memberships',
    args: address ? [address] : undefined,
  });

  const { data: isMemberActive } = useReadContract({
    address: CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER as `0x${string}`,
    abi: MEMBERSHIP_MANAGER_ABI,
    functionName: 'isMemberActive',
    args: address ? [address] : undefined,
  });

  const { data: remainingTime } = useReadContract({
    address: CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER as `0x${string}`,
    abi: MEMBERSHIP_MANAGER_ABI,
    functionName: 'getRemainingTime',
    args: address ? [address] : undefined,
  });

  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.USDT as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.USDT as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER] : undefined,
  });

  const { writeContract: approveUSDT, data: approveHash } = useWriteContract();
  const { writeContract: buyMembership, data: purchaseHash } = useWriteContract();
  const { writeContract: faucetUsdt, data: faucetHash } = useWriteContract();

  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isPurchasing, isSuccess: isPurchaseSuccess } = useWaitForTransactionReceipt({
    hash: purchaseHash,
  });

  const { isLoading: isFaucetPending, isSuccess: isFaucetSuccess } = useWaitForTransactionReceipt({
    hash: faucetHash,
  });

  useEffect(() => {
    if (isConnected) {
      setLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isApproved) {
      setApproving(false);
      refetchAllowance();
    }
  }, [isApproved, refetchAllowance]);

  useEffect(() => {
    if (isPurchaseSuccess && address) {
      setPurchasing(false);
      refetchMembership();
      onPurchaseSuccess?.();
    }
  }, [isPurchaseSuccess, address, onPurchaseSuccess, refetchMembership]);

  useEffect(() => {
    if (isFaucetSuccess) {
      setFauceting(false);
      refetchUsdtBalance();
    }
  }, [isFaucetSuccess, refetchUsdtBalance]);

  const handleFaucet = async () => {
    if (!address || !CONTRACT_ADDRESSES.USDT) return;
    setFauceting(true);
    try {
      faucetUsdt({
        address: CONTRACT_ADDRESSES.USDT as `0x${string}`,
        abi: MOCK_USDT_ABI,
        functionName: 'faucet',
        args: [address],
      });
    } catch (error) {
      console.error('Faucet failed:', error);
      setFauceting(false);
    }
  };

  const handleApprove = async () => {
    if (!address) return;

    setApproving(true);
    try {
      const amount = parseUnits(MEMBERSHIP_COST_USDT.toString(), 6);
      approveUSDT({
        address: CONTRACT_ADDRESSES.USDT as `0x${string}`,
        abi: USDT_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER, amount],
      });
    } catch (error) {
      console.error('Approve failed:', error);
      setApproving(false);
    }
  };

  const handleBuyMembership = async () => {
    if (!address) return;

    setPurchasing(true);
    try {
      buyMembership({
        address: CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER as `0x${string}`,
        abi: MEMBERSHIP_MANAGER_ABI,
        functionName: 'buyMembership',
      });
    } catch (error) {
      console.error('Purchase failed:', error);
      setPurchasing(false);
    }
  };

  const needsApproval = usdtAllowance !== undefined && 
    usdtAllowance < parseUnits(MEMBERSHIP_COST_USDT.toString(), 6);

  const hasEnoughUSDT = usdtBalance !== undefined && 
    usdtBalance >= parseUnits(MEMBERSHIP_COST_USDT.toString(), 6);

  const getRemainingDays = () => {
    if (!remainingTime) return 0;
    return Math.floor(Number(remainingTime) / (24 * 60 * 60));
  };

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-3xl border border-purple-100">
        <div className="text-center">
          <AlertCircle className="mx-auto text-purple-400 mb-4" size={48} />
          <p className="text-slate-600">Please connect wallet first</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-3xl border border-purple-100">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-purple-600 mb-4" size={48} />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-3xl border border-purple-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-2xl">
            <Crown className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Membership</h3>
            <p className="text-sm text-slate-500">Support the platform, buyback tokens</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {isMemberActive ? (
        <div className="bg-white p-6 rounded-2xl mb-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-xl">
                <Crown className="text-white" size={20} />
              </div>
              <div>
                <p className="font-black text-slate-900">Membership active</p>
                <p className="text-xs text-slate-500">Thank you for your support!</p>
              </div>
            </div>
            <div className="bg-green-100 px-3 py-1 rounded-full">
              <span className="text-xs font-bold text-green-700">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-purple-100">
            <div className="flex items-center text-slate-600 text-sm">
              <Calendar size={16} className="mr-2" />
              <span>Days left</span>
            </div>
            <span className="text-2xl font-black text-purple-600">
              {getRemainingDays()} days
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl mb-6">
          <div className="text-center">
            <Crown className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-600 mb-2">You are not a member yet</p>
            <p className="text-xs text-slate-400">Buy membership to support the platform</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl mb-6">
        <h4 className="font-bold text-slate-900 mb-3">Member benefits</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start">
            <CheckCircle className="text-purple-600 mr-2 flex-shrink-0 mt-0.5" size={16} />
            <span>Support platform operation and growth</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="text-purple-600 mr-2 flex-shrink-0 mt-0.5" size={16} />
            <span>100% of fees go to SPARK buyback</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="text-purple-600 mr-2 flex-shrink-0 mt-0.5" size={16} />
            <span>Buyback tokens reward top creators</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="text-purple-600 mr-2 flex-shrink-0 mt-0.5" size={16} />
            <span>Build a better AI knowledge community</span>
          </li>
        </ul>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-2xl mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Price</p>
            <p className="text-4xl font-black">{MEMBERSHIP_COST_USDT} USDT</p>
            <p className="text-xs opacity-75 mt-1">Valid for 30 days</p>
          </div>
          <Coins size={64} className="opacity-20" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl mb-6">
        <h4 className="font-bold text-slate-900 mb-3">My assets</h4>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">USDT balance:</span>
          <span className="font-bold text-slate-900">
            {usdtBalance ? formatUnits(usdtBalance, 6) : '0'} USDT
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {!hasEnoughUSDT && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
            <p className="text-sm text-red-800 text-center">
              ❌ Insufficient USDT. Need at least {MEMBERSHIP_COST_USDT} USDT
            </p>
          </div>
        )}

        {hasEnoughUSDT && needsApproval && (
          <button
            onClick={handleApprove}
            disabled={approving || isApproving}
            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold hover:bg-purple-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {approving || isApproving ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Approving...</span>
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                <span>Step 1: Approve USDT</span>
              </>
            )}
          </button>
        )}

        {hasEnoughUSDT && !needsApproval && (
          <button
            onClick={handleBuyMembership}
            disabled={purchasing || isPurchasing}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {purchasing || isPurchasing ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Purchasing...</span>
              </>
            ) : (
              <>
                <Crown size={20} />
                <span>{isMemberActive ? 'Renew' : 'Buy membership'}</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-400 text-center space-y-2">
        {showFaucet && (
          <button
            type="button"
            onClick={handleFaucet}
            disabled={fauceting || isFaucetPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fauceting || isFaucetPending ? (
              <>
                <Loader className="animate-spin" size={14} />
                领取中…
              </>
            ) : (
              <>
                <Droplets size={14} />
                领测试 USDT（+100）
              </>
            )}
          </button>
        )}
        <p>💡 Membership valid for 30 days. You can renew after expiry.</p>
      </div>
    </div>
  );
}
