-- ============================================
-- AI Spark 数据库迁移脚本
-- 用于区块链经济模型重构
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 添加新字段到users表
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_eligible_for_mint BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_minted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mint_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_expire_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_connected BOOLEAN DEFAULT false;

-- 2. 创建mint_records表（追踪Mint记录）
CREATE TABLE IF NOT EXISTS mint_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  tx_hash TEXT NOT NULL,           -- 链上交易哈希
  amount NUMERIC DEFAULT 10000,     -- Mint的代币数量
  usdt_paid NUMERIC DEFAULT 10,     -- 支付的USDT数量
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mint_records_user ON mint_records(user_address);
CREATE INDEX IF NOT EXISTS idx_mint_records_created_at ON mint_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mint_records_tx_hash ON mint_records(tx_hash);

ALTER TABLE mint_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看自己的mint记录" ON mint_records;
CREATE POLICY "用户可以查看自己的mint记录" ON mint_records 
  FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'sub' OR true);

DROP POLICY IF EXISTS "系统可以创建mint记录" ON mint_records;
CREATE POLICY "系统可以创建mint记录" ON mint_records 
  FOR INSERT WITH CHECK (true);

-- 3. 创建memberships表（会员记录）
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  tx_hash TEXT NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  expire_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_address);
CREATE INDEX IF NOT EXISTS idx_memberships_expire ON memberships(expire_date);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships(is_active);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看自己的会员记录" ON memberships;
CREATE POLICY "用户可以查看自己的会员记录" ON memberships 
  FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'sub' OR true);

DROP POLICY IF EXISTS "系统可以创建会员记录" ON memberships;
CREATE POLICY "系统可以创建会员记录" ON memberships 
  FOR INSERT WITH CHECK (true);

-- 4. 创建weekly_rankings表（每周排名记录）
CREATE TABLE IF NOT EXISTS weekly_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,         -- 周开始日期
  week_end DATE NOT NULL,           -- 周结束日期
  user_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  rank INTEGER NOT NULL,            -- 排名（1-10）
  total_likes INTEGER NOT NULL,     -- 该周总点赞数
  reward_amount NUMERIC NOT NULL,   -- 奖励代币数量
  tx_hash TEXT,                     -- 奖励发放的交易哈希
  is_claimed BOOLEAN DEFAULT false, -- 是否已领取
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_rankings_week ON weekly_rankings(week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_weekly_rankings_user ON weekly_rankings(user_address);
CREATE INDEX IF NOT EXISTS idx_weekly_rankings_claimed ON weekly_rankings(is_claimed);

ALTER TABLE weekly_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可以查看排名" ON weekly_rankings;
CREATE POLICY "所有人可以查看排名" ON weekly_rankings 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "系统可以创建排名记录" ON weekly_rankings;
CREATE POLICY "系统可以创建排名记录" ON weekly_rankings 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "系统可以更新排名记录" ON weekly_rankings;
CREATE POLICY "系统可以更新排名记录" ON weekly_rankings 
  FOR UPDATE USING (true);

-- 5. 创建reward_pool_stats表（奖励池统计）
CREATE TABLE IF NOT EXISTS reward_pool_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_usdt_collected NUMERIC DEFAULT 0,  -- 总收集的USDT
  total_spark_bought NUMERIC DEFAULT 0,    -- 总回购的SPARK
  total_spark_distributed NUMERIC DEFAULT 0, -- 总分发的SPARK
  last_buyback_at TIMESTAMPTZ,            -- 上次回购时间
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入初始记录
INSERT INTO reward_pool_stats (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

ALTER TABLE reward_pool_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可以查看奖励池统计" ON reward_pool_stats;
CREATE POLICY "所有人可以查看奖励池统计" ON reward_pool_stats 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "系统可以更新奖励池统计" ON reward_pool_stats;
CREATE POLICY "系统可以更新奖励池统计" ON reward_pool_stats 
  FOR UPDATE USING (true);

-- 6. 创建触发器自动更新reward_pool_stats
CREATE OR REPLACE FUNCTION update_reward_pool_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reward_pool_stats_updated_at ON reward_pool_stats;
CREATE TRIGGER update_reward_pool_stats_updated_at
  BEFORE UPDATE ON reward_pool_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_reward_pool_stats_timestamp();

-- 7. 创建函数：更新用户post_count
CREATE OR REPLACE FUNCTION update_user_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users 
    SET post_count = post_count + 1 
    WHERE address = NEW.user_address;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users 
    SET post_count = GREATEST(post_count - 1, 0) 
    WHERE address = OLD.user_address;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_post_count_insert ON posts;
CREATE TRIGGER trigger_update_user_post_count_insert
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_post_count();

DROP TRIGGER IF EXISTS trigger_update_user_post_count_delete ON posts;
CREATE TRIGGER trigger_update_user_post_count_delete
  AFTER DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_post_count();

-- 8. 创建函数：自动授予前2000名用户mint资格
CREATE OR REPLACE FUNCTION grant_mint_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  eligible_count INTEGER;
BEGIN
  -- 检查当前有多少用户已获得资格
  SELECT COUNT(*) INTO eligible_count
  FROM users
  WHERE is_eligible_for_mint = true;
  
  -- 如果还未达到2000人限制，且该用户是第一次发帖，则授予资格
  IF eligible_count < 2000 AND NEW.post_count = 1 THEN
    UPDATE users
    SET is_eligible_for_mint = true
    WHERE address = NEW.address 
      AND is_eligible_for_mint = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_grant_mint_eligibility ON users;
CREATE TRIGGER trigger_grant_mint_eligibility
  AFTER UPDATE OF post_count ON users
  FOR EACH ROW
  WHEN (NEW.post_count > OLD.post_count)
  EXECUTE FUNCTION grant_mint_eligibility();

-- 9. 创建视图：当前周排名
CREATE OR REPLACE VIEW current_week_rankings AS
SELECT 
  u.address,
  COUNT(l.id) as total_likes,
  RANK() OVER (ORDER BY COUNT(l.id) DESC) as rank
FROM users u
LEFT JOIN posts p ON p.user_address = u.address
LEFT JOIN likes l ON l.post_id = p.id
WHERE l.created_at >= date_trunc('week', CURRENT_DATE)
  AND l.created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY u.address
ORDER BY total_likes DESC
LIMIT 10;

-- 10. 创建函数：获取用户每周获赞数
CREATE OR REPLACE FUNCTION get_user_weekly_likes(
  user_addr TEXT,
  week_start_date DATE
) RETURNS INTEGER AS $$
DECLARE
  like_count INTEGER;
BEGIN
  SELECT COUNT(l.id) INTO like_count
  FROM posts p
  JOIN likes l ON l.post_id = p.id
  WHERE p.user_address = user_addr
    AND l.created_at >= week_start_date
    AND l.created_at < week_start_date + INTERVAL '7 days';
  
  RETURN COALESCE(like_count, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 迁移完成！
-- 现在可以在 Table Editor 中查看新创建的表
-- ============================================
