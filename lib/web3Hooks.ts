import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  CONTRACT_ADDRESSES,
  SPARK_TOKEN_ABI,
  USDT_ABI,
  MINT_CONTROLLER_ABI,
  MEMBERSHIP_MANAGER_ABI,
  REWARD_POOL_ABI,
} from './web3Config';

// 读取SPARK余额
export function useSparkBalance(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  return useReadContract({
    address: CONTRACT_ADDRESSES.SPARK_TOKEN as `0x${string}`,
    abi: SPARK_TOKEN_ABI,
    functionName: 'balanceOf',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.SPARK_TOKEN,
    },
  });
}

// 读取USDT余额
export function useUsdtBalance(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  return useReadContract({
    address: CONTRACT_ADDRESSES.USDT as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.USDT,
    },
  });
}

// 检查mint资格
export function useMintEligibility(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const { data: isEligible } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'isEligible',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.MINT_CONTROLLER,
    },
  });

  const { data: hasMinted } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'hasMinted',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.MINT_CONTROLLER,
    },
  });

  const { data: canMint } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'canMint',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.MINT_CONTROLLER,
    },
  });

  return {
    isEligible,
    hasMinted,
    canMint,
  };
}

// 检查会员状态
export function useMembershipStatus(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const { data: isActive } = useReadContract({
    address: CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER as `0x${string}`,
    abi: MEMBERSHIP_MANAGER_ABI,
    functionName: 'isMemberActive',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER,
    },
  });

  const { data: remainingTime } = useReadContract({
    address: CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER as `0x${string}`,
    abi: MEMBERSHIP_MANAGER_ABI,
    functionName: 'getRemainingTime',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER,
    },
  });

  return {
    isActive,
    remainingTime: remainingTime ? Number(remainingTime) : 0,
  };
}

// Approve USDT
export function useApproveUsdt() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const approve = async (spender: string, amount: string) => {
    const amountInUnits = parseUnits(amount, 6); // USDT has 6 decimals
    
    writeContract({
      address: CONTRACT_ADDRESSES.USDT as `0x${string}`,
      abi: USDT_ABI,
      functionName: 'approve',
      args: [spender as `0x${string}`, amountInUnits],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    approve,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

// Mint SPARK
export function useMintSpark() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const mint = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'mint',
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    mint,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

// 购买会员
export function useBuyMembership() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const buyMembership = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.MEMBERSHIP_MANAGER as `0x${string}`,
      abi: MEMBERSHIP_MANAGER_ABI,
      functionName: 'buyMembership',
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    buyMembership,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

// 领取每周奖励
export function useClaimWeeklyReward() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const claimReward = (weekId: number) => {
    writeContract({
      address: CONTRACT_ADDRESSES.REWARD_POOL as `0x${string}`,
      abi: REWARD_POOL_ABI,
      functionName: 'claimWeeklyReward',
      args: [BigInt(weekId)],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    claimReward,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

// 获取每周奖励信息
export function useWeeklyReward(weekId?: number, address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  return useReadContract({
    address: CONTRACT_ADDRESSES.REWARD_POOL as `0x${string}`,
    abi: REWARD_POOL_ABI,
    functionName: 'getWeeklyReward',
    args: weekId && targetAddress ? [BigInt(weekId), targetAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!weekId && !!targetAddress && !!CONTRACT_ADDRESSES.REWARD_POOL,
    },
  });
}
