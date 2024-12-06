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
    console.log('Calculating pose match:', { currentLandmarks, videoLandmarks });
    
    const angleDifferences = {};
    let totalDifference = 0;
    let validAngles = 0;

    for (const angName in angleDict) {
      const currentAngle = computeAngle(angName, currentLandmarks, angleDict, landmarkNames);
      const videoAngle = computeAngle(angName, videoLandmarks, angleDict, landmarkNames);

      if (!isNaN(currentAngle) && !isNaN(videoAngle)) {
        const diff = Math.abs(currentAngle - videoAngle);
        const normalizedDiff = Math.min(diff, 360 - diff) / 180;
        angleDifferences[angName] = (1 - normalizedDiff) * 100;
        totalDifference += angleDifferences[angName];
        validAngles++;
      }
    }

    const matchPercentage = validAngles > 0 ? totalDifference / validAngles : 0;
    const color = getColorFromPercentage(matchPercentage);

    console.log('Match result:', { matchPercentage, color, angleDifferences });

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
    <div className="app">
      {/* Controls */}
      <div style={{ textAlign: 'center', margin: '20px' }}>
        <button 
          onClick={() => {
            setIsWebcamActive(!isWebcamActive);
            if (!isWebcamActive) {
              setWebcamLandmarks([]);
            }
          }}
          style={{
            padding: '10px 20px',
            margin: '10px',
            backgroundColor: isWebcamActive ? '#ff4444' : '#44aa44',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {isWebcamActive ? 'Stop Webcam' : 'Start Webcam'}
        </button>
      </div>

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

      {/* Workout Videos */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        padding: '20px'
      }}>
        <WorkoutVideoComponent
          workout={workoutTypes[0]}
          poseLandmarker={landmarkers.videoLandmarker}
          onLandmarksUpdate={setVideoLandmarks}
        />
      </div>
    </div>
  );
}

export default App2;
