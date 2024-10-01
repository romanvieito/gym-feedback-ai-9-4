/**
 * VideoPlayer Component
 * 
 * This component is responsible for rendering a video element that can either play a video file uploaded by the user or display a live feed from the webcam.
 * 
 * Props:
 * - videoSrc: A string representing the source URL of the video file to be played.
 * - useWebcam: A boolean that indicates whether to use the webcam for video input.
 * - videoRef: A reference to the video element that will display the video.
 * - setVideoDimensions: A function to update the video dimensions state.
 * - videoDimensions: An object that holds the current width and height of the video, initialized to 480x360.
 * - feedback: A string representing the feedback text to be displayed as an overlay.
 * 
 * State:
 * - statistics: An array of strings representing the video's statistics.
 * 
 * Effects:
 * - The useEffect hook is used to set up the video source. If useWebcam is true, it attempts to access the user's webcam using the getUserMedia API and sets the video source to the webcam stream. 
 * - When the video metadata is loaded, it calculates the scaled dimensions for the video based on the maximum width and height constraints and updates the state accordingly.
 * 
 * Utility Functions:
 * - getScaledDimensions: A helper function that calculates the appropriate dimensions for the video based on the video dimensions and specified maximum constraints.
 */


import React, { useEffect } from 'react';
import Overlay from './Overlay';

// Max width and height constraints
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

function getScaledDimensions(width, height, maxWidth, maxHeight) {
  let aspectRatio = width / height;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}

function VideoPlayer({ videoSrc, useWebcam, videoRef, setVideoDimensions, videoDimensions, feedback }) {
  // Remove local state for video dimensions
  useEffect(() => {
    if (useWebcam) {
      async function setupWebcam() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            const scaledDimensions = getScaledDimensions(
              videoRef.current.videoWidth,
              videoRef.current.videoHeight,
              MAX_WIDTH,
              MAX_HEIGHT
            );
            setVideoDimensions(scaledDimensions); // Update parent state
            videoRef.current.play();
          };
        } else {
          alert('Webcam not supported in this browser.');
        }
      }
      setupWebcam();
    } else {
      if (videoSrc) {
        videoRef.current.src = videoSrc;
        videoRef.current.onloadedmetadata = () => {
          const scaledDimensions = getScaledDimensions(
            videoRef.current.videoWidth,
            videoRef.current.videoHeight,
            MAX_WIDTH,
            MAX_HEIGHT
          );
          setVideoDimensions(scaledDimensions); // Update parent state
          videoRef.current.play();
        };
      }
    }
  }, [videoSrc, useWebcam, videoRef, setVideoDimensions]);

  return (
    <div style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        controls={!useWebcam} // Show controls if not using webcam
        style={{
          width: `${videoDimensions.width}px`,
          height: `${videoDimensions.height}px`,
          margin: '10px',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        }}
      />
      <Overlay statistics={feedback ? [feedback] : []} visible={true} />
    </div>
  );
}

export default VideoPlayer;
