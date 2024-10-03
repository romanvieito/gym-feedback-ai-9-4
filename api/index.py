#from fastapi import FastAPI

### Create FastAPI instance with custom docs and openapi url
#app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

#@app.get("/api/py/helloFastApi")
#def hello_fast_api():
#    return {"message": "Hello from FastAPI"}

#-----------------------------------------------------------------------------------------

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
import os
import secrets
from pydantic import BaseModel
from typing import List, Dict, Tuple
import random
import time
from openai import OpenAI
from dotenv import load_dotenv
import json

# Secret key to encode and decode JWT tokens
# SECRET_KEY is a strong, random string used for encoding and decoding JWT tokens. 
# It is generated using `secrets.token_hex(32)`, which produces a 64-character hexadecimal string, 
# ensuring a high level of security for the secret key.
SECRET_KEY = secrets.token_hex(32)  
ALGORITHM = "HS256"

MODEL_DIR = os.path.join("app", "static", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "pose_landmarker_heavy.task")

DOTENV_PATH = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(DOTENV_PATH)

openai_client = OpenAI(
    # This is the default and can be omitted
    api_key=os.getenv("OPENAI_API_KEY"),
)

OPENAI_PROMPT = """As a fitness expert, analyze a client’s isometric workout using the provided JSON
body landmarks. In one short sentence (no more than 20 words), provide feedback that highlights key strengths and
offers specific adjustments to body alignment or muscle engagement to maximize stability and reduce strain during static holds."""

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=MODEL_DIR), name="static") # Mount the static files directory 

# Middleware for authentication (example)

@app.middleware("http")
async def authenticate(request: Request, call_next):
    # Skip authentication for certain paths (e.g., /token, /api/model, and /process-landmarks)
    if request.url.path in ["/api/py", "/api/py/token", "/api/py/model", "/api/py/process_landmarks"]:
        return await call_next(request)

    token = request.headers.get('Authorization')
    if token is None or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = token[len("Bearer "):]
    print(f"Received Token: {token}")  # Debugging line
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        request.state.user = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    response = await call_next(request)
    return response


@app.get("/api/py")
async def root():
    return {"message": "Welcome to the Pose Detection API"}


@app.get("/api/py/model")
async def get_model():
    # Make sure the path to the model is consistent with your static directory
    if not os.path.exists(MODEL_PATH):
        raise HTTPException(status_code=404, detail="Model file not found")
    return FileResponse(MODEL_PATH)
    # model_path = os.path.join(os.getcwd(), 'backend', 'api', 'static', 'models', 'pose_landmarker_heavy.task')
    # if not os.path.exists(model_path):
    #     raise HTTPException(status_code=404, detail="Model file not found")
    # return FileResponse(model_path)


