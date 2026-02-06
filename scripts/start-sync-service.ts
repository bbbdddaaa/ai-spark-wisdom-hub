/**
 * 启动实时同步服务
 * 持续运行，监听数据库变化并自动同步到合约
 * 
 * 使用方法：
 * npx tsx scripts/start-sync-service.ts
 * 
 * 或者使用 PM2 保持后台运行：
 * pm2 start scripts/start-sync-service.ts --name "mint-sync"
 */

import { startRealtimeSync, runBatchSync } from '../services/eligibilitySyncService';

async function main() {
  console.log('');
  console.log('=' .repeat(60));
  console.log('🚀 Mint资格实时同步服务');
  console.log('=' .repeat(60));
  console.log('');
  console.log('功能: 监听用户发布内容，自动授予前2000名mint资格');
  console.log('');
  
  try {
    // 1. 先执行一次批量同步，同步历史用户
    console.log('📋 步骤1: 批量同步历史用户...');
    console.log('-'.repeat(60));
    const batchResult = await runBatchSync();
    
    if (batchResult.success) {
      console.log(`✅ 批量同步完成，共同步 ${batchResult.synced} 个用户`);
    } else {
      console.warn('⚠️ 批量同步失败，但将继续启动实时监听');
    }
    console.log('');
    
    // 2. 启动实时监听
    console.log('📡 步骤2: 启动实时监听...');
    console.log('-'.repeat(60));
    const subscription = startRealtimeSync();
    console.log('✅ 实时监听已启动');
    console.log('');
    
    console.log('=' .repeat(60));
    console.log('🎯 服务运行中...');
    console.log('   - 监听新帖子发布');
    console.log('   - 自动授予前2000名mint资格');
    console.log('   - 按 Ctrl+C 停止服务');
    console.log('=' .repeat(60));
    console.log('');
    
    // 定期健康检查（每10分钟）
    setInterval(() => {
      const now = new Date().toLocaleString('zh-CN');
      console.log(`💓 [${now}] 服务运行正常`);
    }, 10 * 60 * 1000);
    
    // 处理退出信号
    process.on('SIGINT', () => {
      console.log('');
      console.log('👋 收到退出信号，正在关闭服务...');
      subscription.unsubscribe();
      console.log('✅ 服务已停止');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('');
      console.log('👋 收到终止信号，正在关闭服务...');
      subscription.unsubscribe();
      console.log('✅ 服务已停止');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('');
    console.error('❌ 服务启动失败:', error);
    process.exit(1);
  }
}

main();
