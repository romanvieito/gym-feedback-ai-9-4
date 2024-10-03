import React from 'react';
import LinearProgressWithLabel from './LinearProgressWithLabel';

const LoadingIndicator = ({ progress }) => (
  <>
    {progress > 0 && progress < 100 ? (
      <>
        <p>Downloading model to process poses ... </p>
        <LinearProgressWithLabel value={progress} />
      </>
    ) : progress === 100 ? (
      <p>Downloaded model</p>
    ) : (
      <p>Getting started</p>
    )}
  </>
);

export default LoadingIndicator;
