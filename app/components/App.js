'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { workoutTypes } from '../services/workoutData';
import { WebcamComponent } from './WebcamComponent';
import { WorkoutVideoComponent } from './WorkoutVideoComponent';
import { PoseDetectionService } from '../services/PoseDetectionService';
import { angleDict, landmarkNames } from '../services/poseUtils';
import { calculateAngleDifferencesAndAnomalies } from '../services/angleUtils';
import mixpanel from 'mixpanel-browser';

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

  // const [sortedLandmarks, setSortedLandmarks] = useState([]);

  
  const calculatePoseMatch = useCallback((webcamLandmarks, videoLandmarks) => {
    const { angleDifferences, anomalousIndices, totalDifference, validAngles } = calculateAngleDifferencesAndAnomalies(
      webcamLandmarks,
      videoLandmarks,
      angleDict,
      landmarkNames
    );

    // the distance close to 0 is perfect so performance level is excellent
    // hay que jugar aqui pero esto esta de palo
    const averageDifference = validAngles > 0 ? totalDifference / validAngles : 0;
    // Normalize the difference to a 0-100 scale, with a maximum difference of 180 degrees
    const matchPercentage = validAngles > 0 ? Math.max(0, Math.min(100, (1 - (averageDifference / 180)) * 100)) : 0;

    // Define adaptive thresholds for ordinal scale - subir # to make it easier to achieve
    const excellentAverageThreshold = 45;  // was 30 - allow more deviation
    const goodAverageThreshold = 65;       // was 45
    const fairAverageThreshold = 85;       // was 60

    // Define adaptive thresholds for ordinal scale - less is 
    const excellentMatchThreshold = 60;     // was 70 - lower required match %
    const goodMatchThreshold = 40;         // was 50
    const fairMatchThreshold = 20;         // was 30

    // // Add debug logging
    // console.log('Debug values:', {
    //     videoCurrentTime,
    //     videoRemainingTime,
    //     averageDifference,
    //     matchPercentage,
    //     thresholds: {
    //         excellent: {
    //             avg: excellentAverageThreshold,
    //             match: excellentMatchThreshold
    //         },
    //         good: {
    //             avg: goodAverageThreshold,
    //             match: goodMatchThreshold
    //         },
    //         fair: {
    //             avg: fairAverageThreshold,
    //             match: fairMatchThreshold
    //         },
    //         video_status: {
    //           current: videoCurrentTime,
    //           remaining: videoRemainingTime
    //         },
    //     },
    // });

    // Determine the performance level and color
    let performanceLevel, color;
    if (averageDifference <= excellentAverageThreshold && matchPercentage >= excellentMatchThreshold) {
      performanceLevel = "Excellent";
      color = 'rgb(0, 255, 0)'; // Green
    } else if (averageDifference <= goodAverageThreshold && matchPercentage >= goodMatchThreshold) {
      performanceLevel = "Good";
      color = 'rgb(173, 255, 47)'; // Yellow-green
    } else if (averageDifference <= fairAverageThreshold && matchPercentage >= fairMatchThreshold) {
      performanceLevel = "Fair";
      color = 'rgb(255, 165, 0)'; // Orange
    } else {
      performanceLevel = "Poor";
      color = 'rgb(255, 0, 0)'; // Red
    }

    console.log(`Performance Level: ${performanceLevel}`);

    // Identify the top 3 most misaligned landmarks
    const sortedLandmarks = Object.entries(angleDifferences)
      .sort(([, diffA], [, diffB]) => diffB - diffA)
      .slice(0, 3)
      .map(([landmark]) => landmark);

    // // Update the state with the sorted landmarks
    // setSortedLandmarks(sortedLandmarks);

    // Provide audio feedback at 5 second intervals
    // this is only triggered when the video is active and for now it is triggered every 5 seconds
    // TODO: make it more comprehensive  considering the history of the performance in the "feedbackinterval"
    if (isActive && videoCurrentTime > 0 && (videoCurrentTime - lastCurrentTimeFeedback) >= feedbackInterval) {
      const feedbackText = `Please pay attention to ${sortedLandmarks.join(', ')}.`;
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(feedbackText);
        window.speechSynthesis.speak(utterance);
      }
      console.log(`Feedback event triggered at ${videoCurrentTime} seconds`);
      setLastCurrentTimeFeedback(videoCurrentTime); // Update the last feedback time
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
      angleDifferences,
      anomalousIndices,
      performanceFeedback: performanceLevel,
      mostMisalignedLandmarks: sortedLandmarks
    };
  }, [videoCurrentTime, videoRemainingTime, lastCurrentTimeFeedback, lastRemainingTimeFeedback, feedbackInterval, remainingTimeFeedbackInterval]);

  useEffect(() => {
    if (webcamLandmarks.length > 0 && videoLandmarks.length > 0) {
      const matchData = calculatePoseMatch(webcamLandmarks, videoLandmarks);
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
        padding: '20px'
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

        {/* Webcam Component */}
        {isActive && (
          <WebcamComponent
            poseLandmarker={landmarkers.webcamLandmarker}
            onLandmarksUpdate={(landmarks) => {
              if (isActive) {
                setWebcamLandmarks(landmarks);
              }
            }}
            poseMatchData={poseMatchData}
          />
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
