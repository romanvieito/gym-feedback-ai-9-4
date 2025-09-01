'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { areLandmarksVisible, PoseConfigManager } from '../services/poseUtils';
import { calculateAngleDifferencesAndAnomalies } from '../services/angleUtils';
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

const APPLY_SMOOTHING = true;
const APPLY_KALMAN = true;

/**
 * Centralizes the pose processing pipeline: kalman + smoothing + calibration + matching + thresholds + feedback gating.
 * Focused on Single Responsibility, Maintainability, and Readability.
 */
export function usePosePipeline({
  webcamLandmarks,
  videoLandmarks,
  isActive,
  videoCurrentTime,
  videoDuration,
  selectedFeedbackInterval,
  speak, // async(text, options?) guarded for mute by caller
  speakEncouragement // (text)
}) {
  const [poseMatchData, setPoseMatchData] = useState(null);
  const [isCalibrated, setIsCalibrated] = useState(false);

  // Internal pipeline state
  const kalmanFilters = useRef([]);
  const [kalmanR, setKalmanR] = useState(0.01);
  const [kalmanQ, setKalmanQ] = useState(0.1);
  const [prevWebcamLandmarks, setPrevWebcamLandmarks] = useState(null);
  const [prevVideoLandmarks, setPrevVideoLandmarks] = useState(null);
  const [landmarkPerformance, setLandmarkPerformance] = useState({});
  const [lastCurrentTimeFeedback, setLastCurrentTimeFeedback] = useState(0);
  const [lastRemainingTimeFeedback, setLastRemainingTimeFeedback] = useState(0);
  const [landmarksVisible, setLandmarksVisible] = useState(true);
  const calibrationTimeoutRef = useRef(null);

  // Feedback interval options mapping
  const feedbackIntervalOptions = {
    'frequent': 60,
    'balanced': 150,
    'minimal': 300,
    'smart': 'adaptive'
  };

  // Use user-selected feedback interval or fallback to dynamic calculation
  const userFeedbackInterval = selectedFeedbackInterval ? feedbackIntervalOptions[selectedFeedbackInterval] : null;
  const minInterval = 30; // Minimum 30 seconds between feedback
  const maxInterval = 300; // Maximum 5 minutes between feedback
  const feedbackFactor = 0.1;
  const remainingTimeFactor = 0.15;
  
  // Handle smart adaptive feedback
  const isSmartFeedback = userFeedbackInterval === 'adaptive';
  
  const feedbackInterval = isSmartFeedback 
    ? Math.max(minInterval, Math.min(maxInterval, videoDuration * feedbackFactor)) // Dynamic for smart mode
    : (userFeedbackInterval || 150); // Default to balanced (150 seconds) if no selection
  const remainingTimeFeedbackInterval = Math.max(minInterval, Math.min(maxInterval, videoDuration * remainingTimeFactor));

  // Debug logging for feedback intervals
  console.log(`Feedback intervals - Selected: ${selectedFeedbackInterval}, User interval: ${userFeedbackInterval}, Final interval: ${feedbackInterval}s, Remaining time interval: ${remainingTimeFeedbackInterval}s`);

  const estimateKalmanParameters = useCallback((landmarks) => {
    if (!Array.isArray(landmarks) || landmarks.length === 0) return;
    const variance = landmarks.reduce((acc, landmark) => {
      return acc + Math.pow(landmark.x - landmark.y, 2) + Math.pow(landmark.y - landmark.z, 2);
    }, 0) / landmarks.length;

    const newQ = Math.min(1, Math.max(0.01, variance * 0.1));
    const newR = Math.min(1, Math.max(0.01, variance * 0.01));
    setKalmanQ(newQ);
    setKalmanR(newR);
  }, []);

  const calculatePoseMatch = useCallback((camLandmarks, vidLandmarks) => {
    const config = PoseConfigManager.getCurrentConfig();
    const requiredIndices = config.requiredLandmarkIndices;

    const webcamVisible = areLandmarksVisible(camLandmarks, requiredIndices, config);
    const videoVisible = areLandmarksVisible(vidLandmarks, requiredIndices, config);
    setLandmarksVisible(webcamVisible && videoVisible);
    // Do not early return; proceed to compute with available data to keep poseMatchData flowing

    const { angleDifferencesMatch, anomalousIndices, totalDifferenceMatch, validAngles } = calculateAngleDifferencesAndAnomalies(
      camLandmarks,
      vidLandmarks,
      config
    );

    const averageDifferenceMatch = validAngles > 0 ? totalDifferenceMatch / validAngles : 0;
    const matchPercentage = validAngles > 0 ? Math.max(0, Math.min(100, averageDifferenceMatch)) : 0;

    const excellentAverageThreshold = 95;
    const goodAverageThreshold = 85;
    const fairAverageThreshold = 70;

    let performanceLevel;
    let color;
    if (matchPercentage >= excellentAverageThreshold) {
      performanceLevel = 'Excellent';
      color = 'rgb(0, 255, 0)';
    } else if (matchPercentage >= goodAverageThreshold) {
      performanceLevel = 'Good';
      color = 'rgb(173, 255, 47)';
    } else if (matchPercentage >= fairAverageThreshold) {
      performanceLevel = 'Fair';
      color = 'rgb(255, 165, 0)';
    } else {
      performanceLevel = 'Poor';
      color = 'rgb(255, 0, 0)';
    }

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

    // Feedback gating (sequence guard with else-if)
    if (isActive && videoCurrentTime > 0 && (videoCurrentTime - lastCurrentTimeFeedback) >= feedbackInterval) {
      const worstLandmarks = Object.entries(landmarkPerformance)
        .sort(([, totalDiffA], [, totalDiffB]) => totalDiffB - totalDiffA)
        .slice(0, 1)
        .map(([landmark]) => landmark);

      const feedbackText = `Please pay attention to ${worstLandmarks.join(', ')}.`;
      console.log(`Form feedback triggered at ${videoCurrentTime}s (interval: ${feedbackInterval}s)`);
      try { speak && speak(feedbackText); } catch (_) {}

      setLastCurrentTimeFeedback(videoCurrentTime);
      setLandmarkPerformance({});
    } else if (isActive && videoCurrentTime > 0 && (videoCurrentTime - lastRemainingTimeFeedback) >= remainingTimeFeedbackInterval) {
      const minutes = Math.floor(videoCurrentTime / 60);
      const seconds = Math.floor(videoCurrentTime % 60);
      const timeText = minutes > 0
        ? `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`
        : `${seconds} second${seconds !== 1 ? 's' : ''}`;
      console.log(`Encouragement feedback triggered at ${videoCurrentTime}s (interval: ${remainingTimeFeedbackInterval}s)`);
      try { speakEncouragement && speakEncouragement(timeText); } catch (_) {}
      setLastRemainingTimeFeedback(videoCurrentTime);
    }

    return {
      percentage: matchPercentage,
      color,
      angleDifferencesMatch,
      anomalousIndices,
      performanceFeedback: performanceLevel,
      mostMisalignedLandmarks: sortedLandmarks
    };
  }, [isActive, videoCurrentTime, lastCurrentTimeFeedback, lastRemainingTimeFeedback, feedbackInterval, remainingTimeFeedbackInterval, landmarkPerformance, speak, speakEncouragement]);

  // Calibration effect
  useEffect(() => {
    if (webcamLandmarks.length > 0 && videoLandmarks.length > 0 && !isCalibrated) {
      if (calibrationTimeoutRef.current) clearTimeout(calibrationTimeoutRef.current);
      calibrationTimeoutRef.current = setTimeout(async () => {
        const success = await CalibrationService.calibrate(videoLandmarks, webcamLandmarks);
        setIsCalibrated(success);
        if (success) {
          try { speak && speak('Calibration complete. Ready to start.'); } catch (_) {}
        }
      }, 1000);
    }
    return () => {
      if (calibrationTimeoutRef.current) clearTimeout(calibrationTimeoutRef.current);
    };
  }, [webcamLandmarks, videoLandmarks, isCalibrated, speak]);

  // Landmark processing effect
  useEffect(() => {
    if (webcamLandmarks.length > 0 && videoLandmarks.length > 0) {
      estimateKalmanParameters(webcamLandmarks);
      if (kalmanFilters.current.length === 0) {
        kalmanFilters.current = webcamLandmarks.map(() => new KalmanFilter());
      }
      kalmanFilters.current.forEach(filter => filter.setParameters({ R: kalmanR, Q: kalmanQ }));

      const kalmanFilteredWebcamLandmarks = APPLY_KALMAN
        ? webcamLandmarks.map((landmark, i) => ({
            x: kalmanFilters.current[i].filter(landmark.x),
            y: kalmanFilters.current[i].filter(landmark.y),
            z: kalmanFilters.current[i].filter(landmark.z),
          }))
        : webcamLandmarks;

      const kalmanFilteredVideoLandmarks = videoLandmarks;

      const smoothedWebcamLandmarks = smoothLandmarks(prevWebcamLandmarks, kalmanFilteredWebcamLandmarks, APPLY_SMOOTHING);
      const smoothedVideoLandmarks = smoothLandmarks(prevVideoLandmarks, kalmanFilteredVideoLandmarks, APPLY_SMOOTHING);

      setPrevWebcamLandmarks(smoothedWebcamLandmarks);
      setPrevVideoLandmarks(smoothedVideoLandmarks);

      const calibratedLandmarks = CalibrationService.transformLandmarks(smoothedWebcamLandmarks);
      const matchData = calculatePoseMatch(calibratedLandmarks, smoothedVideoLandmarks);
      setPoseMatchData(matchData);
    }
  }, [webcamLandmarks, videoLandmarks, estimateKalmanParameters, kalmanR, kalmanQ, prevWebcamLandmarks, prevVideoLandmarks, calculatePoseMatch]);

  const resetCalibration = useCallback(() => {
    CalibrationService.resetCalibration();
    setIsCalibrated(false);
  }, []);

  return {
    poseMatchData,
    isCalibrated,
    resetCalibration,
    landmarksVisible
  };
}

export default usePosePipeline;


