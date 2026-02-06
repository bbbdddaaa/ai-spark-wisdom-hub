-- ============================================
-- AI Spark 数据库快速建表脚本
-- 在 Supabase SQL Editor 中一次性执行
-- ============================================

-- 1. 创建用户表
CREATE TABLE users (
  address TEXT PRIMARY KEY,
  tokens NUMERIC DEFAULT 20,
  daily_post_count INTEGER DEFAULT 0,
  daily_like_count INTEGER DEFAULT 0,
  like_earned_today NUMERIC DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_updated_at ON users(updated_at);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看所有用户信息" ON users FOR SELECT USING (true);
CREATE POLICY "用户只能插入自己的数据" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "用户只能更新自己的数据" ON users FOR UPDATE USING (true);

-- 2. 创建帖子表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  ai_score_relevance SMALLINT,           -- AI相关性分数 (0-35)
  ai_score_quality SMALLINT,             -- 内容质量分数 (0-35)
  ai_score_value SMALLINT,               -- 教育价值分数 (0-30)
  ai_score_total SMALLINT,               -- 总分 (0-100)
  ai_score_details TEXT,                 -- 评分详细说明
  category TEXT,                         -- 主要分类
  secondary_category TEXT,               -- 次要分类（可选）
  scored_at TIMESTAMPTZ,                 -- 评分时间
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user_address ON posts(user_address);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_likes ON posts(likes DESC);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_score_total ON posts(ai_score_total DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可以查看帖子" ON posts FOR SELECT USING (true);
CREATE POLICY "认证用户可以创建帖子" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "用户只能删除自己的帖子" ON posts FOR DELETE USING (user_address = current_setting('request.jwt.claims', true)::json->>'sub');

-- 3. 创建点赞表
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_address)
);

CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_address ON likes(user_address);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可以查看点赞" ON likes FOR SELECT USING (true);
CREATE POLICY "认证用户可以点赞" ON likes FOR INSERT WITH CHECK (true);
CREATE POLICY "用户可以取消自己的点赞" ON likes FOR DELETE USING (true);

-- 4. 创建交易记录表
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_address ON transactions(user_address);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的交易记录" ON transactions FOR SELECT USING (true);
CREATE POLICY "系统可以创建交易记录" ON transactions FOR INSERT WITH CHECK (true);

-- 5. 创建自动更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. 创建自动更新点赞数函数
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes = likes - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_likes_on_insert
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

CREATE TRIGGER trigger_update_post_likes_on_delete
  AFTER DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- 7. 创建评分记录表（用于审计和统计）
CREATE TABLE post_scoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  agent_address TEXT,
  score_relevance SMALLINT,
  score_quality SMALLINT,
  score_value SMALLINT,
  score_total SMALLINT,
  category TEXT,
  secondary_category TEXT,
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scoring_logs_post_id ON post_scoring_logs(post_id);
CREATE INDEX idx_scoring_logs_scored_at ON post_scoring_logs(scored_at DESC);

ALTER TABLE post_scoring_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可以查看评分记录" ON post_scoring_logs FOR SELECT USING (true);
CREATE POLICY "系统可以创建评分记录" ON post_scoring_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- 执行完成！
-- 现在可以在 Table Editor 中查看创建的表
-- ============================================

-- ============================================
-- 数据库迁移脚本（如果数据库已存在）
-- 在已有数据库上执行以下语句添加新字段
-- ============================================

-- 为现有的posts表添加评分和分类字段
-- 如果表已存在，执行以下ALTER TABLE语句：

/*
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS ai_score_relevance SMALLINT,
ADD COLUMN IF NOT EXISTS ai_score_quality SMALLINT,
ADD COLUMN IF NOT EXISTS ai_score_value SMALLINT,
ADD COLUMN IF NOT EXISTS ai_score_total SMALLINT,
ADD COLUMN IF NOT EXISTS ai_score_details TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS secondary_category TEXT,
ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_score_total ON posts(ai_score_total DESC);
*/
