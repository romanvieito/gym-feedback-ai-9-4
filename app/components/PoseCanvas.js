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

  // Update getColorFromPercentage function
  function getColorFromPercentage(percentage) {
    // Ensure percentage is between 0 and 100
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

  // Define landmark names at the top of the file
const landmarkNames = [
  'Nose', 'Left Eye (Inner)', 'Left Eye', 'Left Eye (Outer)', 'Right Eye (Inner)',
  'Right Eye', 'Right Eye (Outer)', 'Left Ear', 'Right Ear', 'Mouth (Left)',
  'Mouth (Right)', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Pinky', 'Right Pinky', 'Left Index',
  'Right Index', 'Left Thumb', 'Right Thumb', 'Left Hip', 'Right Hip',
  'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle', 'Left Heel',
  'Right Heel', 'Left Foot Index', 'Right Foot Index'
  ];

  // Define the angle dictionary in JavaScript
  const angleDict = {
    'right ankle': [['Right Knee', 'Right Ankle', 'Right Foot Index', 'Right Heel'], 'dorsiflexion', 90, 1],
    'left ankle': [['Left Knee', 'Left Ankle', 'Left Foot Index', 'Left Heel'], 'dorsiflexion', 90, 1],
    'right knee': [['Right Ankle', 'Right Knee', 'Right Hip'], 'flexion', -180, 1],
    'left knee': [['Left Ankle', 'Left Knee', 'Left Hip'], 'flexion', -180, 1],
    'right hip': [['Right Knee', 'Right Hip', 'Left Hip', 'Neck'], 'flexion', 0, -1],
    'left hip': [['Left Knee', 'Left Hip', 'Right Hip', 'Neck'], 'flexion', 0, -1],
    'right shoulder': [['Right Elbow', 'Right Shoulder', 'Left Shoulder', 'Neck'], 'flexion', 0, -1],
    'left shoulder': [['Left Elbow', 'Left Shoulder', 'Right Shoulder', 'Neck'], 'flexion', 0, -1],
    'right elbow': [['Right Wrist', 'Right Elbow', 'Right Shoulder'], 'flexion', 180, -1],
    'left elbow': [['Left Wrist', 'Left Elbow', 'Left Shoulder'], 'flexion', 180, -1],
    'right wrist': [['Right Elbow', 'Right Wrist', 'Right Index'], 'flexion', -180, 1],
    'left wrist': [['Left Elbow', 'Left Index', 'Left Wrist'], 'flexion', -180, 1],
    'right foot': [['Right Foot Index', 'Right Heel'], 'horizontal', 0, -1],
    'left foot': [['Left Foot Index', 'Left Heel'], 'horizontal', 0, -1],
    'right shank': [['Right Ankle', 'Right Knee'], 'horizontal', 0, -1],
    'left shank': [['Left Ankle', 'Left Knee'], 'horizontal', 0, -1],
    'right thigh': [['Right Knee', 'Right Hip'], 'horizontal', 0, -1],
    'left thigh': [['Left Knee', 'Left Hip'], 'horizontal', 0, -1],
    'pelvis': [['Left Hip', 'Right Hip'], 'horizontal', 0, -1],
    'trunk': [['Neck', 'Hip'], 'horizontal', 0, -1],
    'shoulders': [['Left Shoulder', 'Right Shoulder'], 'horizontal', 0, -1],
    'head': [['Head', 'Neck'], 'horizontal', 0, -1],
    'right arm': [['Right Elbow', 'Right Shoulder'], 'horizontal', 0, -1],
    'left arm': [['Left Elbow', 'Left Shoulder'], 'horizontal', 0, -1],
    'right forearm': [['Right Wrist', 'Right Elbow'], 'horizontal', 0, -1],
    'left forearm': [['Left Wrist', 'Left Elbow'], 'horizontal', 0, -1],
    'right hand': [['Right Index', 'Right Wrist'], 'horizontal', 0, -1],
    'left hand': [['Left Index', 'Left Wrist'], 'horizontal', 0, -1]
  };

  // Function to compute angles
  function computeAngle(angName, landmarks, angleDict) {
    const angParams = angleDict[angName];
    if (!angParams) return NaN;

    const angleCoords = angParams[0].map(kpt => {
      const index = landmarkNames.indexOf(kpt);
      if (index === -1) return null;
      const landmark = landmarks[index];
      return landmark ? [landmark.x, landmark.y, landmark.z] : null; // Ensure 3D coordinates
    }).filter(coord => coord !== null);

    if (angleCoords.length < 3) {
      console.warn(`Insufficient points for angle calculation: ${angName}`);
      return NaN;
    }

    let ang = points3DToAngles(angleCoords);
    ang += angParams[2];
    ang *= angParams[3];

    // Normaliza los ángulos para manejar la naturaleza circular de los mismos
    if (['pelvis', 'shoulders'].includes(angName)) {
      // Para pelvis y hombros, normaliza a un rango de [-90, 90] grados
      ang = ang > 90 ? ang - 180 : ang;  // Ajusta si el ángulo es mayor a 90 grados
      ang = ang < -90 ? ang + 180 : ang; // Ajusta si el ángulo es menor a -90 grados
    } else {
      // Para otros ángulos, normaliza a un rango de [-180, 180] grados
      ang = ang > 180 ? ang - 360 : ang;  // Ajusta si el ángulo es mayor a 180 grados
      ang = ang < -180 ? ang + 360 : ang; // Ajusta si el ángulo es menor a -180 grados
    }

    return ang;
  }

  // Helper function to calculate angles from 3D points
  function points3DToAngles(coords) {
    if (coords.length < 3) return 0;

    // Extract points
    const [p1, p2, p3] = coords;

    // Calculate vectors
    const vectorA = { x: p2[0] - p1[0], y: p2[1] - p1[1], z: p2[2] - p1[2] };
    const vectorB = { x: p3[0] - p2[0], y: p3[1] - p2[1], z: p3[2] - p2[2] };

    // Calculate dot product and magnitudes
    const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y + vectorA.z * vectorB.z;
    const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2 + vectorA.z ** 2);
    const magnitudeB = Math.sqrt(vectorB.x ** 2 + vectorB.y ** 2 + vectorB.z ** 2);

    // Calculate cosine of the angle
    const cosineAngle = dotProduct / (magnitudeA * magnitudeB);

    // Ensure the cosine value is within the valid range for acos
    const clampedCosine = Math.max(-1, Math.min(1, cosineAngle));

    // Calculate the angle in degrees
    const angle = Math.acos(clampedCosine) * (180 / Math.PI);

    return angle;
  }

  // Function to calculate cosine distance between two angles
  function cosineDistanceBetweenAngles(angle1, angle2) {
    // Convert angles to radians
    const radian1 = angle1 * (Math.PI / 180);
    const radian2 = angle2 * (Math.PI / 180);

    // Calculate cosine similarity
    const cosineSimilarity = Math.cos(radian1) * Math.cos(radian2) + Math.sin(radian1) * Math.sin(radian2);

    // Cosine distance is 1 - cosine similarity
    return 1 - cosineSimilarity;
  }

  // Function to compare angles using cosine distance and return landmark indices
  function findAnomalousLandmarkIndices(angleslandmarks, anglesotherlandmarks, landmarks, otherLandmarks) {
    const anomalousIndices = [];
    const COSINE_DISTANCE_THRESHOLD = 0.1; // Ajusta este umbral según sea necesario

    for (const angName in angleslandmarks) {
      if (angleslandmarks.hasOwnProperty(angName) && anglesotherlandmarks.hasOwnProperty(angName)) {
        // Calcula la distancia coseno entre los ángulos
        const cosineDistance = cosineDistanceBetweenAngles(angleslandmarks[angName], anglesotherlandmarks[angName]);

        // Log para depuración: muestra el nombre del ángulo y la distancia coseno
        console.log(`Ángulo: ${angName}, Distancia Coseno: ${cosineDistance}`);

        if (cosineDistance > COSINE_DISTANCE_THRESHOLD) {
          // Obtiene los nombres de los landmarks para este ángulo
          const landmarkNamesForAngle = angleDict[angName][0];
          // Convierte los nombres de los landmarks en índices
          const indices = landmarkNamesForAngle.map(name => {
            const index = landmarkNames.indexOf(name);
            if (index === -1) {
              console.warn(`Nombre de landmark no encontrado: ${name}`);
              return null; // O puedes optar por manejarlo de otra manera
            }
            return index;
          }).filter(index => index !== null); // Filtra los índices no válidos

          // Log para depuración: muestra los índices de los landmarks anómalos
          console.log(`Índices de Landmarks Anómalos para ${angName}:`, indices);

          // Añade estos índices a la lista de índices anómalos
          anomalousIndices.push(...indices);
        }
      }
    }

    // Elimina duplicados
    const uniqueAnomalousIndices = [...new Set(anomalousIndices)];

    // Log para depuración: muestra los índices únicos de los landmarks anómalos
    console.log('Índices Únicos de Landmarks Anómalos:', uniqueAnomalousIndices);

    return uniqueAnomalousIndices;
  }


  // // TODO TODO: Exclude landmarks based on the index
  // // Indexes of landmarks to exclude .. 1, 2, 3, 4, 5, 6, 7, 8,
  // const excludeIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Example indexes for the landmarks to exclude
  // // // Flag to control exclusion
  // let excludeAfterDetection = true; // Set to true to exclude, false to include
  // // Function to process landmarks after detection
  function processLandmarks(landmarks) {
  //   if (excludeAfterDetection) {
  //     return landmarks.filter((_, index) => !excludeIndexes.includes(index));
  //   }
     return landmarks;
  }

  // Integrate this function in your pose detection logic
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
          // Compute angles for each joint
          const angleslandmarks = {};
          const anglesotherlandmarks = {};
          for (const angName in angleDict) {
            angleslandmarks[angName] = computeAngle(angName, currentLandmarks, angleDict);
            anglesotherlandmarks[angName] = computeAngle(angName, otherLandmarks, angleDict);
          }

          // Find anomalous landmark indices
          const anomalousIndices = findAnomalousLandmarkIndices(angleslandmarks, anglesotherlandmarks, currentLandmarks, otherLandmarks);
          console.log('Anomalous Landmark Indices:', anomalousIndices);

          

          // const totalDistance = currentLandmarks.reduce((sum, landmark, index) => {
          //   const otherLandmark = otherLandmarks[index];
          //   return sum + euclideanDistance(landmark, otherLandmark);
          // }, 0);
          // Count the number of anomalous points
          const numberOfAnomalousPoints = anomalousIndices.length;
          console.log('Number of Anomalous Points:', numberOfAnomalousPoints);

          // Calculate match percentage based on the number of anomalous points
          matchPercentage = Math.max(0, 100 - (numberOfAnomalousPoints / currentLandmarks.length) * 200);

          // Visualize anomalous points
          anomalousIndices.forEach(index => {
            const landmark = currentLandmarks[index];
            if (landmark) {
              // Dibuja una señal visual en el canvas para los landmarks anómalos
              drawVisualSignal(canvasCtx, landmark, getColorFromPercentage(poseMatchPercentage));
            }
          });
          
        }

        setPoseMatchPercentage(matchPercentage);

        // Apply color change for all videos
        const color = getColorFromPercentage(matchPercentage);

        const drawingUtils = new DrawingUtils(canvasCtx);

        // Dibuja los landmarks y los conectores en el canvas
        drawingUtils.drawLandmarks(processLandmarks(currentLandmarks), { radius: 6, color: color });
        drawingUtils.drawConnectors(processLandmarks(currentLandmarks), PoseLandmarker.POSE_CONNECTIONS, {
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

  // Función para dibujar una señal visual en el canvas
  function drawVisualSignal(ctx, landmark, color) {
    ctx.beginPath();
    ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color; // Usa el color proporcionado
    ctx.fill();
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
