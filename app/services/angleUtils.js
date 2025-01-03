// Define the global constant at the top of the file
const COSINE_DISTANCE_THRESHOLD = 0.15; // Adjust this threshold as needed


// Helper function to calculate angles from 3D points
export function points3DToAngles(coords) {
  if (coords.length < 3) return 0;

  // Extract points
  const [p1, p2, p3] = coords;

  // Calculate vectors
  const vectorA = { x: p2[0] - p1[0], y: p2[1] - p1[1], z: p2[2] - p1[2] };
  const vectorB = { x: p3[0] - p2[0], y: p3[1] - p2[1], z: p3[2] - p2[2] };

  // Calculate dot product and magnitudes
  const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y + vectorA.z * vectorB.z;
  const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2 + vectorA.z ** 2);
  const magnitudeB = Math.sqrt(vectorB.x ** 2 + vectorB.y ** 2 + vectorB.z ** 2);


  // Calculate cosine of the angle
  const cosineAngle = dotProduct / (magnitudeA * magnitudeB);

  // Ensure the cosine value is within the valid range for acos
  const clampedCosine = Math.max(-1, Math.min(1, cosineAngle));
  
  // Calculate the angle in degrees
  const angle = Math.acos(clampedCosine) * (180 / Math.PI);

  return angle;
}

// Function to compute angles
export function computeAngle(angName, landmarks, angleDict, landmarkNames) {
  // Retrieve the parameters for the specified angle from the angle dictionary
  const angParams = angleDict[angName];
  if (!angParams) return NaN; // Return NaN if no parameters are found for the angle

  // Map the keypoints to their corresponding 3D coordinates
  const angleCoords = angParams[0].map(kpt => {
    const index = landmarkNames.indexOf(kpt); // Find the index of the keypoint in the landmark names
    if (index === -1) return null; // Return null if the keypoint is not found
    const landmark = landmarks[index]; // Get the landmark at the found index
    return landmark ? [landmark.x, landmark.y, landmark.z] : null; // Return the 3D coordinates if the landmark exists
  }).filter(coord => coord !== null); // Filter out any null values

  // Check if there are enough points to calculate the angle
  if (angleCoords.length < 3) {
    console.warn(`Insufficient points for angle calculation: ${angName}`);
    return NaN; // Return NaN if there are not enough points
  }

  // Calculate the angle using the 3D coordinates
  let ang = points3DToAngles(angleCoords);
  ang += angParams[2]; // Adjust the angle by adding a specified offset
  ang *= angParams[3]; // Scale the angle by a specified factor

  // Normalize the angle to handle its circular nature
  if (['pelvis', 'shoulders'].includes(angName)) {
    // For pelvis and shoulders, normalize to a range of [-90, 90] degrees
    ang = ang > 90 ? ang - 180 : ang;  // Adjust if the angle is greater than 90 degrees
    ang = ang < -90 ? ang + 180 : ang; // Adjust if the angle is less than -90 degrees
  } else {
    // For other angles, normalize to a range of [-180, 180] degrees
    ang = ang > 180 ? ang - 360 : ang;  // Adjust if the angle is greater than 180 degrees
    ang = ang < -180 ? ang + 360 : ang; // Adjust if the angle is less than -180 degrees
  }

  return ang; // Return the computed angle
}

// Function to calculate cosine distance between two angles
function cosineDistanceBetweenAngles(angle1, angle2) {
  // Convert angles to radians
  const radian1 = angle1 * (Math.PI / 180);
  const radian2 = angle2 * (Math.PI / 180);

  // Calculate cosine similarity
  const cosineSimilarity = Math.cos(radian1) * Math.cos(radian2) + Math.sin(radian1) * Math.sin(radian2);

  // Cosine distance is 1 - cosine similarity
  return 1 - cosineSimilarity;
}

// Function to compare angles using cosine distance and return landmark indices
function findAnomalousLandmarkIndices(angleslandmarks, anglesotherlandmarks, landmarks, otherLandmarks) {
  const anomalousIndices = [];
  
  for (const angName in angleslandmarks) {
    if (angleslandmarks.hasOwnProperty(angName) && anglesotherlandmarks.hasOwnProperty(angName)) {
      // Calculate the cosine distance between the angles
      const cosineDistance = cosineDistanceBetweenAngles(angleslandmarks[angName], anglesotherlandmarks[angName]);

      // Debug log: show the angle name and cosine distance
      // console.log(`Angle: ${angName}, Cosine Distance: ${cosineDistance}`);

      if (cosineDistance > COSINE_DISTANCE_THRESHOLD) {
        // Get the landmark names for this angle
        const landmarkNamesForAngle = angleDict[angName][0];
        // Convert the landmark names to indices
        const indices = landmarkNamesForAngle.map(name => {
          const index = landmarkNames.indexOf(name);
          if (index === -1) {
            console.warn(`Landmark name not found: ${name}`);
            return null; // Or handle it another way
          }
          return index;
        }).filter(index => index !== null); // Filter out invalid indices

        // Debug log: show the anomalous landmark indices
        // console.log(`Anomalous Landmark Indices for ${angName}:`, indices);

        // Add these indices to the list of anomalous indices
        anomalousIndices.push(...indices);
      }
    }
  }

  // Remove duplicates
  const uniqueAnomalousIndices = [...new Set(anomalousIndices)];

  // Debug log: show the unique anomalous landmark indices
  // console.log('Unique Anomalous Landmark Indices:', uniqueAnomalousIndices);

  return uniqueAnomalousIndices;
}


