/**
 * 批量授予前2000名用户mint资格
 * 用于初始化或补充未授予的用户
 * 
 * 使用方法：
 * npx tsx scripts/batch-grant-eligibility.ts
 */

import { batchGrantEligibilityForTop2000 } from '../services/mintEligibilitySimpleSync';

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 批量授予前2000名用户Mint资格');
  console.log('='.repeat(60));
  console.log('');
  console.log('功能：查询前2000名发过帖子的用户，批量授予链上mint资格');
  console.log('');
  
  try {
    await batchGrantEligibilityForTop2000();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 批量授予完成！');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ 批量授予失败');
    console.error('='.repeat(60));
    console.error('');
    console.error('错误详情:', error);
    
    process.exit(1);
  }
}

main();
