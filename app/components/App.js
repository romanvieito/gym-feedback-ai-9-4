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

// New function to calibrate landmarks
const calibrateLandmarks = (landmarks, referenceLandmarks) => {
  if (!landmarks || !referenceLandmarks) return landmarks;

  const scaleFactor = calculateScale(referenceLandmarks);
  return landmarks.map((landmark, index) => ({
    x: landmark.x * scaleFactor,
    y: landmark.y * scaleFactor,
    z: landmark.z * scaleFactor
  }));
};

// Calculate scaling factor between webcam and video poses
const calculateScale = (referenceLandmarks) => {
  const refShoulderDist = Math.hypot(
    referenceLandmarks[11].x - referenceLandmarks[12].x,
    referenceLandmarks[11].y - referenceLandmarks[12].y
  );

  // Default scale if shoulders are not detected
  return refShoulderDist > 0 ? 1 / refShoulderDist : 1;
};

// Function to check if the video source is a YouTube URL
const isYouTubeUrl = (url) => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

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

function App() {
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

  // Initialize Kalman filters for each landmark
  const kalmanFilters = useRef([]);

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

  useEffect(() => {
    PoseDetectionService.initialize()
      .then(setLandmarkers)
      .catch(error => console.error("Error initializing pose landmarkers:", error));
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

    // Identify the top 3 most misaligned landmarks 
    // TODO: has to move to angles to cope wit the iterval
    const sortedLandmarks = Object.entries(angleDifferencesMatch)
      .sort(([, diffA], [, diffB]) => diffB - diffA)
      .slice(0, 3)
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
        .slice(0, 3)
        .map(([landmark]) => landmark);

      const feedbackText = `Please pay attention to ${worstLandmarks.join(', ')}.`;

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(feedbackText);
        window.speechSynthesis.speak(utterance);
      }

      console.log(`Feedback event triggered: ${feedbackText}`);
      setLastCurrentTimeFeedback(videoCurrentTime); // Update the last feedback time

      // Reset landmark performance for the next interval
      setLandmarkPerformance({});
    }


    if (isActive && videoRemainingTime > 0 && (videoCurrentTime - lastRemainingTimeFeedback) >= remainingTimeFeedbackInterval) {
      const feedbackText = `You're doing great! Just ${Math.floor(videoRemainingTime)} seconds left. Keep pushing!`;
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(feedbackText);
        window.speechSynthesis.speak(utterance);
      }
      console.log(`Feedback event triggered with ${videoRemainingTime} seconds remaining`);
      setLastRemainingTimeFeedback(videoCurrentTime); // Update the last feedback time
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

      const calibratedLandmarks = calibrateLandmarks(smoothedWebcamLandmarks, smoothedVideoLandmarks);
      const matchData = calculatePoseMatch(calibratedLandmarks, smoothedVideoLandmarks);
      setPoseMatchData(matchData);
    }
  }, [webcamLandmarks, videoLandmarks, calculatePoseMatch, kalmanR, kalmanQ]);

  function getColorFromPercentage(percentage) {
    if (isNaN(percentage) || percentage === null) return 'rgb(255,0,0)';
    
    const green = Math.min(255, Math.floor((100 - percentage) * 2.55));
    const red = Math.min(255, Math.floor(percentage * 2.55));
    return `rgb(${red},${green},0)`;
  }

  return (
    <div className="w-full">
      {/* Video Components Container */}
      <div className="relative w-full max-w-[1280px] mx-auto">
        {/* Main Workout Video */}
        <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <WorkoutVideoComponent
            workout={workoutTypes[0]}
            poseLandmarker={landmarkers.videoLandmarker}
            onLandmarksUpdate={setVideoLandmarks}
            isActive={isActive}
            onCurrentTimeUpdate={setVideoCurrentTime}
            onDurationUpdate={setVideoDuration}
          />
        </div>

        {/* Webcam Component - Overlay */}
        {isActive && (
          <div className="absolute bottom-4 right-4 w-[320px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg bg-black/10 backdrop-blur-sm">
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
            />
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex flex-col items-center gap-4 mt-8">
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
            px-6 py-3 rounded-lg font-medium
            flex items-center gap-2
            transition-all duration-200
            ${isActive 
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white' 
              : 'bg-black hover:bg-gray-900 text-white'}
          `}
        >
          {isActive ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
          {isActive ? 'Pause Workout' : 'Start Workout'}
        </button>

        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          *Ensure your full body is visible for accurate feedback.
        </p>
      </div>
    </div>
  );
}

export default App;
