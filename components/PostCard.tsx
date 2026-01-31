
import React from 'react';
import { Post } from '../types';
import { truncateAddress, getAvatarUrl } from '../constants';
import { Heart, Share2 } from 'lucide-react';

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike }) => {
  return (
    <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl shadow-black/20 border border-slate-800 hover:border-indigo-500/50 transition-all group">
      <div className="flex items-center space-x-3 mb-4">
        <img src={getAvatarUrl(post.userAddress)} className="w-8 h-8 rounded-xl border border-slate-800" />
        <span className="text-[11px] font-mono font-bold text-slate-500">{truncateAddress(post.userAddress)}</span>
        <span className="text-[10px] text-slate-700">•</span>
        <span className="text-[10px] font-medium text-slate-500">{new Date(post.timestamp).toLocaleDateString()}</span>
      </div>

      <h3 className="text-xl font-black text-slate-50 mb-2 group-hover:text-indigo-400 transition-colors">{post.title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-4">{post.content}</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {post.tags.map(tag => (
          <span key={tag} className="text-[10px] font-bold text-indigo-400 bg-indigo-900/30 px-3 py-1 rounded-lg border border-indigo-800/50">#{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button 
          onClick={() => onLike(post.id)}
          className="flex items-center space-x-2 text-slate-500 hover:text-rose-400 transition-colors"
        >
          <Heart size={18} className={post.likes > 50 ? 'fill-rose-500 text-rose-500' : ''} />
          <span className="text-xs font-black">{post.likes}</span>
        </button>
        <button className="text-slate-600 hover:text-slate-300 transition-colors">
          <Share2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default PostCard;
