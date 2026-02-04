
export const COLORS = {
  primary: '#6366f1',
  secondary: '#a855f7',
  accent: '#f43f5e',
  success: '#10b981',
  warning: '#f59e0b',
};

// Economy config (blockchain version)
export const ECONOMY_CONFIG = {
  INITIAL_TOKENS: 20,
  POST_REWARD_BASE: 10,
  POST_REWARD_REDUCED: 3,
  DAILY_POST_LIMIT: 3,
  DAILY_LIKE_EARN_LIMIT: 50,
  LIKE_COST: 1,
  PLATFORM_FEE: 0.1,
  FEATURED_REWARD: 100,
  
  MINT_COST_USDT: 10,
  MINT_REWARD_SPARK: 10000,
  MINT_ELIGIBLE_USERS: 2000,
  
  MEMBERSHIP_COST_USDT: 10,
  MEMBERSHIP_DURATION_DAYS: 30,
  
  WEEKLY_REWARD_RANK_1: 10000,
  WEEKLY_REWARD_RANK_10: 2000,
  WEEKLY_REWARD_DECREASE: 889,
  
  BUYBACK_THRESHOLD_USDT: 100,
  BUYBACK_SPLIT_RATIO: 1.0,
  
  POST_REWARD_ELIGIBLE_USERS: 2000,
};

export const CATEGORY_COLORS: Record<string, string> = {
  'AI Tips & Tricks': 'bg-blue-100 text-blue-700',
  'Life Change Story': 'bg-purple-100 text-purple-700',
  'Prompt Engineering': 'bg-emerald-100 text-emerald-700',
  'New Tool Review': 'bg-orange-100 text-orange-700',
};

export const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getAvatarUrl = (address: string) => {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
};

export const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export const calculateLikeReward = (likeCost: number, platformFee: number) => {
  return likeCost * (1 - platformFee);
};
