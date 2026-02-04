
import React, { useState, useEffect } from 'react';
import { analyzePost } from '../services/geminiService';
import { Sparkles, Send, X, AlertCircle, Loader2, Shield, CheckCircle } from 'lucide-react';
import { 
  validatePostData, 
  submissionThrottle, 
  getSecurityConfig,
  type ValidationResult 
} from '../lib/security';

interface PostFormProps {
  onSubmit: (data: { title: string; content: string; tags: string[] }) => void;
  onClose: () => void;
  loading?: boolean;
}

const PostForm: React.FC<PostFormProps> = ({ onSubmit, onClose, loading = false }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSecurityCheck, setShowSecurityCheck] = useState(false);
  
  const securityConfig = getSecurityConfig();

  useEffect(() => {
    if (title || content) {
      const validation = validatePostData(title, content, tags);
      setValidationErrors(validation.errors);
    } else {
      setValidationErrors([]);
    }
  }, [title, content, tags]);

  const handleAIAnalyze = async () => {
    if (!content || !title) return;
    
    const validation = validatePostData(title, content, tags);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const result = await analyzePost(
        validation.sanitizedData!.title, 
        validation.sanitizedData!.content
      );
      setTags(result.tags);
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = () => {
    if (!submissionThrottle.canSubmit()) {
      const remaining = submissionThrottle.getRemainingCooldown();
      setValidationErrors([`Please wait ${remaining} seconds before submitting`]);
      return;
    }
    
    const validation = validatePostData(title, content, tags);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setShowSecurityCheck(true);
      return;
    }
    
    submissionThrottle.recordSubmit();
    
    onSubmit(validation.sanitizedData!);
  };

  const titleLength = title.length;
  const contentLength = content.length;
  const isTitleValid = titleLength >= securityConfig.MIN_TITLE_LENGTH && titleLength <= securityConfig.MAX_TITLE_LENGTH;
  const isContentValid = contentLength >= securityConfig.MIN_CONTENT_LENGTH && contentLength <= securityConfig.MAX_CONTENT_LENGTH;
  
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white w-full md:max-w-xl h-[85vh] md:h-auto md:max-h-[80vh] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between px-8 h-16 border-b border-slate-50 bg-white sticky top-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Share your AI discovery</h2>
            {showSecurityCheck && (
              <div className="flex items-center space-x-1 bg-emerald-50 px-2 py-1 rounded-lg">
                <Shield size={12} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-600">Security check</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 no-scrollbar">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Title</label>
              <span className={`text-xs font-mono ${
                titleLength > securityConfig.MAX_TITLE_LENGTH ? 'text-rose-500' : 
                isTitleValid ? 'text-emerald-500' : 'text-slate-400'
              }`}>
                {titleLength} / {securityConfig.MAX_TITLE_LENGTH}
              </span>
            </div>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
              maxLength={securityConfig.MAX_TITLE_LENGTH}
              className="w-full text-2xl font-black placeholder:text-slate-200 focus:outline-none border-b-2 border-transparent focus:border-indigo-100 transition-colors pb-2"
            />
          </div>
          
          <button
            type="button"
            onClick={handleAIAnalyze}
            disabled={isAnalyzing || !title || !content}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase border border-indigo-100 hover:bg-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            <span>{isAnalyzing ? 'Analyzing...' : 'AI tags'}</span>
          </button>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Content</label>
              <span className={`text-xs font-mono ${
                contentLength > securityConfig.MAX_CONTENT_LENGTH ? 'text-rose-500' : 
                isContentValid ? 'text-emerald-500' : 'text-slate-400'
              }`}>
                {contentLength} / {securityConfig.MAX_CONTENT_LENGTH}
              </span>
            </div>
            <textarea 
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="How did it change you? Or any interesting tips?"
              maxLength={securityConfig.MAX_CONTENT_LENGTH}
              className="w-full text-base text-slate-600 placeholder:text-slate-300 focus:outline-none bg-transparent resize-none leading-relaxed min-h-[250px] border-2 border-transparent focus:border-indigo-50 rounded-xl p-4 transition-colors"
            />
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
              {tags.map((tag, idx) => (
                <span key={idx} className="bg-slate-50 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-bold">#{tag}</span>
              ))}
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle size={16} className="text-rose-500" />
                <span className="text-xs font-black text-rose-600 uppercase tracking-widest">Fix required</span>
              </div>
              {validationErrors.map((error, idx) => (
                <p key={idx} className="text-sm text-rose-600 flex items-start space-x-2">
                  <span className="text-rose-400">•</span>
                  <span>{error}</span>
                </p>
              ))}
            </div>
          )}

          <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <Shield size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-indigo-600/80 leading-relaxed">
                <span className="font-black">Security enabled:</span>
                Your input is filtered for scripts, SQL injection, and other unsafe content.
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 bg-slate-50/50">
          <button 
            onClick={handleSubmit}
            disabled={loading || !title || !content || validationErrors.some(e => e.includes('cannot be empty') || e.includes('at least'))}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Publishing...</span>
              </>
            ) : validationErrors.length === 0 && title && content ? (
              <>
                <CheckCircle size={18} />
                <span>Publish & earn 10 Spark</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Publish & earn 10 Spark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostForm;
