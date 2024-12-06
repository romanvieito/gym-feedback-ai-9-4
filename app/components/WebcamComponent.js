import React, { useRef, useEffect, useCallback } from 'react';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';
import { PoseDetectionService } from '../services/PoseDetectionService';
import { computeAngle } from '../services/angleUtils';

export function WebcamComponent({ 
  poseLandmarker, 
  onLandmarksUpdate,
  poseMatchData 
}) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const detectPose = useCallback(async () => {
    if (!webcamRef.current || !poseLandmarker || !canvasRef.current) return;

    const video = webcamRef.current;
    const canvasCtx = canvasRef.current.getContext('2d');
    
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    // Set canvas dimensions and draw video
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);

    try {
      const result = await PoseDetectionService.detectPoseInVideo(poseLandmarker, video);
      if (result?.landmarks?.[0]) {
        onLandmarksUpdate(result.landmarks[0]);
        
        const drawingUtils = new DrawingUtils(canvasCtx);
        const color = poseMatchData?.color || '#0000ff';
        
        // Draw landmarks with provided color
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
  }, [poseLandmarker, onLandmarksUpdate, poseMatchData]);

  // Initialize webcam
  useEffect(() => {
    if (poseLandmarker) {
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
    }
  }, [poseLandmarker, detectPose]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '640px', 
      height: '480px',
      margin: '0 auto'
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