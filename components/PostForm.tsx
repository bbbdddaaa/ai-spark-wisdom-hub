
import React, { useState, useEffect } from 'react';
import { analyzePost } from '../services/geminiService';
import { Sparkles, Send, X, AlertCircle, Loader2, Shield, CheckCircle } from 'lucide-react';
import { 
  validatePostData, 
  submissionThrottle, 
  getSecurityConfig,
  type ValidationResult 
} from '../lib/security';
import { ScoringResult } from '../services/agentScoringService';
import { CategorizationResult } from '../services/postCategorizationService';
import { ScoringResultCard } from './ScoringResultCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';

interface PostFormProps {
  onSubmit: (data: { 
    title: string; 
    content: string; 
    tags: string[];
    scoringResult?: ScoringResult;
    categorizationResult?: CategorizationResult;
  }) => void;
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
  const [isScoring, setIsScoring] = useState(false);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [categorizationResult, setCategorizationResult] = useState<CategorizationResult | null>(null);
  const [showScoringResult, setShowScoringResult] = useState(false);
  
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

  const handleSubmit = async () => {
    if (!submissionThrottle.canSubmit()) {
      const remaining = submissionThrottle.getRemainingCooldown();
      setValidationErrors([`Please wait ${remaining} seconds before submitting again`]);
      return;
    }
    
    const validation = validatePostData(title, content, tags);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setShowSecurityCheck(true);
      return;
    }
    
    // Start AI scoring process
    setIsScoring(true);
    setValidationErrors([]);
    
    try {
      // Call backend API for scoring and categorization in parallel
      const [scoringResponse, categorizationResponse] = await Promise.all([
        fetch(`${API_URL}/api/score-post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: validation.sanitizedData!.title,
            content: validation.sanitizedData!.content
          })
        }),
        fetch(`${API_URL}/api/categorize-post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: validation.sanitizedData!.title,
            content: validation.sanitizedData!.content
          })
        })
      ]);
      
      const scoringData = await scoringResponse.json();
      const categorizationData = await categorizationResponse.json();
      
      if (!scoringData.success || !categorizationData.success) {
        throw new Error('AI service returned an error');
      }
      
      setScoringResult(scoringData.data);
      setCategorizationResult(categorizationData.data);
      setShowScoringResult(true);
      
      // If scoring passes, can submit directly, or wait for user confirmation
      // Here we let user confirm before submitting
    } catch (error) {
      console.error('Scoring failed:', error);
      setValidationErrors(['AI scoring service is temporarily unavailable, please try again later']);
    } finally {
      setIsScoring(false);
    }
  };
  
  const handleConfirmPublish = () => {
    if (!scoringResult || !scoringResult.isPassing) {
      setValidationErrors(['Scoring did not pass, cannot publish']);
      return;
    }
    
    submissionThrottle.recordSubmit();
    
    const validation = validatePostData(title, content, tags);
    // 传入评分结果，避免后端重复评分
    onSubmit({
      ...validation.sanitizedData!,
      scoringResult,
      categorizationResult: categorizationResult || undefined
    });
  };
  
  const handleCancelScoring = () => {
    setShowScoringResult(false);
    setScoringResult(null);
    setCategorizationResult(null);
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
          {/* Scoring result display */}
          {showScoringResult && scoringResult && categorizationResult && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <ScoringResultCard
                scoring={scoringResult}
                categorization={categorizationResult}
                onConfirm={scoringResult.isPassing ? handleConfirmPublish : undefined}
                onCancel={handleCancelScoring}
                isPublishing={loading}
              />
            </div>
          )}
          
          {/* Loading state during scoring */}
          {isScoring && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 animate-pulse">
              <div className="flex items-center justify-center space-x-3">
                <Loader2 className="animate-spin text-purple-600" size={24} />
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-900">AI Scoring...</p>
                  <p className="text-sm text-purple-600 mt-1">Analyzing post quality and categorization</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Hide form if scoring result is already displayed */}
          {!showScoringResult && (
            <>
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
          </>
          )}
        </div>

        {!showScoringResult && (
        <div className="p-8 border-t border-slate-50 bg-slate-50/50">
          <button 
            onClick={handleSubmit}
            disabled={loading || isScoring || !title || !content || validationErrors.some(e => e.includes('cannot be empty') || e.includes('at least'))}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Publishing...</span>
              </>
            ) : isScoring ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>AI Scoring...</span>
              </>
            ) : validationErrors.length === 0 && title && content ? (
              <>
                <CheckCircle size={18} />
                <span>AI Score & Publish</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>AI Score & Publish</span>
              </>
            )}
          </button>
        </div>
        )}
      </div>
    </div>
  );
};

export default PostForm;
