import React, { useRef, useEffect, useState } from 'react';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { PoseDetectionService } from '../services/PoseDetectionService';


export function WorkoutVideoComponent({ 
  workout,
  poseLandmarker, 
  onLandmarksUpdate,
  isActive,
  onCurrentTimeUpdate,
  onDurationUpdate,
  showPoseLines,
  onVideoRef,
  isMaximized = false,
  onTogglePlayPause,
  onWorkoutComplete
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

    const handleVideoEnd = () => {
      console.log('Video ended - workout complete!');
      if (onWorkoutComplete) {
        onWorkoutComplete();
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleVideoEnd);

    if (isActive) {
      video.play().catch(err => console.error("Error playing video:", err));
    } else {
      video.pause();
    }

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleVideoEnd);
    };
  }, [isActive, onCurrentTimeUpdate, onDurationUpdate]);

  useEffect(() => {
    if (!poseLandmarker || !videoRef.current || !canvasRef.current) return;

    const detectAndDrawPose = async () => {
      try {
        const videoEl = videoRef.current;
        const canvasEl = canvasRef.current;
        if (!videoEl || !canvasEl) return;
        if (videoEl.readyState >= 2) {
          const result = await PoseDetectionService.detectPoseInVideo(
            poseLandmarker,
            videoEl
          );

          if (result?.landmarks?.[0]) {
            onLandmarksUpdate(result.landmarks[0]);
            
            // Only draw if showPoseLines is true
            if (showPoseLines) {
              const video = videoEl;
              const canvasCtx = canvasEl.getContext('2d');
              const drawingUtils = new DrawingUtils(canvasCtx);
              
              canvasEl.width = video.videoWidth;
              canvasEl.height = video.videoHeight;
              
              canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
              drawingUtils.drawLandmarks(result.landmarks[0], {
                radius: 6,
                color: '#00ff00'
              });
              drawingUtils.drawConnectors(
                result.landmarks[0], 
                PoseLandmarker.POSE_CONNECTIONS, 
                {
                  lineWidth: 6,
                  color: '#00ff00'
                }
              );
            } else {
              // Clear canvas when lines are hidden
              const canvasCtx = canvasEl.getContext('2d');
              canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            }
          }
        }
      } catch (error) {
        console.error("Error detecting video pose:", error);
      }
    };

    let animationFrameId;
    const detectFrame = async () => {
      await detectAndDrawPose();
      if (isActive) {
        animationFrameId = requestAnimationFrame(detectFrame);
      }
    };

    // Always run at least once to populate landmarks even when paused
    detectFrame();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [poseLandmarker, videoRef, canvasRef, onLandmarksUpdate, isActive, showPoseLines]);

  const containerClass = isMaximized
    ? 'relative w-full h-full'
    : 'relative w-full aspect-video';
  const videoBgClass = isMaximized
    ? 'bg-black'
    : 'bg-gray-50 dark:bg-gray-900';

  const handleVideoClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTogglePlayPause) {
      onTogglePlayPause();
    }
  };

  const resolveVideoSrc = (video) => {
    if (!video) return '';
    if (typeof video === 'string' && video.startsWith('/')) {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/app')) {
        return `/app${video}`;
      }
    }
    return video;
  };

  const isSameOriginApiVideo = (video) => {
    if (!video) return false;
    if (typeof window === 'undefined') return false;
    try {
      // Treat root-relative or same-origin /api/uploads as same-origin
      if (typeof video === 'string' && video.startsWith('/')) return true;
      const u = new URL(video);
      return (
        u.origin === window.location.origin &&
        (u.pathname.startsWith('/api/uploads/') || u.pathname.startsWith('/app/api/uploads/'))
      );
    } catch (_) {
      return false;
    }
  };

  const handleVideoError = (e) => {
    const v = e?.currentTarget;
    // Log minimal info to help diagnose proxy/base-path issues
    console.error('Workout video error', {
      src: v?.currentSrc || v?.src,
      networkState: v?.networkState,
      readyState: v?.readyState,
    });
  };

  const handleVideoStalled = (e) => {
    const v = e?.currentTarget;
    console.warn('Workout video stalled', {
      src: v?.currentSrc || v?.src,
      networkState: v?.networkState,
      readyState: v?.readyState,
    });
  };

  return (
    <div className={containerClass}>
      <video 
        ref={(el) => { 
          videoRef.current = el; 
          if (onVideoRef) onVideoRef(el);
        }} 
        className={`absolute inset-0 w-full h-full object-contain ${videoBgClass} cursor-pointer`}
        src={resolveVideoSrc(workout.video)}
        playsInline
        crossOrigin={isSameOriginApiVideo(workout.video) ? undefined : undefined}
        preload="auto"
        onError={handleVideoError}
        onStalled={handleVideoStalled}
        onClick={handleVideoClick}
      />
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
} 