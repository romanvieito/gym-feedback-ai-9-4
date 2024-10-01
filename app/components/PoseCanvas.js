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

const PoseCanvas = ({ videoRef, poseLandmarker, videoDimensions, setFeedback }) => {
  const canvasRef = useRef(null);
  const [landmarksData, setLandmarksData] = useState({});
  const [landmarksDatarealworld, setLandmarksDatarealworld] = useState({});
  const frameIndex = useRef(0);
  const [currentFeedback, setCurrentFeedback] = useState("");

  const setTimedFeedback = useCallback((feedback) => {
    console.log("Setting feedback:", feedback);
    setFeedback(feedback);
    // The Overlay component will handle the timing now
  }, [setFeedback]);

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

  return <canvas ref={canvasRef} style={{ width: `${videoDimensions.width}px`, height: `${videoDimensions.height}px` }}></canvas>;
};

export default PoseCanvas;

