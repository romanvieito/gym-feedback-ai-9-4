import React, { useRef, useEffect, useCallback } from 'react';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';
import { PoseDetectionService } from '../services/PoseDetectionService';
import { computeAngle } from '../services/angleUtils';

export function WebcamComponent({ 
  poseLandmarker, 
  onLandmarksUpdate,
  onFrameIndexUpdate,
  onCurrentTimeUpdate,
  poseMatchData 
}) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const onLandmarksUpdateRef = useRef(onLandmarksUpdate);
  const poseMatchDataRef = useRef(poseMatchData);
  const frameRate = 30; // Assume a frame rate for the webcam

  useEffect(() => {
    onLandmarksUpdateRef.current = onLandmarksUpdate;
    poseMatchDataRef.current = poseMatchData;
  }, [onLandmarksUpdate, poseMatchData]);

  const detectPose = useCallback(async () => {
    if (!webcamRef.current || !poseLandmarker || !canvasRef.current) return;

    const video = webcamRef.current;
    const canvasCtx = canvasRef.current.getContext('2d');
    
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    try {
      const result = await PoseDetectionService.detectPoseInVideo(poseLandmarker, video);
      
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (result?.landmarks?.[0]) {
        onLandmarksUpdateRef.current(result.landmarks[0]);
        
        const drawingUtils = new DrawingUtils(canvasCtx);
        const color = poseMatchDataRef.current?.color || '#0000ff';
        
        drawingUtils.drawLandmarks(result.landmarks[0], { radius: 6, color });
        drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
          lineWidth: 6,
          color
        });
      }
    } catch (error) {
      console.error("Error detecting pose:", error);
    }

    animationRef.current = requestAnimationFrame(detectPose);
  }, [poseLandmarker]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    if (poseMatchData?.color) {
    }
  }, [poseMatchData]);

  useEffect(() => {
    if (!poseLandmarker) return;

    const videoRef = webcamRef.current;
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef) {
          videoRef.srcObject = stream;
          videoRef.onloadedmetadata = () => {
            videoRef.play();
            detectPose();
          };
        }
      })
      .catch(error => console.error("Error accessing webcam:", error));

    return () => {
      if (videoRef?.srcObject) {
        videoRef.srcObject.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [poseLandmarker, detectPose]);

  useEffect(() => {
    const updateWebcamData = () => {
      const currentTime = performance.now() / 1000; // Use performance.now() for precise timing
      onCurrentTimeUpdate(currentTime);

      const frameIndex = Math.floor(currentTime * frameRate);
      onFrameIndexUpdate(frameIndex);

      // Simulate landmark detection
      const landmarks = []; // Replace with actual landmark detection logic
      onLandmarksUpdate(landmarks);
    };

    const intervalId = setInterval(updateWebcamData, 1000 / frameRate);

    return () => clearInterval(intervalId);
  }, [onCurrentTimeUpdate, onFrameIndexUpdate, onLandmarksUpdate]);

  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      aspectRatio: '16/9',
      overflow: 'hidden',
      borderRadius: '0.75rem'
    }}>
      <video
        ref={webcamRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        autoPlay
        playsInline
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
} 