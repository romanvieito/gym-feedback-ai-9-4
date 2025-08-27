'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { workoutTypes } from '../services/workoutData';
import { WebcamComponent } from './WebcamComponent';
import { WorkoutVideoComponent } from './WorkoutVideoComponent';
import { PoseDetectionService } from '../services/PoseDetectionService';
import { angleDict, landmarkNames } from '../services/poseUtils';
import { calculateAngleDifferencesAndAnomalies } from '../services/angleUtils';
import { areLandmarksVisible } from '../services/poseUtils'; // Import the visibility check function

import mixpanel from 'mixpanel-browser';
import KalmanFilter from '../services/KalmanFilter';

import { CalibrationService } from '../services/CalibrationService';

// Exponential Smoothing Function with Control Flag
const smoothLandmarks = (prevLandmarks, newLandmarks, applySmoothing = true, alpha = 0.6) => {
  if (!applySmoothing || !prevLandmarks) return newLandmarks;
  return newLandmarks.map((landmark, i) => ({
    x: alpha * landmark.x + (1 - alpha) * prevLandmarks[i].x,
    y: alpha * landmark.y + (1 - alpha) * prevLandmarks[i].y,
    z: alpha * landmark.z + (1 - alpha) * prevLandmarks[i].z,
  }));
};

const APPLY_SMOOTHING = true; // Set to true to enable exponential smoothing
const APPLY_KALMAN = true;    // Set to true to enable Kalman filtering

