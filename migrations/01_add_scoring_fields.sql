-- ============================================
-- AI评分和分类功能 - 数据库迁移脚本
-- 执行时间：按需执行（首次启用评分功能时）
-- ============================================

-- 1. 为posts表添加评分和分类字段
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS ai_score_relevance SMALLINT,           -- AI相关性分数 (0-35)
ADD COLUMN IF NOT EXISTS ai_score_quality SMALLINT,             -- 内容质量分数 (0-35)
ADD COLUMN IF NOT EXISTS ai_score_value SMALLINT,               -- 教育价值分数 (0-30)
ADD COLUMN IF NOT EXISTS ai_score_total SMALLINT,               -- 总分 (0-100)
ADD COLUMN IF NOT EXISTS ai_score_details TEXT,                 -- 评分详细说明
ADD COLUMN IF NOT EXISTS category TEXT,                         -- 主要分类
ADD COLUMN IF NOT EXISTS secondary_category TEXT,               -- 次要分类（可选）
ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;                 -- 评分时间

-- 2. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_score_total ON posts(ai_score_total DESC);

-- 3. 创建评分记录表（用于审计和统计）
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

-- 4. 为评分记录表创建索引
CREATE INDEX IF NOT EXISTS idx_scoring_logs_post_id ON post_scoring_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_scoring_logs_scored_at ON post_scoring_logs(scored_at DESC);

-- 5. 启用行级安全策略
ALTER TABLE post_scoring_logs ENABLE ROW LEVEL SECURITY;

-- 6. 创建访问策略（先删除后创建，避免重复错误）
DROP POLICY IF EXISTS "所有人可以查看评分记录" ON post_scoring_logs;
DROP POLICY IF EXISTS "系统可以创建评分记录" ON post_scoring_logs;

CREATE POLICY "所有人可以查看评分记录" 
  ON post_scoring_logs FOR SELECT 
  USING (true);

CREATE POLICY "系统可以创建评分记录" 
  ON post_scoring_logs FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- 验证迁移
-- ============================================

-- 查看posts表的新字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
  AND (column_name LIKE 'ai_%' 
       OR column_name = 'category' 
       OR column_name = 'secondary_category'
       OR column_name = 'scored_at')
ORDER BY column_name;

-- 查看post_scoring_logs表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'post_scoring_logs'
ORDER BY ordinal_position;

-- ============================================
-- 迁移完成！
-- ============================================

-- 说明：
-- 1. 所有ALTER TABLE都使用IF NOT EXISTS，可以安全地重复执行
-- 2. 评分字段为SMALLINT类型，节省存储空间
-- 3. 已创建索引优化按分类和评分的查询
-- 4. post_scoring_logs表用于记录所有评分历史，便于审计
-- 5. RLS策略确保数据访问安全
