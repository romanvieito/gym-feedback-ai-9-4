"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, AppBar, Toolbar, Container, Button, Grid } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import PoseCanvas from './PoseCanvas';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

function App() {
  const webcamRef = useRef(null);
  const uploadedVideoRef = useRef(null);
  const [isWebcamStreaming, setIsWebcamStreaming] = useState(false);
  const [isUploadedVideoPlaying, setIsUploadedVideoPlaying] = useState(false);
  const [isUploadedVideoPaused, setIsUploadedVideoPaused] = useState(true);
  const [webcamPoseLandmarker, setWebcamPoseLandmarker] = useState(null);
  const [uploadedVideoPoseLandmarker, setUploadedVideoPoseLandmarker] = useState(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
  const [webcamFeedback, setWebcamFeedback] = useState('');
  const [uploadedVideoFeedback, setUploadedVideoFeedback] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState(null);

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

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        setIsWebcamStreaming(true);
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
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      setUploadedVideo(videoUrl);
      if (uploadedVideoRef.current) {
        uploadedVideoRef.current.src = videoUrl;
        uploadedVideoRef.current.onloadedmetadata = () => {
          // Start playing the video immediately after it's loaded
          uploadedVideoRef.current.play();
          setIsUploadedVideoPaused(false);
          setIsUploadedVideoPlaying(true);
          // Start the webcam as well
          startWebcam();
        };
      }
    } else {
      console.error("Please upload a valid video file.");
    }
  };

  const toggleUploadedVideo = () => {
    if (uploadedVideoRef.current) {
      if (isUploadedVideoPaused) {
        uploadedVideoRef.current.play();
        setIsUploadedVideoPlaying(true);
        setIsUploadedVideoPaused(false);
        startWebcam();
      } else {
        uploadedVideoRef.current.pause();
        setIsUploadedVideoPlaying(false);
        setIsUploadedVideoPaused(true);
        stopWebcam();
      }
    }
  };

  const toggleWebcam = () => {
    if (isWebcamStreaming) {
      stopWebcam();
      if (uploadedVideoRef.current && !isUploadedVideoPaused) {
        uploadedVideoRef.current.pause();
        setIsUploadedVideoPlaying(false);
        setIsUploadedVideoPaused(true);
      }
    } else {
      startWebcam();
      if (uploadedVideoRef.current && isUploadedVideoPaused) {
        uploadedVideoRef.current.play();
        setIsUploadedVideoPlaying(true);
        setIsUploadedVideoPaused(false);
      }
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: '#000' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            24up.
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
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
                style={{ width: '100%', height: 'auto', display: 'none' }}
              />
              {isWebcamStreaming && webcamPoseLandmarker && (
                <PoseCanvas
                  videoRef={webcamRef}
                  poseLandmarker={webcamPoseLandmarker}
                  videoDimensions={videoDimensions}
                  setFeedback={setWebcamFeedback}
                  feedback={webcamFeedback}
                />
              )}
            </Box>
            <Button 
              variant="contained"
              sx={{ my: 2, backgroundColor: 'black' }}
              startIcon={isWebcamStreaming ? <VideocamOffIcon /> : <VideocamIcon />}
              onClick={toggleWebcam}
            >
              {isWebcamStreaming ? 'Stop Webcam' : 'Start Webcam'}
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
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
                  height: 'auto', 
                  display: 'none'
                }}
                onPlay={() => {
                  setIsUploadedVideoPlaying(true);
                  setIsUploadedVideoPaused(false);
                  startWebcam();
                }}
                onPause={() => {
                  setIsUploadedVideoPlaying(false);
                  setIsUploadedVideoPaused(true);
                  stopWebcam();
                }}
              />
              {uploadedVideo && uploadedVideoPoseLandmarker && (
                <PoseCanvas
                  videoRef={uploadedVideoRef}
                  poseLandmarker={uploadedVideoPoseLandmarker}
                  videoDimensions={videoDimensions}
                  setFeedback={setUploadedVideoFeedback}
                  feedback={uploadedVideoFeedback}
                />
              )}
            </Box>
            <Button
              variant="contained"
              component="label"
              sx={{ my: 2, mr: 2 }}
              startIcon={<CloudUploadIcon />}
            >
              Upload Video
              <input
                type="file"
                hidden
                accept="video/*"
                onChange={handleVideoUpload}
              />
            </Button>
            {uploadedVideo && (
              <Button
                variant="contained"
                sx={{ my: 2, backgroundColor: 'black' }}
                startIcon={isUploadedVideoPaused ? <PlayArrowIcon /> : <PauseIcon />}
                onClick={toggleUploadedVideo}
              >
                {isUploadedVideoPaused ? 'Play' : 'Pause'}
              </Button>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default App;