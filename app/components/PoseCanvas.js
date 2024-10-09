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
 * - isWebcam: A boolean indicating whether the video is from a webcam or an uploaded video.
 * - otherLandmarks: An array of landmarks from the uploaded video, used for comparison with the webcam landmarks.
 * - updateLandmarks: A function to update the landmarks in the parent component.
 * 
 * State:
 * - canvasDimensions: An object that holds the current width and height of the canvas, initialized to 480x360.
 * - currentFeedback: A string to store the current feedback message.
 * - isFullScreen: A boolean to track whether the screen is in fullscreen mode.
 * - poseMatchPercentage: A number between 0 and 100 representing the percentage of match between webcam and uploaded video landmarks.
 * 
 * Effects:
 * - The useEffect hook is used to set up the pose detection logic. It continuously draws the video frames onto the canvas and applies pose detection using the PoseLandmarker.
 * - The canvas is updated in an animation loop, where each frame is processed to detect poses and draw the results on the canvas.
 * 
 */

import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';

const PoseCanvas = forwardRef(({ videoRef, poseLandmarker, videoDimensions, setFeedback, isWebcam, updateLandmarks }, ref) => {
  const canvasRef = useRef(null);
  const frameIndex = useRef(0);
  const animationIdRef = useRef(null);
  const drawingUtilsRef = useRef(null);
  const videoReadyRef = useRef(false);

  const setTimedFeedback = useCallback((feedback) => {
    console.log("Setting feedback:", feedback);
    setFeedback(feedback);
  }, [setFeedback]);

  const stopPoseDetection = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

  const startPoseDetection = useCallback(() => {
    if (videoReadyRef.current) {
      detectPose();
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }, []);

  useImperativeHandle(ref, () => ({
    stopPoseDetection,
    startPoseDetection,
    clearCanvas,
    setVideoReady: (ready) => {
      videoReadyRef.current = ready;
      if (ready) {
        clearCanvas(); // Limpiar el canvas cuando el video está listo
        stopPoseDetection(); // Detener cualquier detección anterior
        frameIndex.current = 0; // Reiniciar el índice del frame
        startPoseDetection(); // Iniciar la detección con el nuevo video
      }
    }
  }));

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
    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      console.warn("Canvas element is null");
      return;
    }
    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) {
      console.warn("Canvas context is null");
      return;
    }

    const videoWidth = videoDimensions.width;
    const videoHeight = videoDimensions.height;

    if (!videoWidth || !videoHeight) {
      console.warn("Invalid video dimensions:", videoDimensions);
      return;
    }

    // Update canvas dimensions
    canvasElement.width = videoWidth;
    canvasElement.height = videoHeight;

    // Clear the canvas before drawing
    clearCanvas();

    // Draw video on canvas
    canvasCtx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

    if (videoRef.current && poseLandmarker && videoRef.current.readyState >= 2) {
      const result = await poseLandmarker.detectForVideo(videoRef.current, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        const currentLandmarks = result.landmarks[0];

        // Update landmarks in the parent component
        updateLandmarks(isWebcam, currentLandmarks);

        // Call the function to send landmarks to the backend
        sendLandmarksToBackend(currentLandmarks, result.worldLandmarks[0]);

        // Dibujar landmarks
        drawingUtilsRef.current = new DrawingUtils(canvasCtx);
        drawingUtilsRef.current.drawLandmarks(currentLandmarks, { radius: 4, color: 'rgb(0, 255, 0)' });
        drawingUtilsRef.current.drawConnectors(currentLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: 'rgb(255, 0, 0)',
          lineWidth: 2,
        });

        frameIndex.current += 1; // Increment frame index
      } else {
        console.warn("No landmarks detected");
      }
    } else {
      console.warn("Video not ready or poseLandmarker not available");
    }
    animationIdRef.current = requestAnimationFrame(detectPose);
  }

  useEffect(() => {
    return () => {
      stopPoseDetection(); // Stop animation when the component unmounts
    };
  }, [stopPoseDetection]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      ></canvas>
    </div>
  );
});

export default PoseCanvas;