function App({ selectedFitnessGoal = '', selectedWearable = '', selectedWorkout = null }) {
  const [landmarkers, setLandmarkers] = useState({
    webcamLandmarker: null,
    videoLandmarker: null
  });
  const [isActive, setIsActive] = useState(false);
  const [webcamLandmarks, setWebcamLandmarks] = useState([]);
  const [videoLandmarks, setVideoLandmarks] = useState([]);
  const [poseMatchData, setPoseMatchData] = useState(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [lastCurrentTimeFeedback, setLastCurrentTimeFeedback] = useState(0);
  const [lastRemainingTimeFeedback, setLastRemainingTimeFeedback] = useState(0);
  const [landmarksVisible, setLandmarksVisible] = useState(true);
  const [landmarkPerformance, setLandmarkPerformance] = useState({});
  const [prevWebcamLandmarks, setPrevWebcamLandmarks] = useState(null);
  const [prevVideoLandmarks, setPrevVideoLandmarks] = useState(null);
  const [kalmanR, setKalmanR] = useState(0.01); // Measurement noise covariance
  const [kalmanQ, setKalmanQ] = useState(0.1);  // Process noise covariance
  const [showPoseLines, setShowPoseLines] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const calibrationTimeoutRef = useRef(null);
  const videoRef = useRef(null); // Reference to control video volume
  const [feedbackVolume, setFeedbackVolume] = useState(0.8); // Feedback volume control
  const originalVideoVolumeRef = useRef(1);
  const speechActiveCountRef = useRef(0);
  const volumeFadeRafRef = useRef(null);

  // Initialize Kalman filters for each landmark
  const kalmanFilters = useRef([]);

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

  const minInterval = 5;  // Minimum interval in seconds
  const maxInterval = 30; // Maximum interval in seconds
  const feedbackFactor = 0.1;  // 10% of total video duration for general feedback
  const remainingTimeFactor = 0.15; // 15% of total video duration for remaining time feedback
  
  // Dynamically calculate intervals
  const feedbackInterval = Math.max(minInterval, Math.min(maxInterval, videoDuration * feedbackFactor));
  const remainingTimeFeedbackInterval = Math.max(minInterval, Math.min(maxInterval, videoDuration * remainingTimeFactor));
  

  const estimateKalmanParameters = (landmarks) => {
    // Calculate variance of the landmarks
    const variance = landmarks.reduce((acc, landmark) => {
      return acc + Math.pow(landmark.x - landmark.y, 2) + Math.pow(landmark.y - landmark.z, 2);
    }, 0) / landmarks.length;

    // Adjust Q based on variance
    const newQ = Math.min(1, Math.max(0.01, variance * 0.1));
    setKalmanQ(newQ);

    // Optionally adjust R based on some criteria
    const newR = Math.min(1, Math.max(0.01, variance * 0.01));
    setKalmanR(newR);
  };

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

  // Smoothly fade the video element volume to a target over a short duration
  const fadeVideoVolumeTo = useCallback((targetVolume, durationMs = 200) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const startVolume = videoEl.volume;
    const clampedTarget = Math.max(0, Math.min(1, targetVolume));
    if (Math.abs(startVolume - clampedTarget) < 0.01) {
      videoEl.volume = clampedTarget;
      return;
    }

    if (volumeFadeRafRef.current) cancelAnimationFrame(volumeFadeRafRef.current);
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const newVolume = startVolume + (clampedTarget - startVolume) * t;
      videoEl.volume = Math.max(0, Math.min(1, newVolume));
      if (t < 1) {
        volumeFadeRafRef.current = requestAnimationFrame(step);
      }
    };
    volumeFadeRafRef.current = requestAnimationFrame(step);
  }, []);

  const duckVideoVolume = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    // Store the original volume only once per ducking session start
    if (speechActiveCountRef.current === 0) {
      originalVideoVolumeRef.current = videoEl.volume ?? 1;
      // Duck to 15% for clarity
      fadeVideoVolumeTo(0.15, 180);
    }
    speechActiveCountRef.current += 1;
  }, [fadeVideoVolumeTo]);

  const restoreVideoVolumeIfIdle = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (speechActiveCountRef.current <= 0) return;
    speechActiveCountRef.current -= 1;
    if (speechActiveCountRef.current === 0) {
      fadeVideoVolumeTo(originalVideoVolumeRef.current ?? 1, 220);
    }
  }, [fadeVideoVolumeTo]);

  // Centralized speech with ducking helper (with safety restore and queue cancel)
  const speakWithDucking = useCallback((text) => {
    if (!('speechSynthesis' in window) || !text) return;
    const synth = window.speechSynthesis;
    // Prevent long queues and overlapping states
    try { synth.cancel(); } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = Math.max(0, Math.min(1, feedbackVolume));

    let safetyTimerId = null;
    utterance.onstart = () => {
      duckVideoVolume();
      const wordCount = (text.match(/\S+/g) || []).length;
      const estimateMs = Math.min(12000, Math.max(1500, wordCount * 400));
      safetyTimerId = setTimeout(() => {
        restoreVideoVolumeIfIdle();
        if (safetyTimerId) {
          clearTimeout(safetyTimerId);
          safetyTimerId = null;
        }
      }, estimateMs);
    };
    const cleanup = () => {
      if (safetyTimerId) {
        clearTimeout(safetyTimerId);
        safetyTimerId = null;
      }
      restoreVideoVolumeIfIdle();
    };
    utterance.onend = cleanup;
    utterance.onerror = cleanup;
    synth.speak(utterance);
  }, [duckVideoVolume, restoreVideoVolumeIfIdle, feedbackVolume]);

  useEffect(() => {
    PoseDetectionService.initialize()
      .then(setLandmarkers)
      .catch(error => console.error("Error initializing pose landmarkers:", error));

    // Add welcome message when component mounts
    if ('speechSynthesis' in window && !welcomePlayedRef.current) {
      const welcomeMessages = [
        "Hey there! Ready to sweat and shine? Let's make every move count!",
        "Good to see you! Let's get this session started!",
        "Time to get fit and feel amazing! I'm here to guide you through your workout.",
        "Welcome! Get ready for an energizing workout session!",
        "Let's make today's workout count! Ready when you are!",
        "It's time to move, groove, and improve! Let's get this session started!",
        "Every rep brings you closer to your goals. Let's kick things off strong!",
        "Excited to see you! Let's ignite that energy and have a great workout!",
        "Here we go! Today's workout is your next step to greatness. Let's begin!",
        "Welcome! Let's set the tone for an great session. You've got this!"
      ];
      const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      speakWithDucking(randomWelcome);
      welcomePlayedRef.current = true;
    }
  }, []);

  
  const calculatePoseMatch = useCallback((webcamLandmarks, videoLandmarks) => {
    const requiredIndices = Array.from({ length: landmarkNames.length - 10 }, (_, i) => i + 10); // Indices from 10 onwards
    
    console.log('webcamLandmarks:', webcamLandmarks);
    // If webcamLandmarks is an array of objects, log each object
    webcamLandmarks.forEach((landmark, index) => {
      console.log(`Landmark ${index}:`, landmark);
    });

    const webcamVisible = areLandmarksVisible(webcamLandmarks, requiredIndices);
    const videoVisible = areLandmarksVisible(videoLandmarks, requiredIndices);

    setLandmarksVisible(webcamVisible && videoVisible);

    if (!webcamVisible || !videoVisible) {
      console.log('Required landmarks are not visible. Skipping pose match calculation.');
      // return; // Exit the function if required landmarks are not visible but we want to
                 // so commented for now keep the feedback
    }

    console.log('webcamVisible:', webcamVisible);
    console.log('videoVisible:', videoVisible);

    const { angleDifferencesMatch, anomalousIndices, totalDifferenceMatch, validAngles } = calculateAngleDifferencesAndAnomalies(
      webcamLandmarks,
      videoLandmarks,
      angleDict,
      landmarkNames
    );

    // the distance close to 0 is perfect so performance so DifferenceMatch is close to 100 and 
    //level is excellent
    // hay que jugar aqui pero esto esta de palo
    const averageDifferenceMatch = validAngles > 0 ? totalDifferenceMatch / validAngles : 0;
    // Normalize the difference to a 0-100 scale, with a maximum difference of 180 degrees
    const matchPercentage = validAngles > 0 ? Math.max(0, Math.min(100, (1 - (averageDifferenceMatch / 180)) * 100)) : 0;

    // TODO: Define adaptive thresholds for ordinal scale
    const excellentAverageThreshold = 85;  // Higher threshold for excellent
    const goodAverageThreshold = 70;       // Higher threshold for good
    const fairAverageThreshold = 55;       // Higher threshold for fair

    // TODO: Determine the performance level and color to be corrected 
    let performanceLevel, color;
    if (matchPercentage >= excellentAverageThreshold) {
      performanceLevel = "Excellent";
      color = 'rgb(0, 255, 0)'; // Green
    } else if (matchPercentage >= goodAverageThreshold) {
      performanceLevel = "Good";
      color = 'rgb(173, 255, 47)'; // Yellow-green
    } else if (matchPercentage >= fairAverageThreshold) {
      performanceLevel = "Fair";
      color = 'rgb(255, 165, 0)'; // Orange
    } else {
      performanceLevel = "Poor";
      color = 'rgb(255, 0, 0)'; // Red
    }

    console.log(`Performance Level: ${performanceLevel}`);

    // Identify the top most misaligned landmarks 
    // TODO: has to move to angles to cope wit the iterval
    const sortedLandmarks = Object.entries(angleDifferencesMatch)
      .sort(([, diffA], [, diffB]) => diffB - diffA)
      .slice(0, 1)
      .map(([landmark]) => landmark);

    // Accumulate landmark performance
    Object.entries(angleDifferencesMatch).forEach(([landmark, diff]) => {
      setLandmarkPerformance(prev => ({
        ...prev,
        [landmark]: (prev[landmark] || 0) + diff
      }));
    });

    // Provide audio feedback at 5 second intervals
    if (isActive && videoCurrentTime > 0 && (videoCurrentTime - lastCurrentTimeFeedback) >= feedbackInterval) {
      //  Rank landmarks based on accumulated performance
      //TODO: this has to be retested
      const worstLandmarks = Object.entries(landmarkPerformance)
        .sort(([, totalDiffA], [, totalDiffB]) => totalDiffB - totalDiffA)
        .slice(0, 1)
        .map(([landmark]) => landmark);

      const feedbackText = `Please pay attention to ${worstLandmarks.join(', ')}.`;

      speakWithDucking(feedbackText);

      console.log(`Feedback event triggered: ${feedbackText}`);
      setLastCurrentTimeFeedback(videoCurrentTime); // Update the last feedback time

      // Reset landmark performance for the next interval
      setLandmarkPerformance({});
    }


    if (isActive && videoCurrentTime > 0 && (videoCurrentTime - lastRemainingTimeFeedback) >= remainingTimeFeedbackInterval) {
      const minutes = Math.floor(videoCurrentTime / 60);
      const seconds = Math.floor(videoCurrentTime % 60);
      const timeText = minutes > 0 
        ? `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`
        : `${seconds} second${seconds !== 1 ? 's' : ''}`;
        
      const encouragingPhrases = [
        `Great work! ${timeText} and counting. Every second counts!`,
        `Fantastic effort! ${timeText} of awesome workout. You're crushing it!`,
        `You're doing amazing! ${timeText} of exercise completed. Stay strong!`,
        `Keep that energy going! You've been at it for ${timeText}. You've got this!`,
        `Consistency is key! ${timeText} of movement. Feel the progress!`
      ];

      const randomPhrase = encouragingPhrases[Math.floor(Math.random() * encouragingPhrases.length)];
      
      speakWithDucking(randomPhrase);
      console.log(`Feedback event triggered at ${timeText}`);
      setLastRemainingTimeFeedback(videoCurrentTime);
    }

    console.log('Debug - isActive:', isActive);
    console.log('Debug - videoRemainingTime:', videoRemainingTime);
    console.log('Debug - lastRemainingTimeFeedback:', lastRemainingTimeFeedback);
    console.log('Debug - feedbackInterval:', feedbackInterval);
    console.log('Debug - remainingTimeFeedbackInterval:', remainingTimeFeedbackInterval);


    return {
      percentage: matchPercentage,
      color,
      angleDifferencesMatch,
      anomalousIndices,
      performanceFeedback: performanceLevel,
      mostMisalignedLandmarks: sortedLandmarks
    };
  }, [videoCurrentTime, videoRemainingTime, lastCurrentTimeFeedback, lastRemainingTimeFeedback, feedbackInterval, remainingTimeFeedbackInterval, isActive]);

  // Add calibration effect
  useEffect(() => {
    if (webcamLandmarks.length > 0 && videoLandmarks.length > 0 && !isCalibrated) {
      // Clear any existing calibration timeout
      if (calibrationTimeoutRef.current) {
        clearTimeout(calibrationTimeoutRef.current);
      }

      // Set a new calibration timeout
      calibrationTimeoutRef.current = setTimeout(async () => {
        const success = await CalibrationService.calibrate(videoLandmarks, webcamLandmarks);
        setIsCalibrated(success);
        
        if (success) {
          console.log('Calibration successful');
          // Optionally provide feedback to the user
          speakWithDucking('Calibration complete. Ready to start.');
        } else {
          console.warn('Calibration failed');
        }
      }, 1000); // Wait for 1 second of stable poses before calibrating
    }

    return () => {
      if (calibrationTimeoutRef.current) {
        clearTimeout(calibrationTimeoutRef.current);
      }
    };
  }, [webcamLandmarks, videoLandmarks, isCalibrated]);

  // Update the landmark processing effect
  useEffect(() => {
    if (webcamLandmarks.length > 0 && videoLandmarks.length > 0) {
      // Estimate Kalman parameters based on current landmarks
      estimateKalmanParameters(webcamLandmarks);

      // Initialize Kalman filters if not already done
      if (kalmanFilters.current.length === 0) {
        kalmanFilters.current = webcamLandmarks.map(() => new KalmanFilter());
      }

      // Update Kalman filter parameters dynamically
      kalmanFilters.current.forEach(filter => filter.setParameters({ R: kalmanR, Q: kalmanQ }));

      // Apply Kalman filtering if enabled
      const kalmanFilteredWebcamLandmarks = APPLY_KALMAN
        ? webcamLandmarks.map((landmark, i) => ({
            x: kalmanFilters.current[i].filter(landmark.x),
            y: kalmanFilters.current[i].filter(landmark.y),
            z: kalmanFilters.current[i].filter(landmark.z),
          }))
        : webcamLandmarks;

      const kalmanFilteredVideoLandmarks = APPLY_KALMAN
        ? videoLandmarks.map((landmark, i) => ({
            x: kalmanFilters.current[i].filter(landmark.x),
            y: kalmanFilters.current[i].filter(landmark.y),
            z: kalmanFilters.current[i].filter(landmark.z),
          }))
        : videoLandmarks;

      // Apply Exponential Smoothing after Kalman filtering
      const smoothedWebcamLandmarks = smoothLandmarks(prevWebcamLandmarks, kalmanFilteredWebcamLandmarks, APPLY_SMOOTHING);
      const smoothedVideoLandmarks = smoothLandmarks(prevVideoLandmarks, kalmanFilteredVideoLandmarks, APPLY_SMOOTHING);

      setPrevWebcamLandmarks(smoothedWebcamLandmarks);
      setPrevVideoLandmarks(smoothedVideoLandmarks);

      // Apply calibration if available
      const calibratedLandmarks = CalibrationService.transformLandmarks(smoothedWebcamLandmarks);
      const matchData = calculatePoseMatch(calibratedLandmarks, smoothedVideoLandmarks);
      setPoseMatchData(matchData);
    }
  }, [webcamLandmarks, videoLandmarks, calculatePoseMatch, kalmanR, kalmanQ]);

  // Add reset calibration function
  const resetCalibration = useCallback(() => {
    CalibrationService.resetCalibration();
    setIsCalibrated(false);
  }, []);

  function getColorFromPercentage(percentage) {
    if (isNaN(percentage) || percentage === null) return 'rgb(255,0,0)';
    
    const green = Math.min(255, Math.floor((100 - percentage) * 2.55));
    const red = Math.min(255, Math.floor(percentage * 2.55));
    return `rgb(${red},${green},0)`;
  }

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

      speakWithDucking(feedbackText);
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative w-full">
        {/* Toggle Pose Lines Button - YouTube-style floating action button */}
        <button
          onClick={() => setShowPoseLines(!showPoseLines)}
          className="absolute top-4 right-4 z-20 p-3 rounded-full text-sm font-medium bg-white hover:bg-gray-50 text-gray-700 shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
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

        {/* Main Video Container - YouTube-style rounded corners and shadow */}
        <div className="w-full rounded-2xl overflow-hidden shadow-2xl bg-white">
          <WorkoutVideoComponent
            workout={selectedWorkout || workoutTypes[0]}
            poseLandmarker={landmarkers.videoLandmarker}
            onLandmarksUpdate={setVideoLandmarks}
            isActive={isActive}
            onCurrentTimeUpdate={setVideoCurrentTime}
            onDurationUpdate={setVideoDuration}
            showPoseLines={showPoseLines}
            onVideoRef={(el) => { videoRef.current = el; }}
          />
        </div>

        {/* Webcam Overlay - YouTube-style picture-in-picture */}
        {isActive && (
          <div className="absolute bottom-6 right-6 w-[360px] h-[270px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white bg-white">
            <WebcamComponent
              poseLandmarker={landmarkers.webcamLandmarker}
              onLandmarksUpdate={(landmarks) => {
                if (isActive) {
                  setWebcamLandmarks(landmarks);
                }
              }}
              onCurrentTimeUpdate={setVideoCurrentTime}
              onFrameIndexUpdate={() => {}}
              poseMatchData={poseMatchData}
              showPoseLines={showPoseLines}
            />
          </div>
        )}
      </div>
      
      {/* Controls Section - YouTube-style centered layout */}
      <div className="flex flex-col items-center gap-6 mt-8">
        {/* Main Control Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={() => {
              const newIsActive = !isActive;
              setIsActive(newIsActive);
              if (!newIsActive) {
                setWebcamLandmarks([]);
                setVideoLandmarks([]);
                mixpanel.track('Workout Paused', {
                  platform: 'web_app'
                });
              } else {
                mixpanel.track('Workout Resumed', {
                  platform: 'web_app'
                });
              }
            }}
            className={`
              px-8 py-4 rounded-full font-semibold text-base
              flex items-center gap-3
              transition-all duration-200 shadow-lg hover:shadow-xl
              ${isActive 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-2 border-gray-200' 
                : 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-600'}
            `}
          >
            {isActive ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
            {isActive ? 'Pause Workout' : 'Start Workout'}
          </button>

          <button
            onClick={() => generateAIFeedback(poseMatchData)}
            disabled={isActive || !poseMatchData}
            className={`
              px-8 py-4 rounded-full font-semibold text-base flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl
              ${isActive || !poseMatchData 
                ? 'bg-gray-300 cursor-not-allowed border-2 border-gray-300' 
                : 'bg-blue-600 hover:bg-blue-700 border-2 border-blue-600'
              } text-white
            `}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Get Feedback
          </button>
        </div>

        {/* Info Text - YouTube-style subtle text */}
        <div className="px-6 py-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">
            💡 The more we see, the more precise the feedback!
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
