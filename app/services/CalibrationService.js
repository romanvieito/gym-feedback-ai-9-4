import { landmarkNames } from './poseUtils';

export class CalibrationService {
  static #calibrationState = {
    isCalibrated: false,
    scaleFactor: 1,
    rotationMatrix: null,
    translationVector: null,
    referenceHeight: null,
    referenceWidth: null,
    confidenceThreshold: 0.7
  };

  static #referencePoints = {
    shoulders: [11, 12], // Left and right shoulder indices
    hips: [23, 24],     // Left and right hip indices
    ankles: [27, 28]    // Left and right ankle indices
  };

  static async calibrate(referenceLandmarks, userLandmarks) {
    if (!referenceLandmarks || !userLandmarks) {
      console.warn('Missing landmarks for calibration');
      return false;
    }

    try {
      // 1. Calculate scale factor using multiple body segments
      const scaleFactor = this.#calculateMultiSegmentScale(referenceLandmarks, userLandmarks);
      
      // 2. Calculate rotation to align poses
      const rotationMatrix = this.#calculateRotationMatrix(referenceLandmarks, userLandmarks);
      
      // 3. Calculate translation to center poses
      const translationVector = this.#calculateTranslationVector(referenceLandmarks, userLandmarks);
      
      // 4. Store reference dimensions
      const { height, width } = this.#calculateReferenceDimensions(referenceLandmarks);
      
      // 5. Update calibration state
      this.#calibrationState = {
        isCalibrated: true,
        scaleFactor,
        rotationMatrix,
        translationVector,
        referenceHeight: height,
        referenceWidth: width,
        confidenceThreshold: 0.7
      };

      return true;
    } catch (error) {
      console.error('Calibration failed:', error);
      return false;
    }
  }

  static #calculateMultiSegmentScale(referenceLandmarks, userLandmarks) {
    const segments = [
      { name: 'shoulders', points: this.#referencePoints.shoulders },
      { name: 'hips', points: this.#referencePoints.hips },
      { name: 'ankles', points: this.#referencePoints.ankles }
    ];

    const scales = segments.map(segment => {
      const refDist = this.#calculateDistance(
        referenceLandmarks[segment.points[0]],
        referenceLandmarks[segment.points[1]]
      );
      const userDist = this.#calculateDistance(
        userLandmarks[segment.points[0]],
        userLandmarks[segment.points[1]]
      );
      return refDist / userDist;
    }).filter(scale => !isNaN(scale) && isFinite(scale));

    // Use weighted average of scales, giving more weight to more reliable segments
    const weights = [0.4, 0.4, 0.2]; // Weights for shoulders, hips, ankles
    const weightedScale = scales.reduce((acc, scale, i) => acc + scale * weights[i], 0);
    
    return weightedScale;
  }

  static #calculateRotationMatrix(referenceLandmarks, userLandmarks) {
    // Calculate the angle between the shoulder lines
    const refShoulderAngle = this.#calculateAngle(
      referenceLandmarks[this.#referencePoints.shoulders[0]],
      referenceLandmarks[this.#referencePoints.shoulders[1]]
    );
    const userShoulderAngle = this.#calculateAngle(
      userLandmarks[this.#referencePoints.shoulders[0]],
      userLandmarks[this.#referencePoints.shoulders[1]]
    );

    const rotationAngle = refShoulderAngle - userShoulderAngle;
    
    // Create 2D rotation matrix
    return [
      [Math.cos(rotationAngle), -Math.sin(rotationAngle)],
      [Math.sin(rotationAngle), Math.cos(rotationAngle)]
    ];
  }

  static #calculateTranslationVector(referenceLandmarks, userLandmarks) {
    // Calculate center points
    const refCenter = this.#calculateCenterPoint(referenceLandmarks);
    const userCenter = this.#calculateCenterPoint(userLandmarks);

    return {
      x: refCenter.x - userCenter.x,
      y: refCenter.y - userCenter.y
    };
  }

  static #calculateReferenceDimensions(landmarks) {
    const height = Math.abs(
      landmarks[this.#referencePoints.ankles[0]].y - 
      landmarks[this.#referencePoints.shoulders[0]].y
    );
    
    const width = Math.abs(
      landmarks[this.#referencePoints.shoulders[0]].x - 
      landmarks[this.#referencePoints.shoulders[1]].x
    );

    return { height, width };
  }

  static #calculateDistance(point1, point2) {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) +
      Math.pow(point2.y - point1.y, 2)
    );
  }

  static #calculateAngle(point1, point2) {
    return Math.atan2(point2.y - point1.y, point2.x - point1.x);
  }

  static #calculateCenterPoint(landmarks) {
    const x = (landmarks[this.#referencePoints.shoulders[0]].x + 
               landmarks[this.#referencePoints.shoulders[1]].x) / 2;
    const y = (landmarks[this.#referencePoints.shoulders[0]].y + 
               landmarks[this.#referencePoints.shoulders[1]].y) / 2;
    return { x, y };
  }

  static transformLandmarks(landmarks) {
    if (!this.#calibrationState.isCalibrated) {
      return landmarks;
    }

    return landmarks.map(landmark => {
      // Apply rotation
      const rotatedX = landmark.x * this.#calibrationState.rotationMatrix[0][0] +
                      landmark.y * this.#calibrationState.rotationMatrix[0][1];
      const rotatedY = landmark.x * this.#calibrationState.rotationMatrix[1][0] +
                      landmark.y * this.#calibrationState.rotationMatrix[1][1];

      // Apply scale
      const scaledX = rotatedX * this.#calibrationState.scaleFactor;
      const scaledY = rotatedY * this.#calibrationState.scaleFactor;

      // Apply translation
      return {
        x: scaledX + this.#calibrationState.translationVector.x,
        y: scaledY + this.#calibrationState.translationVector.y,
        z: landmark.z * this.#calibrationState.scaleFactor,
        visibility: landmark.visibility
      };
    });
  }

  static isCalibrated() {
    return this.#calibrationState.isCalibrated;
  }

  static resetCalibration() {
    this.#calibrationState = {
      isCalibrated: false,
      scaleFactor: 1,
      rotationMatrix: null,
      translationVector: null,
      referenceHeight: null,
      referenceWidth: null,
      confidenceThreshold: 0.7
    };
  }

  static getCalibrationState() {
    return { ...this.#calibrationState };
  }
} 