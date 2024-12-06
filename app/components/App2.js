'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { workoutTypes } from '../services/workoutData';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { landmarkNames, angleDict } from '../services/poseUtils';

function App2() {
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const videoCanvasRef = useRef(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const animationRef = useRef(null);
  const [webcamLandmarks, setWebcamLandmarks] = useState([]);
  const [videoLandmarks, setVideoLandmarks] = useState([]);
  const videoRefs = useRef([]);

  // Initialize PoseLandmarker
  useEffect(() => {
    async function loadPoseLandmarker() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });

      setPoseLandmarker(landmarker);
    }

    loadPoseLandmarker();
  }, []);

  // Add these helper functions
  const computeAngle = useCallback((angName, landmarks, angleDict) => {
    const angParams = angleDict[angName];
    if (!angParams) return NaN;

    const angleCoords = angParams[0].map(kpt => {
      const index = landmarkNames.indexOf(kpt);
      if (index === -1) return null;
      const landmark = landmarks[index];
      return landmark ? [landmark.x, landmark.y, landmark.z] : null;
    }).filter(coord => coord !== null);

    if (angleCoords.length < 3) return NaN;

    let ang = points3DToAngles(angleCoords);
    ang += angParams[2];
    ang *= angParams[3];

    // Normalize angles
    if (['pelvis', 'shoulders'].includes(angName)) {
      ang = ang > 90 ? ang - 180 : ang;
      ang = ang < -90 ? ang + 180 : ang;
    } else {
      ang = ang > 180 ? ang - 360 : ang;
      ang = ang < -180 ? ang + 360 : ang;
    }

    return ang;
  }, []);

  function points3DToAngles(coords) {
    if (coords.length < 3) return 0;

    const [p1, p2, p3] = coords;
    const vectorA = { x: p2[0] - p1[0], y: p2[1] - p1[1], z: p2[2] - p1[2] };
    const vectorB = { x: p3[0] - p2[0], y: p3[1] - p2[1], z: p3[2] - p2[2] };

    const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y + vectorA.z * vectorB.z;
    const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2 + vectorA.z ** 2);
    const magnitudeB = Math.sqrt(vectorB.x ** 2 + vectorB.y ** 2 + vectorB.z ** 2);

    const cosineAngle = dotProduct / (magnitudeA * magnitudeB);
    const clampedCosine = Math.max(-1, Math.min(1, cosineAngle));
    return Math.acos(clampedCosine) * (180 / Math.PI);
  }

  // Wrap detectPose in useCallback
  const detectPose = useCallback(async () => {
    if (!webcamRef.current || !poseLandmarker || !canvasRef.current) {
      return;
    }

    const video = webcamRef.current;
    
    if (video.readyState < 2) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    const canvasCtx = canvasRef.current.getContext('2d');
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;

    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);

    try {
      const result = await poseLandmarker.detectForVideo(video, performance.now());
      const drawingUtils = new DrawingUtils(canvasCtx);

      if (result.landmarks && result.landmarks[0]) {
        const currentLandmarks = result.landmarks[0];
        setWebcamLandmarks(currentLandmarks);
        
        if (videoLandmarks && videoLandmarks.length > 0) {
          // Calculate angles for both sets of landmarks
          const currentAngles = {};
          const videoAngles = {};
          
          for (const angName in angleDict) {
            currentAngles[angName] = computeAngle(angName, currentLandmarks, angleDict);
            videoAngles[angName] = computeAngle(angName, videoLandmarks, angleDict);
          }

          // Compare angles and calculate match percentage
          const validAngles = Object.keys(currentAngles).filter(
            ang => !isNaN(currentAngles[ang]) && !isNaN(videoAngles[ang])
          );

          const differences = validAngles.map(ang => {
            const diff = Math.abs(currentAngles[ang] - videoAngles[ang]);
            return Math.min(diff, 360 - diff) / 180; // Normalize to [0,1]
          });

          const averageDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
          const percentage = Math.max(0, (1 - averageDifference) * 100);

          // Use the same color interpolation logic
          const red = Math.min(255, Math.floor((1 - percentage / 100) * 255));
          const green = Math.min(255, Math.floor((percentage / 100) * 255));
          const color = `rgb(${red},${green},0)`;

          console.log(`Pose accuracy: ${percentage.toFixed(1)}%`);
          
          drawingUtils.drawLandmarks(currentLandmarks, { radius: 6, color });
          drawingUtils.drawConnectors(currentLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
            lineWidth: 6,
            color
          });
        } else {
          // Draw default blue landmarks while waiting for video landmarks
          drawingUtils.drawLandmarks(currentLandmarks, { 
            radius: 6,
            color: '#0000ff' // Blue color
          });
          drawingUtils.drawConnectors(currentLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
            lineWidth: 6,
            color: '#0000ff' // Blue color
          });
        }
      }
    } catch (error) {
      console.error("Error detecting pose:", error);
    }

    animationRef.current = requestAnimationFrame(detectPose);
  }, [poseLandmarker, videoLandmarks, webcamRef, canvasRef, computeAngle]);

  // Now we can reference detectPose in useCallback
  const startPoseDetection = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    detectPose();
  }, [detectPose]);

  // Update the useEffect for video landmarks
  useEffect(() => {
    if (poseLandmarker && videoRefs.current[0] && isWebcamActive && videoCanvasRef.current) {
      const detectVideoLandmarks = async () => {
        try {
          if (videoRefs.current[0].readyState >= 2) {
            const result = await poseLandmarker.detectForVideo(
              videoRefs.current[0], 
              performance.now()
            );
            if (result.landmarks && result.landmarks[0]) {
              console.log("Setting video landmarks:", result.landmarks[0]);
              setVideoLandmarks(result.landmarks[0]);
              
              // Draw landmarks on video canvas
              const video = videoRefs.current[0];
              const canvasCtx = videoCanvasRef.current.getContext('2d');
              const drawingUtils = new DrawingUtils(canvasCtx);
              
              // Set canvas dimensions to match video
              videoCanvasRef.current.width = video.videoWidth;
              videoCanvasRef.current.height = video.videoHeight;
              
              canvasCtx.clearRect(0, 0, videoCanvasRef.current.width, videoCanvasRef.current.height);
              drawingUtils.drawLandmarks(result.landmarks[0], {
                radius: 6,
                color: '#00ff00'  // Green landmarks for the workout video
              });
              drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
                lineWidth: 6,
                color: '#00ff00'
              });
            } else {
              console.log("No landmarks detected in video");
            }
          } else {
            console.log("Video not ready:", videoRefs.current[0].readyState);
          }
        } catch (error) {
          console.error("Error detecting video pose:", error);
        }
      };

      const currentVideoRef = videoRefs.current[0];
      currentVideoRef.currentTime = 0;
      currentVideoRef.play()
        .then(detectVideoLandmarks)
        .catch(error => console.error("Error playing video:", error));

      // Set up animation loop for continuous landmark detection
      let animationFrameId;
      const detectFrame = async () => {
        await detectVideoLandmarks();
        animationFrameId = requestAnimationFrame(detectFrame);
      };
      detectFrame();

      return () => {
        if (currentVideoRef) {
          currentVideoRef.pause();
        }
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [poseLandmarker, isWebcamActive]);

  useEffect(() => {
    if (videoLandmarks.length > 0) {
      console.log("Video landmarks set, starting pose detection");
      startPoseDetection();
    }
  }, [videoLandmarks, startPoseDetection]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        webcamRef.current.onloadedmetadata = () => {
          webcamRef.current.play();
          setIsWebcamActive(true);
        };
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (webcamRef.current && webcamRef.current.srcObject) {
      const tracks = webcamRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      webcamRef.current.srcObject = null;
      setIsWebcamActive(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Pause the first video
      if (videoRefs.current[0]) {
        videoRefs.current[0].pause();
      }
    }
  };

  return (
    <div className="app">
      {/* Webcam controls */}
      <div style={{ textAlign: 'center', margin: '20px' }}>
        <button 
          onClick={isWebcamActive ? stopWebcam : startWebcam}
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

      {/* Webcam and canvas container */}
      <div style={{ 
        position: 'relative', 
        width: '640px', 
        height: '480px',
        margin: '0 auto'
      }}>
        <video
          ref={webcamRef}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>

      {/* Workout videos grid (just one for now) */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {workoutTypes.map((type, index) => (
          <div key={index} className="video-container" style={{ 
            position: 'relative',
            width: '640px',
            height: '480px'
          }}>
            <video
              ref={el => videoRefs.current[index] = el}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              controls
              crossOrigin="anonymous"
              src={type.video}
              onPlay={async () => {
                if (poseLandmarker && videoRefs.current[index]) {
                  try {
                    const result = await poseLandmarker.detectForVideo(
                      videoRefs.current[index], 
                      performance.now()
                    );
                    if (result.landmarks) {
                      setVideoLandmarks(result.landmarks[0]);
                      
                      // Draw landmarks on video canvas
                      const canvasCtx = videoCanvasRef.current.getContext('2d');
                      const drawingUtils = new DrawingUtils(canvasCtx);
                      
                      canvasCtx.clearRect(0, 0, videoCanvasRef.current.width, videoCanvasRef.current.height);
                      drawingUtils.drawLandmarks(result.landmarks[0], {
                        radius: 6,
                        color: '#00ff00'
                      });
                      drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
                        lineWidth: 6,
                        color: '#00ff00'
                      });
                    }
                  } catch (error) {
                    console.error("Error detecting video pose:", error);
                  }
                }
              }}
            />
            <canvas
              ref={videoCanvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none'
              }}
            />
            <div style={{ 
              position: 'absolute',
              bottom: '-60px',
              left: 0,
              right: 0,
              textAlign: 'center' 
            }}>
              <h4>{type.title}</h4>
              <p>{type.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App2;
