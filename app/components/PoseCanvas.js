/**
 * PoseCanvas Component
 * 
 * This component is responsible for rendering a canvas element that overlays on top of a video element.
 * It utilizes the MediaPipe library's PoseLandmarker to detect and visualize human poses in real-time.
 * 
 * Props:
 * - videoRef: A reference to the video element that is being used for pose detection.
 * - poseLandmarker: An instance of the PoseLandmarker from the MediaPipe library, which is used to process the video frames and detect poses.
 * - videoDimensions: An object that holds the current width and height of the video, passed down from the parent component.
 * - setFeedback: A function to set the feedback received from the backend.
 * 
 * State:
 * - canvasDimensions: An object that holds the current width and height of the canvas, initialized to 480x360.
 * - currentFeedback: A string to store the current feedback message.
 * - isFullScreen: A boolean to track whether the screen is in fullscreen mode.
 * 
 * Effects:
 * - The useEffect hook is used to set up the pose detection logic. It continuously draws the video frames onto the canvas and applies pose detection using the PoseLandmarker.
 * - The canvas is updated in an animation loop, where each frame is processed to detect poses and draw the results on the canvas.
 * 
 * Utility Functions:
 * - getScaledDimensions: A helper function that calculates the appropriate dimensions for the canvas based on the video dimensions and specified maximum constraints.
 */


import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';
import Overlay from './Overlay'; 

// Max width and height constraints
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

function getScaledDimensions(width, height, maxWidth, maxHeight) {
  let aspectRatio = width / height;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}

const PoseCanvas = ({ videoRef, poseLandmarker, videoDimensions, setFeedback, feedback }) => {
  const canvasRef = useRef(null);
  const [landmarksData, setLandmarksData] = useState({});
  const [landmarksDatarealworld, setLandmarksDatarealworld] = useState({});
  const frameIndex = useRef(0);
  const [currentFeedback, setCurrentFeedback] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const setTimedFeedback = useCallback((feedback) => {
    console.log("Setting feedback:", feedback);
    setFeedback(feedback);
    // The Overlay component will handle the timing now
  }, [setFeedback]);

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  useEffect(() => {
    let animationId;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');
    const drawingUtils = new DrawingUtils(canvasCtx);

    const sendLandmarksToBackend = async (landmarks, realworldlandmarks) => {
      try {
        const response = await fetch('/api/py/process_landmarks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            frameIndex: frameIndex.current,
            landmarks: landmarks,
            realworldlandmarks: realworldlandmarks
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Processed Data:', data);
        if (data.feedback && data.feedback !== "No feedback yet") {
          setTimedFeedback(data.feedback);
        }
      } catch (error) {
        console.error('Error sending landmarks:', error);
      }
    };

    async function detectPose() {
      if (
        videoRef.current &&
        poseLandmarker &&
        videoRef.current.readyState >= 2
      ) {
        const videoWidth = videoDimensions.width;
        const videoHeight = videoDimensions.height;

        // Update canvas dimensions
        canvasElement.width = videoWidth;
        canvasElement.height = videoHeight;

        // Draw video on canvas
        canvasCtx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

        const result = await poseLandmarker.detectForVideo(
          videoRef.current,
          performance.now()
        );

        if (result.landmarks) {
          for (const landmarks of result.landmarks) {
            drawingUtils.drawLandmarks(landmarks, { radius: 5, color: 'red' });
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
              color: 'green',
              lineWidth: 2,
            });
          }
          // Save landmarks data with the frame index
          const landmarksData = result.landmarks.reduce((acc, landmark) => {
            acc = landmark;
            return acc;
          }, {});
          // Save landmarks data with the frame index

          const landmarksDatarealworld = result.worldLandmarks.reduce((acc, worldlandmark) => {
            acc = worldlandmark;
            return acc;
          }, {});
          setLandmarksData(landmarksData);
          setLandmarksDatarealworld(landmarksDatarealworld);
          // Send landmarks to backend for every frame
          sendLandmarksToBackend(landmarksData, landmarksDatarealworld);
          // // Send landmarks to backend every 10 frames
          // if (frameIndex.current % 10 === 0) {
          //   sendLandmarksToBackend(landmarksData,landmarksDatarealworld);
          // }

          frameIndex.current += 1;  // Increment the frame index
        }
      }
      animationId = requestAnimationFrame(detectPose);
    }

    detectPose();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [videoRef, poseLandmarker, videoDimensions, setTimedFeedback]);

  useEffect(() => {
    const fullscreenChangeHandler = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', fullscreenChangeHandler);

    return () => {
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: `${videoDimensions.width}px`, height: `${videoDimensions.height}px` }}></canvas>
      <Overlay statistics={feedback ? [feedback] : []} visible={true} />
      {!isFullScreen && (
        <div style={{ position: 'absolute', bottom: 10, right: 10, color: 'white' }}>
          <button 
            onClick={handleFullScreen}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '10px',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default PoseCanvas;

