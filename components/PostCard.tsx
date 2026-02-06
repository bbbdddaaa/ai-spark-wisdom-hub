
import React from 'react';
import { Post } from '../types';
import { truncateAddress, getAvatarUrl } from '../constants';
import { Heart, Share2, Star } from 'lucide-react';
import { getCategoryColor, getCategoryIcon, PostCategory } from '../services/postCategorizationService';

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
  onClick?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onClick }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 85) return '#10b981'; // Green
    if (score >= 70) return '#f59e0b'; // Orange
    return '#6b7280'; // Gray
  };

  return (
    <div 
      className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-slate-50 hover:border-indigo-100 hover:shadow-lg transition-all cursor-pointer"
      onClick={() => onClick?.(post)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img src={getAvatarUrl(post.userAddress)} className="w-8 h-8 rounded-xl" />
          <span className="text-[11px] font-mono font-bold text-slate-400">{truncateAddress(post.userAddress)}</span>
          <span className="text-[10px] text-slate-300">•</span>
          <span className="text-[10px] font-medium text-slate-300">{new Date(post.timestamp).toLocaleDateString()}</span>
        </div>
        
        {/* AI Score Badge */}
        {post.aiScore && (
          <div 
            className="flex items-center space-x-1 px-2 py-1 rounded-lg"
            style={{ backgroundColor: `${getScoreColor(post.aiScore.total)}20` }}
          >
            <Star 
              size={12} 
              className="fill-current"
              style={{ color: getScoreColor(post.aiScore.total) }}
            />
            <span 
              className="text-xs font-bold"
              style={{ color: getScoreColor(post.aiScore.total) }}
            >
              {post.aiScore.total}
            </span>
          </div>
        )}
      </div>

      {/* Category tags */}
      {(post.category || post.secondaryCategory) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {post.category && (
            <span 
              className="text-[10px] font-bold px-2 py-1 rounded-lg text-white"
              style={{ backgroundColor: getCategoryColor(post.category as PostCategory) }}
            >
              {getCategoryIcon(post.category as PostCategory)} {post.category}
            </span>
          )}
          {post.secondaryCategory && (
            <span 
              className="text-[10px] font-bold px-2 py-1 rounded-lg text-white opacity-75"
              style={{ backgroundColor: getCategoryColor(post.secondaryCategory as PostCategory) }}
            >
              {getCategoryIcon(post.secondaryCategory as PostCategory)} {post.secondaryCategory}
            </span>
          )}
        </div>
      )}

      <h3 className="text-xl font-black text-slate-900 mb-2">{post.title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-4">{post.content}</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {post.tags.map(tag => (
          <span key={tag} className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg">#{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onLike(post.id);
          }}
          className="flex items-center space-x-2 text-slate-400 hover:text-rose-500 transition-colors"
        >
          <Heart size={18} className={post.likes > 0 ? 'fill-rose-500 text-rose-500' : ''} />
          <span className="text-xs font-black">{post.likes}</span>
        </button>
        <button 
          onClick={(e) => e.stopPropagation()}
          className="text-slate-300 hover:text-slate-600 transition-colors"
        >
          <Share2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default PostCard;