@app.post("/api/py/token")
async def login():
    # In a real application, you would verify the username and password.
    # For this example, we're issuing a token directly.
    access_token = create_access_token(data={"sub": "user_id"})
    print(f"Generated Token: {access_token}")  # Debugging line
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/py/refresh-token")
async def refresh_token(request: Request):
    token = request.headers.get('Authorization')
    if token is None or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = token[len("Bearer "):]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        new_token = create_access_token(data={"sub": payload.get("sub")})
        return {"access_token": new_token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")
    

# @app.post("/process_pose")
# async def process_pose(request: Request):
#     # Process the landmarks here
#     # For example, you might want to save them to a database or perform some analysis
#    data = await request.json()
#    print(data)
#    return JSONResponse(content={"status": "success", "data": data})

# Define a Pydantic model for the incoming landmark data

class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: float

class LandmarksData(BaseModel):
    frameIndex: int
    landmarks: List[Landmark]
    realworldlandmarks: List[Landmark]

# Add these global variables at the top of your file
current_feedback = "Welcome! Let's get started!"
FEEDBACK_INTERVAL = 100

# Add these new classes for the multi-agent system
class FeedbackAnalyzer:
    def analyze(self, feedback: str) -> Dict[str, str]:
        # Extract key points from the feedback
        strengths = []
        adjustments = []
        
        sentences = feedback.split('.')
        for sentence in sentences:
            if "great" in sentence.lower() or "excellent" in sentence.lower():
                strengths.append(sentence.strip())
            elif "adjust" in sentence.lower() or "improve" in sentence.lower():
                adjustments.append(sentence.strip())
        
        return {
            "strengths": strengths,
            "adjustments": adjustments
        }

class PoseEvaluator:
    def evaluate(self, landmarks: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        # Evaluate the pose based on key landmarks
        evaluation = {}
        
        # Example: Check if shoulders are level
        left_shoulder = landmarks.get("Left Shoulder", {})
        right_shoulder = landmarks.get("Right Shoulder", {})
        if left_shoulder and right_shoulder:
            shoulder_diff = abs(left_shoulder["y"] - right_shoulder["y"])
            evaluation["shoulder_alignment"] = 1 - min(shoulder_diff * 10, 1)  # 1 is perfect, 0 is poor
        
        # Add more pose evaluations here
        # Example: Check if elbows are bent
        left_elbow = landmarks.get("Left Elbow", {})
        right_elbow = landmarks.get("Right Elbow", {})
        if left_elbow and right_elbow:
            elbow_diff = abs(left_elbow["x"] - right_elbow["x"])
            evaluation["elbow_flexion"] = 1 - min(elbow_diff * 10, 1)  # 1 is perfect, 0 is poor
        
        # Example: Check if knees are bent
        left_knee = landmarks.get("Left Knee", {})
        right_knee = landmarks.get("Right Knee", {})
        if left_knee and right_knee:
            knee_diff = abs(left_knee["x"] - right_knee["x"])
            evaluation["knee_flexion"] = 1 - min(knee_diff * 10, 1)  # 1 is perfect, 0 is poor
        
        # Example: Check if ankles are aligned
        left_ankle = landmarks.get("Left Ankle", {})
        right_ankle = landmarks.get("Right Ankle", {})
        if left_ankle and right_ankle:
            ankle_diff = abs(left_ankle["x"] - right_ankle["x"])
            evaluation["ankle_alignment"] = 1 - min(ankle_diff * 10, 1)  # 1 is perfect, 0 is poor

        # Example: Check if hips are aligned
        left_hip = landmarks.get("Left Hip", {})
        right_hip = landmarks.get("Right Hip", {})
        if left_hip and right_hip:
            hip_diff = abs(left_hip["x"] - right_hip["x"])
            evaluation["hip_alignment"] = 1 - min(hip_diff * 10, 1)  # 1 is perfect, 0 is poor
        
       
        return evaluation

class RecommendationGenerator:
    def generate(self, analysis: Dict[str, str], evaluation: Dict[str, float]) -> str:
        recommendation = "Pose Analysis:\n\n"

        # Strengths
        if analysis["strengths"]:
            recommendation += "🟢 Strengths:\n"
            for strength in analysis["strengths"]:
                recommendation += f"  • {strength}\n"
            recommendation += "\n"

        # Areas to focus on
        if analysis["adjustments"]:
            recommendation += "🔶 Areas to Focus On:\n"
            for adjustment in analysis["adjustments"]:
                recommendation += f"  • {adjustment}\n"
            recommendation += "\n"

        # Pose evaluation
        if evaluation:
            recommendation += "📊 Pose Evaluation:\n"
            for aspect, score in evaluation.items():
                aspect_name = aspect.replace('_', ' ').title()
                emoji = self.get_score_emoji(score)
                recommendation += f"{emoji} {aspect_name}: {score:.2f}/1.00"
                recommendation += f" - {self.get_score_feedback(aspect, score)}\n"

        # Overall recommendation
        overall_score = sum(evaluation.values()) / len(evaluation) if evaluation else 0
        recommendation += f"\n🎯 Overall Performance: {overall_score:.2f}/1.00\n"
        recommendation += self.get_overall_feedback(overall_score)

        return recommendation

    def get_score_emoji(self, score: float) -> str:
        if score >= 0.8:
            return "🟢"
        elif score >= 0.6:
            return "🟡"
        else:
            return "🔴"

    def get_score_feedback(self, aspect: str, score: float) -> str:
        if score >= 0.8:
            return "Excellent! Keep it up."
        elif score >= 0.6:
            return "Good, but there's room for improvement."
        else:
            return f"Focus on improving your {aspect.replace('_', ' ')}."

    def get_overall_feedback(self, score: float) -> str:
        if score >= 0.8:
            return "Great job! Your form is excellent. Keep maintaining this level of performance."
        elif score >= 0.6:
            return "Good effort! You're on the right track. Focus on the areas mentioned above to improve further."
        else:
            return "There's significant room for improvement. Pay close attention to the feedback and keep practicing."

@app.post("/api/py/process_landmarks")
async def process_landmarks(data: LandmarksData):
    
    # print("test_frame: ", data.frameIndex,"\n")
    # print("test_landmarks: ", data.landmarks,"\n")
    # print("test_realworldlandmarks: ", data.realworldlandmarks,"\n")
    try:
        # Make sure landmarkNames is defined correctly
        landmarkNames = [
            'Nose', 'Left Eye (Inner)', 'Left Eye', 'Left Eye (Outer)', 'Right Eye (Inner)',
            'Right Eye', 'Right Eye (Outer)', 'Left Ear', 'Right Ear', 'Mouth (Left)',
            'Mouth (Right)', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
            'Left Wrist', 'Right Wrist', 'Left Pinky', 'Right Pinky', 'Left Index',
            'Right Index', 'Left Thumb', 'Right Thumb', 'Left Hip', 'Right Hip',
            'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle', 'Left Heel',
            'Right Heel', 'Left Foot Index', 'Right Foot Index'
        ]
         # Your processing logic here
        frame_index = data.frameIndex
        landmarks = data.landmarks
        realworldlandmarks = data.realworldlandmarks
        # # First, let's print the structure of landmarks to understand it better
        # print("frame_index: ", frame_index,"\n")
        # print("landmarks: ", landmarks,"\n")
        # print("realworldlandmarks: ", realworldlandmarks,"\n")
        
         # Process the landmarks for this frame
        processed_landmarks = {}
        
        for landmark_index, landmark_data in enumerate(landmarks):
            landmark_name = landmarkNames[int(landmark_index)]
            # print(landmark_name,"idx: ",landmark_index,"data :",landmark_data,"\n")
            processed_landmarks[landmark_name] = {
                "x": round(landmark_data.x, 3),  # rounding to 3 decimal places to reduce character count
                "y": round(landmark_data.y, 3),  # rounding to 3 decimal places to reduce character count
                "z": round(landmark_data.z, 3),  # rounding to 3 decimal places to reduce character count
                "visibility": landmark_data.visibility
            }

        # Here we can do the same for realworldlandmarks if needed

        # Create the output structure for this frame
        json_output = {
            frame_index: processed_landmarks
        }

        # Generate feedback text every 5 seconds
        # current_time = time.time()
        # print("current_time: ", current_time,"\n")
        # print("current_feedback: ", current_feedback,"\n")
        
        # Generate new feedback text every 5 seconds
        # print("current_time: ", current_time,"\n")
        # print("FEEDBACK_INTERVAL: ", FEEDBACK_INTERVAL,"\n")
        if frame_index % FEEDBACK_INTERVAL == 0:
            # print(f"Processed data for frame {frame_index}: ", json_output)
            openai_response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": OPENAI_PROMPT  # Asegúrate de que esto sea un string
                },{
                    "role": "user",
                    "content": json.dumps(json_output)  # Si json_output es un dict, conviértelo a string
                }],
            )
            
            feedback = openai_response.choices[0].message.content
            
            # Use the multi-agent system to process the feedback
            analyzer = FeedbackAnalyzer()
            evaluator = PoseEvaluator()
            recommender = RecommendationGenerator()
            
            analysis = analyzer.analyze(feedback)
            evaluation = evaluator.evaluate(processed_landmarks)
            recommendation = recommender.generate(analysis, evaluation)
            
            current_feedback = recommendation
        else:
            current_feedback = "No feedback yet"
            print("current_feedback: ", current_feedback,"\n")

        return {
            "status": "success", 
            "processed_frame": frame_index, 
            "feedback": current_feedback,
        }
        
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt