import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase环境变量未配置，将使用模拟数据模式');
}

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库类型定义（与Supabase表结构对应）
export interface DbUser {
  address: string;
  tokens: number;
  daily_post_count: number;
  daily_like_count: number;
  like_earned_today: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface DbPost {
  id: string;
  user_address: string;
  title: string;
  content: string;
  tags: string[];
  likes: number;
  created_at: string;
}

export interface DbLike {
  id: string;
  post_id: string;
  user_address: string;
  created_at: string;
}

export interface DbTransaction {
  id: string;
  user_address: string;
  amount: number;
  reason: string;
  created_at: string;
}
