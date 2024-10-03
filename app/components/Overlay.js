/**
 * The Overlay component is responsible for displaying a set of statistics 
 * related to the pose detection functionality in a visually appealing manner. 
 * It is designed to be positioned in the top right corner of the screen, 
 * providing users with real-time feedback without obstructing the main content.
 * 
 * Functionality:
 * - Visibility Control: The component checks the 'visible' prop to determine 
 *   whether it should render its content. If 'visible' is false, the component 
 *   returns null, ensuring that it does not take up any space or interfere 
 *   with the user interface.
 * 
 * - Dynamic Statistics Display: The 'statistics' prop is expected to be an 
 *   array of strings, each representing a different statistic related to the 
 *   pose detection process. The component maps over this array to display 
 *   each statistic in a styled format, allowing users to easily read and 
 *   understand the current state of the application.
 * 
 * - Styling: The component uses Material-UI's Box and Typography components 
 *   to create a clean and modern look. The overlay has a semi-transparent 
 *   background, white text, and rounded corners, making it visually distinct 
 *   from the underlying content while maintaining readability.
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography, Fade } from '@mui/material';

const Overlay = ({ statistics, visible }) => {
  const [show, setShow] = useState(false);

  const [isSupported, setIsSupported] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
    }
    if (statistics.length > 0 && statistics[0] !== "") {
      setShow(true);

      speak();

      // Set a timeout to hide the overlay after 10 seconds
      const timer = setTimeout(() => setShow(false), 10000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [statistics]);

  const speak = () => {
    if (isSupported && statistics.length > 0 && currentIndex < statistics.length) {
      const utterance = new SpeechSynthesisUtterance(statistics[currentIndex]);

      // Manejar el evento end
      utterance.onend = () => {
        setCurrentIndex((prevIndex) => prevIndex + 1); // Aumentar el índice para el siguiente texto
        speak(); // Hablar el siguiente texto
      };

      speechSynthesis.speak(utterance);
    } else if (currentIndex >= statistics.length) {
      // Resetear el índice si se ha llegado al final
      setCurrentIndex(0);
    }
  };

  if (!visible || !show) return null;

  return (
    <Fade in={show} timeout={500}>
      <Box
        sx={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: 'auto',
          maxWidth: '300px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: '8px',
          padding: '10px',
          boxSizing: 'border-box',
          // zIndex: 10,
        }}
      >
        {statistics.map((stat, index) => (
          <Typography key={index} variant="body1" fontSize="1rem">
            {stat}
          </Typography>
        ))}
      </Box>
    </Fade>
  );
};

export default Overlay;
