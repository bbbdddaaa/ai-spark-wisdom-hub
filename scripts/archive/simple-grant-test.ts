/**
 * 简化版测试：授予 Mint 资格
 */

import { createWalletClient, http, parseAbi, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const OWNER_PRIVATE_KEY = (process.env.OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY) as `0x${string}`;
const MINT_CONTROLLER_ADDRESS = '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839' as `0x${string}`;
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const MINT_CONTROLLER_ABI = parseAbi([
  'function grantEligibility(address[] calldata users) external',
  'function isEligible(address user) external view returns (bool)',
]);

async function testGrant() {
  const testAddress = (process.argv[2] || '0x38783e1fa0e5d082a221ad81d35e129fd55d19f0') as `0x${string}`;
  
  console.log('\n====================================');
  console.log('授予 Mint 资格测试');
  console.log('====================================\n');
  console.log('RPC URL:', RPC_URL);
  console.log('MintController:', MINT_CONTROLLER_ADDRESS);
  console.log('测试地址:', testAddress);
  console.log();

  if (!OWNER_PRIVATE_KEY) {
    console.error('❌ 错误: OWNER_PRIVATE_KEY 或 PRIVATE_KEY 未配置');
    return;
  }

  try {
    // 创建客户端
    const account = privateKeyToAccount(OWNER_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(RPC_URL),
    });

    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    console.log('✓ Owner 地址:', account.address);
    console.log();

    // 1. 检查当前状态
    console.log('🔍 检查当前资格状态...');
    const isEligibleBefore = await publicClient.readContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'isEligible',
      args: [testAddress],
    });
    console.log('   当前状态:', isEligibleBefore ? '✅ 已有资格' : '❌ 无资格');
    console.log();

    if (isEligibleBefore) {
      console.log('✅ 用户已有 Mint 资格，无需授予');
      return;
    }

    // 2. 授予资格
    console.log('🔄 发送交易授予资格...');
    const hash = await walletClient.writeContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'grantEligibility',
      args: [[testAddress]],
    });

    console.log('   交易已发送:', hash);
    console.log('   区块浏览器: https://basescan.org/tx/' + hash);
    console.log();

    // 3. 等待确认
    console.log('⏳ 等待交易确认...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('   ✅ 交易已确认');
    } else {
      console.log('   ❌ 交易失败');
      return;
    }
    console.log();

    // 4. 验证结果
    console.log('🔍 验证授予结果...');
    const isEligibleAfter = await publicClient.readContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'isEligible',
      args: [testAddress],
    });
    console.log('   当前状态:', isEligibleAfter ? '✅ 已有资格' : '❌ 无资格');
    console.log();

    console.log('====================================');
    if (isEligibleAfter) {
      console.log('✅ 授予成功！');
    } else {
      console.log('❌ 授予失败！');
    }
    console.log('====================================\n');

  } catch (error: any) {
    console.error('\n❌ 错误:', error.message);
    if (error.message.includes('insufficient funds')) {
      console.error('   提示: Owner 账户余额不足，无法支付 Gas 费');
    } else if (error.message.includes('Ownable')) {
      console.error('   提示: 当前账户不是合约的 Owner');
    }
    console.error();
  }
}

testGrant();
