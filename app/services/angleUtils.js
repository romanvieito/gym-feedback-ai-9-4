export function points3DToAngles(coords) {
  if (coords.length < 3) return 0;

  const [p1, p2, p3] = coords;
  const vectorA = { x: p2[0] - p1[0], y: p2[1] - p1[1], z: p2[2] - p1[2] };
  const vectorB = { x: p3[0] - p2[0], y: p3[1] - p2[1], z: p3[2] - p2[2] };

  const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y + vectorA.z * vectorB.z;
  const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2 + vectorA.z ** 2);
  const magnitudeB = Math.sqrt(vectorB.x ** 2 + vectorB.y ** 2 + vectorB.z ** 2);

  const cosineAngle = dotProduct / (magnitudeA * magnitudeB);
  const clampedCosine = Math.max(-1, Math.min(1, cosineAngle));
  return Math.acos(clampedCosine) * (180 / Math.PI);
}

export function computeAngle(angName, landmarks, angleDict, landmarkNames) {
  const angParams = angleDict[angName];
  if (!angParams) return NaN;

  const angleCoords = angParams[0].map(kpt => {
    const index = landmarkNames.indexOf(kpt);
    if (index === -1) return null;
    const landmark = landmarks[index];
    return landmark ? [landmark.x, landmark.y, landmark.z] : null;
  }).filter(coord => coord !== null);

  if (angleCoords.length !== 3) {
    console.warn(`Invalid number of points for angle ${angName}: ${angleCoords.length}`);
    return NaN;
  }

  let ang = points3DToAngles(angleCoords);
  
  ang = (ang + angParams[2]) * angParams[3];

  while (ang > 180) ang -= 360;
  while (ang < -180) ang += 360;

  return ang;
}
