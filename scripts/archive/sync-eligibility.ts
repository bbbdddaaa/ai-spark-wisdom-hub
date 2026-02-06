/**
 * 手动同步脚本
 * 用于一次性同步所有需要mint资格的用户到合约
 * 
 * 使用方法：
 * npx tsx scripts/sync-eligibility.ts
 */

import { runBatchSync } from '../services/eligibilitySyncService';

async function main() {
  console.log('=' .repeat(60));
  console.log('🚀 开始同步Mint资格到区块链合约');
  console.log('=' .repeat(60));
  console.log('');
  
  try {
    const result = await runBatchSync();
    
    console.log('');
    console.log('=' .repeat(60));
    if (result.success) {
      console.log(`✅ 同步完成！共同步 ${result.synced} 个用户`);
    } else {
      console.log('❌ 同步失败');
      console.error(result.error);
    }
    console.log('=' .repeat(60));
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('');
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

main();
