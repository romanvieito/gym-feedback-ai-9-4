'use client';

import React, { useState, useEffect } from 'react';
import StarRating from './StarRating';
import Tooltip from './Tooltip';

export default function PerformanceSummaryModal({ 
  isOpen, 
  onClose, 
  performanceData, 
  challengeName, 
  totalDuration,
  fitnessGoal,
  focusArea,
  onSaveProgress,
  onUpdateRating
}) {
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  // Generate AI summary when modal opens
  useEffect(() => {
    if (isOpen && performanceData.length > 0 && !aiSummary) {
      generateAISummary();
    }
  }, [isOpen, performanceData, aiSummary]);

  const generateAISummary = async () => {
    setIsLoadingSummary(true);
    try {
      const response = await fetch('/api/ai/workout-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          performanceHistory: performanceData,
          challengeName,
          totalDuration,
          fitnessGoal,
          focusArea
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
      } else {
        console.error('Failed to generate AI summary');
        setAiSummary('Great job completing the challenge! Keep up the excellent work!');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('Great job completing the challenge! Keep up the excellent work!');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  if (!isOpen) return null;

  // Calculate performance statistics
  const averagePerformance = performanceData.length > 0 
    ? performanceData.reduce((sum, p) => sum + p.percentage, 0) / performanceData.length 
    : 0;

  const performanceLevels = performanceData.reduce((acc, p) => {
    acc[p.performanceLevel] = (acc[p.performanceLevel] || 0) + 1;
    return acc;
  }, {});

  // Calculate percentages for each performance level
  const totalDataPoints = performanceData.length;
  const performanceLevelsWithPercentages = Object.entries(performanceLevels).map(([level, count]) => ({
    level,
    count,
    percentage: totalDataPoints > 0 ? Math.round((count / totalDataPoints) * 100) : 0
  }));

  const bestPerformance = performanceData.length > 0 
    ? Math.max(...performanceData.map(p => p.percentage))
    : 0;

  const worstPerformance = performanceData.length > 0 
    ? Math.min(...performanceData.map(p => p.percentage))
    : 0;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 85) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 55) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceEmoji = (level) => {
    switch (level) {
      case 'Excellent': return '🌟';
      case 'Good': return '👍';
      case 'Fair': return '👌';
      case 'Poor': return '💪';
      default: return '📊';
    }
  };

  // Calculate suggested star rating based on performance
  const getSuggestedRating = () => {
    if (averagePerformance >= 90) return 5;
    if (averagePerformance >= 80) return 4;
    if (averagePerformance >= 70) return 3;
    if (averagePerformance >= 60) return 2;
    return 1;
  };

  const handleRatingChange = (rating) => {
    setUserRating(rating);
    setHasRated(true);
    
    // Update the rating of the existing workout
    if (onUpdateRating) {
      onUpdateRating(challengeName, rating);
    }
    
    // Track rating in analytics
    if (typeof window !== 'undefined' && window.mixpanel) {
      window.mixpanel.track('Challenge Rated', {
        challengeName,
        userRating: rating,
        suggestedRating: getSuggestedRating(),
        averagePerformance: averagePerformance.toFixed(1),
        platform: 'web_app'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                🎉 Challenge Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {challengeName}
              </p>
            </div>
            <Tooltip content="Close performance summary">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overall Performance */}
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {averagePerformance.toFixed(1)}%
            </div>
            <div className={`text-lg font-semibold ${getPerformanceColor(averagePerformance)}`}>
              {averagePerformance >= 85 ? 'Excellent Work!' : 
               averagePerformance >= 70 ? 'Great Job!' : 
               averagePerformance >= 55 ? 'Good Effort!' : 'Keep Improving!'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Average Performance Score
            </div>
          </div>

          {/* Star Rating Section */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-center">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
                ⭐ Rate Your Performance
              </h4>
              
              <div className="flex flex-col items-center gap-3">
                <StarRating
                  rating={userRating || getSuggestedRating()}
                  onRatingChange={handleRatingChange}
                  interactive={true}
                  size="lg"
                />
                
                {!hasRated && (
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    Suggested: {getSuggestedRating()} stars based on your performance
                  </div>
                )}
                
                {hasRated && (
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    Thank you for rating! 🎉
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {bestPerformance.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Best Performance
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatTime(totalDuration)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Duration
              </div>
            </div>
          </div>

          {/* Performance Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Performance Breakdown
            </h3>
            <div className="space-y-2">
              {performanceLevelsWithPercentages
                .sort((a, b) => b.percentage - a.percentage) // Sort by percentage descending
                .map(({ level, count, percentage }) => (
                <div key={level} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getPerformanceEmoji(level)}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{level}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {percentage}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ({count} samples)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Improvement Areas */}
          {worstPerformance < 70 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                💡 Areas for Improvement
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Your lowest performance was {worstPerformance.toFixed(1)}%. 
                Focus on maintaining consistent form throughout the workout for better results!
              </p>
            </div>
          )}

          {/* AI-Generated Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                🤖 AI Coach Summary
              </h4>
              <Tooltip content={showSummary ? "Hide AI-generated workout summary" : "Show AI-generated workout summary"}>
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                >
                  {showSummary ? 'Hide' : 'Show'} Summary
                </button>
              </Tooltip>
            </div>
            
            {showSummary && (
              <div className="space-y-3">
                {isLoadingSummary ? (
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Generating personalized summary...</span>
                  </div>
                ) : (
                  <div className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    {aiSummary || 'Great job completing the challenge! Keep up the excellent work!'}
                  </div>
                )}
                
                {!isLoadingSummary && !aiSummary && (
                  <Tooltip content="Generate a personalized AI summary of your workout performance">
                    <button
                      onClick={generateAISummary}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                    >
                      Generate AI Summary
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          {/* Encouragement */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              🎯 Great Job!
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              You completed the challenge! Every workout brings you closer to your fitness goals. 
              Keep up the excellent work!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <Tooltip content="Close this performance summary">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </Tooltip>
            <Tooltip content="Start this workout challenge again">
              <button
                onClick={() => {
                  // TODO: Implement retry functionality
                  onClose();
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
