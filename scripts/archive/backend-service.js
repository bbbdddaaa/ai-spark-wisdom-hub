// AI Spark 后端自动化服务
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('🚀 AI Spark 后端服务启动中...');
console.log('时间:', new Date().toISOString());

// 配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 缺少 Supabase 配置');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 健康检查
async function healthCheck() {
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) throw error;
    console.log('✅ 服务健康检查通过');
    return true;
  } catch (error) {
    console.error('❌ 服务健康检查失败:', error);
    return false;
  }
}

// 主循环
async function main() {
  console.log('执行健康检查...');
  const healthy = await healthCheck();
  
  if (healthy) {
    console.log('✅ 服务运行正常');
  }
  
  // 每小时执行一次检查
  setTimeout(main, 60 * 60 * 1000);
}

main().catch(console.error);

// 保持进程运行
setInterval(() => {
  console.log('🔄 服务运行中...', new Date().toISOString());
}, 5 * 60 * 1000); // 每5分钟打印一次
