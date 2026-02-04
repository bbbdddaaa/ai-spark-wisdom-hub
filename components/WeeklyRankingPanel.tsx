import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { Trophy, Medal, Star, Loader, Gift, Calendar, AlertCircle } from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import {
  CONTRACT_ADDRESSES,
  REWARD_POOL_ABI,
} from '../lib/web3Config';

interface WeeklyRankingPanelProps {
  onClaimSuccess?: () => void;
  onClose?: () => void;
}

interface RankingUser {
  address: string;
  likes_count: number;
  reward_amount: number;
  rank: number;
}

export default function WeeklyRankingPanel({ onClaimSuccess, onClose }: WeeklyRankingPanelProps) {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [currentWeekRankings, setCurrentWeekRankings] = useState<RankingUser[]>([]);
  const [lastWeekRankings, setLastWeekRankings] = useState<RankingUser[]>([]);
  const [claiming, setClaiming] = useState(false);

  const { data: currentWeekId } = useReadContract({
    address: CONTRACT_ADDRESSES.REWARD_POOL as `0x${string}`,
    abi: REWARD_POOL_ABI,
    functionName: 'getCurrentWeekId',
  });

  const lastWeekId = currentWeekId ? Number(currentWeekId) - 1 : 0;
  const { data: userReward, refetch: refetchReward } = useReadContract({
    address: CONTRACT_ADDRESSES.REWARD_POOL as `0x${string}`,
    abi: REWARD_POOL_ABI,
    functionName: 'getWeeklyReward',
    args: address && lastWeekId > 0 ? [BigInt(lastWeekId), address] : undefined,
  });

  const { writeContract: claimReward, data: claimHash } = useWriteContract();

  const { isLoading: isClaiming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  useEffect(() => {
    const loadRankings = async () => {
      setLoading(true);
      try {
        const { data: currentRankings } = await supabaseService.supabase
          .rpc('get_current_week_ranking');

        if (currentRankings) {
          setCurrentWeekRankings(currentRankings.slice(0, 10));
        }

        if (currentWeekId) {
          const { data: lastRankings } = await supabaseService.supabase
            .from('weekly_rankings')
            .select('*')
            .eq('week_id', lastWeekId)
            .order('rank', { ascending: true })
            .limit(10);

          if (lastRankings) {
            setLastWeekRankings(lastRankings);
          }
        }
      } catch (error) {
        console.error('Failed to load rankings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected) {
      loadRankings();
    }
  }, [isConnected, currentWeekId, lastWeekId]);

  useEffect(() => {
    if (isClaimSuccess) {
      setClaiming(false);
      refetchReward();
      onClaimSuccess?.();
    }
  }, [isClaimSuccess, refetchReward, onClaimSuccess]);

  const handleClaimReward = async () => {
    if (!address || !lastWeekId) return;

    setClaiming(true);
    try {
      claimReward({
        address: CONTRACT_ADDRESSES.REWARD_POOL as `0x${string}`,
        abi: REWARD_POOL_ABI,
        functionName: 'claimWeeklyReward',
        args: [BigInt(lastWeekId)],
      });
    } catch (error) {
      console.error('Claim failed:', error);
      setClaiming(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="text-yellow-500" size={24} />;
      case 2:
        return <Medal className="text-gray-400" size={24} />;
      case 3:
        return <Medal className="text-amber-700" size={24} />;
      default:
        return <Star className="text-slate-400" size={20} />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-50 to-amber-50 border-yellow-200';
      case 2:
        return 'from-slate-50 to-gray-50 border-slate-200';
      case 3:
        return 'from-amber-50 to-orange-50 border-amber-200';
      default:
        return 'from-slate-50 to-slate-50 border-slate-100';
    }
  };

  const calculateReward = (rank: number) => {
    const baseReward = 10000;
    const minReward = 2000;
    const step = (baseReward - minReward) / 9;
    return baseReward - (rank - 1) * step;
  };

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-3xl border border-amber-100">
        <div className="text-center">
          <AlertCircle className="mx-auto text-amber-400 mb-4" size={48} />
          <p className="text-slate-600">Please connect wallet first</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-3xl border border-amber-100">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-amber-600 mb-4" size={48} />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const [rank, rewardAmount, claimed] = userReward || [0n, 0n, false];
  const hasReward = Number(rewardAmount) > 0;
  const hasClaimed = claimed as boolean;

  return (
    <div className="space-y-6">
      {hasReward && (
        <div className={`bg-gradient-to-br ${hasClaimed ? 'from-green-50 to-emerald-50' : 'from-amber-50 to-orange-50'} p-6 rounded-3xl border ${hasClaimed ? 'border-green-200' : 'border-amber-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`${hasClaimed ? 'bg-green-600' : 'bg-amber-600'} p-3 rounded-2xl`}>
                <Gift className="text-white" size={24} />
              </div>
              <div>
                <p className="font-black text-slate-900">Last week ranking reward</p>
                <p className="text-sm text-slate-500">
                  Rank #{Number(rank)} • {formatUnits(rewardAmount, 18)} SPARK
                </p>
              </div>
            </div>
            {getRankIcon(Number(rank))}
          </div>
          
          {!hasClaimed ? (
            <button
              onClick={handleClaimReward}
              disabled={claiming || isClaiming}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-2xl font-bold hover:from-amber-700 hover:to-orange-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {claiming || isClaiming ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <Gift size={20} />
                  <span>Claim reward</span>
                </>
              )}
            </button>
          ) : (
            <div className="bg-green-100 border border-green-200 p-3 rounded-2xl text-center">
              <p className="text-sm text-green-800 font-bold">✅ Reward claimed</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-amber-600 to-orange-600 p-3 rounded-2xl">
              <Trophy className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">This week ranking</h3>
              <p className="text-sm text-slate-500">Live</p>
            </div>
          </div>
          <div className="flex items-center text-slate-400 text-sm">
            <Calendar size={16} className="mr-1" />
            <span>Week {currentWeekId?.toString()}</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl mb-6">
          <p className="text-sm text-slate-700 text-center">
            🏆 Top 10 by likes each week earn <strong className="text-amber-600">2,000 - 10,000 SPARK</strong>
          </p>
        </div>

        <div className="space-y-3">
          {currentWeekRankings.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Star className="mx-auto mb-2" size={48} />
              <p>No ranking data this week yet</p>
              <p className="text-xs mt-1">Post content to get on the board!</p>
            </div>
          ) : (
            currentWeekRankings.map((user, index) => {
              const rank = index + 1;
              const reward = calculateReward(rank);
              const isCurrentUser = user.address.toLowerCase() === address?.toLowerCase();

              return (
                <div
                  key={user.address}
                  className={`bg-gradient-to-r ${getRankColor(rank)} p-4 rounded-2xl border transition-all ${
                    isCurrentUser ? 'ring-2 ring-indigo-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {user.address.slice(0, 6)}...{user.address.slice(-4)}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user.likes_count} likes
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-amber-600">
                        {reward.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">SPARK</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {lastWeekRankings.length > 0 && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h4 className="font-bold text-slate-900 mb-4 flex items-center">
            <Calendar size={18} className="mr-2" />
            Last week (settled)
          </h4>
          <div className="space-y-2">
            {lastWeekRankings.slice(0, 5).map((user) => (
              <div
                key={user.address}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 w-6">#{user.rank}</span>
                  <span className="text-slate-600">
                    {user.address.slice(0, 6)}...{user.address.slice(-4)}
                  </span>
                </div>
                <span className="font-bold text-slate-900">
                  {Number(user.reward_amount).toLocaleString()} SPARK
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-100">
        <h4 className="font-bold text-slate-900 mb-3">Ranking rules</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span>Likes are counted weekly for all users</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span>Top 10 get token rewards</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span>1st: 10,000 SPARK, down to 10th: 2,000 SPARK</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span>Ranking settled every Monday, last week rewards distributed</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
