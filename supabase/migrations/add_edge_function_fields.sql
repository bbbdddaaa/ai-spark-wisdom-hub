-- 为 Edge Functions 添加必要的数据库字段和表

-- 1. 为 posts 表添加 mint 资格字段
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS mint_eligibility_granted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mint_eligibility_granted_at TIMESTAMPTZ;

-- 添加索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_posts_mint_eligibility 
ON posts(mint_eligibility_granted, ai_score) 
WHERE mint_eligibility_granted = FALSE AND ai_score >= 60;

-- 2. 创建周排名奖励表
CREATE TABLE IF NOT EXISTS weekly_rewards (
  id BIGSERIAL PRIMARY KEY,
  week_id BIGINT NOT NULL,
  user_wallet TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10),
  amount TEXT NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, user_wallet)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_weekly_rewards_week_user 
ON weekly_rewards(week_id, user_wallet);

CREATE INDEX IF NOT EXISTS idx_weekly_rewards_claimed 
ON weekly_rewards(claimed) 
WHERE claimed = FALSE;

-- 3. 创建排名查询函数
CREATE OR REPLACE FUNCTION get_weekly_ranking(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  user_wallet TEXT,
  likes_count BIGINT,
  posts_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_wallet,
    COUNT(DISTINCT l.id) as likes_count,
    COUNT(DISTINCT p.id) as posts_count
  FROM posts p
  LEFT JOIN likes l ON l.post_id = p.id
  WHERE p.created_at >= start_date 
    AND p.created_at <= end_date
    AND p.user_wallet IS NOT NULL
  GROUP BY p.user_wallet
  ORDER BY likes_count DESC, posts_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weekly_rewards_updated_at
BEFORE UPDATE ON weekly_rewards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. 添加评论（方便理解）
COMMENT ON TABLE weekly_rewards IS '周排名奖励记录表';
COMMENT ON COLUMN weekly_rewards.week_id IS '周ID（时间戳/7天）';
COMMENT ON COLUMN weekly_rewards.user_wallet IS '用户钱包地址';
COMMENT ON COLUMN weekly_rewards.rank IS '排名（1-10）';
COMMENT ON COLUMN weekly_rewards.amount IS '奖励金额（SPARK，wei 单位）';
COMMENT ON COLUMN weekly_rewards.claimed IS '是否已领取';
COMMENT ON COLUMN weekly_rewards.transaction_hash IS '区块链交易哈希';

COMMENT ON COLUMN posts.mint_eligibility_granted IS '是否已授予 mint 资格';
COMMENT ON COLUMN posts.mint_eligibility_granted_at IS '授予资格时间';

-- 6. 创建视图：待授予资格的用户
CREATE OR REPLACE VIEW pending_mint_eligibility AS
SELECT DISTINCT
  user_wallet,
  MAX(ai_score) as max_score,
  COUNT(*) as qualified_posts_count,
  MAX(created_at) as latest_post_at
FROM posts
WHERE ai_score >= 60 
  AND mint_eligibility_granted = FALSE
  AND user_wallet IS NOT NULL
GROUP BY user_wallet
ORDER BY max_score DESC, latest_post_at DESC;

COMMENT ON VIEW pending_mint_eligibility IS '待授予 mint 资格的用户列表';
