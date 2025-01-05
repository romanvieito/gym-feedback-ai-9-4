'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { workoutTypes } from '../services/workoutData';
import { WebcamComponent } from './WebcamComponent';
import { WorkoutVideoComponent } from './WorkoutVideoComponent';
import { PoseDetectionService } from '../services/PoseDetectionService';
import { angleDict, landmarkNames } from '../services/poseUtils';
import { calculateAngleDifferencesAndAnomalies } from '../services/angleUtils';
import { areLandmarksVisible } from '../services/poseUtils'; // Import the visibility check function

import mixpanel from 'mixpanel-browser';

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
  

  useEffect(() => {
    PoseDetectionService.initialize()
      .then(setLandmarkers)
      .catch(error => console.error("Error initializing pose landmarkers:", error));
  }, []);

  
  const calculatePoseMatch = useCallback((webcamLandmarks, videoLandmarks) => {
    const requiredIndices = Array.from({ length: landmarkNames.length - 10 }, (_, i) => i + 10); // Indices from 10 onwards

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

    // Define adaptive thresholds for ordinal scale
    const excellentAverageThreshold = 85;  // Higher threshold for excellent
    const goodAverageThreshold = 70;       // Higher threshold for good
    const fairAverageThreshold = 55;       // Higher threshold for fair

    // Determine the performance level and color to be corrected 
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

    // // Update the state with the sorted landmarks
    // setSortedLandmarks(sortedLandmarks);

    // Accumulate landmark performance
    Object.entries(angleDifferencesMatch).forEach(([landmark, diff]) => {
      setLandmarkPerformance(prev => ({
        ...prev,
        [landmark]: (prev[landmark] || 0) + diff
      }));
    });

    // Provide audio feedback at 5 second intervals
    if (isActive && videoCurrentTime > 0 && (videoCurrentTime - lastCurrentTimeFeedback) >= feedbackInterval) {
      // Rank landmarks based on accumulated performance
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
      // *** Apply Calibration Before Comparison ***
      // TODO: this calibration has to be retested, not sure id mediapipe already calibrates as expected
      const calibratedLandmarks = calibrateLandmarks(webcamLandmarks, videoLandmarks);
      /////*****OJO OJO OJO OJO theline bellow is ONLY to check what happens if we use the videoLandmarks directly for comparison
      //const calibratedLandmarks = videoLandmarks
      /////*****OJO OJO OJO OJO the line above is ONLY to check what happens if we use the videoLandmarks directly for comparison
      const matchData = calculatePoseMatch(calibratedLandmarks, videoLandmarks);
      setPoseMatchData(matchData);
    }
  }, [webcamLandmarks, videoLandmarks, calculatePoseMatch]);

  function getColorFromPercentage(percentage) {
    if (isNaN(percentage) || percentage === null) return 'rgb(255,0,0)';
    
    const green = Math.min(255, Math.floor((100 - percentage) * 2.55));
    const red = Math.min(255, Math.floor(percentage * 2.55));
    return `rgb(${red},${green},0)`;
  }

  return (
    <div className="app" style={{ 
      backgroundColor: 'white',
      color: 'black',
    }}>

      {/* Video Components Container */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        padding: '20px',
        position: 'relative'
      }}>
        {/* Workout Videos */}
        <WorkoutVideoComponent
          workout={workoutTypes[0]}
          poseLandmarker={landmarkers.videoLandmarker}
          onLandmarksUpdate={setVideoLandmarks}
          isActive={isActive}
          onCurrentTimeUpdate={setVideoCurrentTime}
          onDurationUpdate={setVideoDuration}
        />

        {/* Message on top of the video component */}
        {!landmarksVisible && (
          <div style={{
            position: 'absolute',
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            zIndex: 10,
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100% - 20px)',
            boxSizing: 'border-box',
            textAlign: 'center'
          }}>
            Please adjust your position to capture all your full body otherwise our feedback might be inaccurate.
          </div>
        )}

        {/* Webcam Component */}
        {isActive && (
          <div style={{
            padding: '10px',
            position: 'relative'
          }}>
            <WebcamComponent
              poseLandmarker={landmarkers.webcamLandmarker}
              onLandmarksUpdate={(landmarks) => {
                if (isActive) {
                  setWebcamLandmarks(landmarks);
                }
              }}
              poseMatchData={poseMatchData}
            />
          </div>
        )}

      </div>
      
      {/* Controls */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
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
          style={{
            padding: '10px 10px',
            backgroundColor: isActive ? '#ff4444' : '#44aa44',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
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
      </div>
    </div>
  );
}

export default App;
