export const landmarkNames = [
  'Nose', 'Left Eye (Inner)', 'Left Eye', 'Left Eye (Outer)', 'Right Eye (Inner)',
  'Right Eye', 'Right Eye (Outer)', 'Left Ear', 'Right Ear', 'Mouth (Left)',
  'Mouth (Right)', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Pinky', 'Right Pinky', 'Left Index',
  'Right Index', 'Left Thumb', 'Right Thumb', 'Left Hip', 'Right Hip',
  'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle', 'Left Heel',
  'Right Heel', 'Left Foot Index', 'Right Foot Index'
];

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
  'left ankle': [['Left Knee', 'Left Ankle', 'Left Foot Index'], 'dorsiflexion', 90, 1]
};