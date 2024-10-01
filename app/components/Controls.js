/**
 * The Controls component provides a user interface for selecting the video source 
 * for the pose detection application. It allows users to either upload a video file 
 * from their device or use their webcam as the video source.
 * 
 * Functionality:
 * - Video Upload: When the user clicks the "Upload Video" button, it triggers a hidden 
 *   file input element to open, allowing the user to select a video file. Once a file 
 *   is selected, the `handleVideoUpload` function is called, which creates a URL for 
 *   the selected video file and updates the state to set this video as the source. 
 *   It also ensures that the webcam option is disabled by setting `setUseWebcam` to false.
 * 
 * - Webcam Usage: The "Use Webcam" button allows users to switch to using their webcam 
 *   as the video source. When clicked, it sets the video source to null and updates 
 *   the state to indicate that the webcam should be used instead.
 * 
 * The component is styled using Material-UI components, providing a clean and 
 * user-friendly interface for selecting video sources.
 */


import React from 'react';
import { Button, Box, Typography } from '@mui/material';

function Controls({ setVideoSrc, setUseWebcam }) {
  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const fileURL = URL.createObjectURL(file);
    setVideoSrc(fileURL);
    setUseWebcam(false);
  };

  const handleWebcam = () => {
    setVideoSrc(null);
    setUseWebcam(true);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Typography variant="h6" sx={{ marginBottom: 2 }}>
        Select Video Source
      </Typography>
      <Button variant="contained" onClick={() => document.getElementById('videoFileInput').click()}>
        Upload Video
      </Button>
      <Button variant="outlined" onClick={handleWebcam}>
        Use Webcam
      </Button>
      <input
        type="file"
        id="videoFileInput"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleVideoUpload}
      />
    </Box>
  );
}

export default Controls;
