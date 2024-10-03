import React from 'react';
import LinearProgressWithLabel from './LinearProgressWithLabel';

const LoadingIndicator = ({ progress }) => (
  <div style={{ color: 'white' }}>
    {progress > 0 && progress < 100 ? (
      <>
        <p>Downloading dance moves... Get ready to boogie! 🕺💃</p>
        <LinearProgressWithLabel value={progress} color="white" />
      </>
    ) : progress === 100 ? (
      <p>Woohoo! Dance floor is ready! 🎉</p>
    ) : (
      <p>Warming up the disco ball... 🪩</p>
    )}
  </div>
);

export default LoadingIndicator;
