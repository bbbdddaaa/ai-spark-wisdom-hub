import { useEffect, useState } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Zap, Coins, Users, CheckCircle, XCircle, Loader, AlertCircle, Droplets } from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import {
  CONTRACT_ADDRESSES,
  MINT_CONTROLLER_ABI,
  USDT_ABI,
  MOCK_USDT_ABI,
  SPARK_TOKEN_ABI,
  MINT_COST_USDT,
  MINT_REWARD_SPARK,
} from '../lib/web3Config';

interface MintPanelProps {
  onMintSuccess?: () => void;
  onClose?: () => void;
}

const TEST_CHAIN_IDS = [31337, 11155111]; // Hardhat, Sepolia

export default function MintPanel({ onMintSuccess, onClose }: MintPanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isEligible, setIsEligible] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [minting, setMinting] = useState(false);
  const [fauceting, setFauceting] = useState(false);
  const showFaucet = TEST_CHAIN_IDS.includes(chainId) && !!CONTRACT_ADDRESSES.USDT;

  const { data: remainingSlots } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'remainingSlots',
  });

  const { data: totalMintedUsers } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'totalMintedUsers',
  });

  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.USDT as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: usdtAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.USDT as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.MINT_CONTROLLER] : undefined,
  });

  const { data: sparkBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.SPARK_TOKEN as `0x${string}`,
    abi: SPARK_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { writeContract: approveUSDT, data: approveHash } = useWriteContract();
  const { writeContract: mint, data: mintHash } = useWriteContract();
  const { writeContract: faucetUsdt, data: faucetHash } = useWriteContract();

  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isMinting, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  const { isLoading: isFaucetPending, isSuccess: isFaucetSuccess } = useWaitForTransactionReceipt({
    hash: faucetHash,
  });

  useEffect(() => {
    if (!address) return;

    const checkEligibility = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabaseService.supabase
          .from('users')
          .select('is_eligible_for_mint, has_minted')
          .eq('address', address)
          .single();

        if (userData) {
          setIsEligible(userData.is_eligible_for_mint || false);
          setHasMinted(userData.has_minted || false);
        }
      } catch (error) {
        console.error('Check mint eligibility failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkEligibility();
  }, [address]);

  useEffect(() => {
    if (isApproved) {
      setApproving(false);
    }
  }, [isApproved]);

  useEffect(() => {
    if (isMintSuccess && address) {
      supabaseService.supabase
        .from('users')
        .update({ has_minted: true })
        .eq('address', address)
        .then(() => {
          setHasMinted(true);
          setMinting(false);
          onMintSuccess?.();
        });
    }
  }, [isMintSuccess, address, onMintSuccess]);

  useEffect(() => {
    if (isFaucetSuccess) {
      setFauceting(false);
      refetchUsdtBalance();
    }
  }, [isFaucetSuccess, refetchUsdtBalance]);

  const handleApprove = async () => {
    if (!address) return;

    setApproving(true);
    try {
      const amount = parseUnits(MINT_COST_USDT.toString(), 6);
      approveUSDT({
        address: CONTRACT_ADDRESSES.USDT as `0x${string}`,
        abi: USDT_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.MINT_CONTROLLER, amount],
      });
    } catch (error) {
      console.error('Approve failed:', error);
      setApproving(false);
    }
  };

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

  const handleMint = async () => {
    if (!address) return;

    setMinting(true);
    try {
      mint({
        address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'mint',
      });
    } catch (error) {
      console.error('Mint failed:', error);
      setMinting(false);
    }
  };

  const needsApproval = usdtAllowance !== undefined && 
    usdtAllowance < parseUnits(MINT_COST_USDT.toString(), 6);

  const hasEnoughUSDT = usdtBalance !== undefined && 
    usdtBalance >= parseUnits(MINT_COST_USDT.toString(), 6);

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100">
        <div className="text-center">
          <AlertCircle className="mx-auto text-indigo-400 mb-4" size={48} />
          <p className="text-slate-600">Please connect wallet first</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-indigo-600 mb-4" size={48} />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-3 rounded-2xl">
            <Zap className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Mint SPARK</h3>
            <p className="text-sm text-slate-500">Top 2000 exclusive</p>
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

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl text-center">
          <Users className="mx-auto text-indigo-600 mb-2" size={20} />
          <p className="text-2xl font-black text-slate-900">
            {totalMintedUsers?.toString() || '0'}
          </p>
          <p className="text-xs text-slate-400">Minted users</p>
        </div>
        <div className="bg-white p-4 rounded-2xl text-center">
          <Coins className="mx-auto text-purple-600 mb-2" size={20} />
          <p className="text-2xl font-black text-slate-900">
            {remainingSlots?.toString() || '0'}
          </p>
          <p className="text-xs text-slate-400">Slots left</p>
        </div>
        <div className="bg-white p-4 rounded-2xl text-center">
          <Zap className="mx-auto text-amber-600 mb-2" size={20} />
          <p className="text-2xl font-black text-slate-900">10K</p>
          <p className="text-xs text-slate-400">SPARK reward</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl mb-6">
        <h4 className="font-bold text-slate-900 mb-3">Mint rules</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">•</span>
            <span>Top 2000 users who post get mint eligibility</span>
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">•</span>
            <span>Pay <strong className="text-indigo-600">10 USDT</strong> to mint <strong className="text-indigo-600">10,000 SPARK</strong></span>
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">•</span>
            <span>Each address can mint until 2000 slots are full</span>
          </li>
        </ul>
      </div>

      <div className="bg-white p-6 rounded-2xl mb-6">
        <h4 className="font-bold text-slate-900 mb-3">My assets</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">USDT balance:</span>
            <span className="font-bold text-slate-900">
              {usdtBalance ? formatUnits(usdtBalance, 6) : '0'} USDT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">SPARK balance:</span>
            <span className="font-bold text-slate-900">
              {sparkBalance ? formatUnits(sparkBalance, 18) : '0'} SPARK
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Mint eligibility:</span>
            <span className="font-bold">
              {isEligible ? (
                <span className="text-green-600 flex items-center">
                  <CheckCircle size={16} className="mr-1" /> Eligible
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <XCircle size={16} className="mr-1" /> Not eligible
                </span>
              )}
            </span>
          </div>
          {hasMinted && (
            <div className="flex justify-between">
              <span className="text-slate-600">Mint status:</span>
              <span className="text-green-600 font-bold flex items-center">
                <CheckCircle size={16} className="mr-1" /> Minted
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {!isEligible && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
            <p className="text-sm text-amber-800 text-center">
              ⚠️ You don't have mint eligibility yet. Post content to qualify (top 2000).
            </p>
          </div>
        )}

        {isEligible && !hasEnoughUSDT && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
            <p className="text-sm text-red-800 text-center">
              ❌ Insufficient USDT. Need at least {MINT_COST_USDT} USDT
            </p>
          </div>
        )}

        {isEligible && hasEnoughUSDT && needsApproval && (
          <button
            onClick={handleApprove}
            disabled={approving || isApproving}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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

        {isEligible && hasEnoughUSDT && !needsApproval && (
          <button
            onClick={handleMint}
            disabled={minting || isMinting || hasMinted}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {minting || isMinting ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Minting...</span>
              </>
            ) : hasMinted ? (
              <>
                <CheckCircle size={20} />
                <span>Minted</span>
              </>
            ) : (
              <>
                <Zap size={20} />
                <span>Mint 10,000 SPARK</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-400 text-center space-y-2">
        {showFaucet ? (
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
        ) : (
          <span>
            💡 Need test USDT? Visit{' '}
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              USDT faucet
            </a>
          </span>
        )}
      </div>
    </div>
  );
}
