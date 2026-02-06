/**
 * 检查用户的 mint 状态（链上和数据库）
 * 用于调试 mint 失败问题
 * 
 * 使用方法：
 * npx tsx scripts/check-mint-status.ts <用户地址>
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

// 配置
const USER_ADDRESS = process.argv[2];
const MINT_CONTROLLER_ADDRESS = '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839' as `0x${string}`;
const SPARK_TOKEN_ADDRESS = '0xEABD7e41D19c9b977419aE054815C4bF9B028d20' as `0x${string}`;
const RPC_URL = process.env.BASE_RPC_URL || process.env.VITE_RPC_URL || 'https://mainnet.base.org';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

if (!USER_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(USER_ADDRESS)) {
  console.error('❌ 请提供有效的用户地址');
  console.error('用法: npx tsx scripts/check-mint-status.ts <用户地址>');
  process.exit(1);
}

// 创建客户端
const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 合约ABI
const MINT_CONTROLLER_ABI = parseAbi([
  'function isEligible(address user) external view returns (bool)',
  'function hasMinted(address user) external view returns (bool)',
  'function canMint(address user) external view returns (bool)',
  'function totalMintedUsers() external view returns (uint256)',
  'function remainingSlots() external view returns (uint256)',
  'function mintCost() external view returns (uint256)',
]);

const SPARK_TOKEN_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
]);

async function checkMintStatus() {
  console.log('');
  console.log('='.repeat(80));
  console.log('🔍 检查 Mint 状态');
  console.log('='.repeat(80));
  console.log('');
  console.log('👤 用户地址:', USER_ADDRESS);
  console.log('📍 RPC:', RPC_URL);
  console.log('📍 合约:', MINT_CONTROLLER_ADDRESS);
  console.log('');

  try {
    // 1. 检查链上状态
    console.log('⛓️  链上状态检查...');
    console.log('-'.repeat(80));

    const [
      isEligible,
      hasMinted,
      canMint,
      totalMintedUsers,
      remainingSlots,
      mintCost,
      sparkBalance,
    ] = await Promise.all([
      publicClient.readContract({
        address: MINT_CONTROLLER_ADDRESS,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'isEligible',
        args: [USER_ADDRESS as `0x${string}`],
      }),
      publicClient.readContract({
        address: MINT_CONTROLLER_ADDRESS,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'hasMinted',
        args: [USER_ADDRESS as `0x${string}`],
      }),
      publicClient.readContract({
        address: MINT_CONTROLLER_ADDRESS,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'canMint',
        args: [USER_ADDRESS as `0x${string}`],
      }),
      publicClient.readContract({
        address: MINT_CONTROLLER_ADDRESS,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'totalMintedUsers',
      }),
      publicClient.readContract({
        address: MINT_CONTROLLER_ADDRESS,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'remainingSlots',
      }),
      publicClient.readContract({
        address: MINT_CONTROLLER_ADDRESS,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'mintCost',
      }),
      publicClient.readContract({
        address: SPARK_TOKEN_ADDRESS,
        abi: SPARK_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [USER_ADDRESS as `0x${string}`],
      }),
    ]);

    console.log('✅ 有mint资格:', isEligible ? '是' : '否');
    console.log('✅ 已经mint:', hasMinted ? '是' : '否');
    console.log('✅ 可以mint:', canMint ? '是' : '否');
    console.log('📊 已mint人数:', totalMintedUsers.toString());
    console.log('📊 剩余名额:', remainingSlots.toString());
    console.log('💰 Mint成本:', (Number(mintCost) / 1e18).toFixed(6), 'ETH');
    console.log('💎 SPARK余额:', (Number(sparkBalance) / 1e18).toFixed(2), 'SPARK');
    console.log('');

    // 2. 检查数据库状态
    console.log('📊 数据库状态检查 (Supabase)...');
    console.log('-'.repeat(80));

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('address', USER_ADDRESS)
      .single();

    if (userError) {
      console.log('⚠️  数据库中未找到用户:', userError.message);
    } else if (userData) {
      console.log('✅ 用户存在');
      console.log('📝 发帖数:', userData.post_count || 0);
      console.log('💎 代币余额:', userData.tokens || 0);
      console.log('✅ 有mint资格(DB):', userData.is_eligible_for_mint ? '是' : '否');
      console.log('✅ 已经mint(DB):', userData.has_minted ? '是' : '否');
      console.log('📅 创建时间:', userData.created_at);
      console.log('📅 更新时间:', userData.updated_at);
    }
    console.log('');

    // 3. 数据一致性检查
    console.log('🔄 数据一致性检查...');
    console.log('-'.repeat(80));

    let hasIssues = false;

    if (userData) {
      if (userData.is_eligible_for_mint !== isEligible) {
        console.log('⚠️  资格状态不一致！');
        console.log('   数据库:', userData.is_eligible_for_mint);
        console.log('   链上:', isEligible);
        hasIssues = true;
      }

      if (userData.has_minted !== hasMinted) {
        console.log('⚠️  Mint状态不一致！');
        console.log('   数据库:', userData.has_minted);
        console.log('   链上:', hasMinted);
        hasIssues = true;
      }

      if (!hasIssues) {
        console.log('✅ 数据一致');
      }
    }
    console.log('');

    // 4. Mint资格分析
    console.log('🎯 Mint 资格分析...');
    console.log('-'.repeat(80));

    if (canMint) {
      console.log('✅ 用户可以 mint！');
      console.log('');
      console.log('   请确保：');
      console.log('   1. 钱包中有至少 0.003 ETH（用于mint）');
      console.log('   2. 钱包中有足够的ETH支付gas费（约0.001 ETH）');
      console.log('   3. 连接到Base主网（链ID: 8453）');
    } else {
      console.log('❌ 用户不能 mint，原因：');
      
      if (!isEligible) {
        console.log('   ❌ 没有mint资格');
        console.log('      解决方法：发布第一篇帖子以获得资格（前2000名）');
      }
      
      if (hasMinted) {
        console.log('   ❌ 已经mint过了');
        console.log('      每个地址只能mint一次');
      }
      
      if (Number(remainingSlots) === 0) {
        console.log('   ❌ Mint名额已满（2000人上限）');
      }
    }
    console.log('');

    // 5. 合约调用建议
    if (canMint && !hasMinted) {
      console.log('📝 合约调用参数建议：');
      console.log('-'.repeat(80));
      console.log('合约地址:', MINT_CONTROLLER_ADDRESS);
      console.log('函数名:', 'mint()');
      console.log('参数:', '无');
      console.log('Value:', (Number(mintCost) / 1e18).toFixed(6), 'ETH');
      console.log('Gas Limit:', '建议 150000');
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ 检查完成');
    console.log('='.repeat(80));
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 检查失败:', error);
    console.error('');
    process.exit(1);
  }
}

checkMintStatus();
