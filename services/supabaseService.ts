import { supabase as supabaseClient, DbUser, DbPost, DbLike, DbTransaction } from '../lib/supabaseClient';
import { Post, User, TokenTransaction } from '../types';
import { ECONOMY_CONFIG, getTodayString } from '../constants';
import { validatePostData } from '../lib/security';

// 导出supabase实例供直接使用
export const supabase = supabaseClient;

// ==================== 用户相关操作 ====================

/**
 * 获取或创建用户
 */
export const getOrCreateUser = async (address: string): Promise<User> => {
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
 * 获取所有帖子
 */
export const fetchPosts = async (): Promise<Post[]> => {
  const { data: posts, error } = await supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取帖子失败:', error);
    throw error;
  }

  // 获取每个帖子的点赞用户列表
  const postsWithLikes = await Promise.all(
    posts.map(async (post) => {
      const likedBy = await getPostLikedBy(post.id);
      return dbPostToPost(post, likedBy);
    })
  );

  return postsWithLikes;
};

/**
 * 创建新帖子（包含安全验证）
 */
export const createPost = async (
  userAddress: string,
  title: string,
  content: string,
  tags: string[]
): Promise<Post> => {
  // 服务端安全验证（双重保护）
  const validation = validatePostData(title, content, tags);
  
  if (!validation.isValid) {
    console.error('帖子验证失败:', validation.errors);
    throw new Error('Validation failed: ' + validation.errors.join(', '));
  }
  
  // 使用清理后的数据
  const sanitizedData = validation.sanitizedData!;
  
  const { data: post, error } = await supabaseClient
    .from('posts')
    .insert({
      user_address: userAddress,
      title: sanitizedData.title,
      content: sanitizedData.content,
      tags: sanitizedData.tags
    })
    .select()
    .single();

  if (error) {
    console.error('创建帖子失败:', error);
    throw error;
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
  likedBy
});

const dbTransactionToTransaction = (dbTx: DbTransaction): TokenTransaction => ({
  id: dbTx.id,
  amount: Number(dbTx.amount),
  reason: dbTx.reason,
  timestamp: new Date(dbTx.created_at).getTime()
});

// ==================== 实时订阅 ====================

/**
 * 订阅帖子变化
 */
export const subscribeToPosts = (callback: (post: Post) => void) => {
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
export const subscribeToLikes = (callback: (like: DbLike) => void) => {
  return supabaseClient
    .channel('likes-channel')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'likes' },
      (payload) => {
        callback(payload.new as DbLike);
      }
    )
    .subscribe();
};
