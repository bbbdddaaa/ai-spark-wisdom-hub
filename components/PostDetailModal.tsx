import React from 'react';
import { Post } from '../types';
import { truncateAddress, getAvatarUrl } from '../constants';
import { X, Heart, Share2, Star, Calendar, User } from 'lucide-react';
import { getCategoryColor, getCategoryIcon, PostCategory } from '../services/postCategorizationService';

interface PostDetailModalProps {
  post: Post;
  onClose: () => void;
  onLike: (id: string) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, onClose, onLike }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#f59e0b';
    return '#6b7280';
  };

  const getScoreLevel = (score: number): string => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Pass';
    return 'Fail';
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Detail card */}
      <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <img src={getAvatarUrl(post.userAddress)} className="w-10 h-10 rounded-xl" alt="avatar" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700">{truncateAddress(post.userAddress)}</span>
                  {post.aiScore && (
                    <div 
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
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
                        {post.aiScore.total} pts · {getScoreLevel(post.aiScore.total)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  <Calendar size={12} />
                  <span>{new Date(post.timestamp).toLocaleString('zh-CN')}</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Category tags */}
          {(post.category || post.secondaryCategory) && (
            <div className="flex flex-wrap gap-2">
              {post.category && (
                <span 
                  className="text-sm font-bold px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: getCategoryColor(post.category as PostCategory) }}
                >
                  {getCategoryIcon(post.category as PostCategory)} {post.category}
                </span>
              )}
              {post.secondaryCategory && (
                <span 
                  className="text-sm font-bold px-3 py-1.5 rounded-lg text-white opacity-80"
                  style={{ backgroundColor: getCategoryColor(post.secondaryCategory as PostCategory) }}
                >
                  {getCategoryIcon(post.secondaryCategory as PostCategory)} {post.secondaryCategory}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h2 className="text-3xl font-black text-slate-900 leading-tight">
            {post.title}
          </h2>

          {/* Content */}
          <div className="prose prose-slate max-w-none">
            <p className="text-base text-slate-600 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
              {post.tags.map((tag, idx) => (
                <span 
                  key={idx} 
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* AI Scoring Details */}
          {post.aiScore && (
            <div className="p-5 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-100">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Star className="text-purple-600" size={16} />
                AI Scoring Details
              </h3>
              
              {/* Score bars */}
              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">AI Relevance</span>
                    <span className="font-bold" style={{ color: getScoreColor(post.aiScore.total) }}>
                      {post.aiScore.relevance}/35
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(post.aiScore.relevance / 35) * 100}%`,
                        backgroundColor: getScoreColor(post.aiScore.total)
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">Content Quality</span>
                    <span className="font-bold" style={{ color: getScoreColor(post.aiScore.total) }}>
                      {post.aiScore.quality}/35
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(post.aiScore.quality / 35) * 100}%`,
                        backgroundColor: getScoreColor(post.aiScore.total)
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">Educational Value</span>
                    <span className="font-bold" style={{ color: getScoreColor(post.aiScore.total) }}>
                      {post.aiScore.value}/30
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(post.aiScore.value / 30) * 100}%`,
                        backgroundColor: getScoreColor(post.aiScore.total)
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Scoring details description */}
              <div className="p-3 bg-white/60 rounded-lg">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {post.aiScore.details}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => onLike(post.id)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            >
              <Heart size={20} className={post.likes > 0 ? 'fill-rose-500 text-rose-500' : ''} />
              <span className="text-sm font-bold">{post.likes} Likes</span>
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
              <Share2 size={20} />
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
