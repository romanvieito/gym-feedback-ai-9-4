'use client';

import React, { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

// FeedbackManager centralizes TTS playback: unlock, ducking, sequencing, subtitles.
// Usage: const ref = useRef(); <FeedbackManager ref={ref} getVideoEl={() => videoRef.current} feedbackVolume={0.8} showSubtitles={true} />
// Then call: ref.current?.speak(text, { voice: 'alloy' })

const FeedbackManager = forwardRef(function FeedbackManager(
  {
    getVideoEl,
    feedbackVolume = 0.8,
    showSubtitles = true,
  },
  ref
) {
  const audioContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const currentAudioRef = useRef(null);
  const speakSeqRef = useRef(0);
  const ttsAbortRef = useRef(null);
  const welcomePlayedRef = useRef(false);

  const welcomeMessages = [
    "Hey there! Ready to sweat and shine? Let's make every move count!",
    "Good to see you! Let's get this session started!",
    "Time to get fit and feel amazing! I'm here to guide you through your workout.",
    "Welcome! Get ready for an energizing workout session!",
    "Let's make today's workout count! Ready when you are!",
    "It's time to move, groove, and improve! Let's get this session started!",
    "Every rep brings you closer to your goals. Let's kick things off strong!",
    "Excited to see you! Let's ignite that energy and have a great workout!",
    "Here we go! Today's workout is your next step to greatness. Let's begin!",
    "Welcome! Let's set the tone for an great session. You've got this!",
  ];

  const buildEncouragingPhrases = (timeText) => [
    `Great work! ${timeText} and counting. Every second counts!`,
    `Fantastic effort! ${timeText} of awesome workout. You're crushing it!`,
    `You're doing amazing! ${timeText} of exercise completed. Stay strong!`,
    `Keep that energy going! You've been at it for ${timeText}. You've got this!`,
    `Consistency is key! ${timeText} of movement. Feel the progress!`,
  ];
  const speechActiveCountRef = useRef(0);
  const originalVideoVolumeRef = useRef(1);
  const volumeFadeRafRef = useRef(null);

  const fadeVideoVolumeTo = useCallback((targetVolume, durationMs = 200) => {
    const videoEl = typeof getVideoEl === 'function' ? getVideoEl() : null;
    if (!videoEl) return;
    const startVolume = videoEl.volume;
    const clampedTarget = Math.max(0, Math.min(1, targetVolume));
    if (Math.abs(startVolume - clampedTarget) < 0.01) {
      videoEl.volume = clampedTarget;
      return;
    }
    if (volumeFadeRafRef.current) cancelAnimationFrame(volumeFadeRafRef.current);
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const newVolume = startVolume + (clampedTarget - startVolume) * t;
      videoEl.volume = Math.max(0, Math.min(1, newVolume));
      if (t < 1) {
        volumeFadeRafRef.current = requestAnimationFrame(step);
      }
    };
    volumeFadeRafRef.current = requestAnimationFrame(step);
  }, [getVideoEl]);

  const duckVideoVolume = useCallback(() => {
    const videoEl = typeof getVideoEl === 'function' ? getVideoEl() : null;
    if (!videoEl) return;
    if (speechActiveCountRef.current === 0) {
      originalVideoVolumeRef.current = videoEl.volume ?? 1;
      fadeVideoVolumeTo(0.15, 180);
    }
    speechActiveCountRef.current += 1;
  }, [fadeVideoVolumeTo, getVideoEl]);

  const restoreVideoVolumeIfIdle = useCallback(() => {
    const videoEl = typeof getVideoEl === 'function' ? getVideoEl() : null;
    if (!videoEl) return;
    if (speechActiveCountRef.current <= 0) return;
    speechActiveCountRef.current -= 1;
    if (speechActiveCountRef.current === 0) {
      fadeVideoVolumeTo(originalVideoVolumeRef.current ?? 1, 220);
    }
  }, [fadeVideoVolumeTo, getVideoEl]);

  const ensureAudioUnlocked = useCallback(async () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        audioUnlockedRef.current = true;
        return true;
      }
      if (!audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      audioUnlockedRef.current = audioContextRef.current.state === 'running';
      return audioUnlockedRef.current;
    } catch (_) {
      return false;
    }
  }, []);

  const speak = useCallback(async (text, options = {}) => {
    if (!text) return;

    const seq = ++speakSeqRef.current;
    

    // Preempt current audio and in-flight fetch
    try {
      if (ttsAbortRef.current) {
        try { ttsAbortRef.current.abort(); } catch (_) {}
      }
      if (currentAudioRef.current) {
        try { currentAudioRef.current.pause(); } catch (_) {}
        try { currentAudioRef.current.src = ''; } catch (_) {}
        currentAudioRef.current = null;
        restoreVideoVolumeIfIdle();
        // Explicitly hide any active subtitle when preempting
        if (showSubtitles && window.subtitleComponent) {
          try { window.subtitleComponent.hideSubtitle(); } catch (_) {}
        }
        await new Promise(r => setTimeout(r, 120));
      }
    } catch (_) {}

    try {
      const ctrl = new AbortController();
      ttsAbortRef.current = ctrl;

      const resp = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: options.voice || 'alloy', response_format: 'mp3' }),
        signal: ctrl.signal,
      });

      if (seq !== speakSeqRef.current) return;
      if (!resp.ok) throw new Error('TTS request failed');

      const blob = await resp.blob();
      if (seq !== speakSeqRef.current) return;

      const url = URL.createObjectURL(blob);
      const audioEl = new Audio(url);
      audioEl.volume = Math.max(0, Math.min(1, feedbackVolume));
      currentAudioRef.current = audioEl;

      const cleanup = () => {
        try { URL.revokeObjectURL(url); } catch (_) {}
        restoreVideoVolumeIfIdle();
        if (currentAudioRef.current === audioEl) {
          currentAudioRef.current = null;
        }
        if (showSubtitles && window.subtitleComponent) {
          try { window.subtitleComponent.hideSubtitle(); } catch (_) {}
        }
      };

      audioEl.onended = cleanup;
      audioEl.onerror = cleanup;

      try { await ensureAudioUnlocked(); } catch (_) {}
      if (seq !== speakSeqRef.current) { cleanup(); return; }

      duckVideoVolume();
      try {
        await audioEl.play();
        // Display subtitles only once playback actually starts
        if (seq === speakSeqRef.current && showSubtitles && window.subtitleComponent) {
          try { window.subtitleComponent.displaySubtitle(text, { autoHide: false }); } catch (_) {}
        }
      } catch (_) {
        cleanup();
      }
    } catch (_) {
      restoreVideoVolumeIfIdle();
      if (showSubtitles && window.subtitleComponent) {
        try { window.subtitleComponent.hideSubtitle(); } catch (_) {}
      }
    }
  }, [feedbackVolume, showSubtitles, ensureAudioUnlocked, duckVideoVolume, restoreVideoVolumeIfIdle]);

  const playWelcomeOnce = useCallback(async () => {
    if (welcomePlayedRef.current) return;
    const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    await speak(randomWelcome);
    welcomePlayedRef.current = true;
  }, [speak]);

  const speakEncouragement = useCallback(async (timeText) => {
    const phrases = buildEncouragingPhrases(timeText);
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    await speak(randomPhrase);
  }, [speak]);

  useEffect(() => {
    const onVis = async () => {
      if (!document.hidden) {
        await ensureAudioUnlocked();
        const a = currentAudioRef.current;
        if (a && a.paused) {
          try { await a.play(); } catch (_) {}
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [ensureAudioUnlocked]);

  useImperativeHandle(ref, () => ({
    speak,
    ensureAudioUnlocked,
    playWelcomeOnce,
    speakEncouragement,
  }));

  return null;
});

export default FeedbackManager;


