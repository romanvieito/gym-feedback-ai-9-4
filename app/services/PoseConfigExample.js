// Example usage of the new pose detection configuration system
import { PoseConfigManager } from './poseUtils';

// Example 1: Get current configuration
export function getCurrentPoseConfig() {
  return PoseConfigManager.getConfig();
}

// Example 2: Update specific joint thresholds
export function adjustJointSensitivity() {
  // Make knee detection more strict (higher threshold = more sensitive to deviations)
  PoseConfigManager.setJointThreshold('right knee', 75);
  PoseConfigManager.setJointThreshold('left knee', 75);
  
  // Make shoulder detection more lenient (lower threshold = less sensitive)
  PoseConfigManager.setJointThreshold('right shoulder', 55);
  PoseConfigManager.setJointThreshold('left shoulder', 55);
}

// Example 3: Update landmark visibility requirements
export function adjustVisibilityRequirements() {
  // Make core landmarks more strict
  PoseConfigManager.setLandmarkVisibilityThreshold('Left Shoulder', 0.7);
  PoseConfigManager.setLandmarkVisibilityThreshold('Right Shoulder', 0.7);
  PoseConfigManager.setLandmarkVisibilityThreshold('Left Hip', 0.7);
  PoseConfigManager.setLandmarkVisibilityThreshold('Right Hip', 0.7);
  
  // Make face landmarks more lenient
  PoseConfigManager.setLandmarkVisibilityThreshold('Nose', 0.2);
  PoseConfigManager.setLandmarkVisibilityThreshold('Left Eye', 0.2);
  PoseConfigManager.setLandmarkVisibilityThreshold('Right Eye', 0.2);
}

// Example 4: Bulk configuration update
export function configureForWorkoutType(workoutType) {
  switch (workoutType) {
    case 'squats':
      // Focus on lower body joints
      PoseConfigManager.updateConfig({
        anomalyThresholds: {
          'right knee': 80,    // Very strict for squats
          'left knee': 80,
          'right hip': 75,
          'left hip': 75,
          'right ankle': 70,
          'left ankle': 70,
          // Less strict for upper body
          'right shoulder': 50,
          'left shoulder': 50,
          'right elbow': 50,
          'left elbow': 50,
        },
        minVisibleLandmarks: 12 // Can work with fewer landmarks for squats
      });
      break;
      
    case 'pushups':
      // Focus on upper body joints
      PoseConfigManager.updateConfig({
        anomalyThresholds: {
          'right shoulder': 75,  // Very strict for pushups
          'left shoulder': 75,
          'right elbow': 80,
          'left elbow': 80,
          // Less strict for lower body
          'right knee': 50,
          'left knee': 50,
          'right hip': 50,
          'left hip': 50,
        },
        minVisibleLandmarks: 18 // Need more landmarks for pushups
      });
      break;
      
    case 'planks':
      // Focus on core stability
      PoseConfigManager.updateConfig({
        anomalyThresholds: {
          'right hip': 70,
          'left hip': 70,
          'right shoulder': 65,
          'left shoulder': 65,
          'right knee': 60,
          'left knee': 60,
        },
        minVisibleLandmarks: 16
      });
      break;
      
    default:
      // Reset to default configuration
      PoseConfigManager.resetConfig();
  }
}

// Example 5: Get specific thresholds
export function getJointSensitivity(jointName) {
  return PoseConfigManager.getJointThreshold(jointName);
}

export function getLandmarkVisibilityRequirement(landmarkName) {
  return PoseConfigManager.getLandmarkVisibilityThreshold(landmarkName);
}

// Example 6: Create custom configuration for specific user needs
export function createCustomConfig(userPreferences) {
  const {
    strictness = 'medium', // 'low', 'medium', 'high'
    focusArea = 'full',    // 'upper', 'lower', 'core', 'full'
    minLandmarks = 15
  } = userPreferences;
  
  const baseThresholds = {
    low: 50,
    medium: 65,
    high: 80
  };
  
  const baseThreshold = baseThresholds[strictness];
  
  let config = {
    minVisibleLandmarks: minLandmarks,
    anomalyThresholds: {}
  };
  
  // Apply focus area
  if (focusArea === 'upper' || focusArea === 'full') {
    config.anomalyThresholds = {
      ...config.anomalyThresholds,
      'right shoulder': baseThreshold,
      'left shoulder': baseThreshold,
      'right elbow': baseThreshold,
      'left elbow': baseThreshold,
    };
  }
  
  if (focusArea === 'lower' || focusArea === 'full') {
    config.anomalyThresholds = {
      ...config.anomalyThresholds,
      'right knee': baseThreshold,
      'left knee': baseThreshold,
      'right hip': baseThreshold,
      'left hip': baseThreshold,
      'right ankle': baseThreshold - 5,
      'left ankle': baseThreshold - 5,
    };
  }
  
  if (focusArea === 'core' || focusArea === 'full') {
    config.anomalyThresholds = {
      ...config.anomalyThresholds,
      'right hip': baseThreshold,
      'left hip': baseThreshold,
    };
  }
  
  PoseConfigManager.updateConfig(config);
  return config;
}
