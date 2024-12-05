'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { workoutTypes } from '../services/workoutData';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

function App2() {
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
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
        setWebcamLandmarks(result.landmarks[0]);
        
        // Only draw colored landmarks if we have video landmarks to compare against
        if (videoLandmarks && videoLandmarks.length > 0) {
          const differences = result.landmarks[0].map((landmark, index) => {
            const videoLandmark = videoLandmarks[index];
            if (!videoLandmark) return 1;
            const dx = landmark.x - videoLandmark.x;
            const dy = landmark.y - videoLandmark.y;
            const dz = landmark.z - videoLandmark.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
          });

          const averageDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
          const color = averageDifference > 1.0 ? 'red' : 'green';
          
          console.log("Differences:", differences);
          console.log(`Pose accuracy: ${Math.max(0, Math.min(100, (1 - averageDifference) * 100)).toFixed(1)}%`);
          console.log(color);

          drawingUtils.drawLandmarks(result.landmarks[0], { radius: 6, color });
          drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
            lineWidth: 6,
            color
          });
        } else {
          // Draw default blue landmarks while waiting for video landmarks
          drawingUtils.drawLandmarks(result.landmarks[0], { 
            radius: 6,
            color: '#0000ff' // Blue color
          });
          drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
            lineWidth: 6,
            color: '#0000ff' // Blue color
          });
        }
      }
    } catch (error) {
      console.error("Error detecting pose:", error);
    }

    animationRef.current = requestAnimationFrame(detectPose);
  }, [poseLandmarker, videoLandmarks, webcamRef, canvasRef]);

  // Now we can reference detectPose in useCallback
  const startPoseDetection = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    detectPose();
  }, [detectPose]);

  // Add new useEffect for video landmarks
  useEffect(() => {
    if (poseLandmarker && videoRefs.current[0] && isWebcamActive) {
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

      videoRefs.current[0].currentTime = 0;
      videoRefs.current[0].play()
        .then(detectVideoLandmarks)
        .catch(error => console.error("Error playing video:", error));

      return () => {
        if (videoRefs.current[0]) {
          videoRefs.current[0].pause();
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

      {/* Workout videos grid */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {workoutTypes.map((type, index) => (
          <div key={index} className="video-container">
            <video
              ref={el => videoRefs.current[index] = el}
              width="360"
              height="215"
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
                    }
                  } catch (error) {
                    console.error("Error detecting video pose:", error);
                  }
                }
              }}
            />
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
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
