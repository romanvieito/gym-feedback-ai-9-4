'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { workoutTypes } from '../services/workoutData';
import { WebcamComponent } from './WebcamComponent';
import { WorkoutVideoComponent } from './WorkoutVideoComponent';
import SubtitleComponent from './SubtitleComponent';
import FeedbackManager from './FeedbackManager';
import PerformanceSummaryModal from './PerformanceSummaryModal';

import Tooltip from './Tooltip';
import { ProgressTrackingService } from '../services/ProgressTrackingService';
import { PoseDetectionService } from '../services/PoseDetectionService';

import mixpanel from 'mixpanel-browser';

import usePosePipeline from '../hooks/usePosePipeline';
import ControlsBar from './ControlsBar';

//

function App({ selectedFitnessGoal = '', selectedFocusArea = '', selectedFeedbackInterval = '', selectedWearable = '', selectedWorkout = null }) {
  const [landmarkers, setLandmarkers] = useState({
    webcamLandmarker: null,
    videoLandmarker: null
  });
  const [isActive, setIsActive] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [webcamLandmarks, setWebcamLandmarks] = useState([]);
  const [videoLandmarks, setVideoLandmarks] = useState([]);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showPoseLines, setShowPoseLines] = useState(false);
  const videoRef = useRef(null); // Reference to control video volume
  const [feedbackVolume, setFeedbackVolume] = useState(0.8); // Feedback volume control
  const [isMuted, setIsMuted] = useState(false); // Mute state for audio feedback
  const lastPlaybackRef = useRef({ time: 0, wasPlaying: false });
  // Audio unlocking, ducking, and playback handled by FeedbackManager
  
  // Subtitle state management
  const [showSubtitles, setShowSubtitles] = useState(true);

  // Workout completion and performance tracking
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [showPerformanceSummary, setShowPerformanceSummary] = useState(false);


  // Initialize Kalman filters for each landmark (moved into usePosePipeline)

  // OpenAI client removed - now using server-side API route

  // Calculate remaining time for video
  const videoRemainingTime = videoDuration - videoCurrentTime;
  // const feedbackInterval = 10; // Set the interval in seconds
  // const remainingTimeFeedbackInterval = 15; // Set the interval in seconds for remaining time feedback

  ///OJO AQUÍ
  //FROM GPT estimate acceptable values for feedbackInterval 
  //and remainingTimeFeedbackInterval is to base them on the 
  //total video duration. 
  // This allows the intervals to scale dynamically, 
  //ensuring feedback is neither too frequent nor too sparse.

  // Feedback interval options mapping
  const feedbackIntervalOptions = {
    'frequent': 60,   // 1 minute
    'balanced': 150,  // 2.5 minutes  
    'minimal': 300,   // 5 minutes
    'smart': 'adaptive'
  };

  // Use user-selected feedback interval or fallback to dynamic calculation
  const userFeedbackInterval = selectedFeedbackInterval ? feedbackIntervalOptions[selectedFeedbackInterval] : null;
  
  const minInterval = 5;  // Minimum interval in seconds
  const maxInterval = 30; // Maximum interval in seconds
  const feedbackFactor = 0.1;  // 10% of total video duration for general feedback
  const remainingTimeFactor = 0.15; // 15% of total video duration for remaining time feedback
  
  // Handle smart adaptive feedback
  const isSmartFeedback = userFeedbackInterval === 'adaptive';
  
  // Use user-selected interval or dynamically calculate intervals
  const feedbackInterval = isSmartFeedback 
    ? Math.max(minInterval, Math.min(maxInterval, videoDuration * feedbackFactor)) // Dynamic for smart mode
    : (userFeedbackInterval || Math.max(minInterval, Math.min(maxInterval, videoDuration * feedbackFactor)));
  const remainingTimeFeedbackInterval = Math.max(minInterval, Math.min(maxInterval, videoDuration * remainingTimeFactor));

  // Convert user feedback interval to FeedbackManager intervals (in milliseconds)
  const getFeedbackManagerIntervals = (userInterval) => {
    if (!userInterval) {
      return {
        form: 8000,        // 8 seconds
        encouragement: 15000, // 15 seconds
        milestone: 30000,   // 30 seconds
        rest: 5000         // 5 seconds
      };
    }
    
    // Handle smart adaptive feedback
    if (userInterval === 'smart') {
      return {
        form: 6000,        // More frequent form feedback for smart mode
        encouragement: 12000, // Adaptive encouragement
        milestone: 25000,   // Adaptive milestones
        rest: 4000         // More frequent rest prompts
      };
    }
    
    const baseInterval = feedbackIntervalOptions[userInterval] * 1000; // Convert to milliseconds
    return {
      form: Math.min(baseInterval, 8000),        // Cap at 8 seconds
      encouragement: Math.min(baseInterval, 15000), // Cap at 15 seconds
      milestone: Math.min(baseInterval * 2, 30000), // Double the interval, cap at 30 seconds
      rest: Math.min(baseInterval / 2, 5000)     // Half the interval, cap at 5 seconds
    };
  };

  const feedbackManagerIntervals = getFeedbackManagerIntervals(selectedFeedbackInterval);
  

  // Kalman estimation moved into usePosePipeline

  const welcomePlayedRef = useRef(false);

  // Log fitness goal and wearable when component mounts
  useEffect(() => {
    if (selectedFitnessGoal) {
      console.log('Selected Fitness Goal:', selectedFitnessGoal);
    }
    if (selectedWearable) {
      console.log('Selected Wearable:', selectedWearable);
    }
    if (selectedWorkout) {
      console.log('Selected Workout:', selectedWorkout);
    }
  }, [selectedFitnessGoal, selectedWearable, selectedWorkout]);

  const toggleFullscreenPreservingPlayback = useCallback((nextMax) => {
    const v = videoRef.current;
    if (v) {
      lastPlaybackRef.current.time = v.currentTime || 0;
      lastPlaybackRef.current.wasPlaying = !v.paused && !v.ended;
    }
    setIsMaximized(nextMax);
    requestAnimationFrame(() => {
      const videoEl = videoRef.current;
      if (!videoEl) return;
      if (Number.isFinite(lastPlaybackRef.current.time)) {
        try { videoEl.currentTime = lastPlaybackRef.current.time; } catch (_) {}
      }
      if (lastPlaybackRef.current.wasPlaying) {
        try { videoEl.play().catch(() => {}); } catch (_) {}
      } else {
        try { videoEl.pause(); } catch (_) {}
      }
    });
  }, []);

  // Keyboard shortcuts for maximize/minimize
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'f' || event.key === 'F') {
        toggleFullscreenPreservingPlayback(!isMaximized);
      }
      if (event.key === 'Escape' && isMaximized) {
        toggleFullscreenPreservingPlayback(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isMaximized, toggleFullscreenPreservingPlayback]);



  // Delegate to FeedbackManager instance
  const feedbackMgrRef = useRef(null);
  const speakWithDucking = useCallback(async (text, options = {}) => {
    if (isMuted) return; // Don't speak if muted
    try { await feedbackMgrRef.current?.speak(text, options); } catch (_) {}
  }, [isMuted]);

  // Control video volume based on mute state
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      if (isMuted) {
        videoEl.volume = 0;
      } else {
        videoEl.volume = 1; // Restore to full volume when unmuted
      }
    }
  }, [isMuted]);

  // Wire the processing pipeline
  const { poseMatchData, isCalibrated, resetCalibration } = usePosePipeline({
    webcamLandmarks,
    videoLandmarks,
    isActive,
    videoCurrentTime,
    videoDuration,
    selectedFeedbackInterval,
    speak: speakWithDucking,
    speakEncouragement: (t) => { try { feedbackMgrRef.current?.speakEncouragement(t); } catch (_) {} }
  });

  useEffect(() => {
    PoseDetectionService.initialize()
      .then(setLandmarkers)
      .catch(error => console.error("Error initializing pose landmarkers:", error));

    // Welcome message via FeedbackManager (fire-and-forget)
    if (!welcomePlayedRef.current && !isMuted) {
      try { feedbackMgrRef.current?.playWelcomeOnce(); } catch (_) {}
      welcomePlayedRef.current = true;
    }
  }, [isMuted]);

  // Visibility resume handled by FeedbackManager

  // Calibration and pose processing moved into usePosePipeline

  // Add toggle video play/pause function
  const toggleVideoPlayPause = useCallback(() => {
    const newIsActive = !isActive;
    setIsActive(newIsActive);

    if (newIsActive) {
      mixpanel.track('Workout Resumed', {
        platform: 'web_app'
      });
    } else {
      mixpanel.track('Workout Paused', {
        platform: 'web_app'
      });
      setWebcamLandmarks([]);
      setVideoLandmarks([]);
    }
  }, [isActive]);

  function getColorFromPercentage(percentage) {
    if (isNaN(percentage) || percentage === null) return 'rgb(255,0,0)';
    
    const green = Math.min(255, Math.floor((100 - percentage) * 2.55));
    const red = Math.min(255, Math.floor(percentage * 2.55));
    return `rgb(${red},${green},0)`;
  }

  // Save workout progress
  const saveWorkoutProgress = useCallback((workoutData) => {
    const savedWorkout = ProgressTrackingService.saveWorkout(workoutData);
    if (savedWorkout) {
      console.log('Workout progress saved:', savedWorkout);
    }
  }, []);

  // Handle workout completion
  const handleWorkoutComplete = useCallback(() => {
    console.log('Workout completed!');
    setWorkoutCompleted(true);
    setIsActive(false); // Stop the workout
    
    // Calculate performance statistics
    const averagePerformance = performanceHistory.length > 0 
      ? performanceHistory.reduce((sum, p) => sum + p.percentage, 0) / performanceHistory.length 
      : 0;
    
    const bestPerformance = performanceHistory.length > 0 
      ? Math.max(...performanceHistory.map(p => p.percentage))
      : 0;
    
    const worstPerformance = performanceHistory.length > 0 
      ? Math.min(...performanceHistory.map(p => p.percentage))
      : 0;
    
    const performanceLevels = performanceHistory.reduce((acc, p) => {
      acc[p.performanceLevel] = (acc[p.performanceLevel] || 0) + 1;
      return acc;
    }, {});
    
    // Automatically save workout progress
    const workoutData = {
      challengeName: selectedWorkout?.title || 'Workout Challenge',
      totalDuration: videoDuration,
      averagePerformance,
      bestPerformance,
      worstPerformance,
      performanceHistory,
      userRating: 0, // Will be updated when user rates
      fitnessGoal: selectedFitnessGoal,
      focusArea: selectedFocusArea,
      performanceLevels
    };
    
    saveWorkoutProgress(workoutData);
    
    // Track workout completion
    mixpanel.track('Workout Completed', {
      platform: 'web_app',
      challengeName: selectedWorkout?.title || 'Unknown',
      totalDuration: videoDuration,
      averagePerformance,
      performanceHistoryLength: performanceHistory.length
    });

    // Show performance summary after a short delay
    setTimeout(() => {
      setShowPerformanceSummary(true);
    }, 1000);
  }, [selectedWorkout, videoDuration, performanceHistory, selectedFitnessGoal, selectedFocusArea, saveWorkoutProgress]);

  // Close performance summary modal
  const closePerformanceSummary = useCallback(() => {
    setShowPerformanceSummary(false);
    setWorkoutCompleted(false);
    // Reset performance history for next workout
    setPerformanceHistory([]);
  }, []);

  // Update workout rating
  const updateWorkoutRating = useCallback((challengeName, rating) => {
    const updatedWorkout = ProgressTrackingService.updateWorkoutRating(challengeName, rating);
    if (updatedWorkout) {
      console.log('Workout rating updated:', updatedWorkout);
    }
  }, []);

  // Track performance data over time (will use poseMatchData from pipeline)

  // Add new function to generate AI feedback
  const generateAIFeedback = async (performanceData) => {
    try {
      // Track feedback request
      mixpanel.track('AI Feedback Requested By User', {
        platform: 'web_app',
      });

      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          performanceFeedback: performanceData.performanceFeedback,
          percentage: performanceData.percentage,
          mostMisalignedLandmarks: performanceData.mostMisalignedLandmarks
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        const errorDetails = errorData.details || '';
        throw new Error(`${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
      }

      const data = await response.json();
      const feedbackText = data.feedback;

      // Track successful feedback generation
      mixpanel.track('AI Feedback Generated', {
        platform: 'web_app',
        performanceLevel: performanceData.performanceFeedback,
        matchPercentage: performanceData.percentage.toFixed(1),
        jointToImprove: performanceData.mostMisalignedLandmarks.join(', '),
        feedbackText: feedbackText,
        feedbackLength: feedbackText.length
      });

      // Use FeedbackManager's context-aware speaking to respect feedback frequency settings
      try { 
        await feedbackMgrRef.current?.speakWithContext(feedbackText, { type: 'form' }); 
      } catch (_) {
        // Fallback to direct speaking if context-aware fails
        speakWithDucking(feedbackText);
      }
    } catch (error) {
      // Track error in feedback generation
      mixpanel.track('AI Feedback Error', {
        platform: 'web_app',
        errorMessage: error.message
      });
      console.error('Error generating AI feedback:', error);
      
      // Provide user-friendly error message
      const errorMessage = error.message.includes('OpenAI API key not configured') 
        ? "AI feedback is not configured. Please contact support."
        : "Sorry, I couldn't generate feedback right now. Please try again.";
      speakWithDucking(errorMessage);
    }
  };

  return (
    <>
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative w-full">


        {/* Feedback Manager (hidden) */}
        <FeedbackManager
          ref={feedbackMgrRef}
          getVideoEl={() => videoRef.current}
          feedbackVolume={isMuted ? 0 : feedbackVolume}
          showSubtitles={showSubtitles}
          isMuted={isMuted}
          feedbackIntervals={feedbackManagerIntervals}
          userSettings={{
            fitnessGoal: selectedFitnessGoal,
            focusArea: selectedFocusArea,
            wearable: selectedWearable,
            feedbackInterval: selectedFeedbackInterval,
          }}
          selectedWorkout={selectedWorkout}
        />



        {/* Fullscreen overlay when maximized */}
        {isMaximized && (
          <div className="fixed inset-0 z-50 bg-black">
            <div className="relative w-full h-full">
              <Tooltip content="Exit fullscreen mode" position="bottom">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFullscreenPreservingPlayback(false); }}
                  className="absolute bottom-6 left-6 z-50 w-12 h-12 rounded-xl bg-white/90 hover:bg-white text-gray-700 shadow-lg backdrop-blur-sm transition-all duration-200 flex items-center justify-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                </button>
              </Tooltip>
              
              {/* Mute Button - Fullscreen */}
              <Tooltip content={isMuted ? "Unmute" : "Mute"} position="bottom">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute bottom-6 left-20 z-50 w-12 h-12 rounded-xl bg-white/90 hover:bg-white text-gray-700 shadow-lg backdrop-blur-sm transition-all duration-200 flex items-center justify-center"
                >
                  {isMuted ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <line x1="23" y1="9" x2="17" y2="15"/>
                      <line x1="17" y1="9" x2="23" y2="15"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                  )}
                </button>
              </Tooltip>
              
              {/* Toggle Pose Lines Button - Fullscreen */}
              <Tooltip content={showPoseLines ? "Hide pose lines" : "Show pose lines"} position="bottom">
                <button
                  onClick={() => setShowPoseLines(!showPoseLines)}
                  className="absolute bottom-6 left-36 z-50 w-12 h-12 rounded-xl bg-white/90 hover:bg-white text-gray-700 shadow-lg backdrop-blur-sm transition-all duration-200 flex items-center justify-center"
                >
                  {showPoseLines ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </Tooltip>
              <WorkoutVideoComponent
                workout={selectedWorkout || workoutTypes[0]}
                poseLandmarker={landmarkers.videoLandmarker}
                onLandmarksUpdate={setVideoLandmarks}
                isActive={isActive}
                onCurrentTimeUpdate={setVideoCurrentTime}
                onDurationUpdate={setVideoDuration}
                showPoseLines={showPoseLines}
                onVideoRef={(el) => { videoRef.current = el; }}
                isMaximized={true}
                onTogglePlayPause={toggleVideoPlayPause}
                onWorkoutComplete={handleWorkoutComplete}
              />

              {/* Webcam PiP visible in fullscreen */}
              <div className={`absolute bottom-6 right-6 w-[320px] h-[240px] rounded-xl overflow-hidden shadow-lg border border-white/20 bg-white/10 backdrop-blur-sm z-40 ${!isActive ? 'opacity-50' : ''} transition-opacity duration-200`}>
                <WebcamComponent
                  poseLandmarker={landmarkers.webcamLandmarker}
                  onLandmarksUpdate={setWebcamLandmarks}
                  onCurrentTimeUpdate={setVideoCurrentTime}
                  onFrameIndexUpdate={() => {}}
                  poseMatchData={poseMatchData}
                  showPoseLines={showPoseLines}
                />
              </div>

              {/* Subtitle Component for fullscreen - only render when maximized */}
              {isMaximized && (
                <SubtitleComponent
                  showSubtitles={showSubtitles}
                  onToggleSubtitles={() => setShowSubtitles(!showSubtitles)}
                  isMaximized={true}
                />
              )}
            </div>
          </div>
        )}

        {/* Main Video Container - Minimalist rounded design */}
        {!isMaximized && (
          <div className="w-full rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <WorkoutVideoComponent
              workout={selectedWorkout || workoutTypes[0]}
              poseLandmarker={landmarkers.videoLandmarker}
              onLandmarksUpdate={setVideoLandmarks}
              isActive={isActive}
              onCurrentTimeUpdate={setVideoCurrentTime}
              onDurationUpdate={setVideoDuration}
              showPoseLines={showPoseLines}
              onVideoRef={(el) => { videoRef.current = el; }}
              isMaximized={false}
              onTogglePlayPause={toggleVideoPlayPause}
              onWorkoutComplete={handleWorkoutComplete}
            />
          </div>
        )}

        {/* Webcam Overlay - Minimalist picture-in-picture */}
        {!isMaximized && (
          <div className={`absolute bottom-4 right-4 w-[280px] h-[210px] rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${!isActive ? 'opacity-50' : ''} transition-opacity duration-200`}>
            <WebcamComponent
              poseLandmarker={landmarkers.webcamLandmarker}
              onLandmarksUpdate={setWebcamLandmarks}
              onCurrentTimeUpdate={setVideoCurrentTime}
              onFrameIndexUpdate={() => {}}
              poseMatchData={poseMatchData}
              showPoseLines={showPoseLines}
            />
          </div>
        )}


        {/* Subtitle Component for normal mode (hidden toggle, enables display) */}
        {!isMaximized && (
          <SubtitleComponent
            showSubtitles={showSubtitles}
            onToggleSubtitles={() => setShowSubtitles(!showSubtitles)}
            isMaximized={false}
            className="hidden"
          />
        )}


      </div>
      
      {/* Controls Section - Single row layout */}
      <ControlsBar
        isActive={isActive}
        isMaximized={isMaximized}
        isMuted={isMuted}
        showSubtitles={showSubtitles}
        showPoseLines={showPoseLines}
        onToggleActive={async () => {
                const newIsActive = !isActive;
                setIsActive(newIsActive);
                if (newIsActive) {
            mixpanel.track('Workout Resumed', { platform: 'web_app' });
                } else {
            mixpanel.track('Workout Paused', { platform: 'web_app' });
                  setWebcamLandmarks([]);
                  setVideoLandmarks([]);
                }
              }}
        onToggleFullscreen={(e) => { e?.preventDefault?.(); e?.stopPropagation?.(); toggleFullscreenPreservingPlayback(!isMaximized); }}
        onToggleMute={() => setIsMuted(!isMuted)}
        onToggleSubtitles={() => setShowSubtitles(!showSubtitles)}
        onTogglePoseLines={() => setShowPoseLines(!showPoseLines)}
        onGetFeedback={(e) => {
          e?.preventDefault?.();
          e?.stopPropagation?.();
                const hasWebcamPose = Array.isArray(webcamLandmarks) && webcamLandmarks.length > 0;
                const hasVideoPose = Array.isArray(videoLandmarks) && videoLandmarks.length > 0;
                if (!hasWebcamPose) {
                  alert('No pose detected from your camera. Please ensure your camera can see you.');
                  return;
                }
                if (!hasVideoPose) {
                  alert('Video pose data not available yet. Please wait for the video to load.');
                  return;
                }
          const payload = poseMatchData ? {
            performanceFeedback: poseMatchData.performanceFeedback || 'Unknown',
            percentage: Number.isFinite(poseMatchData.percentage) ? poseMatchData.percentage : 0,
            mostMisalignedLandmarks: Array.isArray(poseMatchData.mostMisalignedLandmarks) ? poseMatchData.mostMisalignedLandmarks : []
          } : { performanceFeedback: 'Unknown', percentage: 0, mostMisalignedLandmarks: [] };
                generateAIFeedback(payload);
              }}
      />

      {/* Info Text - Minimalist subtle text */}
      <div className="mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Better look, sharper feedback
          </p>
        </div>
      </div>

      {/* Performance Summary Modal */}
      <PerformanceSummaryModal
        isOpen={showPerformanceSummary}
        onClose={closePerformanceSummary}
        performanceData={performanceHistory}
        challengeName={selectedWorkout?.title || 'Workout Challenge'}
        totalDuration={videoDuration}
        fitnessGoal={selectedFitnessGoal}
        focusArea={selectedFocusArea}
        onSaveProgress={saveWorkoutProgress}
        onUpdateRating={updateWorkoutRating}
      />
    </>
  );
}

export default App;
