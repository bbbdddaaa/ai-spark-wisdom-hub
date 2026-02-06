import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MINT_CONTROLLER_ABI = [
  "function isEligible(address user) view returns (bool)",
  "function hasMinted(address user) view returns (bool)",
  "function mintCount(address user) view returns (uint256)",
  "function canMint(address user) view returns (bool)"
];

async function checkMintEligibility(walletAddress: string) {
  // 配置 RPC
  const rpcUrl = process.env.BASE_RPC_URL || process.env.VITE_RPC_URL || 'https://mainnet.base.org';
  const mintControllerAddress = process.env.VITE_MINT_CONTROLLER_ADDRESS || '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839';
  
  console.log('\n====================================');
  console.log('Mint 权限查询工具');
  console.log('====================================\n');
  console.log('RPC URL:', rpcUrl);
  console.log('MintController 地址:', mintControllerAddress);
  console.log('查询钱包地址:', walletAddress);
  console.log('\n====================================\n');

  try {
    // 连接到区块链
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // 创建合约实例
    const mintController = new ethers.Contract(
      mintControllerAddress,
      MINT_CONTROLLER_ABI,
      provider
    );

    // 查询各项信息
    console.log('正在查询...\n');
    
    const [isEligible, hasMinted, mintCount, canMint] = await Promise.all([
      mintController.isEligible(walletAddress),
      mintController.hasMinted(walletAddress),
      mintController.mintCount(walletAddress),
      mintController.canMint(walletAddress)
    ]);

    // 显示结果
    console.log('查询结果:');
    console.log('----------------------------------------');
    console.log('✓ 是否有 Mint 资格 (isEligible):', isEligible ? '✅ 是' : '❌ 否');
    console.log('✓ 是否已经 Mint 过 (hasMinted):', hasMinted ? '✅ 是' : '❌ 否');
    console.log('✓ Mint 次数 (mintCount):', mintCount.toString());
    console.log('✓ 当前可以 Mint (canMint):', canMint ? '✅ 是' : '❌ 否');
    console.log('----------------------------------------\n');

    if (isEligible && canMint) {
      console.log('🎉 该钱包地址有 Mint 权限，可以进行 Mint 操作！');
      console.log('Mint 成本: 0.003 ETH');
      console.log('Mint 奖励: 10,000 SPARK\n');
    } else if (isEligible && !canMint) {
      console.log('⚠️  该钱包地址有 Mint 资格，但当前不能 Mint（可能是 Mint 名额已满）\n');
    } else {
      console.log('❌ 该钱包地址没有 Mint 权限\n');
      console.log('获取 Mint 权限的方式：');
      console.log('1. 发布高质量的 AI 相关内容（评分 ≥ 60 分）');
      console.log('2. 等待管理员手动授予资格\n');
    }

  } catch (error: any) {
    console.error('\n❌ 查询失败:', error.message);
    
    if (error.message.includes('network')) {
      console.error('\n提示: 请检查网络连接和 RPC URL 配置');
    } else if (error.message.includes('invalid address')) {
      console.error('\n提示: 钱包地址格式不正确');
    }
  }
}

// 从命令行参数获取钱包地址
const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('\n❌ 错误: 请提供钱包地址');
  console.log('\n使用方法:');
  console.log('  npx ts-node scripts/check-mint-eligibility.ts <钱包地址>\n');
  console.log('示例:');
  console.log('  npx ts-node scripts/check-mint-eligibility.ts 0x38783e1fa0e5d082a221ad81d35e129fd55d19f0\n');
  process.exit(1);
}

// 验证地址格式
if (!ethers.isAddress(walletAddress)) {
  console.error('\n❌ 错误: 无效的钱包地址格式\n');
  process.exit(1);
}

// 执行查询
checkMintEligibility(walletAddress);
