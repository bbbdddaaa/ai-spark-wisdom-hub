import React from 'react';
import { ScoringResult } from '../services/agentScoringService';
import { CategorizationResult, getCategoryColor, getCategoryIcon } from '../services/postCategorizationService';
import { Loader2 } from 'lucide-react';

interface ScoringResultCardProps {
  scoring: ScoringResult;
  categorization: CategorizationResult;
  onConfirm?: () => void;
  onCancel?: () => void;
  isPublishing?: boolean;
}

export const ScoringResultCard: React.FC<ScoringResultCardProps> = ({
  scoring,
  categorization,
  onConfirm,
  onCancel,
  isPublishing = false
}) => {
  const getScoreColor = (score: number, max: number): string => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return '#10b981'; // Green
    if (percentage >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getStarRating = (score: number, max: number): string => {
    const percentage = (score / max) * 100;
    if (percentage >= 90) return '⭐⭐⭐⭐⭐';
    if (percentage >= 75) return '⭐⭐⭐⭐';
    if (percentage >= 60) return '⭐⭐⭐';
    if (percentage >= 40) return '⭐⭐';
    return '⭐';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-200">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">AI Scoring Result</h3>
        {scoring?.isPassing ? (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
            ✅ Passed
          </span>
        ) : (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
            ❌ Failed
          </span>
        )}
      </div>

      {/* Total Score */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold text-gray-700">Total Score</span>
          <span 
            className="text-3xl font-bold"
            style={{ color: getScoreColor(scoring.total, 100) }}
          >
            {scoring.total}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="h-3 rounded-full transition-all duration-500"
            style={{ 
              width: `${scoring.total}%`,
              backgroundColor: getScoreColor(scoring.total, 100)
            }}
          />
        </div>
        {!scoring.isPassing && (
          <p className="text-sm text-red-600 mt-2">
            Minimum requirement: 60 points
          </p>
        )}
      </div>

      {/* Dimension Scores */}
      <div className="space-y-4 mb-6">
        {/* AI Relevance */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">AI Relevance</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{getStarRating(scoring.relevance, 35)}</span>
                <span 
                  className="font-semibold"
                  style={{ color: getScoreColor(scoring.relevance, 35) }}
                >
                  {scoring.relevance}/35
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(scoring.relevance / 35) * 100}%`,
                  backgroundColor: getScoreColor(scoring.relevance, 35)
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Quality */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Content Quality</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{getStarRating(scoring.quality, 35)}</span>
                <span 
                  className="font-semibold"
                  style={{ color: getScoreColor(scoring.quality, 35) }}
                >
                  {scoring.quality}/35
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(scoring.quality / 35) * 100}%`,
                  backgroundColor: getScoreColor(scoring.quality, 35)
                }}
              />
            </div>
          </div>
        </div>

        {/* Educational Value */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Educational Value</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{getStarRating(scoring.value, 30)}</span>
                <span 
                  className="font-semibold"
                  style={{ color: getScoreColor(scoring.value, 30) }}
                >
                  {scoring.value}/30
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(scoring.value / 30) * 100}%`,
                  backgroundColor: getScoreColor(scoring.value, 30)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Details */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Scoring Details</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{scoring.details}</p>
      </div>

      {/* AI Auto Categorization */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">AI Auto Categorization</h4>
        <div className="flex flex-wrap gap-2">
          <div 
            className="px-3 py-1.5 rounded-full text-white text-sm font-medium flex items-center gap-1"
            style={{ backgroundColor: getCategoryColor(categorization.primary) }}
          >
            <span>{getCategoryIcon(categorization.primary)}</span>
            <span>{categorization.primary}</span>
            <span className="text-xs opacity-75">(Primary)</span>
          </div>
          {categorization.secondary && (
            <div 
              className="px-3 py-1.5 rounded-full text-white text-sm font-medium flex items-center gap-1"
              style={{ backgroundColor: getCategoryColor(categorization.secondary) }}
            >
              <span>{getCategoryIcon(categorization.secondary)}</span>
              <span>{categorization.secondary}</span>
              <span className="text-xs opacity-75">(Secondary)</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Classification confidence: {categorization.confidence}%
        </p>
        <p className="text-xs text-gray-600 mt-1">
          {categorization.reasoning}
        </p>
      </div>

      {/* Action Buttons */}
      {(onConfirm || onCancel) && (
        <div className="flex gap-3">
          {onCancel && !isPublishing && (
            <button
              onClick={onCancel}
              disabled={isPublishing}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Edit Content
            </button>
          )}
          {onConfirm && scoring.isPassing && (
            <button
              onClick={onConfirm}
              disabled={isPublishing}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Confirm Publish</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
