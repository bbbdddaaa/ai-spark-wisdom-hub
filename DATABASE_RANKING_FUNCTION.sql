-- 创建获取当前周排名的RPC函数
-- 这个函数用于WeeklyRankingPanel组件

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS get_current_week_ranking();

-- 创建新函数
CREATE OR REPLACE FUNCTION get_current_week_ranking()
RETURNS TABLE (
  address TEXT,
  likes_count BIGINT,
  reward_amount NUMERIC,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_likes AS (
    -- 统计每个用户发布的帖子获得的点赞数
    SELECT 
      p.author_address,
      COUNT(l.id) as total_likes
    FROM posts p
    LEFT JOIN likes l ON p.id = l.post_id
    WHERE p.created_at >= date_trunc('week', NOW())  -- 本周的帖子
    GROUP BY p.author_address
  ),
  ranked_users AS (
    -- 按点赞数排名
    SELECT 
      ul.author_address,
      ul.total_likes,
      ROW_NUMBER() OVER (ORDER BY ul.total_likes DESC) as user_rank
    FROM user_likes ul
    WHERE ul.total_likes > 0
    ORDER BY ul.total_likes DESC
    LIMIT 10  -- 只取前10名
  )
  SELECT 
    ru.author_address::TEXT as address,
    ru.total_likes as likes_count,
    -- 计算奖励金额：第1名10000，第10名2000，线性递减
    CASE 
      WHEN ru.user_rank <= 10 THEN 
        (10000 - (ru.user_rank - 1) * 889)::NUMERIC
      ELSE 
        0::NUMERIC
    END as reward_amount,
    ru.user_rank::INTEGER as rank
  FROM ranked_users ru
  ORDER BY ru.user_rank;
END;
$$ LANGUAGE plpgsql;

-- 添加函数注释
COMMENT ON FUNCTION get_current_week_ranking() IS '获取当前周的点赞排名前10名用户';
