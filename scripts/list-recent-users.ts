/**
 * 列出最近的用户和帖子
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listRecentActivity() {
  console.log('\n====================================');
  console.log('最近的用户和活动');
  console.log('====================================\n');

  try {
    // 1. 查询最近的用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('address, post_count, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (usersError) throw usersError;

    console.log('📋 最近注册的用户（最近 10 个）:');
    console.log('------------------------------------');
    if (users.length === 0) {
      console.log('没有用户');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.address}`);
        console.log(`   发帖数: ${user.post_count ?? 0}`);
        console.log(`   注册时间: ${user.created_at}`);
        console.log();
      });
    }

    // 2. 查询最近的帖子
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, user_address, title, ai_score_total, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (postsError) throw postsError;

    console.log('📝 最近发布的帖子（最近 10 个）:');
    console.log('------------------------------------');
    if (posts.length === 0) {
      console.log('没有帖子');
    } else {
      posts.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title.substring(0, 50)}${post.title.length > 50 ? '...' : ''}`);
        console.log(`   作者: ${post.user_address}`);
        console.log(`   评分: ${post.ai_score_total ?? '未评分'}`);
        console.log(`   发布时间: ${post.created_at}`);
        console.log();
      });
    }

    // 3. 查询包含特定地址的用户（不区分大小写）
    const searchAddress = process.argv[2];
    if (searchAddress) {
      console.log(`🔍 搜索地址: ${searchAddress}`);
      console.log('------------------------------------');
      
      const { data: matchedUsers, error: matchError } = await supabase
        .from('users')
        .select('address, post_count, created_at')
        .ilike('address', `%${searchAddress}%`);

      if (matchError) {
        console.error('搜索失败:', matchError);
      } else if (matchedUsers.length === 0) {
        console.log('❌ 没有找到匹配的用户');
      } else {
        console.log(`✅ 找到 ${matchedUsers.length} 个匹配的用户:`);
        matchedUsers.forEach((user, index) => {
          console.log(`${index + 1}. ${user.address}`);
          console.log(`   发帖数: ${user.post_count ?? 0}`);
          console.log(`   注册时间: ${user.created_at}`);
        });
      }
      console.log();
    }

  } catch (error: any) {
    console.error('\n❌ 错误:', error.message);
  }
}

listRecentActivity();
