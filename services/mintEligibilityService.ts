import { supabase } from './supabaseService';

/**
 * Mint资格管理服务
 * 追踪前2000名发布内容的用户
 */

const MAX_ELIGIBLE_USERS = 2000;

/**
 * 检查用户是否有mint资格
 */
export async function checkMintEligibility(userAddress: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('is_eligible_for_mint')
    .eq('address', userAddress)
    .single();

  if (error) {
    console.error('检查mint资格失败:', error);
    return false;
  }

  return data?.is_eligible_for_mint || false;
}

/**
 * 检查用户是否已经mint过
 */
export async function hasUserMinted(userAddress: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('has_minted')
    .eq('address', userAddress)
    .single();

  if (error) {
    console.error('检查mint状态失败:', error);
    return false;
  }

  return data?.has_minted || false;
}

/**
 * 获取当前已有多少用户获得了mint资格
 */
export async function getEligibleUsersCount(): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_eligible_for_mint', true);

  if (error) {
    console.error('获取合格用户数失败:', error);
    return 0;
  }

  return count || 0;
}

/**
 * 获取剩余的mint名额
 */
export async function getRemainingSlots(): Promise<number> {
  const count = await getEligibleUsersCount();
  return Math.max(0, MAX_ELIGIBLE_USERS - count);
}

/**
 * 手动授予用户mint资格（管理员功能）
 */
export async function grantMintEligibility(userAddress: string): Promise<boolean> {
  // 检查是否还有剩余名额
  const remaining = await getRemainingSlots();
  if (remaining <= 0) {
    console.error('Mint名额已满');
    return false;
  }

  const { error } = await supabase
    .from('users')
    .update({ is_eligible_for_mint: true })
    .eq('address', userAddress);

  if (error) {
    console.error('授予mint资格失败:', error);
    return false;
  }

  return true;
}

/**
 * 批量授予用户mint资格（管理员功能）
 */
export async function batchGrantMintEligibility(
  userAddresses: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const address of userAddresses) {
    const result = await grantMintEligibility(address);
    if (result) {
      success.push(address);
    } else {
      failed.push(address);
    }
  }

  return { success, failed };
}

/**
 * 记录用户mint操作
 */
export async function recordMint(
  userAddress: string,
  txHash: string,
  amount: number = 10000,
  usdtPaid: number = 10
): Promise<boolean> {
  try {
    // 插入mint记录
    const { error: recordError } = await supabase
      .from('mint_records')
      .insert({
        user_address: userAddress,
        tx_hash: txHash,
        amount,
        usdt_paid: usdtPaid,
      });

    if (recordError) throw recordError;

    // 更新用户状态
    const { error: updateError } = await supabase
      .from('users')
      .update({
        has_minted: true,
        mint_count: supabase.rpc('increment', { x: 1 }),
      })
      .eq('address', userAddress);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('记录mint失败:', error);
    return false;
  }
}

/**
 * 获取用户的mint记录
 */
export async function getUserMintRecords(userAddress: string) {
  const { data, error } = await supabase
    .from('mint_records')
    .select('*')
    .eq('user_address', userAddress)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取mint记录失败:', error);
    return [];
  }

  return data || [];
}

/**
 * 获取所有mint统计信息
 */
export async function getMintStats() {
  const eligibleCount = await getEligibleUsersCount();
  const remaining = await getRemainingSlots();

  const { count: mintedCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('has_minted', true);

  const { data: totalMinted } = await supabase
    .from('mint_records')
    .select('amount')
    .then(({ data }) => {
      const total = data?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;
      return { data: total };
    });

  return {
    eligibleUsers: eligibleCount,
    remainingSlots: remaining,
    mintedUsers: mintedCount || 0,
    totalTokensMinted: totalMinted || 0,
    progressPercentage: (eligibleCount / MAX_ELIGIBLE_USERS) * 100,
  };
}

/**
 * 监听用户发布第一篇帖子，自动授予mint资格
 * 这个功能已经通过数据库触发器实现
 * 此函数仅用于手动触发
 */
export async function checkAndGrantEligibilityForNewPoster(
  userAddress: string
): Promise<boolean> {
  // 检查用户是否已经有资格
  const hasEligibility = await checkMintEligibility(userAddress);
  if (hasEligibility) {
    return true;
  }

  // 检查剩余名额
  const remaining = await getRemainingSlots();
  if (remaining <= 0) {
    return false;
  }

  // 检查用户是否发布过帖子
  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_address', userAddress);

  if (count && count > 0) {
    // 授予资格
    return await grantMintEligibility(userAddress);
  }

  return false;
}
