-- ============================================
-- AI评分和分类功能 - 简化版迁移脚本
-- 复制粘贴到Supabase SQL Editor直接执行
-- ============================================

-- 步骤1: 为posts表添加新字段
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS ai_score_relevance SMALLINT,
ADD COLUMN IF NOT EXISTS ai_score_quality SMALLINT,
ADD COLUMN IF NOT EXISTS ai_score_value SMALLINT,
ADD COLUMN IF NOT EXISTS ai_score_total SMALLINT,
ADD COLUMN IF NOT EXISTS ai_score_details TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS secondary_category TEXT,
ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

-- 步骤2: 创建索引
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_score_total ON posts(ai_score_total DESC);

-- 步骤3: 创建评分日志表
CREATE TABLE IF NOT EXISTS post_scoring_logs (
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

-- 步骤4: 创建日志表索引
CREATE INDEX IF NOT EXISTS idx_scoring_logs_post_id ON post_scoring_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_scoring_logs_scored_at ON post_scoring_logs(scored_at DESC);

-- 步骤5: 启用RLS
ALTER TABLE post_scoring_logs ENABLE ROW LEVEL SECURITY;

-- 步骤6: 删除旧策略（如果存在）
DROP POLICY IF EXISTS "所有人可以查看评分记录" ON post_scoring_logs;
DROP POLICY IF EXISTS "系统可以创建评分记录" ON post_scoring_logs;

-- 步骤7: 创建新策略
CREATE POLICY "所有人可以查看评分记录" 
  ON post_scoring_logs FOR SELECT 
  USING (true);

CREATE POLICY "系统可以创建评分记录" 
  ON post_scoring_logs FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- 完成！现在验证迁移结果
-- ============================================

-- 查看posts表的新字段
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
  AND (column_name LIKE 'ai_%' 
       OR column_name IN ('category', 'secondary_category', 'scored_at'))
ORDER BY column_name;
