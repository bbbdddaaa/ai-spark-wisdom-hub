/**
 * 测试授予 Mint 资格功能
 */

import { grantMintEligibility } from '../services/mintEligibilitySimpleSync.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testGrantEligibility() {
  const testAddress = process.argv[2] || '0x38783e1fa0e5d082a221ad81d35e129fd55d19f0';
  
  console.log('\n====================================');
  console.log('测试授予 Mint 资格');
  console.log('====================================\n');
  console.log('测试地址:', testAddress);
  console.log();

  try {
    console.log('🔄 开始授予资格...\n');
    
    const result = await grantMintEligibility(testAddress, {
      skipOnChainCheck: false,  // 检查是否已有资格
      waitForConfirmation: true,  // 等待交易确认
    });

    console.log('\n====================================');
    console.log('测试结果');
    console.log('====================================\n');

    if (result.success) {
      console.log('✅ 授予资格成功！');
      if (result.txHash) {
        console.log(`   交易哈希: ${result.txHash}`);
        console.log(`   区块浏览器: https://basescan.org/tx/${result.txHash}`);
      }
    } else {
      console.log('❌ 授予资格失败');
      console.log(`   错误信息: ${result.error}`);
    }
    console.log();

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error);
  }
}

testGrantEligibility();
