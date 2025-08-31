'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

const SubtitleComponent = ({ 
  showSubtitles = true, 
  onToggleSubtitles, 
  isMaximized = false,
  className = "" 
}) => {
  const [subtitleText, setSubtitleText] = useState('');
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const subtitleTimeoutRef = useRef(null);

  // Function to display subtitles with text
  const displaySubtitle = useCallback((text) => {
    if (!text || !showSubtitles) return;

    setSubtitleText(text);
    setSubtitleVisible(true);
    
    // Clear any existing timeout
    if (subtitleTimeoutRef.current) {
      clearTimeout(subtitleTimeoutRef.current);
    }
    
    // Hide subtitles after estimated duration (roughly 150 words per minute)
    const wordCount = text.split(' ').length;
    const estimatedDuration = Math.max(3000, (wordCount / 150) * 60 * 1000); // Minimum 3 seconds
    subtitleTimeoutRef.current = setTimeout(() => {
      setSubtitleVisible(false);
      setSubtitleText('');
    }, estimatedDuration);
  }, [showSubtitles]);

  // Function to hide subtitles
  const hideSubtitle = useCallback(() => {
    setSubtitleVisible(false);
    setSubtitleText('');
    if (subtitleTimeoutRef.current) {
      clearTimeout(subtitleTimeoutRef.current);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (subtitleTimeoutRef.current) {
        clearTimeout(subtitleTimeoutRef.current);
      }
    };
  }, []);

  // Expose methods to parent component
  useEffect(() => {
    if (window.subtitleComponent) {
      window.subtitleComponent.displaySubtitle = displaySubtitle;
      window.subtitleComponent.hideSubtitle = hideSubtitle;
    } else {
      window.subtitleComponent = {
        displaySubtitle,
        hideSubtitle
      };
    }
  }, [displaySubtitle, hideSubtitle]);

  return (
    <>
      {/* Toggle Subtitles Button */}
      <button
        onClick={onToggleSubtitles}
        className={`absolute bottom-4 right-20 z-50 p-3 rounded-full text-sm font-medium bg-white hover:bg-gray-50 text-gray-700 shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl ${className}`}
      >
        {showSubtitles ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <path d="M8 8h8M8 12h8M8 16h5"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <path d="M8 8h8M8 12h8M8 16h5"/>
            <line x1="2" y1="2" x2="22" y2="22"/>
          </svg>
        )}
      </button>

      {/* Subtitles Display */}
      {showSubtitles && subtitleVisible && subtitleText && (
        <div className={`absolute ${isMaximized ? 'bottom-20' : 'bottom-16'} left-1/2 transform -translate-x-1/2 ${isMaximized ? 'z-50' : 'z-20'} ${isMaximized ? 'max-w-4xl' : 'max-w-3xl'} px-6`}>
          <div className="bg-black bg-opacity-75 text-white text-center px-6 py-4 rounded-lg shadow-lg backdrop-blur-sm">
            <p className={`${isMaximized ? 'text-lg' : 'text-base'} font-medium leading-relaxed`}>
              {subtitleText}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SubtitleComponent;
