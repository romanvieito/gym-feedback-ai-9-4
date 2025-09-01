'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Tooltip from './Tooltip';

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
  const displaySubtitle = useCallback((text, options = {}) => {
    if (!text || !showSubtitles) return;

    setSubtitleText(text);
    setSubtitleVisible(true);
    
    // Clear any existing timeout
    if (subtitleTimeoutRef.current) {
      clearTimeout(subtitleTimeoutRef.current);
    }
    
    // Optionally auto-hide after a duration; default is to persist until explicitly hidden
    const { autoHide = false, durationMs } = options || {};
    if (autoHide) {
      const wordCount = text.split(' ').length;
      const estimatedDuration = Math.max(3000, (wordCount / 150) * 60 * 1000); // Minimum 3 seconds
      const hideAfter = Number.isFinite(durationMs) ? durationMs : estimatedDuration;
      subtitleTimeoutRef.current = setTimeout(() => {
        setSubtitleVisible(false);
        setSubtitleText('');
      }, hideAfter);
    }
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
      <Tooltip content={showSubtitles ? "Hide subtitles for audio feedback" : "Show subtitles for audio feedback"} position="bottom">
        <button
          onClick={onToggleSubtitles}
          className={`absolute bottom-6 left-52 z-50 w-12 h-12 rounded-xl bg-white/90 hover:bg-white text-gray-700 shadow-lg backdrop-blur-sm transition-all duration-200 flex items-center justify-center ${className}`}
        >
          {showSubtitles ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <g>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M6 10h2M6 14h6M14 14h4" />
              </g>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <g>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M6 10h2M6 14h6M14 14h4" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </g>
            </svg>
          )}
        </button>
      </Tooltip>

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
