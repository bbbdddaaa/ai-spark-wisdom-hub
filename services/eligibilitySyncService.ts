/**
 * Mint资格自动同步服务
 * 监听数据库变化，自动同步到区块链合约
 */

import * as dotenv from 'dotenv';
// 加载环境变量
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createWalletClient, http, parseAbi, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// 配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!; // 使用 anon key
const PRIVATE_KEY = process.env.PRIVATE_KEY!; // 部署者私钥
const MINT_CONTROLLER_ADDRESS = '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839' as `0x${string}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 创建钱包客户端
const privateKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(privateKey as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// 创建公共客户端用于读取
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// 合约ABI（只需要用到的函数）
const MINT_CONTROLLER_ABI = parseAbi([
  'function grantEligibility(address[] calldata users) external',
  'function isEligible(address user) external view returns (bool)',
]);

/**
 * 检查用户在合约中是否已有资格
 */
async function isEligibleOnChain(userAddress: string): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
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
 * 授予单个用户mint资格（调用合约）
 */
async function grantEligibilityOnChain(userAddress: string): Promise<boolean> {
  try {
    console.log(`🔄 正在授予资格: ${userAddress}`);
    
    // 先检查是否已有资格
    const alreadyEligible = await isEligibleOnChain(userAddress);
    if (alreadyEligible) {
      console.log(`✅ 用户已有资格，跳过: ${userAddress}`);
      return true;
    }
    
    // 调用合约授予资格
    const hash = await walletClient.writeContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'grantEligibility',
      args: [[userAddress as `0x${string}`]],
    });
    
    console.log(`✅ 交易已发送: ${hash}`);
    console.log(`   等待确认...`);
    
    // 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log(`🎉 授予资格成功: ${userAddress}`);
      return true;
    } else {
      console.error(`❌ 交易失败: ${userAddress}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 授予资格失败 ${userAddress}:`, error);
    return false;
  }
}

/**
 * 批量授予资格
 */
async function batchGrantEligibility(userAddresses: string[]): Promise<void> {
  if (userAddresses.length === 0) return;
  
  try {
    console.log(`🔄 批量授予资格: ${userAddresses.length} 个用户`);
    
    // 过滤掉已有资格的用户
    const needGrant: string[] = [];
    for (const address of userAddresses) {
      const hasEligibility = await isEligibleOnChain(address);
      if (!hasEligibility) {
        needGrant.push(address);
      }
    }
    
    if (needGrant.length === 0) {
      console.log('✅ 所有用户已有资格');
      return;
    }
    
    console.log(`📝 需要授予: ${needGrant.length} 个用户`);
    
    // 批量调用（一次最多100个）
    const batchSize = 100;
    for (let i = 0; i < needGrant.length; i += batchSize) {
      const batch = needGrant.slice(i, i + batchSize);
      
      const hash = await walletClient.writeContract({
        address: MINT_CONTROLLER_ADDRESS,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'grantEligibility',
        args: [batch as `0x${string}`[]],
      });
      
      console.log(`✅ 批次 ${Math.floor(i / batchSize) + 1} 交易已发送: ${hash}`);
    }
    
    console.log('🎉 批量授予完成');
  } catch (error) {
    console.error('❌ 批量授予失败:', error);
    throw error;
  }
}

/**
 * 查询数据库中有资格但合约中没有的用户
 */
async function getUsersNeedingSync(): Promise<string[]> {
  try {
    // 获取前2000名发过帖子的用户
    const { data: users, error } = await supabase
      .from('users')
      .select('address, post_count')
      .gt('post_count', 0)
      .order('post_count', { ascending: false })
      .limit(2000);
    
    if (error) throw error;
    if (!users || users.length === 0) return [];
    
    // 检查哪些用户在合约中还没有资格
    const needSync: string[] = [];
    for (const user of users) {
      const hasEligibility = await isEligibleOnChain(user.address);
      if (!hasEligibility) {
        needSync.push(user.address);
      }
    }
    
    return needSync;
  } catch (error) {
    console.error('查询需要同步的用户失败:', error);
    return [];
  }
}

/**
 * 实时监听：当用户发布第一篇内容时自动授予资格
 */
export function startRealtimeSync() {
  console.log('🚀 启动实时同步服务...');
  
  // 监听posts表的INSERT事件
  const subscription = supabase
    .channel('posts-insert')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'posts',
    }, async (payload) => {
      const userAddress = payload.new.user_address;
      console.log(`📝 检测到新帖子: ${userAddress}`);
      
      try {
        // 查询用户发帖数量
        const { data: user } = await supabase
          .from('users')
          .select('post_count')
          .eq('address', userAddress)
          .single();
        
        // 如果是第一篇帖子，授予资格
        if (user && user.post_count === 1) {
          console.log(`🎯 这是用户的第一篇帖子，准备授予mint资格...`);
          
          // 检查是否已经达到2000人上限
          const { count } = await supabase
            .from('users')
            .select('address', { count: 'exact', head: true })
            .gt('post_count', 0);
          
          if (count && count <= 2000) {
            await grantEligibilityOnChain(userAddress);
          } else {
            console.log(`⚠️ 已达到2000人上限，不再授予资格`);
          }
        }
      } catch (error) {
        console.error('处理新帖子事件失败:', error);
        // 发送告警通知（可选）
        await sendAlert(`授予资格失败: ${userAddress}`);
      }
    })
    .subscribe();
  
  console.log('✅ 实时同步服务已启动');
  
  return subscription;
}

/**
 * 批量同步：手动触发，同步所有需要的用户
 */
export async function runBatchSync() {
  console.log('🔄 开始批量同步...');
  
  try {
    const needSync = await getUsersNeedingSync();
    
    if (needSync.length === 0) {
      console.log('✅ 所有用户已同步');
      return { success: true, synced: 0 };
    }
    
    console.log(`📋 发现 ${needSync.length} 个用户需要同步`);
    await batchGrantEligibility(needSync);
    
    return { success: true, synced: needSync.length };
  } catch (error) {
    console.error('批量同步失败:', error);
    return { success: false, error };
  }
}

/**
 * 发送告警通知（可选实现）
 */
async function sendAlert(message: string) {
  // 实现你的告警通知逻辑
  // 例如：发送到Discord、Telegram、邮件等
  console.error('🚨 告警:', message);
  
  // 示例：发送到Discord Webhook
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **Mint资格同步告警**\n${message}`,
        }),
      });
    } catch (error) {
      console.error('发送Discord通知失败:', error);
    }
  }
}

// 如果直接运行此文件，启动实时同步
if (require.main === module) {
  console.log('🎬 启动Mint资格同步服务...');
  
  // 先执行一次批量同步
  runBatchSync()
    .then(() => {
      console.log('✅ 初始批量同步完成');
      // 然后启动实时监听
      startRealtimeSync();
    })
    .catch((error) => {
      console.error('❌ 启动失败:', error);
      process.exit(1);
    });
  
  // 保持进程运行
  process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务...');
    process.exit(0);
  });
}
