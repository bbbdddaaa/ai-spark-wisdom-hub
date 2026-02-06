import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  CONTRACT_ADDRESSES,
  SPARK_TOKEN_ABI,
  USDT_ABI,
  MINT_CONTROLLER_ABI,
  MEMBERSHIP_MANAGER_ABI,
  REWARD_POOL_ABI,
  POST_SCORING_AGENT_ABI,
  MIN_PASSING_SCORE
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

// Transfer SPARK tokens
export function useTransferSpark() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const transfer = (to: string, amount: string) => {
    const amountInUnits = parseUnits(amount, 18); // SPARK has 18 decimals
    
    writeContract({
      address: CONTRACT_ADDRESSES.SPARK_TOKEN as `0x${string}`,
      abi: SPARK_TOKEN_ABI,
      functionName: 'transfer',
      args: [to as `0x${string}`, amountInUnits],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    transfer,
    isPending,
    isConfirming,
    isSuccess,
    hash,
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

// ==================== Post Scoring Agent相关Hooks ====================

/**
 * 获取Agent信息
 */
export function useAgentInfo(tokenId?: number) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.POST_SCORING_AGENT as `0x${string}`,
    abi: POST_SCORING_AGENT_ABI,
    functionName: 'getAgentInfo',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: tokenId !== undefined && !!CONTRACT_ADDRESSES.POST_SCORING_AGENT,
    },
  });
}

/**
 * 获取当前账户的Agent Token ID
 */
export function useAgentTokenId(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  return useReadContract({
    address: CONTRACT_ADDRESSES.POST_SCORING_AGENT as `0x${string}`,
    abi: POST_SCORING_AGENT_ABI,
    functionName: 'agentTokenIds',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.POST_SCORING_AGENT,
    },
  });
}

/**
 * 检查帖子是否已评分
 */
export function useIsPostScored(postHash?: string) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.POST_SCORING_AGENT as `0x${string}`,
    abi: POST_SCORING_AGENT_ABI,
    functionName: 'isPostScored',
    args: postHash ? [postHash as `0x${string}`] : undefined,
    query: {
      enabled: !!postHash && !!CONTRACT_ADDRESSES.POST_SCORING_AGENT,
    },
  });
}

/**
 * 获取帖子评分记录
 */
export function useScoringRecord(postHash?: string) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.POST_SCORING_AGENT as `0x${string}`,
    abi: POST_SCORING_AGENT_ABI,
    functionName: 'getScoringRecord',
    args: postHash ? [postHash as `0x${string}`] : undefined,
    query: {
      enabled: !!postHash && !!CONTRACT_ADDRESSES.POST_SCORING_AGENT,
    },
  });
}

/**
 * 记录评分到链上（仅Agent owner可调用）
 */
export function useRecordScore() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const recordScore = (
    postHash: string,
    relevanceScore: number,
    qualityScore: number,
    valueScore: number
  ) => {
    if (!CONTRACT_ADDRESSES.POST_SCORING_AGENT) {
      throw new Error('Agent contract not configured');
    }

    writeContract({
      address: CONTRACT_ADDRESSES.POST_SCORING_AGENT as `0x${string}`,
      abi: POST_SCORING_AGENT_ABI,
      functionName: 'recordScore',
      args: [
        postHash as `0x${string}`,
        relevanceScore,
        qualityScore,
        valueScore
      ],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    recordScore,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

/**
 * 注册新的Agent（仅owner可调用）
 */
export function useRegisterAgent() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const registerAgent = (agentURI: string) => {
    if (!CONTRACT_ADDRESSES.POST_SCORING_AGENT) {
      throw new Error('Agent contract not configured');
    }

    writeContract({
      address: CONTRACT_ADDRESSES.POST_SCORING_AGENT as `0x${string}`,
      abi: POST_SCORING_AGENT_ABI,
      functionName: 'registerAgent',
      args: [agentURI],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    registerAgent,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

/**
 * 更新Agent URI（仅Agent owner可调用）
 */
export function useUpdateAgentURI() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const updateAgentURI = (tokenId: number, newAgentURI: string) => {
    if (!CONTRACT_ADDRESSES.POST_SCORING_AGENT) {
      throw new Error('Agent contract not configured');
    }

    writeContract({
      address: CONTRACT_ADDRESSES.POST_SCORING_AGENT as `0x${string}`,
      abi: POST_SCORING_AGENT_ABI,
      functionName: 'updateAgentURI',
      args: [BigInt(tokenId), newAgentURI],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    updateAgentURI,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}
