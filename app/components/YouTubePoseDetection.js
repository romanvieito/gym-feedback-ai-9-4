// TODO: Add a way to switch between YouTube and Workout Video

import React, { useRef, useEffect, useState } from 'react';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { PoseDetectionService } from '../services/PoseDetectionService';

// Extract YouTube video ID for embedding
const getYouTubeEmbedUrl = (url) => {
  const videoIdMatch = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return videoIdMatch ? videoIdMatch[1] : '';
};

// Exponential Smoothing Function
const smoothLandmarks = (prevLandmarks, newLandmarks, alpha = 0.6) => {
  if (!prevLandmarks) return newLandmarks;
  return newLandmarks.map((landmark, i) => ({
    x: alpha * landmark.x + (1 - alpha) * prevLandmarks[i].x,
    y: alpha * landmark.y + (1 - alpha) * prevLandmarks[i].y,
    z: alpha * landmark.z + (1 - alpha) * prevLandmarks[i].z,
  }));
};

export function YouTubePoseDetection({ videoUrl }) {
  const iframeRef = useRef(null);
  const canvasRef = useRef(null);
  const videoElementRef = useRef(null);
  const [player, setPlayer] = useState(null);
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [prevLandmarks, setPrevLandmarks] = useState(null);
  const videoId = getYouTubeEmbedUrl(videoUrl);
  const frameInterval = 3;  // Process every 3rd frame for performance

  // Initialize MediaPipe Pose
  useEffect(() => {
    const loadPoseLandmarker = async () => {
      const landmarker = await PoseDetectionService.initialize();
      setPoseLandmarker(landmarker);
    };

    loadPoseLandmarker();
  }, []);

  // Initialize YouTube Player API
  useEffect(() => {
    const onYouTubeIframeAPIReady = () => {
      const playerInstance = new YT.Player(iframeRef.current, {
        videoId: videoId,
        events: {
          onReady: (event) => {
            setPlayer(event.target);
            event.target.playVideo();
            syncVideoElement(event.target);
          }
        }
      });
    };

    if (window.YT) {
      onYouTubeIframeAPIReady();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    }
  }, [videoId]);

  // Sync offscreen video element with YouTube player
  const syncVideoElement = (player) => {
    setVideoLoaded(true);
  };

  // Pose Detection with Smoothing
  useEffect(() => {
    if (!poseLandmarker || !videoElementRef.current || !canvasRef.current) return;

    let frameCount = 0;

    const detectPose = async () => {
      const video = videoElementRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Process pose every nth frame to improve performance
      if (frameCount % frameInterval === 0) {
        try {
          const result = await PoseDetectionService.detectPoseInVideo(
            poseLandmarker,
            canvas
          );

          if (result?.landmarks?.[0]) {
            // Apply Exponential Smoothing to landmarks
            const smoothedLandmarks = smoothLandmarks(prevLandmarks, result.landmarks[0]);
            setPrevLandmarks(smoothedLandmarks);  // Store for next iteration

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const drawingUtils = new DrawingUtils(ctx);
            drawingUtils.drawLandmarks(smoothedLandmarks, {
              radius: 6,
              color: '#00ff00'
            });
            drawingUtils.drawConnectors(
              smoothedLandmarks,
              PoseLandmarker.POSE_CONNECTIONS,
              {
                lineWidth: 6,
                color: '#00ff00'
              }
            );
          }
        } catch (error) {
          console.error("Pose detection error:", error);
        }
      }
      frameCount++;
      requestAnimationFrame(detectPose);
    };

    if (videoLoaded) {
      detectPose();
    }
  }, [poseLandmarker, videoLoaded]);

  return (
    <div style={{ position: 'relative', width: '1024px', height: '576px', margin: '0 auto' }}>
      <div ref={iframeRef} id="youtube-player" style={{ width: '100%', height: '100%' }}></div>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />
    </div>
  );
}