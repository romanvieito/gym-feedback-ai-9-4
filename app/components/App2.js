'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { workoutTypes } from '../services/workoutData';
import { WebcamComponent } from './WebcamComponent';
import { WorkoutVideoComponent } from './WorkoutVideoComponent';
import { PoseDetectionService } from '../services/PoseDetectionService';
import { computeAngle } from '../services/angleUtils';
import { angleDict, landmarkNames } from '../services/poseUtils';

function App2() {
  const [landmarkers, setLandmarkers] = useState({
    webcamLandmarker: null,
    videoLandmarker: null
  });
  const [isWebcamActive, setIsWebcamActive] = useState(false);
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
      minHeight: '100vh'
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
        />

        {/* Webcam Component */}
        {isWebcamActive && (
          <WebcamComponent
            poseLandmarker={landmarkers.webcamLandmarker}
            onLandmarksUpdate={(landmarks) => {
              if (isWebcamActive) {
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
        alignItems: 'center',
        margin: '20px'
      }}>
        <button 
          onClick={() => {
            setIsWebcamActive(!isWebcamActive);
            if (!isWebcamActive) {
              setWebcamLandmarks([]);
            }
          }}
          style={{
            padding: '30px 20px',
            margin: '10px',
            backgroundColor: isWebcamActive ? '#ff4444' : '#44aa44',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isWebcamActive ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
          {isWebcamActive ? 'Stop' : 'Start Workout with Webcam'}
        </button>
      </div>
    </div>
  );
}

export default App2;
