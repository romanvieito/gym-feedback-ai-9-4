"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, AppBar, Toolbar, Container, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import PoseCanvas from './PoseCanvas';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

function App() {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
  const [feedback, setFeedback] = useState('');

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

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
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
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
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
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ width: '100%', height: 'auto', display: 'none' }}
          />
          {isStreaming && poseLandmarker && (
            <PoseCanvas
              videoRef={videoRef}
              poseLandmarker={poseLandmarker}
              videoDimensions={videoDimensions}
              setFeedback={setFeedback}
              feedback={feedback}
            />
          )}
        </Box>
        <Button 
          variant="contained"
          sx={{ my: 2 }}
          startIcon={isStreaming ? <VideocamOffIcon /> : <VideocamIcon />}
          onClick={isStreaming ? stopWebcam : startWebcam}
        >
          {isStreaming ? 'Stop Webcam' : 'Start Webcam'}
        </Button>
      </Container>
    </Box>
  );
}

export default App;
