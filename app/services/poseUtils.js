export const landmarkNames = [
  'Nose', 'Left Eye (Inner)', 'Left Eye', 'Left Eye (Outer)', 'Right Eye (Inner)',
  'Right Eye', 'Right Eye (Outer)', 'Left Ear', 'Right Ear', 'Mouth (Left)',
  'Mouth (Right)', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Pinky', 'Right Pinky', 'Left Index',
  'Right Index', 'Left Thumb', 'Right Thumb', 'Left Hip', 'Right Hip',
  'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle', 'Left Heel',
  'Right Heel', 'Left Foot Index', 'Right Foot Index'
];

export function areLandmarksVisible(landmarks, requiredIndices, config = null) {
  if (!landmarks || landmarks.length === 0) return false;
  
  const currentConfig = config || poseDetectionConfig;
  let visibleCount = 0;
  
  for (const index of requiredIndices) {
    const lm = landmarks[index];
    if (!lm) continue;
    
    const landmarkName = landmarkNames[index];
    const threshold = currentConfig.landmarkVisibilityThresholds[landmarkName] || currentConfig.defaultVisibilityThreshold;
    
    // Treat missing visibility as visible; enforce threshold only when present
    if (lm.visibility === undefined || lm.visibility >= threshold) {
      visibleCount++;
    }
  }
  
  // Check if we have enough visible landmarks
  return visibleCount >= currentConfig.minVisibleLandmarks;
}

export const angleDict = {
  'right knee': [['Right Ankle', 'Right Knee', 'Right Hip'], 'flexion', -180, 1],
  'left knee': [['Left Ankle', 'Left Knee', 'Left Hip'], 'flexion', -180, 1],
  'right hip': [['Right Knee', 'Right Hip', 'Right Shoulder'], 'flexion', 0, -1],
  'left hip': [['Left Knee', 'Left Hip', 'Left Shoulder'], 'flexion', 0, -1],
  'right shoulder': [['Right Elbow', 'Right Shoulder', 'Right Hip'], 'flexion', 0, -1],
  'left shoulder': [['Left Elbow', 'Left Shoulder', 'Left Hip'], 'flexion', 0, -1],
  'right elbow': [['Right Wrist', 'Right Elbow', 'Right Shoulder'], 'flexion', 180, -1],
  'left elbow': [['Left Wrist', 'Left Elbow', 'Left Shoulder'], 'flexion', 180, -1],
  'right ankle': [['Right Knee', 'Right Ankle', 'Right Foot Index'], 'dorsiflexion', 90, 1],
  'left ankle': [['Left Knee', 'Left Ankle', 'Left Foot Index'], 'dorsiflexion', 90, 1],
  // 'neck': [['Nose', 'Left Shoulder', 'Right Shoulder'], 'flexion', 90, -1],
  // 'trunk': [['Left Shoulder', 'Left Hip', 'Left Ankle'], 'flexion', 0, -1],
  // 'right wrist': [['Right Index', 'Right Wrist', 'Right Elbow'], 'flexion', 180, -1],
  // 'left wrist': [['Left Index', 'Left Wrist', 'Left Elbow'], 'flexion', 180, -1]
};
//TODO los 4 ultimos angles (neck, trunk, right wrist, left wrist) los puso cursor, revisar si son correctos

// Configuration for pose detection thresholds and settings
export const poseDetectionConfig = {
  // Global visibility threshold (can be overridden per landmark)
  defaultVisibilityThreshold: 0.5,
  
  // Per-joint anomaly thresholds (percentage similarity below which joint is considered anomalous)
  anomalyThresholds: {
    'right knee': 70,    // Knees are critical for form - higher threshold
    'left knee': 70,
    'right hip': 65,     // Hips are important for stability
    'left hip': 65,
    'right shoulder': 60, // Shoulders can have more natural variation
    'left shoulder': 60,
    'right elbow': 65,   // Elbows are important for arm exercises
    'left elbow': 65,
    'right ankle': 55,   // Ankles can have more variation
    'left ankle': 55,
  },
  
  // Per-landmark visibility thresholds (overrides default)
  landmarkVisibilityThresholds: {
    // Core landmarks that are critical for pose detection
    'Left Shoulder': 0.6,
    'Right Shoulder': 0.6,
    'Left Hip': 0.6,
    'Right Hip': 0.6,
    'Left Knee': 0.5,
    'Right Knee': 0.5,
    'Left Ankle': 0.4,
    'Right Ankle': 0.4,
    // Face landmarks can be less strict
    'Nose': 0.3,
    'Left Eye': 0.3,
    'Right Eye': 0.3,
    // Hand landmarks can vary more
    'Left Wrist': 0.4,
    'Right Wrist': 0.4,
    'Left Elbow': 0.5,
    'Right Elbow': 0.5,
  },
  
  // Minimum number of landmarks that must be visible for pose detection
  minVisibleLandmarks: 15,
  
  // Required landmark indices for pose matching (indices 10+ are body landmarks)
  requiredLandmarkIndices: Array.from({ length: landmarkNames.length - 10 }, (_, i) => i + 10)
};

// Configuration management functions
export class PoseConfigManager {
  static #currentConfig = { ...poseDetectionConfig };
  
  // Get current configuration
  static getConfig() {
    return { ...this.#currentConfig };
  }
  
  // Update configuration with new values
  static updateConfig(updates) {
    this.#currentConfig = {
      ...this.#currentConfig,
      ...updates,
      // Deep merge nested objects
      anomalyThresholds: {
        ...this.#currentConfig.anomalyThresholds,
        ...(updates.anomalyThresholds || {})
      },
      landmarkVisibilityThresholds: {
        ...this.#currentConfig.landmarkVisibilityThresholds,
        ...(updates.landmarkVisibilityThresholds || {})
      }
    };
  }
  
  // Reset to default configuration
  static resetConfig() {
    this.#currentConfig = { ...poseDetectionConfig };
  }
  
  // Get current config for use in functions
  static getCurrentConfig() {
    return this.#currentConfig;
  }
  
  // Update specific joint threshold
  static setJointThreshold(jointName, threshold) {
    this.#currentConfig.anomalyThresholds[jointName] = threshold;
  }
  
  // Update specific landmark visibility threshold
  static setLandmarkVisibilityThreshold(landmarkName, threshold) {
    this.#currentConfig.landmarkVisibilityThresholds[landmarkName] = threshold;
  }
  
  // Get joint threshold
  static getJointThreshold(jointName) {
    return this.#currentConfig.anomalyThresholds[jointName] || 65;
  }
  
  // Get landmark visibility threshold
  static getLandmarkVisibilityThreshold(landmarkName) {
    return this.#currentConfig.landmarkVisibilityThresholds[landmarkName] || this.#currentConfig.defaultVisibilityThreshold;
  }
}