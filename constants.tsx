
export const COLORS = {
  primary: '#6366f1',
  secondary: '#a855f7',
  accent: '#f43f5e',
  success: '#10b981',
  warning: '#f59e0b',
};

// 经济模型配置
export const ECONOMY_CONFIG = {
  INITIAL_TOKENS: 20,           // 连接钱包初始代币
  POST_REWARD_BASE: 10,          // 基础发帖奖励
  POST_REWARD_REDUCED: 3,        // 超限后的发帖奖励
  DAILY_POST_LIMIT: 3,           // 每日高额奖励发帖数量
  DAILY_LIKE_EARN_LIMIT: 50,     // 每日从点赞最多获得代币
  LIKE_COST: 1,                  // 点赞花费
  PLATFORM_FEE: 0.1,             // 平台手续费 10%
  FEATURED_REWARD: 100,          // 精选奖励
};

export const CATEGORY_COLORS: Record<string, string> = {
  'AI Tips & Tricks': 'bg-blue-900/30 text-blue-400 border border-blue-800',
  'Life Change Story': 'bg-purple-900/30 text-purple-400 border border-purple-800',
  'Prompt Engineering': 'bg-emerald-900/30 text-emerald-400 border border-emerald-800',
  'New Tool Review': 'bg-orange-900/30 text-orange-400 border border-orange-800',
};

export const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getAvatarUrl = (address: string) => {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
};

// 辅助函数：获取今天的日期字符串
export const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

// 计算点赞收益
export const calculateLikeReward = (likeCost: number, platformFee: number) => {
  return likeCost * (1 - platformFee);
};
