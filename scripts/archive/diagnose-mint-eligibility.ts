/**
 * Mint 资格问题诊断工具
 * 检查发布文章后为什么没有授予 mint 权限
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('\n====================================');
  console.log('Mint 资格问题诊断工具');
  console.log('====================================\n');

  const issues: string[] = [];
  const fixes: string[] = [];

  try {
    // 1. 检查数据库连接
    console.log('✓ 检查 Supabase 连接...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      issues.push('❌ 无法连接到 Supabase 数据库');
      console.error('连接失败:', testError);
      return;
    }
    console.log('  ✅ Supabase 连接正常\n');

    // 2. 检查 users 表是否有 post_count 字段
    console.log('✓ 检查 users 表结构...');
    const { data: sampleUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('查询失败:', userError);
    }

    const hasPostCount = sampleUser && 'post_count' in sampleUser;
    
    if (!hasPostCount) {
      issues.push('❌ users 表缺少 post_count 字段');
      console.log('  ❌ 缺少 post_count 字段');
      console.log('  ℹ️  当前表结构:', sampleUser ? Object.keys(sampleUser).join(', ') : '无数据');
      fixes.push('需要执行数据库迁移脚本添加 post_count 字段');
    } else {
      console.log('  ✅ post_count 字段存在\n');
    }

    // 3. 检查是否有 post_count 统计触发器
    console.log('✓ 检查数据库触发器...');
    let triggers = null;
    try {
      const result = await supabase.rpc('exec_sql', { 
        query: `SELECT trigger_name FROM information_schema.triggers 
                WHERE event_object_table = 'posts' 
                AND trigger_name LIKE '%post_count%';` 
      });
      triggers = result.data;
    } catch {
      triggers = null;
    }

    if (!triggers) {
      issues.push('⚠️  无法检查触发器（需要数据库权限）');
      console.log('  ⚠️  无法检查触发器，可能需要手动验证');
      fixes.push('确保执行了 DATABASE_MIGRATION.sql 中的触发器创建语句');
    }
    console.log();

    // 4. 检查环境变量配置
    console.log('✓ 检查环境变量...');
    const requiredEnvVars = {
      'OWNER_PRIVATE_KEY': process.env.OWNER_PRIVATE_KEY,
      'VITE_MINT_CONTROLLER_ADDRESS': process.env.VITE_MINT_CONTROLLER_ADDRESS,
      'BASE_RPC_URL': process.env.BASE_RPC_URL || process.env.VITE_RPC_URL,
    };

    let envOk = true;
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        issues.push(`❌ 缺少环境变量: ${key}`);
        console.log(`  ❌ ${key} 未配置`);
        envOk = false;
      }
    }

    if (envOk) {
      console.log('  ✅ 环境变量配置完整\n');
    } else {
      fixes.push('在 .env.local 文件中配置缺少的环境变量');
      console.log();
    }

    // 5. 检查链配置是否一致
    console.log('✓ 检查链配置...');
    const mintControllerAddr = process.env.VITE_MINT_CONTROLLER_ADDRESS;
    const configuredChain = mintControllerAddr === '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839' ? 'Base Mainnet' : 'Base Sepolia';
    
    console.log(`  ℹ️  MintController 地址: ${mintControllerAddr}`);
    console.log(`  ℹ️  推测链: ${configuredChain}`);
    
    // 检查 mintEligibilitySimpleSync.ts 中的链配置
    const syncServiceChain = 'baseSepolia'; // 硬编码在文件中
    if (configuredChain === 'Base Mainnet' && syncServiceChain === 'baseSepolia') {
      issues.push('❌ 链配置不一致：合约在主网，但授权服务配置为测试网');
      console.log('  ❌ 链配置不一致！');
      console.log('    - MintController 在: Base Mainnet');
      console.log('    - 授权服务配置为: Base Sepolia');
      fixes.push('修改 services/mintEligibilitySimpleSync.ts 中的链配置为 base (主网)');
    } else {
      console.log('  ✅ 链配置一致\n');
    }

    // 6. 查询测试用户数据
    console.log('✓ 查询测试用户数据...');
    const testAddress = '0x38783e1fa0e5d082a221ad81d35e129fd55d19f0';
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('*')
      .eq('address', testAddress)
      .single();

    if (userDataError && userDataError.code !== 'PGRST116') {
      console.log(`  ⚠️  查询用户失败: ${userDataError.message}`);
    } else if (!userData) {
      console.log(`  ℹ️  用户 ${testAddress} 不存在于数据库中`);
    } else {
      console.log(`  ✅ 找到用户数据:`);
      console.log(`    - 地址: ${userData.address}`);
      console.log(`    - 发帖数 (post_count): ${userData.post_count ?? '字段不存在'}`);
      console.log(`    - 今日发帖 (daily_post_count): ${userData.daily_post_count ?? 0}`);
      console.log(`    - 是否有 mint 资格 (is_eligible_for_mint): ${userData.is_eligible_for_mint ?? '字段不存在'}`);
      
      if (userData.post_count === undefined) {
        issues.push('❌ 用户数据缺少 post_count 字段');
      }
    }
    console.log();

    // 7. 汇总问题和修复建议
    console.log('====================================');
    console.log('诊断结果');
    console.log('====================================\n');

    if (issues.length === 0) {
      console.log('✅ 未发现明显问题\n');
      console.log('可能原因：');
      console.log('1. 用户还未发布过文章');
      console.log('2. 链上交易还未确认');
      console.log('3. 授权服务日志中有错误信息\n');
    } else {
      console.log('发现的问题：');
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
      console.log();

      console.log('修复建议：');
      fixes.forEach((fix, i) => {
        console.log(`${i + 1}. ${fix}`);
      });
      console.log();
    }

    // 8. 提供具体的修复步骤
    if (fixes.length > 0) {
      console.log('====================================');
      console.log('修复步骤');
      console.log('====================================\n');

      if (issues.some(i => i.includes('post_count 字段'))) {
        console.log('步骤 1: 执行数据库迁移');
        console.log('---------------------------------------');
        console.log('在 Supabase Dashboard > SQL Editor 中执行：');
        console.log();
        console.log('```sql');
        console.log('-- 添加 post_count 字段');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0;');
        console.log();
        console.log('-- 创建自动更新 post_count 的函数');
        console.log('CREATE OR REPLACE FUNCTION update_user_post_count()');
        console.log('RETURNS TRIGGER AS $$');
        console.log('BEGIN');
        console.log('  IF TG_OP = \'INSERT\' THEN');
        console.log('    UPDATE users SET post_count = post_count + 1 WHERE address = NEW.user_address;');
        console.log('  ELSIF TG_OP = \'DELETE\' THEN');
        console.log('    UPDATE users SET post_count = GREATEST(post_count - 1, 0) WHERE address = OLD.user_address;');
        console.log('  END IF;');
        console.log('  RETURN NULL;');
        console.log('END;');
        console.log('$$ LANGUAGE plpgsql;');
        console.log();
        console.log('-- 创建触发器');
        console.log('DROP TRIGGER IF EXISTS trigger_update_user_post_count_insert ON posts;');
        console.log('CREATE TRIGGER trigger_update_user_post_count_insert');
        console.log('  AFTER INSERT ON posts FOR EACH ROW EXECUTE FUNCTION update_user_post_count();');
        console.log();
        console.log('-- 初始化现有用户的 post_count');
        console.log('UPDATE users u SET post_count = (');
        console.log('  SELECT COUNT(*) FROM posts p WHERE p.user_address = u.address');
        console.log(');');
        console.log('```');
        console.log();
      }

      if (issues.some(i => i.includes('链配置不一致'))) {
        console.log('步骤 2: 修复链配置');
        console.log('---------------------------------------');
        console.log('编辑 services/mintEligibilitySimpleSync.ts:');
        console.log('将 `import { baseSepolia } from \'viem/chains\';` 改为 `import { base } from \'viem/chains\';`');
        console.log('将 `chain: baseSepolia,` 改为 `chain: base,`');
        console.log();
      }
    }

  } catch (error: any) {
    console.error('\n❌ 诊断过程出错:', error.message);
  }
}

diagnose();
