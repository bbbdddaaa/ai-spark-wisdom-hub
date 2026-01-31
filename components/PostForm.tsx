
import React, { useState } from 'react';
import { analyzePost } from '../services/geminiService';
import { Sparkles, Send, X, AlertCircle, Loader2 } from 'lucide-react';

interface PostFormProps {
  onSubmit: (data: { title: string; content: string; tags: string[] }) => void;
  onClose: () => void;
}

const PostForm: React.FC<PostFormProps> = ({ onSubmit, onClose }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAIAnalyze = async () => {
    if (!content || !title) return;
    setIsAnalyzing(true);
    const result = await analyzePost(title, content);
    setTags(result.tags);
    setIsAnalyzing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-slate-900 w-full md:max-w-xl h-[85vh] md:h-auto md:max-h-[80vh] md:rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-500 text-slate-200">
        <div className="flex items-center justify-between px-8 h-16 border-b border-slate-800 bg-slate-900 sticky top-0">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">分享你的 AI 发现</h2>
          <button onClick={onClose} className="p-2 text-slate-600 hover:text-slate-300 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 no-scrollbar">
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入标题..."
            className="w-full text-2xl font-black placeholder:text-slate-700 focus:outline-none bg-transparent text-slate-50"
          />
          
          <button
            type="button"
            onClick={handleAIAnalyze}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-900/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase border border-indigo-800 hover:bg-indigo-800 transition-all"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            <span>{isAnalyzing ? '智能润色中...' : 'AI 智能标签'}</span>
          </button>

          <textarea 
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="它是如何改变你的？或者有什么有趣的玩法？"
            className="w-full text-base text-slate-400 placeholder:text-slate-700 focus:outline-none bg-transparent resize-none leading-relaxed min-h-[250px]"
          />

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800">
              {tags.map((tag, idx) => (
                <span key={idx} className="bg-slate-800 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-700">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-800 bg-slate-800/50">
          <button 
            onClick={() => onSubmit({ title, content, tags })}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-lg hover:bg-indigo-500 transition-all"
          >
            <Send size={18} />
            <span>发布并领取 10 Spark</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostForm;
