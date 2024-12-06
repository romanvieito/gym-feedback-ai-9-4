import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class PoseDetectionService {
  static async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    );

    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 1
    });
  }

  static async detectPoseInVideo(poseLandmarker, videoElement) {
    if (!videoElement || videoElement.readyState < 2) return null;
    
    try {
      return await poseLandmarker.detectForVideo(videoElement, performance.now());
    } catch (error) {
      console.error("Error detecting pose:", error);
      return null;
    }
  }
} 