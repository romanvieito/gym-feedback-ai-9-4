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

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';

const PoseCanvas = forwardRef(({ videoRef, poseLandmarker, videoDimensions, setFeedback, feedback, isWebcam, otherLandmarks, updateLandmarks }, ref) => {
  const canvasRef = useRef(null);
  const frameIndex = useRef(0);
  const animationIdRef = useRef(null); // Almacenar el ID de la animación

  const setTimedFeedback = useCallback((feedback) => {
    console.log("Setting feedback:", feedback);
    setFeedback(feedback);
  }, [setFeedback]);

  // Función para detener la detección de poses
  const stopPoseDetection = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

  // Función para iniciar la detección de poses
  const startPoseDetection = useCallback(() => {
    if (!animationIdRef.current) {
      detectPose(); // Iniciar la detección de poses
    }
  }, []);

  // Expone las funciones stopPoseDetection y startPoseDetection al componente padre
  useImperativeHandle(ref, () => ({
    stopPoseDetection,
    startPoseDetection,
  }));

  const [poseMatchPercentage, setPoseMatchPercentage] = useState(100);

  // Add euclideanDistance function
  function euclideanDistance(point1, point2) {
    return Math.sqrt(
      Math.pow(point1.x - point2.x, 2) +
      Math.pow(point1.y - point2.y, 2) +
      Math.pow(point1.z - point2.z, 2)
    );
  }

  // Add getColorFromPercentage function
  function getColorFromPercentage(percentage) {
    const value = Math.round(255 * (percentage / 100));
    return `rgb(${value}, ${value}, ${value})`;
  }

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
      canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

      // Draw video on canvas
      canvasCtx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

      const result = await poseLandmarker.detectForVideo(
        videoRef.current,
        performance.now()
      );

      if (result.landmarks && result.landmarks.length > 0) {
        const currentLandmarks = result.landmarks[0];
        let matchPercentage = 100;
        
        // Update landmarks in the parent component
        updateLandmarks(isWebcam, currentLandmarks);

        if (otherLandmarks && otherLandmarks.length > 0) {
          const totalDistance = currentLandmarks.reduce((sum, landmark, index) => {
            const otherLandmark = otherLandmarks[index];
            return sum + euclideanDistance(landmark, otherLandmark);
          }, 0);

          matchPercentage = Math.max(0, 100 - (totalDistance / currentLandmarks.length) * 200);
        }

        setPoseMatchPercentage(matchPercentage);

        // Apply color change for all videos
        const color = getColorFromPercentage(matchPercentage);

        const drawingUtils = new DrawingUtils(canvasCtx);

        // Dibuja los landmarks y los conectores en el canvas
        drawingUtils.drawLandmarks(currentLandmarks, { radius: 6, color: color });
        drawingUtils.drawConnectors(currentLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: color,
          lineWidth: 6,
        });

        // Llamar a la función para enviar los landmarks al backend
        sendLandmarksToBackend(currentLandmarks, result.worldLandmarks[0]);

        frameIndex.current += 1;  // Incrementar el índice del frame
      } else {
        console.warn("No landmarks detected");
      }
    } else {
      console.warn("Video not ready or poseLandmarker not available");
    }
    animationIdRef.current = requestAnimationFrame(detectPose);
  }

  useEffect(() => {
    startPoseDetection(); // Iniciar la detección al montar el componente

    return () => {
      stopPoseDetection(); // Detener la animación al desmontar el componente
    };
  }, [startPoseDetection, stopPoseDetection]);

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

PoseCanvas.displayName = "PoseCanvas";

export default PoseCanvas;
