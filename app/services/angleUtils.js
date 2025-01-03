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

  if (angleCoords.length < 3) {
    console.warn(`Insufficient points for angle calculation: ${angName}`);
    return NaN;
  }

  let ang = points3DToAngles(angleCoords);
  ang += angParams[2];
  ang *= angParams[3];

  // Normaliza los ángulos para manejar la naturaleza circular de los mismos
  if (['pelvis', 'shoulders'].includes(angName)) {
    // Para pelvis y hombros, normaliza a un rango de [-90, 90] grados
    ang = ang > 90 ? ang - 180 : ang;  // Ajusta si el ángulo es mayor a 90 grados
    ang = ang < -90 ? ang + 180 : ang; // Ajusta si el ángulo es menor a -90 grados
  } else {
    // Para otros ángulos, normaliza a un rango de [-180, 180] grados
    ang = ang > 180 ? ang - 360 : ang;  // Ajusta si el ángulo es mayor a 180 grados
    ang = ang < -180 ? ang + 360 : ang; // Ajusta si el ángulo es menor a -180 grados
  }

  return ang;
}
