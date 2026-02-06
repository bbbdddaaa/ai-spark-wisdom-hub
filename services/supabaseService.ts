import { supabase as supabaseClient, DbUser, DbPost, DbLike, DbTransaction } from '../lib/supabaseClient';
import { Post, User, TokenTransaction } from '../types';
import { ECONOMY_CONFIG, getTodayString } from '../constants';
import { validatePostData } from '../lib/security';
import { scorePost } from './agentScoringService';
import { categorizePost } from './postCategorizationService';

// 导出supabase实例供直接使用
export const supabase = supabaseClient;

// 检查Supabase是否配置
const ensureSupabase = () => {
  if (!supabaseClient) {
    throw new Error('Supabase is not configured. Please set environment variables in Vercel: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  return supabaseClient;
};

// ==================== 用户相关操作 ====================

/**
 * 获取或创建用户
 */
export const getOrCreateUser = async (address: string): Promise<User> => {
  if (!supabaseClient) {
    // 模拟数据模式：返回默认用户
    return {
      address,
      tokens: 0,
      isConnected: true,
      dailyPostCount: 0,
      dailyLikeCount: 0,
      lastResetDate: getTodayString()
    };
  }
  
  // 先尝试获取用户
  const { data: existingUser, error: fetchError } = await supabaseClient
    .from('users')
    .select('*')
    .eq('address', address)
    .single();

  if (existingUser) {
    // 检查是否需要重置每日计数
    const today = getTodayString();
    if (existingUser.last_reset_date !== today) {
      // 需要重置
      const { data: updatedUser, error: updateError } = await supabaseClient
        .from('users')
        .update({
          daily_post_count: 0,
          daily_like_count: 0,
          like_earned_today: 0,
          last_reset_date: today
        })
        .eq('address', address)
        .select()
        .single();

      if (updateError) {
        console.error('重置每日计数失败:', updateError);
        throw updateError;
      }

      return dbUserToUser(updatedUser);
    }

    return dbUserToUser(existingUser);
  }

  // 用户不存在，创建新用户
  const newUser: Partial<DbUser> = {
    address,
    tokens: 0, // 新经济模型：初始为0，需要通过mint获得代币
    daily_post_count: 0,
    daily_like_count: 0,
    like_earned_today: 0,
    last_reset_date: getTodayString()
  };

  const { data: createdUser, error: createError } = await supabaseClient
    .from('users')
    .insert(newUser)
    .select()
    .single();

  if (createError) {
    console.error('创建用户失败:', createError);
    throw createError;
  }

  // 新经济模型：不再给初始奖励，用户需要通过mint或每周排名获得代币

  return dbUserToUser(createdUser);
};

/**
 * 更新用户代币余额
 */
export const updateUserTokens = async (
  address: string,
  tokensChange: number,
  reason: string
): Promise<void> => {
  // 获取当前用户
  const { data: user, error: fetchError } = await supabaseClient
    .from('users')
    .select('tokens')
    .eq('address', address)
    .single();

  if (fetchError) {
    console.error('获取用户失败:', fetchError);
    throw fetchError;
  }

  // 更新代币余额
  const newTokens = user.tokens + tokensChange;
  const { error: updateError } = await supabaseClient
    .from('users')
    .update({ tokens: newTokens })
    .eq('address', address);

  if (updateError) {
    console.error('更新代币失败:', updateError);
    throw updateError;
  }

  // 记录交易
  await createTransaction(address, tokensChange, reason);
};

/**
 * 更新用户每日统计
 */
export const updateUserDailyStats = async (
  address: string,
  updates: Partial<Pick<DbUser, 'daily_post_count' | 'daily_like_count' | 'like_earned_today'>>
): Promise<void> => {
  const { error } = await supabaseClient
    .from('users')
    .update(updates)
    .eq('address', address);

  if (error) {
    console.error('更新每日统计失败:', error);
    throw error;
  }
};

// ==================== 帖子相关操作 ====================

/**
 * 获取所有帖子（优化版：一次性获取所有点赞数据）
 */
export const fetchPosts = async (): Promise<Post[]> => {
  if (!supabaseClient) {
    // 模拟数据模式：返回空数组
    return [];
  }
  
  const { data: posts, error } = await supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取帖子失败:', error);
    throw error;
  }

  // 优化：一次性获取所有帖子的点赞数据，避免N+1查询问题
  const postIds = posts.map(p => p.id);
  const { data: allLikes, error: likesError } = await supabaseClient
    .from('likes')
    .select('post_id, user_address')
    .in('post_id', postIds);
  
  if (likesError) {
    console.error('获取点赞数据失败:', likesError);
    // 如果获取点赞失败，仍然返回帖子数据，只是没有点赞信息
  }

  // 将点赞数据按 post_id 分组
  const likesByPostId: Record<string, string[]> = {};
  (allLikes || []).forEach(like => {
    if (!likesByPostId[like.post_id]) {
      likesByPostId[like.post_id] = [];
    }
    likesByPostId[like.post_id].push(like.user_address);
  });

  // 构建帖子列表（不再需要异步查询）
  const postsWithLikes = posts.map(post => {
    const likedBy = likesByPostId[post.id] || [];
    return dbPostToPost(post, likedBy);
  });

  return postsWithLikes;
};

/**
 * 创建新帖子（前端已评分，后端直接使用结果）
 */
export const createPost = async (
  userAddress: string,
  title: string,
  content: string,
  tags: string[],
  scoringResult?: { relevance: number; quality: number; value: number; total: number; details: string; isPassing: boolean },
  categorizationResult?: { primary: string; secondary: string | null }
): Promise<Post> => {
  // 1. 服务端安全验证（双重保护）
  const validation = validatePostData(title, content, tags);
  
  if (!validation.isValid) {
    console.error('Post validation failed:', validation.errors);
    throw new Error('Validation failed: ' + validation.errors.join(', '));
  }
  
  // Use sanitized data
  const sanitizedData = validation.sanitizedData!;
  
  // 2. 使用前端传来的评分结果，或者重新评分（兜底）
  let finalScoringResult = scoringResult;
  let finalCategorizationResult = categorizationResult;
  
  if (!finalScoringResult || !finalCategorizationResult) {
    console.log('⚠️ 前端未提供评分结果，后端重新评分');
    finalScoringResult = await scorePost(sanitizedData.title, sanitizedData.content);
    finalCategorizationResult = await categorizePost(sanitizedData.title, sanitizedData.content);
  }
  
  // 3. Check if scoring passes
  if (!finalScoringResult.isPassing) {
    throw new Error(`Post scoring did not meet requirements (${finalScoringResult.total}/100 points, minimum 60 points required).\nScoring details: ${finalScoringResult.details}`);
  }
  
  // 4. 存储帖子到数据库
  const { data: post, error } = await supabaseClient
    .from('posts')
    .insert({
      user_address: userAddress,
      title: sanitizedData.title,
      content: sanitizedData.content,
      tags: sanitizedData.tags,
      ai_score_relevance: finalScoringResult.relevance,
      ai_score_quality: finalScoringResult.quality,
      ai_score_value: finalScoringResult.value,
      ai_score_total: finalScoringResult.total,
      ai_score_details: finalScoringResult.details,
      category: finalCategorizationResult.primary,
      secondary_category: finalCategorizationResult.secondary,
      scored_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('创建帖子失败:', error);
    throw error;
  }

  // 5. 可选：记录评分日志
  await createScoringLog(post.id, userAddress, finalScoringResult, finalCategorizationResult);

  // 6. 发布成功后，查询用户帖子数并授予mint资格
  const { count: postCount, error: countError } = await supabaseClient
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_address', userAddress);
  
  if (!countError && postCount === 1) {
    // 第一篇帖子，调用后端API授予mint资格（异步执行，不阻塞返回）
    console.log(`🎉 用户 ${userAddress} 发布第一篇帖子，准备授予mint资格`);
    
    // 调用后端API
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    fetch(`${API_URL}/api/grant-eligibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address: userAddress }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          console.log(`✅ 成功授予mint资格: ${userAddress}`);
          if (result.txHash) {
            console.log(`   交易哈希: ${result.txHash}`);
          }
        } else {
          console.error(`❌ 授予mint资格失败: ${userAddress}`, result.error);
        }
      })
      .catch((error) => {
        console.error(`❌ 授予mint资格API调用失败: ${userAddress}`, error);
      });
  }

  return dbPostToPost(post, []);
};

/**
 * 获取帖子的点赞用户列表
 */
export const getPostLikedBy = async (postId: string): Promise<string[]> => {
  const { data: likes, error } = await supabaseClient
    .from('likes')
    .select('user_address')
    .eq('post_id', postId);

  if (error) {
    console.error('获取点赞列表失败:', error);
    return [];
  }

  return likes.map(like => like.user_address);
};

// ==================== 点赞相关操作 ====================

/**
 * 点赞帖子
 */
export const likePost = async (postId: string, userAddress: string): Promise<void> => {
  const { error } = await supabaseClient
    .from('likes')
    .insert({
      post_id: postId,
      user_address: userAddress
    });

  if (error) {
    console.error('点赞失败:', error);
    throw error;
  }
};

/**
 * 检查用户是否已点赞
 */
export const hasUserLiked = async (postId: string, userAddress: string): Promise<boolean> => {
  const { data, error } = await supabaseClient
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_address', userAddress)
    .single();

  return !!data && !error;
};

// ==================== 交易记录相关操作 ====================

/**
 * 创建交易记录
 */
export const createTransaction = async (
  userAddress: string,
  amount: number,
  reason: string
): Promise<void> => {
  const { error } = await supabaseClient
    .from('transactions')
    .insert({
      user_address: userAddress,
      amount,
      reason
    });

  if (error) {
    console.error('创建交易记录失败:', error);
    throw error;
  }
};

/**
 * 获取用户的交易记录
 */
export const fetchUserTransactions = async (userAddress: string): Promise<TokenTransaction[]> => {
  const { data: transactions, error } = await supabaseClient
    .from('transactions')
    .select('*')
    .eq('user_address', userAddress)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('获取交易记录失败:', error);
    throw error;
  }

  return transactions.map(dbTransactionToTransaction);
};

// ==================== 类型转换辅助函数 ====================

const dbUserToUser = (dbUser: DbUser): User => ({
  address: dbUser.address,
  tokens: Number(dbUser.tokens),
  isConnected: true,
  dailyPostCount: dbUser.daily_post_count,
  dailyLikeCount: dbUser.daily_like_count,
  lastResetDate: dbUser.last_reset_date
});

const dbPostToPost = (dbPost: DbPost, likedBy: string[]): Post => ({
  id: dbPost.id,
  userAddress: dbPost.user_address,
  title: dbPost.title,
  content: dbPost.content,
  timestamp: new Date(dbPost.created_at).getTime(),
  likes: dbPost.likes,
  tags: dbPost.tags || [],
  likedBy,
  aiScore: dbPost.ai_score_total ? {
    relevance: dbPost.ai_score_relevance || 0,
    quality: dbPost.ai_score_quality || 0,
    value: dbPost.ai_score_value || 0,
    total: dbPost.ai_score_total || 0,
    details: dbPost.ai_score_details || ''
  } : undefined,
  category: dbPost.category || undefined,
  secondaryCategory: dbPost.secondary_category || undefined,
  scoredAt: dbPost.scored_at ? new Date(dbPost.scored_at).getTime() : undefined
});

const dbTransactionToTransaction = (dbTx: DbTransaction): TokenTransaction => ({
  id: dbTx.id,
  amount: Number(dbTx.amount),
  reason: dbTx.reason,
  timestamp: new Date(dbTx.created_at).getTime()
});

/**
 * 创建评分日志
 */
const createScoringLog = async (
  postId: string,
  agentAddress: string,
  scoringResult: any,
  categorizationResult: any
): Promise<void> => {
  try {
    await supabaseClient
      .from('post_scoring_logs')
      .insert({
        post_id: postId,
        agent_address: agentAddress,
        score_relevance: scoringResult.relevance,
        score_quality: scoringResult.quality,
        score_value: scoringResult.value,
        score_total: scoringResult.total,
        category: categorizationResult.primary,
        secondary_category: categorizationResult.secondary
      });
  } catch (error) {
    // 评分日志失败不影响帖子发布
    console.warn('创建评分日志失败:', error);
  }
};

// ==================== 实时订阅 ====================

/**
 * 订阅帖子变化
 */
export const subscribeToPosts = (callback: (post: Post) => void) => {
  if (!supabaseClient) {
    // 返回一个空的订阅对象
    return { unsubscribe: () => {} };
  }
  
  return supabaseClient
    .channel('posts-channel')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'posts' },
      async (payload) => {
        const newPost = payload.new as DbPost;
        const likedBy = await getPostLikedBy(newPost.id);
        callback(dbPostToPost(newPost, likedBy));
      }
    )
    .subscribe();
};

/**
 * 订阅点赞变化
 */
export const subscribeToLikes = (callback: (like: { post_id: string; user_address: string }) => void) => {
  if (!supabaseClient) {
    // 返回一个空的订阅对象
    return { unsubscribe: () => {} };
  }
  
  return supabaseClient
    .channel('likes-channel')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'likes' },
      (payload) => {
        const like = payload.new as DbLike;
        callback({
          post_id: like.post_id,
          user_address: like.user_address
        });
      }
    )
    .subscribe();
};
