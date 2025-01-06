//import { angleDict, landmarkNames } from '../services/poseUtils'; // Import statement for angleDict and landmarkNames, currently commented out
const COSINE_DISTANCE_THRESHOLD = 0.15; // Adjustable threshold for cosine distance

// Helper function to calculate angles from 3D points
export function points3DToAngles(coords) {
  if (coords.length < 3) return 0; // Return 0 if there are fewer than 3 coordinates

  const [p1, p2, p3] = coords; // Destructure the first three points from the coordinates
  const vectorA = { x: p2[0] - p1[0], y: p2[1] - p1[1], z: p2[2] - p1[2] }; // Calculate vector A from p1 to p2
  const vectorB = { x: p3[0] - p2[0], y: p3[1] - p2[1], z: p3[2] - p2[2] }; // Calculate vector B from p2 to p3

  const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y + vectorA.z * vectorB.z; // Calculate the dot product of vectors A and B
  const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2 + vectorA.z ** 2); // Calculate the magnitude of vector A
  const magnitudeB = Math.sqrt(vectorB.x ** 2 + vectorB.y ** 2 + vectorB.z ** 2); // Calculate the magnitude of vector B

  if (magnitudeA === 0 || magnitudeB === 0) { // Check for degenerate vectors
    console.warn('Degenerate vectors detected. Returning 0.'); // Log a warning if degenerate vectors are detected
    return 0; // Return 0 for degenerate vectors
  }

  const cosineAngle = dotProduct / (magnitudeA * magnitudeB); // Calculate the cosine of the angle between vectors A and B
  const clampedCosine = Math.max(-1, Math.min(1, cosineAngle)); // Clamp the cosine value to the range [-1, 1]
  return Math.acos(clampedCosine) * (180 / Math.PI); // Return the angle in degrees
}

// Compute angles from landmarks
export function computeAngle(angName, landmarks, angleDict, landmarkNames) {
  const angParams = angleDict[angName]; // Retrieve angle parameters from the angle dictionary
  if (!angParams) return NaN; // Return NaN if angle parameters are not found

  const angleCoords = angParams[0].map(kpt => { // Map over keypoints to get their coordinates
    const index = landmarkNames.indexOf(kpt); // Find the index of the keypoint in landmarkNames
    if (index === -1) return null; // Return null if the keypoint is not found
    const landmark = landmarks[index]; // Get the landmark at the found index
    return landmark ? [landmark.x, landmark.y, landmark.z] : null; // Return the coordinates of the landmark or null
  }).filter(coord => coord !== null); // Filter out null coordinates

  if (angleCoords.length < 3) { // Check if there are fewer than 3 coordinates
    console.warn(`Insufficient points for angle calculation: ${angName}`); // Log a warning if there are insufficient points
    return NaN; // Return NaN for insufficient points
  }

  let ang = points3DToAngles(angleCoords); // Calculate the angle from the coordinates
  ang += angParams[2]; // Adjust the angle by adding a parameter offset
  ang *= angParams[3]; // Scale the angle by a parameter factor

  if (['pelvis', 'shoulders'].includes(angName)) { // Check if the angle name is 'pelvis' or 'shoulders'
    ang = ang > 90 ? ang - 180 : ang; // Adjust the angle if it is greater than 90 degrees
    ang = ang < -90 ? ang + 180 : ang; // Adjust the angle if it is less than -90 degrees
  } else {
    ang = ang > 180 ? ang - 360 : ang; // Adjust the angle if it is greater than 180 degrees
    ang = ang < -180 ? ang + 360 : ang; // Adjust the angle if it is less than -180 degrees
  }
  return ang; // Return the computed angle
}

// Calculate cosine distance between two angles
export function cosineDistanceBetweenAngles(angle1, angle2) {
  const normalizedDiff = Math.abs((angle1 - angle2 + 180) % 360 - 180); // Normalize the difference between angles
  return (1 - Math.cos(normalizedDiff * (Math.PI / 180))) / 2; // Return the cosine distance
}

// Calculate angle differences and anomalies
export function calculateAngleDifferencesAndAnomalies(currentLandmarks, videoLandmarks, angleDict, landmarkNames) {
  const angleDifferencesMatch = {}; // Initialize an object to store angle differences
  const anomalousIndices = new Set(); // Initialize a set to store indices of anomalous landmarks
  let totalDifferenceMatch = 0; // Initialize a variable to accumulate total differences
  let validAngles = 0; // Initialize a counter for valid angles

  const angleKeys = Object.keys(angleDict).slice(10); // Get keys from angleDict starting from index 10

  for (const angName of angleKeys) { // Iterate over each angle name in the angle dictionary  
    const currentAngle = computeAngle(angName, currentLandmarks, angleDict, landmarkNames); // Compute the current angle
    const videoAngle = computeAngle(angName, videoLandmarks, angleDict, landmarkNames); // Compute the video angle

    // // Debugging: Log the computed angles
    console.log(`Angle Name: ${angName}`);
    console.log(`Current Angle: ${currentAngle}`);
    console.log(`Video Angle: ${videoAngle}`);

    if (!isNaN(currentAngle) && !isNaN(videoAngle)) { // Check if both angles are valid numbers
      const diff = cosineDistanceBetweenAngles(currentAngle, videoAngle); // Calculate the cosine distance between angles
      angleDifferencesMatch[angName] = (1 - diff) * 100; // Store the angle difference as a percentage
      totalDifferenceMatch += angleDifferencesMatch[angName]; // Accumulate the total difference
      console.log(`angleDifferencesPercentage: ${angleDifferencesMatch[angName]}`);
      console.log(`angleDifference: ${diff}`);
      validAngles++; // Increment the count of valid angles

      const adaptiveThreshold = COSINE_DISTANCE_THRESHOLD + (totalDifferenceMatch / (validAngles || 1)) * 0.05; // Calculate an adaptive threshold

      //console.log(`value: ${(totalDifferenceMatch / (validAngles || 1)) * 0.05}`);
      //console.log(`adaptiveThreshold: ${adaptiveThreshold}`);

      if (angleDifferencesMatch[angName] > adaptiveThreshold) { // Check if the difference exceeds the adaptive threshold
        const landmarkNamesForAngle = angleDict[angName][0]; // Get the landmark names for the angle
        landmarkNamesForAngle.forEach(name => { // Iterate over each landmark name
          const index = landmarkNames.indexOf(name); // Find the index of the landmark name
          if (index !== -1) { // Check if the index is valid
            anomalousIndices.add(index); // Add the index to the set of anomalous indices
          } else {
            console.warn(`Landmark name not found: ${name}`); // Log a warning if the landmark name is not found
          }
        });
      }
    } else {
      console.warn(`NaN detected for angle: ${angName}`); // Log a warning if NaN is detected for an angle
    }
  }

  return {
    angleDifferencesMatch, // Return the angle differences
    anomalousIndices: Array.from(anomalousIndices), // Convert the set of anomalous indices to an array and return it
    totalDifferenceMatch, // Return the total difference
    validAngles // Return the count of valid angles
  };
}
