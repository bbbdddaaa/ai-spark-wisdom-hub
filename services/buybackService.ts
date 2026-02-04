import { supabase } from './supabaseService';

/**
 * 回购机制服务
 * 管理会员费用的收集和代币回购
 */

// 回购配置
const BUYBACK_CONFIG = {
  THRESHOLD_USDT: 100,  // 触发回购的USDT阈值
  SPLIT_RATIO: 1.0,     // 100%用于奖励分配
};

/**
 * 获取奖励池统计信息
 */
export async function getRewardPoolStats() {
  const { data, error } = await supabase
    .from('reward_pool_stats')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('获取奖励池统计失败:', error);
    return null;
  }

  return data;
}

/**
 * 更新奖励池统计
 */
export async function updateRewardPoolStats(updates: {
  total_usdt_collected?: number;
  total_spark_bought?: number;
  total_spark_distributed?: number;
  last_buyback_at?: Date;
}) {
  const { data, error } = await supabase
    .from('reward_pool_stats')
    .update(updates)
    .select()
    .limit(1)
    .single();

  if (error) {
    console.error('更新奖励池统计失败:', error);
    return null;
  }

  return data;
}

/**
 * 记录会员购买（增加USDT收集量）
 */
export async function recordMembershipPurchase(
  userAddress: string,
  amount: number = 10,
  txHash: string
): Promise<boolean> {
  try {
    // 获取当前统计
    const stats = await getRewardPoolStats();
    if (!stats) {
      console.error('无法获取奖励池统计');
      return false;
    }

    // 更新USDT收集量
    const newTotal = Number(stats.total_usdt_collected) + amount;
    await updateRewardPoolStats({
      total_usdt_collected: newTotal,
    });

    // 记录会员购买
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30); // 30天后过期

    const { error } = await supabase
      .from('memberships')
      .insert({
        user_address: userAddress,
        tx_hash: txHash,
        expire_date: expireDate.toISOString(),
      });

    if (error) throw error;

    // 更新用户会员状态
    await supabase
      .from('users')
      .update({
        is_member: true,
        member_expire_date: expireDate.toISOString(),
      })
      .eq('address', userAddress);

    // 检查是否需要触发回购
    if (newTotal >= BUYBACK_CONFIG.THRESHOLD_USDT) {
      console.log(`USDT余额达到${newTotal}，建议执行回购操作`);
      // 这里可以触发通知或自动回购逻辑
    }

    return true;
  } catch (error) {
    console.error('记录会员购买失败:', error);
    return false;
  }
}

/**
 * 执行回购操作
 * 注意：这是一个简化版本，实际应该通过智能合约调用DEX进行兑换
 */
export async function executeBuyback(
  usdtAmount: number,
  sparkAmount: number
): Promise<boolean> {
  try {
    const stats = await getRewardPoolStats();
    if (!stats) {
      console.error('无法获取奖励池统计');
      return false;
    }

    // 更新统计
    await updateRewardPoolStats({
      total_spark_bought: Number(stats.total_spark_bought) + sparkAmount,
      last_buyback_at: new Date(),
    });

    console.log(`回购完成: 使用${usdtAmount} USDT 购买${sparkAmount} SPARK`);
    
    return true;
  } catch (error) {
    console.error('执行回购失败:', error);
    return false;
  }
}

/**
 * 分发代币到奖励池
 * 用于每周排名奖励分配
 */
export async function distributeTokensFromPool(
  userAddress: string,
  amount: number,
  reason: string
): Promise<boolean> {
  try {
    const stats = await getRewardPoolStats();
    if (!stats) {
      console.error('无法获取奖励池统计');
      return false;
    }

    // 更新统计
    await updateRewardPoolStats({
      total_spark_distributed: Number(stats.total_spark_distributed) + amount,
    });

    console.log(`分发${amount} SPARK给${userAddress}，原因：${reason}`);
    
    return true;
  } catch (error) {
    console.error('分发代币失败:', error);
    return false;
  }
}

/**
 * 获取需要回购的金额
 */
export async function getPendingBuybackAmount(): Promise<number> {
  const stats = await getRewardPoolStats();
  if (!stats) return 0;

  const collected = Number(stats.total_usdt_collected);
  const threshold = BUYBACK_CONFIG.THRESHOLD_USDT;

  if (collected >= threshold) {
    return collected;
  }

  return 0;
}

/**
 * 检查是否需要执行回购
 */
export async function shouldExecuteBuyback(): Promise<boolean> {
  const pending = await getPendingBuybackAmount();
  return pending >= BUYBACK_CONFIG.THRESHOLD_USDT;
}

/**
 * 获取回购历史记录（基于last_buyback_at的变化）
 */
export async function getBuybackHistory() {
  // 这里简化处理，实际应该有专门的buyback_history表
  const stats = await getRewardPoolStats();
  if (!stats) return [];

  return [
    {
      executedAt: stats.last_buyback_at,
      totalUsdtCollected: Number(stats.total_usdt_collected),
      totalSparkBought: Number(stats.total_spark_bought),
      totalSparkDistributed: Number(stats.total_spark_distributed),
    },
  ];
}

/**
 * 定时任务：检查并执行回购
 * 这个函数应该由cron job或后端定时任务调用
 */
export async function buybackCronJob() {
  try {
    console.log('检查是否需要执行回购...');
    
    const should Execute = await shouldExecuteBuyback();
    
    if (!shouldExecute) {
      console.log('USDT余额未达到回购阈值');
      return {
        success: true,
        executed: false,
        message: 'USDT余额未达到回购阈值',
      };
    }

    const pending = await getPendingBuybackAmount();
    
    console.log(`准备执行回购: ${pending} USDT`);
    
    // 这里应该调用智能合约执行实际的回购操作
    // 简化处理，假设1 USDT = 100 SPARK
    const sparkAmount = pending * 100;
    
    const success = await executeBuyback(pending, sparkAmount);
    
    if (success) {
      console.log(`回购成功: 使用${pending} USDT 购买${sparkAmount} SPARK`);
      return {
        success: true,
        executed: true,
        usdtAmount: pending,
        sparkAmount,
      };
    }
    
    return {
      success: false,
      executed: false,
      error: '回购执行失败',
    };
  } catch (error) {
    console.error('回购定时任务失败:', error);
    return {
      success: false,
      executed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取奖励池摘要信息
 */
export async function getRewardPoolSummary() {
  const stats = await getRewardPoolStats();
  if (!stats) {
    return {
      totalUsdtCollected: 0,
      totalSparkBought: 0,
      totalSparkDistributed: 0,
      availableForBuyback: 0,
      lastBuybackAt: null,
    };
  }

  const pending = await getPendingBuybackAmount();

  return {
    totalUsdtCollected: Number(stats.total_usdt_collected),
    totalSparkBought: Number(stats.total_spark_bought),
    totalSparkDistributed: Number(stats.total_spark_distributed),
    availableForBuyback: pending,
    lastBuybackAt: stats.last_buyback_at,
    shouldTriggerBuyback: pending >= BUYBACK_CONFIG.THRESHOLD_USDT,
  };
}
