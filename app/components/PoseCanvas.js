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
// import { d } from '@vercel/blob/dist/create-folder-Oa5wYhFM.cjs';



const PoseCanvas = forwardRef(({ videoRef, webcamPoseLandmarker, uploadedVideoPoseLandmarker, videoDimensions, setFeedback, feedback, isWebcam, otherLandmarks, updateLandmarks }, ref) => {
  const canvasRef = useRef(null);
  const frameIndex = useRef(0);
  const animationIdRef = useRef(null); // Almacenar el ID de la animación

  const setTimedFeedback = useCallback((feedback) => {
    console.log("Setting feedback:", feedback);
    setFeedback(feedback);
  }, [setFeedback]);

  // Add this state to track audio playback
  const [isPlayingFeedback, setIsPlayingFeedback] = useState(false);

  const playAudioFeedback = (audioBase64) => {
    if (!audioBase64) return;
    
    try {
      // Store the current video volume
      const currentVideoVolume = videoRef.current.volume;
      
      // Mute the video
      videoRef.current.volume = 0;
      setIsPlayingFeedback(true);
      
      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
      
      audio.onerror = (e) => {
        console.error('Error playing audio:', e);
        // Restore video volume on error
        videoRef.current.volume = currentVideoVolume;
        setIsPlayingFeedback(false);
      };
      
      // Add ended event listener to restore video volume
      audio.onended = () => {
        videoRef.current.volume = currentVideoVolume;
        setIsPlayingFeedback(false);
      };
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.error('Error playing audio:', e);
          // Restore video volume on error
          videoRef.current.volume = currentVideoVolume;
          setIsPlayingFeedback(false);
        });
      }
    } catch (error) {
      console.error('Error creating audio element:', error);
      // Restore video volume on error
      if (videoRef.current) {
        videoRef.current.volume = 1;
      }
      setIsPlayingFeedback(false);
    }
  };

  // Add this effect to handle video volume based on feedback state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isPlayingFeedback ? 0 : 1;
    }
  }, [isPlayingFeedback]);

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

  // // Add euclideanDistance function
  // function euclideanDistance(point1, point2) {
  //   return Math.sqrt(
  //     Math.pow(point1.x - point2.x, 2) +
  //     Math.pow(point1.y - point2.y, 2) +
  //     Math.pow(point1.z - point2.z, 2)
  //   );
  // }

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Processed Data:', data);
      
      if (data.feedback && data.feedback !== "No feedback yet") {
        setTimedFeedback(data.feedback);
      }
      // Play audio feedback if available
      if (data.feedback_audio && data.feedback !== "No feedback yet") {
        playAudioFeedback(data.feedback_audio);
      }
    } catch (error) {
      console.error('Error sending landmarks:', error);
    }
  };

  const sendAnomalousLandmarksToBackend = async (landmarks_indexes) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/py/process_anomalous_landmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frameIndex: frameIndex.current,
          landmarks_indexes: landmarks_indexes,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Processed Data:', data);
      
      if (data.feedback && data.feedback !== "No feedback yet") {
        setTimedFeedback(data.feedback);
        console.log('Feedback:', data.feedback);
      }

      // Play audio feedback if available
      if (data.feedback_audio && data.feedback !== "No feedback yet") {
        playAudioFeedback(data.feedback_audio);
      }
    } catch (error) {
      console.error('Error sending landmarks:', error);
    }
  };

  // Define landmark names (at the top of the file?) esto no se si va mejor aquí o al principio del archivo
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
    if (!angParams) return NaN;//tenemos que devolver un número para que no se rompa esto pero no tenemos que devolver NaN

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
    const COSINE_DISTANCE_THRESHOLD = 0.15; // Ajusta este umbral según sea necesario

    for (const angName in angleslandmarks) {
      if (angleslandmarks.hasOwnProperty(angName) && anglesotherlandmarks.hasOwnProperty(angName)) {
        // Calcula la distancia coseno entre los ángulos
        const cosineDistance = cosineDistanceBetweenAngles(angleslandmarks[angName], anglesotherlandmarks[angName]);

        // Log para depuración: muestra el nombre del ángulo y la distancia coseno
        //console.log(`Ángulo: ${angName}, Distancia Coseno: ${cosineDistance}`);

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
          //console.log(`Índices de Landmarks Anómalos para ${angName}:`, indices);

          // Añade estos índices a la lista de índices anómalos
          anomalousIndices.push(...indices);
        }
      }
    }

    // Elimina duplicados
    const uniqueAnomalousIndices = [...new Set(anomalousIndices)];

    // Log para depuración: muestra los índices únicos de los landmarks anómalos
    //console.log('Índices Únicos de Landmarks Anómalos:', uniqueAnomalousIndices);

    return uniqueAnomalousIndices;
  }

  function minimumConfidenceScoreValidation(xposeLandmarks) {

    const poseDetectionConfidence = xposeLandmarks.map(landmark => landmark.visibility);
    const posePresenceConfidence = xposeLandmarks.map(landmark => landmark.presence);

    // Verificar si la detección de pose no es exitosa
    const isNotPoseDetected = poseDetectionConfidence.some(confidence => confidence < 0.5);
    const isNotPosePresent = posePresenceConfidence.some(confidence => confidence < 0.5);

    // Validar seguimiento de la pose
    const trackingConfidence = xposeLandmarks.reduce((acc, landmark) => acc + landmark.visibility, 0) / xposeLandmarks.length;
    const isNotTrackingSuccessful = trackingConfidence < 0.5;

    if (isNotPoseDetected) {
      console.log('La detección de la pose no fue exitosa.');
      return false;
    }
    if (isNotPosePresent) {
      console.log('La presencia de la pose no fue suficiente.');
      return false;
    }
    if (isNotTrackingSuccessful) {
      console.log('El seguimiento de la pose no fue exitoso.');
      return false;
    }

    return true;
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



// Todo esto es para generar un movimiento suavizado de la pose para tener un mock solamente...
// Add these functions at the top of your file after the imports

// Base pose to start from (roughly matching a standing position)
const basePose = Array(33).fill().map((_, i) => ({
    x: 0.5, // Center
    y: i < 11 ? 0.3 : i < 23 ? 0.5 : 0.7, // Head landmarks higher, torso middle, legs lower
    z: -0.3,
    visibility: 0.9
  }));

// State for the current pose (initialize with basePose)
let currentPose = [...basePose];

function generateSmoothedLandmarks(frameIndex) {
  const frequency = 0.05; // Controls speed of movement
  const amplitude = 0.05; // Controls range of movement
  
  return currentPose.map((baseLandmark, i) => {
    // Add subtle oscillating movements
    const xOffset = Math.sin(frameIndex * frequency + i) * amplitude;
    const yOffset = Math.cos(frameIndex * frequency + i * 0.5) * amplitude;
    const zOffset = Math.sin(frameIndex * frequency + i * 0.7) * amplitude * 0.5;
    
    // Smoothly update current pose
    currentPose[i] = {
      x: clamp(baseLandmark.x + xOffset, 0.3, 0.7),
      y: clamp(baseLandmark.y + yOffset, 0.2, 0.8),
      z: clamp(baseLandmark.z + zOffset, -0.4, -0.2),
      visibility: clamp(0.9 + Math.random() * 0.1, 0.8, 1.0)
    };
    
    return currentPose[i];
  });
}

// Helper function to clamp values
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Add this constant at the top of the file with other constants
const VARIATION_INDEXES = [11, 12, 13, 14]; // Shoulder, elbow, and wrist landmarks

// Add this helper function
function createVariedLandmarks(baseLandmarks, shouldVary = false) {
  if (!shouldVary) return baseLandmarks;
  
  return baseLandmarks.map((landmark, index) => {
    if (VARIATION_INDEXES.includes(index)) {
      // Add random variation to specified landmarks
      return {
        x: landmark.x + (Math.random() - 0.5) * 0.2, // ±0.1 variation
        y: landmark.y + (Math.random() - 0.5) * 0.2,
        z: landmark.z + (Math.random() - 0.5) * 0.2,
        visibility: landmark.visibility
      };
    }
    return landmark;
  });
}

///Hasta aquí todo esto es para generar un movimiento suavizado de la pose para tener un mock solamente...

// Add this state at the top of the component
const anomalousLandmarkStats = useRef(new Map()); // Tracks frequency of anomalous landmarks

// Add this function to update landmark statistics
function updateAnomalousLandmarkStats(anomalousIndices) {
  // Update frequency count for each anomalous landmark
  anomalousIndices.forEach(index => {
    const currentCount = anomalousLandmarkStats.current.get(index) || 0;
    anomalousLandmarkStats.current.set(index, currentCount + 1);
  });

  // Esto no hace falta Abel: mejor es to keep the history of anomalous landmarks throughout the 500 frames to get a more accurate picture.
  // // Reset stats for landmarks that are no longer anomalous
  // anomalousLandmarkStats.current.forEach((count, index) => {
  //   if (!anomalousIndices.includes(index)) {
  //     anomalousLandmarkStats.current.delete(index);
  //   }
  // });
}

// Modify the detectPose function where we handle anomalous indices
const FEEDBACK_INTERVAL = 300;

async function detectPose() {
    const poseLandmarker = isWebcam ? webcamPoseLandmarker : uploadedVideoPoseLandmarker;
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


      // // TODO, necesito que el Pocho me ayude aquí porque 
      // // siempre usa la webcam como referencia debería ser al contrario
      // const result = 
      //   await poseLandmarker.detectForVideo(
      //     videoRef.current,
      //     performance.now()
      //   )

      // Generate mock landmarks
      const mockLandmarks = generateSmoothedLandmarks(frameIndex.current);
    
      // Create mock result object to match MediaPipe's format
      const result = {
      landmarks: [mockLandmarks],
      worldLandmarks: [mockLandmarks]
      };

      // Create varied landmarks

      const baseMockLandmarks = generateSmoothedLandmarks(frameIndex.current);
      const shouldVaryLandmarks = true; // You can control this with a prop or state
      
      const otherLandmarks = createVariedLandmarks(baseMockLandmarks, shouldVaryLandmarks);


      if (result.landmarks && result.landmarks.length > 0 &&
        minimumConfidenceScoreValidation(result.landmarks)) {

        const currentLandmarks = result.landmarks[0];
        let matchPercentage = 100;

        // Update landmarks in the parent component
        // updateLandmarks(isWebcam, currentLandmarks);

        if (otherLandmarks && otherLandmarks.length > 0 &&
          minimumConfidenceScoreValidation(otherLandmarks)) {

          // console.log('Curerent landmarks: ', currentLandmarks);
          // console.log('Other landmarks: ', otherLandmarks);

          // Compute angles for each joint
          const angleslandmarks = {};
          const anglesotherlandmarks = {};
          for (const angName in angleDict) {
            angleslandmarks[angName] = computeAngle(angName, currentLandmarks, angleDict);
            anglesotherlandmarks[angName] = computeAngle(angName, otherLandmarks, angleDict);
          }
          // Find anomalous landmark indices
          const anomalousIndices = findAnomalousLandmarkIndices(angleslandmarks, anglesotherlandmarks, currentLandmarks, otherLandmarks);
          console.log('Frame Index:', frameIndex.current);
          console.log('Anomalous Landmark Indices:', anomalousIndices);

          // Update statistics
          updateAnomalousLandmarkStats(anomalousIndices);

          // const totalDistance = currentLandmarks.reduce((sum, landmark, index) => {
          //   const otherLandmark = otherLandmarks[index];
          //   return sum + euclideanDistance(landmark, otherLandmark);
          // }, 0);
          // Count the number of anomalous points
          const numberOfAnomalousPoints = anomalousIndices.length;
          //console.log('Number of Anomalous Points:', numberOfAnomalousPoints);

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

        // // Dibuja los landmarks y los conectores en el canvas
        drawingUtils.drawLandmarks(processLandmarks(currentLandmarks), { radius: 6, color: color });
        drawingUtils.drawConnectors(processLandmarks(currentLandmarks), PoseLandmarker.POSE_CONNECTIONS, {
          color: color,
          lineWidth: 6,
        });
        // // Llamar a la función para enviar los landmarks al backend
        // Para ABEL TODO: tienes que cambiar esto, antes se le pedía a openAI basdo en todos los landmarks 
        // pero ahora se le pide basado en los que están anómalos
        // Send landmarks to backend every 500 framesFRAME_INTERVAL
        if (frameIndex.current > 0 &&frameIndex.current % FEEDBACK_INTERVAL === 0) {
          // sendLandmarksToBackend(currentLandmarks, result.worldLandmarks[0]);
          // Get ranked anomalous landmarks
          const rankedAnomalousLandmarks = Array.from(anomalousLandmarkStats.current.entries())
          .sort((a, b) => b[1] - a[1]) // Sort by frequency, highest first
          .map(([index, count]) => ({
            index,
            frequency: count,
            frequencyPercentage: (count / FEEDBACK_INTERVAL) * 100 // Calculate percentage over last 500 frames
          }))
          .filter(item => item.frequencyPercentage > 20); // Only include landmarks that were anomalous >30% of the time

          // Send the most problematic landmarks to backend
          if (rankedAnomalousLandmarks.length > 0) {
            sendAnomalousLandmarksToBackend(rankedAnomalousLandmarks.map(item => item.index));
            // Clear stats after sending
            anomalousLandmarkStats.current.clear();
          }
        }

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
