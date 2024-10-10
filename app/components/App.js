"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Slider, Box, Typography, AppBar, Toolbar, Container, Button, Stack, IconButton } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import PoseCanvas from './PoseCanvas';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';

function App() {
  const webcamRef = useRef(null);
  const uploadedVideoRef = useRef(null);
  const [isWebcamStreaming, setIsWebcamStreaming] = useState(false);
  const [webcamPoseLandmarker, setWebcamPoseLandmarker] = useState(null);
  const [uploadedVideoPoseLandmarker, setUploadedVideoPoseLandmarker] = useState(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
  const [webcamFeedback, setWebcamFeedback] = useState('');
  const [uploadedVideoFeedback, setUploadedVideoFeedback] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [webcamLandmarks, setWebcamLandmarks] = useState([]);
  const [uploadedVideoLandmarks, setUploadedVideoLandmarks] = useState([]);

  const poseCanvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    async function loadPoseLandmarkers() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      const webcamLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });

      const uploadedVideoLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });

      setWebcamPoseLandmarker(webcamLandmarker);
      setUploadedVideoPoseLandmarker(uploadedVideoLandmarker);
    }

    loadPoseLandmarkers();
  }, []);

  useEffect(() => {
    const videoElement = uploadedVideoRef.current;
    if (videoElement) {
      const handleVideoEnded = () => {
        toggleStop()
      };

      videoElement.addEventListener('ended', handleVideoEnded);

      // Limpia el evento cuando el componente se desmonta
      return () => {
        videoElement.removeEventListener('ended', handleVideoEnded);
      };
    }
  }, [uploadedVideoRef]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        //setIsWebcamStreaming(true);
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  const stopWebcam = () => {
    if (webcamRef.current && webcamRef.current.srcObject) {
      const tracks = webcamRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      webcamRef.current.srcObject = null;
      setIsWebcamStreaming(false);
    }
  };

  const handleVideoUpload = (event) => {
    toggleStop();
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      setUploadedVideo(videoUrl);
      if (uploadedVideoRef.current) {
        uploadedVideoRef.current.src = videoUrl;
        uploadedVideoRef.current.onloadedmetadata = () => {
          // Start playing the video immediately after it's loaded
          // uploadedVideoRef.current.play(); 
          // Start the webcam as well
          startWebcam();
          // Establece la duración al cargar los metadatos
          setDuration(uploadedVideoRef.current.duration);

          // Actualiza el tiempo actual del video mientras se reproduce
          uploadedVideoRef.current.ontimeupdate = () => {
            setCurrentTime(uploadedVideoRef.current.currentTime);
          };
        };
      }
    } else {
      console.error("Please upload a valid video file.");
    }
  };

  const handleSliderChange = (event, newValue) => {
    if (uploadedVideoRef.current) {
      uploadedVideoRef.current.currentTime = newValue; // Cambia el tiempo actual del video
      setCurrentTime(newValue); // Actualiza el estado para reflejar el cambio
    }
  };

  const togglePlayPause = () => {
    if (uploadedVideoRef.current) {
      if (isPlaying) {
        uploadedVideoRef.current.pause();
        setIsPlaying(false); // Cambia el estado a 'pausado'
        if (poseCanvasRef.current) {
          poseCanvasRef.current.stopPoseDetection(); // Llama a la función para detener la detección
        }
      } else {
        if (poseCanvasRef.current) {
          poseCanvasRef.current.startPoseDetection(); // Llama a la función para iniciar la detección
        }
        if (!isWebcamStreaming) setIsWebcamStreaming(true);
        uploadedVideoRef.current.play();
        setIsPlaying(true); // Cambia el estado a 'reproduciendo'
      }
    }
  };

  const toggleStop = () => {
    if (uploadedVideoRef.current) {
      setIsWebcamStreaming(false);
      uploadedVideoRef.current.pause();
      if (poseCanvasRef.current) {
        poseCanvasRef.current.stopPoseDetection(); // Llama a la función para detener la detección
      }
      uploadedVideoRef.current.currentTime = 0; // Reinicia el video
      setCurrentTime(0); // Actualiza el estado
      setIsPlaying(false); // Cambia el estado a 'pausado'
    }
  };

  const toggleWebcam = () => {
    if (isWebcamStreaming) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  // Add this new function to update landmarks
  const updateLandmarks = (isWebcam, newLandmarks) => {
    if (isWebcam) {
      setWebcamLandmarks(newLandmarks);
    } else {
      setUploadedVideoLandmarks(newLandmarks);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: '#000' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            24up. Variante B
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          {/* Uploaded Video Section */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{
              mt: 4,
              width: '100%',
              maxWidth: '640px',
              margin: '0 auto',
              boxShadow: 3,
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <video
                ref={uploadedVideoRef}
                playsInline
                style={{
                  width: '100%',
                  height: '0',
                  visibility: 'hidden'
                }}
              />
              {uploadedVideo && uploadedVideoPoseLandmarker && (
                <PoseCanvas
                  ref={poseCanvasRef}
                  videoRef={uploadedVideoRef}
                  poseLandmarker={uploadedVideoPoseLandmarker}
                  videoDimensions={videoDimensions}
                  setFeedback={setUploadedVideoFeedback}
                  feedback={uploadedVideoFeedback}
                  isWebcam={false}
                  otherLandmarks={webcamLandmarks}
                  updateLandmarks={updateLandmarks}
                />
              )}
              {/* Control deslizante para moverse en el video */}
              {
                uploadedVideo && uploadedVideoPoseLandmarker ?
                  <>
                    <Slider
                      value={currentTime}
                      max={duration}
                      onChange={handleSliderChange}
                      aria-labelledby="video-slider"
                      style={{ marginTop: 20 }}
                    />
                    <Box display="flex" justifyContent="center" mt={2}>
                      <IconButton onClick={togglePlayPause}>
                        {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                      </IconButton>
                      {isPlaying &&
                        <>
                          <IconButton onClick={toggleStop}>
                            <StopIcon fontSize="large" />
                          </IconButton>
                        </>}
                    </Box>
                  </>
                  : uploadedVideo && !uploadedVideoPoseLandmarker ?
                    <>
                      <p>Loading video...</p>
                    </>
                    :
                    <>
                    </>
              }
            </Box>
            <Button
              variant="contained"
              component="label"
              sx={{ my: 2, mr: 2, padding: '12px 24px', fontSize: '1.2rem' }}
              startIcon={<CloudUploadIcon />}
            >
              Upload Video To Compare with Your Workout
              <input
                type="file"
                hidden
                accept="video/*"
                onChange={handleVideoUpload}
              />
            </Button>
          </Box>

          {/* Webcam Section */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{
              mt: 4,
              width: '100%',
              maxWidth: '640px',
              margin: '0 auto',
              boxShadow: 3,
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <video
                ref={webcamRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: !uploadedVideo || !uploadedVideoPoseLandmarker ? '0' : isWebcamStreaming ? '0' : 'auto',
                  visibility: !uploadedVideo || !uploadedVideoPoseLandmarker ? '0' : isWebcamStreaming ? 'hidden' : 'visible'
                }}
              />
              {isWebcamStreaming && webcamPoseLandmarker && (
                <PoseCanvas
                  ref={poseCanvasRef}
                  videoRef={webcamRef}
                  poseLandmarker={webcamPoseLandmarker}
                  videoDimensions={videoDimensions}
                  setFeedback={setWebcamFeedback}
                  feedback={webcamFeedback}
                  isWebcam={true}
                  otherLandmarks={uploadedVideoLandmarks}
                  updateLandmarks={updateLandmarks}
                />
              )
              }
            </Box>
            {/* <Button 
              variant="contained"
              sx={{ my: 2, backgroundColor: 'black' }}
              startIcon={isWebcamStreaming ? <VideocamOffIcon /> : <VideocamIcon />}
              onClick={toggleWebcam}
            >
              {isWebcamStreaming ? 'Stop Webcam' : 'Start Webcam'}
            </Button> */}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

export default App;