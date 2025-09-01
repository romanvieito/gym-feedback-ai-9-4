'use client';

import React, { useState, useEffect } from 'react';
import { ProgressTrackingService } from '../services/ProgressTrackingService';
import Tooltip from './Tooltip';

export default function ProgressDashboard({ isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');

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

  // Helper components
  const NavigationTab = ({ id, label, icon, isActive, onClick, count }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <div className="w-4 h-4">{icon}</div>
      <span>{label}</span>
      {count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          isActive 
            ? 'bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900' 
            : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  const StatCard = ({ label, value, icon }) => (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
      <div className="w-8 h-8 mx-auto mb-2 text-gray-600 dark:text-gray-400">
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
        {label}
      </div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        ))}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Your Progress
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Track your fitness journey and improvements
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              aria-label="Close progress dashboard"
            >
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Tabs */}
          {stats && stats.totalWorkouts > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              <NavigationTab
                id="overview"
                label="Overview"
                icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                isActive={activeSection === 'overview'}
                onClick={setActiveSection}
                count={0}
              />
              <NavigationTab
                id="recent"
                label="Recent"
                icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                isActive={activeSection === 'recent'}
                onClick={setActiveSection}
                count={recentWorkouts.length}
              />
              {selectedChallenge && (
                <NavigationTab
                  id="history"
                  label="History"
                  icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                  isActive={activeSection === 'history'}
                  onClick={setActiveSection}
                  count={challengeHistory.length}
                />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {stats && stats.totalWorkouts > 0 ? (
            <>
              {/* Overview Section */}
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      label="Total Workouts"
                      value={stats.totalWorkouts}
                      icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                    />
                    <StatCard
                      label="Avg Performance"
                      value={`${stats.averagePerformance}%`}
                      icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
                    />
                    <StatCard
                      label="Challenges"
                      value={stats.challengesCompleted}
                      icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <StatCard
                      label="Total Time"
                      value={formatDuration(stats.totalTimeSpent)}
                      icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                  </div>
                </div>
              )}

              {/* Recent Workouts Section */}
              {activeSection === 'recent' && (
                <div className="space-y-3">
                  {recentWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="group p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        loadChallengeHistory(workout.challengeName);
                        setActiveSection('history');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-200">
                            {workout.challengeName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(workout.timestamp)} • {formatDuration(workout.totalDuration)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {workout.averagePerformance.toFixed(1)}%
                            </div>
                            {workout.userRating > 0 && (
                              <div className="flex justify-end text-yellow-500 mt-1">
                                {Array.from({ length: workout.userRating }, (_, i) => (
                                  <svg key={i} className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                ))}
                              </div>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Challenge History Section */}
              {activeSection === 'history' && selectedChallenge && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setActiveSection('recent')}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedChallenge} History
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {challengeHistory.map((workout) => (
                      <div
                        key={workout.id}
                        className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(workout.timestamp)}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {workout.averagePerformance.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDuration(workout.totalDuration)}
                            </div>
                            {workout.userRating > 0 && (
                              <div className="flex text-yellow-500">
                                {Array.from({ length: workout.userRating }, (_, i) => (
                                  <svg key={i} className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Workouts Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Complete your first challenge to start tracking your progress!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              Close
            </button>
            {stats && stats.totalWorkouts > 0 && (
              <Tooltip content="Export your workout data">
                <button
                  onClick={() => ProgressTrackingService.exportProgress()}
                  className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm"
                >
                  Export Data
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
