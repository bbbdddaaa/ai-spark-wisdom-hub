/**
 * 检查用户在数据库中的状态
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser(address: string) {
  console.log('\n====================================');
  console.log('检查用户数据库状态');
  console.log('====================================\n');
  console.log('用户地址:', address);
  console.log();

  try {
    // 1. 查询用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('address', address)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log('❌ 用户不存在于数据库中');
        console.log('   用户需要先连接钱包才会创建账户');
        return;
      }
      throw userError;
    }

    console.log('✅ 找到用户数据:');
    console.log('------------------------------------');
    console.log('地址:', user.address);
    console.log('发帖总数 (post_count):', user.post_count ?? '字段不存在');
    console.log('今日发帖 (daily_post_count):', user.daily_post_count ?? 0);
    console.log('代币余额 (tokens):', user.tokens ?? 0);
    console.log('是否有 mint 资格 (is_eligible_for_mint):', user.is_eligible_for_mint ?? '字段不存在');
    console.log('是否已 mint (has_minted):', user.has_minted ?? '字段不存在');
    console.log('创建时间:', user.created_at);
    console.log('最后更新:', user.updated_at);
    console.log();

    // 2. 查询用户的帖子
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, created_at, ai_score_total')
      .eq('user_address', address)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('查询帖子失败:', postsError);
    } else {
      console.log('📝 用户的帖子列表:');
      console.log('------------------------------------');
      if (posts.length === 0) {
        console.log('❌ 没有找到任何帖子');
        console.log('   可能原因：');
        console.log('   1. 帖子发布失败');
        console.log('   2. 帖子评分不及格被拒绝');
        console.log('   3. 数据库同步问题');
      } else {
        posts.forEach((post, index) => {
          console.log(`\n帖子 ${index + 1}:`);
          console.log('  ID:', post.id);
          console.log('  标题:', post.title.substring(0, 50) + (post.title.length > 50 ? '...' : ''));
          console.log('  评分:', post.ai_score_total ?? '未评分');
          console.log('  发布时间:', post.created_at);
        });
      }
      console.log();
    }

    // 3. 分析问题
    console.log('====================================');
    console.log('问题分析');
    console.log('====================================\n');

    if (!user.post_count && user.post_count !== 0) {
      console.log('❌ 问题: users 表缺少 post_count 字段');
      console.log('   解决方案: 执行数据库迁移脚本 DATABASE_MIGRATION.sql');
      console.log();
    } else if (posts.length > 0 && user.post_count === 0) {
      console.log('❌ 问题: 有帖子但 post_count 为 0');
      console.log('   原因: 数据库触发器未正常工作');
      console.log('   解决方案: 手动更新 post_count 或重新执行触发器');
      console.log();
    } else if (posts.length === 0) {
      console.log('❌ 问题: 没有找到用户的帖子');
      console.log('   可能原因:');
      console.log('   1. 帖子 AI 评分未达到 60 分被拒绝');
      console.log('   2. 帖子发布过程中出现错误');
      console.log('   建议: 检查前端控制台和后端日志');
      console.log();
    } else if (user.post_count === 1 && !user.is_eligible_for_mint) {
      console.log('⚠️  问题: 已发布第一篇帖子但未获得 mint 资格');
      console.log('   原因: 自动授权服务可能未正常工作');
      console.log('   解决方案: 手动授予资格');
      console.log();
    } else if (user.post_count >= 1 && user.is_eligible_for_mint) {
      console.log('✅ 一切正常！用户应该有 mint 权限');
      console.log('   如果链上查询显示无权限，可能是链上交易未确认或失败');
      console.log();
    }

  } catch (error: any) {
    console.error('\n❌ 错误:', error.message);
  }
}

const address = process.argv[2];

if (!address) {
  console.error('\n❌ 请提供钱包地址');
  console.log('使用方法: npx ts-node scripts/check-user-db.ts <地址>\n');
  process.exit(1);
}

checkUser(address.toLowerCase());
