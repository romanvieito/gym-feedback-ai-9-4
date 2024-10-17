import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock the PoseLandmarker and FilesetResolver
jest.mock('@mediapipe/tasks-vision', () => ({
  PoseLandmarker: {
    createFromOptions: jest.fn().mockResolvedValue({}),
  },
  FilesetResolver: {
    forVisionTasks: jest.fn().mockResolvedValue({}),
  },
}));

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

describe('App Component', () => {
  test('renders without crashing', async () => {
    render(<App />);
    
    // Check if the main title is rendered
    expect(screen.getByText('Ready for some fun and fitness?')).toBeInTheDocument();
  });

  test('displays exercise cards', () => {
    render(<App />);
    
    expect(screen.getByText('Pilates')).toBeInTheDocument();
    expect(screen.getByText('Isometrics')).toBeInTheDocument();
    expect(screen.getByText('Upload Video')).toBeInTheDocument();
  });

  test('handles video upload', async () => {
    render(<App />);
    
    const file = new File(['dummy content'], 'test.mp4', { type: 'video/mp4' });
    const uploadInput = screen.getByLabelText('Upload Video');
    
    fireEvent.change(uploadInput, { target: { files: [file] } });
    
    // Wait for the video to be processed
    await waitFor(() => {
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
    });
  });

  test('toggles play/pause', async () => {
    render(<App />);
    
    // Simulate video upload
    const file = new File(['dummy content'], 'test.mp4', { type: 'video/mp4' });
    const uploadInput = screen.getByLabelText('Upload Video');
    fireEvent.change(uploadInput, { target: { files: [file] } });
    
    // Wait for the video player to appear
    await waitFor(() => {
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
    });
    
    const playPauseButton = screen.getByLabelText('Play/Pause');
    fireEvent.click(playPauseButton);
    
    // Check if the pause icon is displayed (indicating the video is playing)
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    
    fireEvent.click(playPauseButton);
    
    // Check if the play icon is displayed (indicating the video is paused)
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });
});

