'use client';

import React from 'react';
import Tooltip from './Tooltip';

const ControlsBar = ({
  isActive,
  isMaximized,
  isMuted,
  showSubtitles,
  showPoseLines,
  onToggleActive,
  onToggleFullscreen,
  onToggleMute,
  onToggleSubtitles,
  onTogglePoseLines,
  onGetFeedback
}) => {
  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      {/* AI Feedback */}
      <Tooltip content="AI Feedback">
        <button
          type="button"
          onClick={onGetFeedback}
          className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </Tooltip>

      {/* Play/Pause */}
      <Tooltip content={isActive ? "Pause workout" : "Start workout"}>
        <button 
          type="button"
          onClick={onToggleActive}
          className={`
            w-16 h-16 rounded-2xl font-medium text-base
            flex items-center justify-center
            transition-all duration-200 hover:shadow-lg mx-2
            ${isActive 
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300' 
              : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900'}
          `}
        >
          {isActive ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
      </Tooltip>

      {/* Fullscreen */}
      <Tooltip content={isMaximized ? "Exit fullscreen" : "Enter fullscreen"}>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isMaximized ? (
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            ) : (
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            )}
          </svg>
        </button>
      </Tooltip>

      {/* Mute */}
      <Tooltip content={isMuted ? "Unmute" : "Mute"}>
        <button
          type="button"
          onClick={onToggleMute}
          className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 flex items-center justify-center"
        >
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </button>
      </Tooltip>

      {/* Subtitles */}
      <Tooltip content={showSubtitles ? "Hide subtitles" : "Show subtitles"}>
        <button
          type="button"
          onClick={onToggleSubtitles}
          className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {showSubtitles ? (
              <g>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M6 10h2M6 14h6M14 14h4" />
              </g>
            ) : (
              <g>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M6 10h2M6 14h6M14 14h4" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </g>
            )}
          </svg>
        </button>
      </Tooltip>

      {/* Pose Lines */}
      <Tooltip content={showPoseLines ? "Hide pose lines" : "Show pose lines"}>
        <button
          type="button"
          onClick={onTogglePoseLines}
          className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 flex items-center justify-center"
        >
          {showPoseLines ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </Tooltip>
    </div>
  );
};

export default ControlsBar;


