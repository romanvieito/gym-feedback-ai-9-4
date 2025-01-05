

import React, { useRef, useEffect, useState } from 'react';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { PoseDetectionService } from '../services/PoseDetectionService';


export function WorkoutVideoComponent({ 
  workout,
  poseLandmarker, 
  onLandmarksUpdate,
  isActive,
  onCurrentTimeUpdate,
  onDurationUpdate
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // const [frameRate, setFrameRate] = useState(30); // Default to 30 fps

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      const currentTime = video.currentTime;
      onCurrentTimeUpdate(currentTime); // Update current time based on video
    };

    const updateDuration = () => {
      const duration = video.duration;
      onDurationUpdate(duration); // Update duration based on video
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    if (isActive) {
      video.play().catch(err => console.error("Error playing video:", err));
    } else {
      video.pause();
    }

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [isActive, onCurrentTimeUpdate, onDurationUpdate]);

  useEffect(() => {
    if (!poseLandmarker || !videoRef.current || !canvasRef.current) return;

    const detectAndDrawPose = async () => {
      try {
        if (videoRef.current.readyState >= 2 && !videoRef.current.paused) {
          const result = await PoseDetectionService.detectPoseInVideo(
            poseLandmarker,
            videoRef.current
          );

          if (result?.landmarks?.[0]) {
            onLandmarksUpdate(result.landmarks[0]);
            
            // Draw reference landmarks in green
            const video = videoRef.current;
            const canvasCtx = canvasRef.current.getContext('2d');
            const drawingUtils = new DrawingUtils(canvasCtx);
            
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
            
            canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            drawingUtils.drawLandmarks(result.landmarks[0], {
              radius: 6,
              color: '#00ff00'  // Reference pose always in green
            });
            drawingUtils.drawConnectors(
              result.landmarks[0], 
              PoseLandmarker.POSE_CONNECTIONS, 
              {
                lineWidth: 6,
                color: '#00ff00'
              }
            );
          }
        }
      } catch (error) {
        console.error("Error detecting video pose:", error);
      }
    };

    let animationFrameId;
    const detectFrame = async () => {
      if (isActive) {
        await detectAndDrawPose();
        animationFrameId = requestAnimationFrame(detectFrame);
      }
    };

    if (isActive) {
      detectFrame();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [poseLandmarker, videoRef, canvasRef, onLandmarksUpdate, isActive]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '1024px',
      height: '576px',
      margin: '0 auto'
    }}>
      <video 
        ref={videoRef} 
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1
        }}
        controls={!isActive}
        controlsList="nodownload nofullscreen" 
        src={workout.video}
        playsInline
        crossOrigin="anonymous"
      />
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />
    </div>
  );
} 