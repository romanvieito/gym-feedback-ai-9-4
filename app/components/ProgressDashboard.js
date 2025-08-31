'use client';

import React, { useState, useEffect } from 'react';
import { ProgressTrackingService } from '../services/ProgressTrackingService';

export default function ProgressDashboard({ isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeHistory, setChallengeHistory] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadProgressData();
    }
  }, [isOpen]);

  const loadProgressData = () => {
    const overallStats = ProgressTrackingService.getOverallStats();
    const recent = ProgressTrackingService.getRecentWorkouts(5);
    
    setStats(overallStats);
    setRecentWorkouts(recent);
  };

  const loadChallengeHistory = (challengeName) => {
    const history = ProgressTrackingService.getChallengeHistory(challengeName);
    setChallengeHistory(history);
    setSelectedChallenge(challengeName);
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                📊 Your Progress
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track your fitness journey and improvements
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {stats && stats.totalWorkouts > 0 ? (
            <>
              {/* Overall Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.totalWorkouts}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Total Workouts
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.averagePerformance}%
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Avg Performance
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.challengesCompleted}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    Challenges
                  </div>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatDuration(stats.totalTimeSpent)}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">
                    Total Time
                  </div>
                </div>
              </div>

              {/* Recent Workouts */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Recent Workouts
                </h3>
                <div className="space-y-2">
                  {recentWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => loadChallengeHistory(workout.challengeName)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {workout.challengeName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(workout.timestamp)} • {formatDuration(workout.totalDuration)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {workout.averagePerformance.toFixed(1)}%
                        </div>
                        {workout.userRating > 0 && (
                          <div className="flex text-yellow-400">
                            {Array.from({ length: workout.userRating }, (_, i) => (
                              <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challenge History */}
              {selectedChallenge && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {selectedChallenge} History
                  </h3>
                  <div className="space-y-2">
                    {challengeHistory.map((workout) => (
                      <div
                        key={workout.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(workout.timestamp)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {workout.averagePerformance.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDuration(workout.totalDuration)}
                          </div>
                          {workout.userRating > 0 && (
                            <div className="flex text-yellow-400">
                              {Array.from({ length: workout.userRating }, (_, i) => (
                                <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Workouts Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Complete your first challenge to start tracking your progress!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
            {stats && stats.totalWorkouts > 0 && (
              <button
                onClick={() => ProgressTrackingService.exportProgress()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Export Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
