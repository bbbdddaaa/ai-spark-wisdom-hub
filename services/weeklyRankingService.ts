import { supabase } from './supabaseService';

/**
 * 每周排名计算服务
 * 每周统计点赞数并奖励前10名用户
 */

// 奖励配置
const WEEKLY_REWARD_CONFIG = {
  RANK_1: 10000,   // 第1名奖励
  RANK_10: 2000,   // 第10名奖励
  DECREASE_PER_RANK: 889, // 每名递减889代币
};

/**
 * 计算指定排名的奖励金额
 */
function calculateRewardAmount(rank: number): number {
  if (rank < 1 || rank > 10) return 0;
  return WEEKLY_REWARD_CONFIG.RANK_1 - (rank - 1) * WEEKLY_REWARD_CONFIG.DECREASE_PER_RANK;
}

/**
 * 获取周ID（基于周一作为一周的开始）
 */
function getWeekId(date: Date = new Date()): number {
  const weekStart = getWeekStartDate(date);
  return Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));
}

/**
 * 获取周开始日期（周一）
 */
function getWeekStartDate(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一
  return new Date(d.setDate(diff));
}

/**
 * 获取周结束日期（周日）
 */
function getWeekEndDate(date: Date = new Date()): Date {
  const start = getWeekStartDate(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
}

/**
 * 获取指定周的用户点赞排名
 */
export async function getWeeklyRanking(weekStartDate: Date) {
  const weekStart = weekStartDate.toISOString().split('T')[0];
  const weekEnd = getWeekEndDate(weekStartDate).toISOString().split('T')[0];

  // 查询该周所有帖子的点赞情况
  const { data: likesData, error } = await supabase
    .from('likes')
    .select(`
      id,
      post_id,
      posts!inner(user_address)
    `)
    .gte('created_at', weekStart)
    .lt('created_at', weekEnd);

  if (error) {
    console.error('获取点赞数据失败:', error);
    return [];
  }

  // 统计每个用户的点赞数
  const userLikes: Record<string, number> = {};
  likesData?.forEach((like: any) => {
    const userAddress = like.posts.user_address;
    userLikes[userAddress] = (userLikes[userAddress] || 0) + 1;
  });

  // 转换为数组并排序
  const rankings = Object.entries(userLikes)
    .map(([address, likes]) => ({
      user_address: address,
      total_likes: likes,
    }))
    .sort((a, b) => b.total_likes - a.total_likes)
    .slice(0, 10); // 只取前10名

  return rankings;
}

/**
 * 计算并保存每周排名
 */
export async function calculateAndSaveWeeklyRanking(weekStartDate?: Date) {
  const startDate = weekStartDate || getWeekStartDate(new Date());
  const endDate = getWeekEndDate(startDate);
  
  const weekStart = startDate.toISOString().split('T')[0];
  const weekEnd = endDate.toISOString().split('T')[0];

  console.log(`计算排名: ${weekStart} 到 ${weekEnd}`);

  // 获取排名数据
  const rankings = await getWeeklyRanking(startDate);

  if (rankings.length === 0) {
    console.log('本周没有获得点赞的用户');
    return [];
  }

  // 保存到数据库
  const records = rankings.map((rank, index) => ({
    week_start: weekStart,
    week_end: weekEnd,
    user_address: rank.user_address,
    rank: index + 1,
    total_likes: rank.total_likes,
    reward_amount: calculateRewardAmount(index + 1),
    is_claimed: false,
  }));

  const { data, error } = await supabase
    .from('weekly_rankings')
    .insert(records)
    .select();

  if (error) {
    console.error('保存排名失败:', error);
    return [];
  }

  console.log(`成功保存${records.length}条排名记录`);
  return data || [];
}

/**
 * 获取用户的周排名信息
 */
export async function getUserWeeklyRanking(
  userAddress: string,
  weekStartDate?: Date
) {
  const startDate = weekStartDate || getWeekStartDate(new Date());
  const weekStart = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('weekly_rankings')
    .select('*')
    .eq('user_address', userAddress)
    .eq('week_start', weekStart)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 没有找到记录，说明用户不在前10名
      return null;
    }
    console.error('获取用户排名失败:', error);
    return null;
  }

  return data;
}

/**
 * 获取当前周的排名榜单
 */
export async function getCurrentWeekRankings() {
  const weekStart = getWeekStartDate(new Date()).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('weekly_rankings')
    .select('*')
    .eq('week_start', weekStart)
    .order('rank', { ascending: true });

  if (error) {
    console.error('获取当前周排名失败:', error);
    return [];
  }

  return data || [];
}

/**
 * 标记奖励为已领取
 */
export async function markRewardAsClaimed(
  userAddress: string,
  weekStartDate: Date,
  txHash: string
): Promise<boolean> {
  const weekStart = weekStartDate.toISOString().split('T')[0];

  const { error } = await supabase
    .from('weekly_rankings')
    .update({
      is_claimed: true,
      tx_hash: txHash,
    })
    .eq('user_address', userAddress)
    .eq('week_start', weekStart);

  if (error) {
    console.error('标记奖励已领取失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取用户所有的历史排名
 */
export async function getUserHistoryRankings(userAddress: string) {
  const { data, error } = await supabase
    .from('weekly_rankings')
    .select('*')
    .eq('user_address', userAddress)
    .order('week_start', { ascending: false });

  if (error) {
    console.error('获取历史排名失败:', error);
    return [];
  }

  return data || [];
}

/**
 * 获取排名统计信息
 */
export async function getRankingStats() {
  const weekStart = getWeekStartDate(new Date()).toISOString().split('T')[0];

  // 获取本周总奖励金额
  const { data: thisWeekData } = await supabase
    .from('weekly_rankings')
    .select('reward_amount')
    .eq('week_start', weekStart);

  const thisWeekTotal = thisWeekData?.reduce(
    (sum, r) => sum + Number(r.reward_amount),
    0
  ) || 0;

  // 获取已分发的总奖励
  const { data: claimedData } = await supabase
    .from('weekly_rankings')
    .select('reward_amount')
    .eq('is_claimed', true);

  const totalClaimed = claimedData?.reduce(
    (sum, r) => sum + Number(r.reward_amount),
    0
  ) || 0;

  // 获取总参与周数
  const { data: weeksData } = await supabase
    .from('weekly_rankings')
    .select('week_start')
    .order('week_start', { ascending: false })
    .limit(1);

  const totalWeeks = weeksData?.length || 0;

  return {
    thisWeekTotalReward: thisWeekTotal,
    totalClaimedReward: totalClaimed,
    totalWeeks,
  };
}

/**
 * 定时任务：每周日晚23:59自动计算排名
 * 这个函数应该由cron job或后端定时任务调用
 */
export async function weeklyRankingCronJob() {
  try {
    console.log('开始执行每周排名计算...');
    
    // 计算上周的排名（因为是周日晚上运行，计算的是刚结束的这一周）
    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const results = await calculateAndSaveWeeklyRanking(getWeekStartDate(lastWeekStart));
    
    console.log(`排名计算完成，共${results.length}位用户上榜`);
    
    return {
      success: true,
      rankingsCount: results.length,
      results,
    };
  } catch (error) {
    console.error('排名计算失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
