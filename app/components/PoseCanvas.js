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

  // Update getColorFromPercentage function
  function getColorFromPercentage(percentage) {
    percentage = Math.max(0, Math.min(100, percentage));
    let r, g;
    if (percentage < 50) {
      // Red to Yellow (0-50%)
      r = 255;
      g = Math.round((percentage / 50) * 255);
    } else {
      // Yellow to Green (50-100%)
      r = Math.round(255 - ((percentage - 50) / 50) * 255);
      g = 255;
    }
    return `rgb(${r}, ${g}, 0)`;
  }

  // Add cosineDistance function
  function cosineDistance(vector1, vector2) {
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
    const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2 + vector1.z ** 2);
    const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2 + vector2.z ** 2);
    
    const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);
    return Math.acos(cosineSimilarity) * (180 / Math.PI); // Convert to degrees
  }

  // Function to calculate vector between two points
  function calculateVector(point1, point2) {
    return {
      x: point2.x - point1.x,
      y: point2.y - point1.y,
      z: point2.z - point1.z
    };
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
      // console.log('Processed Data:', data);
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
        let matchPercentage = 0; // Initialize to 0 instead of 100
        
        updateLandmarks(isWebcam, currentLandmarks);

        if (otherLandmarks && otherLandmarks.length > 0 && isWebcam) {
          const angles = [
            [11, 13, 15], // Left Shoulder - Left Elbow - Left Wrist
            [12, 14, 16], // Right Shoulder - Right Elbow - Right Wrist
            [23, 25, 27], // Left Hip - Left Knee - Left Ankle
            [24, 26, 28], // Right Hip - Right Knee - Right Ankle
            [11, 23, 25], // Left Shoulder - Left Hip - Left Knee
            [12, 24, 26]  // Right Shoulder - Right Hip - Right Knee
          ];

          const totalAngleDifference = angles.reduce((sum, [a, b, c]) => {
            const currentVector1 = calculateVector(currentLandmarks[a], currentLandmarks[b]);
            const currentVector2 = calculateVector(currentLandmarks[b], currentLandmarks[c]);
            const otherVector1 = calculateVector(otherLandmarks[a], otherLandmarks[b]);
            const otherVector2 = calculateVector(otherLandmarks[b], otherLandmarks[c]);

            const currentAngle = cosineDistance(currentVector1, currentVector2);
            const otherAngle = cosineDistance(otherVector1, otherVector2);

            return sum + Math.abs(currentAngle - otherAngle);
          }, 0);

          const maxAngleDifference = angles.length * 180; // Maximum possible difference
          matchPercentage = 100 - (totalAngleDifference / maxAngleDifference) * 100;
          matchPercentage = Math.max(0, Math.min(100, matchPercentage)); // Ensure it's between 0 and 100
        }

        setPoseMatchPercentage(matchPercentage);

        // Calculate color based on match percentage only for webcam
        const color = isWebcam ? getColorFromPercentage(matchPercentage) : 'rgb(0, 255, 0)';

        if (isWebcam) {
          console.log('Current Landmarks:', currentLandmarks);
          console.log('Other Landmarks:', otherLandmarks);
          console.log('Match Percentage:', matchPercentage);
          console.log('Color:', color);
        }

        const drawingUtils = new DrawingUtils(canvasCtx);

        // Draw landmarks and connectors with the calculated color
        drawingUtils.drawLandmarks(currentLandmarks, { 
          radius: 6, 
          fillColor: color,
          lineWidth: 2,
          strokeColor: 'white'
        });
        drawingUtils.drawConnectors(currentLandmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: color,
          lineWidth: 7
        });

        // Llamar a la función para enviar los landmarks al backend
        //sendLandmarksToBackend(currentLandmarks, result.worldLandmarks[0]);

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
