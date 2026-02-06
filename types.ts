
export enum PostCategory {
  SHARE = 'AI Share'
}

export interface User {
  address: string | null;
  tokens: number;
  isConnected: boolean;
  dailyPostCount: number; // 今日发布数量
  dailyLikeCount: number; // 今日点赞数量
  lastResetDate: string; // 上次重置日期
}

export interface Post {
  id: string;
  userAddress: string;
  title: string;
  content: string;
  timestamp: number;
  likes: number;
  tags: string[];
  likedBy: string[]; // 记录哪些地址点赞过
  aiScore?: {
    relevance: number;
    quality: number;
    value: number;
    total: number;
    details: string;
  };
  category?: string;
  secondaryCategory?: string;
  scoredAt?: number;
}

export interface TokenTransaction {
  id: string;
  amount: number;
  reason: string;
  timestamp: number;
}
