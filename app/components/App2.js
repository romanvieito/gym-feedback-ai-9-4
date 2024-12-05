'use client';

import React, { useState, useRef, useEffect } from 'react';
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

  // Add startPoseDetection function
  const startPoseDetection = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    detectPose();
  };

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        webcamRef.current.onloadedmetadata = () => {
          webcamRef.current.play();
          setIsWebcamActive(true);
          startPoseDetection();
          
          // Play the first video
          if (videoRefs.current[0]) {
            videoRefs.current[0].play().catch(error => {
              console.error("Error playing video:", error);
            });
          }
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

  // Detect poses
  const detectPose = async () => {
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

      if (result.landmarks) {
        setWebcamLandmarks(result.landmarks[0]); // Store webcam landmarks
        const drawingUtils = new DrawingUtils(canvasCtx);
        drawingUtils.drawLandmarks(result.landmarks[0], { radius: 6 });
        drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
          lineWidth: 6
        });
      }
    } catch (error) {
      console.error("Error detecting pose:", error);
    }

    animationRef.current = requestAnimationFrame(detectPose);
  };

  // Compare landmarks
  const compareLandmarks = () => {
    if (webcamLandmarks.length === 0 || videoLandmarks.length === 0) {
      console.warn("No landmarks to compare");
      return;
    }

    // Example comparison logic (Euclidean distance)
    const differences = webcamLandmarks.map((landmark, index) => {
      const videoLandmark = videoLandmarks[index];
      const dx = landmark.x - videoLandmark.x;
      const dy = landmark.y - videoLandmark.y;
      const dz = landmark.z - videoLandmark.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    });

    console.log("Pose differences:", differences);
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
                // Start pose detection for video
                if (poseLandmarker && videoRefs.current[index]) {
                  try {
                    const result = await poseLandmarker.detectForVideo(
                      videoRefs.current[index], 
                      performance.now()
                    );
                    if (result.landmarks) {
                      setVideoLandmarks(result.landmarks[0]);
                      compareLandmarks();
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
