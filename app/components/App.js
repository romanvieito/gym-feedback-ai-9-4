'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { workoutTypes } from '../services/workoutData';
import { WebcamComponent } from './WebcamComponent';
import { WorkoutVideoComponent } from './WorkoutVideoComponent';
import { PoseDetectionService } from '../services/PoseDetectionService';
import { computeAngle } from '../services/angleUtils';
import { angleDict, landmarkNames } from '../services/poseUtils';
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

  useEffect(() => {
    PoseDetectionService.initialize()
      .then(setLandmarkers)
      .catch(error => console.error("Error initializing pose landmarkers:", error));
  }, []);

  const calculatePoseMatch = useCallback((currentLandmarks, videoLandmarks) => {
    const angleDifferences = {};
    let totalDifference = 0;
    let validAngles = 0;

    for (const angName in angleDict) {
      const currentAngle = computeAngle(angName, currentLandmarks, angleDict, landmarkNames);
      const videoAngle = computeAngle(angName, videoLandmarks, angleDict, landmarkNames);

      console.log(`${angName}:`, {
        currentAngle,
        videoAngle,
        isValid: !isNaN(currentAngle) && !isNaN(videoAngle)
      });

      if (!isNaN(currentAngle) && !isNaN(videoAngle)) {
        const diff = Math.abs(currentAngle - videoAngle);
        const normalizedDiff = Math.min(diff, 360 - diff) / 180;
        angleDifferences[angName] = (1 - normalizedDiff) * 100;
        totalDifference += angleDifferences[angName];
        validAngles++;
      }
    }

    const matchPercentage = validAngles > 0 ? totalDifference / validAngles : 0;

    const goodMatchThreshold = 90;
    const poorMatchThreshold = 60;

    let red, green;
    if (matchPercentage >= goodMatchThreshold) {
      red = 0;
      green = 255;
    } else if (matchPercentage <= poorMatchThreshold) {
      red = 255;
      green = 0;
    } else {
      const ratio = (matchPercentage - poorMatchThreshold) / (goodMatchThreshold - poorMatchThreshold);
      red = Math.floor(255 * (1 - ratio));
      green = Math.floor(255 * ratio);
    }

    const color = `rgb(${red},${green},0)`;

    console.log('Final calculation:', {
      validAngles,
      totalDifference,
      matchPercentage,
      color,
      red,
      green
    });

    return {
      percentage: matchPercentage,
      color,
      angleDifferences
    };
  }, []);

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
