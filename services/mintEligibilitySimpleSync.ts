/**
 * 简化版Mint资格同步服务
 * 在用户发布帖子时直接调用合约授予资格
 */

import { createWalletClient, http, parseAbi, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { supabase } from './supabaseService';

// 配置
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
const MINT_CONTROLLER_ADDRESS = (process.env.VITE_MINT_CONTROLLER_ADDRESS || '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839') as `0x${string}`;
const RPC_URL = process.env.BASE_RPC_URL || process.env.VITE_RPC_URL || 'https://mainnet.base.org';

// 创建客户端
let walletClient: any = null;
let publicClient: any = null;

function getClients() {
  if (!OWNER_PRIVATE_KEY || !MINT_CONTROLLER_ADDRESS) {
    console.warn('⚠️ Owner私钥或合约地址未配置，无法授予链上资格');
    return null;
  }

  if (!walletClient) {
    const account = privateKeyToAccount(OWNER_PRIVATE_KEY as `0x${string}`);
    walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(RPC_URL),
    });
  }

  if (!publicClient) {
    publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });
  }

  return { walletClient, publicClient };
}

// 合约ABI
const MINT_CONTROLLER_ABI = parseAbi([
  'function grantEligibility(address[] calldata users) external',
  'function isEligible(address user) external view returns (bool)',
  'function totalMintedUsers() external view returns (uint256)',
]);

/**
 * 检查用户在合约中是否已有资格
 */
async function isEligibleOnChain(userAddress: string): Promise<boolean> {
  const clients = getClients();
  if (!clients) return false;

  try {
    const result = await clients.publicClient.readContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'isEligible',
      args: [userAddress as `0x${string}`],
    });
    return Boolean(result);
  } catch (error) {
    console.error('检查链上资格失败:', error);
    return false;
  }
}

/**
 * 获取已授予资格的用户数量
 */
async function getEligibleCount(): Promise<number> {
  const clients = getClients();
  if (!clients) return 0;

  try {
    const result = await clients.publicClient.readContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'totalMintedUsers',
    });
    return Number(result);
  } catch (error) {
    console.error('获取已授予数量失败:', error);
    return 0;
  }
}

/**
 * 授予单个用户mint资格（调用合约）
 * @param userAddress 用户地址
 * @param options 选项
 * @returns 是否成功
 */
export async function grantMintEligibility(
  userAddress: string,
  options: {
    skipOnChainCheck?: boolean;  // 是否跳过链上检查（加快速度）
    waitForConfirmation?: boolean;  // 是否等待交易确认
  } = {}
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const clients = getClients();
  if (!clients) {
    return {
      success: false,
      error: 'Owner私钥或合约地址未配置',
    };
  }

  try {
    // 1. 检查是否已有资格（可选，跳过可以加快速度）
    if (!options.skipOnChainCheck) {
      const alreadyEligible = await isEligibleOnChain(userAddress);
      if (alreadyEligible) {
        console.log(`✅ 用户已有资格: ${userAddress}`);
        return { success: true };
      }
    }

    // 2. 检查是否已达上限
    const eligibleCount = await getEligibleCount();
    if (eligibleCount >= 2000) {
      console.log(`⚠️ 已达到2000人上限`);
      return {
        success: false,
        error: '已达到2000人上限',
      };
    }

    console.log(`🔄 授予mint资格: ${userAddress}`);

    // 3. 调用合约授予资格
    const hash = await clients.walletClient.writeContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'grantEligibility',
      args: [[userAddress as `0x${string}`]],
    });

    console.log(`✅ 交易已发送: ${hash}`);

    // 4. 等待确认（可选）
    if (options.waitForConfirmation) {
      console.log(`   等待确认...`);
      const receipt = await clients.publicClient.waitForTransactionReceipt({
        hash,
      });

      if (receipt.status === 'success') {
        console.log(`🎉 授予资格成功: ${userAddress}`);
        return { success: true, txHash: hash };
      } else {
        console.error(`❌ 交易失败: ${userAddress}`);
        return {
          success: false,
          txHash: hash,
          error: '交易失败',
        };
      }
    }

    // 不等待确认，直接返回
    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error(`❌ 授予资格失败 ${userAddress}:`, error);
    return {
      success: false,
      error: error.message || '未知错误',
    };
  }
}

/**
 * 在用户发布第一篇帖子后调用此函数
 * 检查并授予mint资格
 * 
 * @param userAddress 用户地址
 * @param postCount 用户当前发帖数
 */
export async function checkAndGrantEligibilityAfterPost(
  userAddress: string,
  postCount: number
): Promise<void> {
  // 只在第一篇帖子时授予资格
  if (postCount !== 1) {
    return;
  }

  console.log(`📝 用户发布第一篇帖子: ${userAddress}`);

  // 检查数据库中前2000名的数量
  const { count } = await supabase
    .from('users')
    .select('address', { count: 'exact', head: true })
    .gt('post_count', 0);

  if (count && count > 2000) {
    console.log(`⚠️ 已超过2000人，不授予资格`);
    return;
  }

  // 异步授予资格（不阻塞发布流程）
  // 注意：这里使用异步，发布操作不会等待合约调用完成
  grantMintEligibility(userAddress, {
    skipOnChainCheck: false,  // 检查是否已有资格
    waitForConfirmation: false,  // 不等待确认，加快速度
  })
    .then((result) => {
      if (result.success) {
        console.log(`✅ 成功授予资格: ${userAddress}`);
      } else {
        console.error(`❌ 授予资格失败: ${result.error}`);
        // TODO: 可以将失败的记录到数据库，稍后重试
      }
    })
    .catch((error) => {
      console.error(`❌ 授予资格异常:`, error);
    });
}

/**
 * 批量补充授予资格（用于初始化或修复）
 */
export async function batchGrantEligibilityForTop2000(): Promise<void> {
  console.log('🔄 开始批量授予前2000名资格...');

  try {
    // 1. 查询前2000名
    const { data: users, error } = await supabase
      .from('users')
      .select('address')
      .gt('post_count', 0)
      .order('created_at', { ascending: true })  // 按注册时间排序
      .limit(2000);

    if (error) throw error;
    if (!users || users.length === 0) {
      console.log('✅ 没有需要授予资格的用户');
      return;
    }

    console.log(`📋 找到 ${users.length} 个用户`);

    // 2. 检查哪些用户还没有链上资格
    const needGrant: string[] = [];
    for (const user of users) {
      const hasEligibility = await isEligibleOnChain(user.address);
      if (!hasEligibility) {
        needGrant.push(user.address);
      }
    }

    if (needGrant.length === 0) {
      console.log('✅ 所有用户已有链上资格');
      return;
    }

    console.log(`📝 需要授予: ${needGrant.length} 个用户`);

    // 3. 批量授予
    const clients = getClients();
    if (!clients) {
      throw new Error('无法创建钱包客户端');
    }

    const batchSize = 100;
    for (let i = 0; i < needGrant.length; i += batchSize) {
      const batch = needGrant.slice(i, i + batchSize);

      console.log(`🔄 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(needGrant.length / batchSize)}`);

      const hash = await clients.walletClient.writeContract({
        address: MINT_CONTROLLER_ADDRESS,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'grantEligibility',
        args: [batch as `0x${string}`[]],
      });

      console.log(`✅ 批次交易已发送: ${hash}`);

      // 等待确认
      await clients.publicClient.waitForTransactionReceipt({ hash });
      console.log(`✅ 批次交易已确认`);
    }

    console.log('🎉 批量授予完成');
  } catch (error) {
    console.error('❌ 批量授予失败:', error);
    throw error;
  }
}
