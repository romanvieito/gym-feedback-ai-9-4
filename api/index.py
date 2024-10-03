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

# New classes for the Multi-Agent System

class LandmarkAnalysisAgent:
    @staticmethod
    def process_landmarks(landmarks: Dict[str, Dict[float, float, float, float]]) -> Dict[str, float]:
        # Example implementation - you'd need to expand this based on your specific requirements
        hip_angle = calculate_hip_angle(landmarks)
        shoulder_hip_alignment = calculate_shoulder_hip_alignment(landmarks)
        
        return {
            "hip_angle": hip_angle,
            "shoulder_hip_alignment": shoulder_hip_alignment,
            # Add more metrics as needed
        }

class LLMFeedbackAgent:
    @staticmethod
    async def generate_feedback(pose_metrics: Dict[str, float]) -> str:
        prompt = f"""As a fitness expert, analyze the following metrics for an isometric workout:
        Hip Angle: {pose_metrics['hip_angle']}°
        Shoulder-Hip Alignment: {pose_metrics['shoulder_hip_alignment']}
        
        In one short sentence (no more than 20 words), provide feedback that highlights key strengths and
        offers specific adjustments to body alignment or muscle engagement to maximize stability and reduce strain during static holds."""
        
        response = await openai_client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

class CoordinationAgent:
    @staticmethod
    def combine_feedback(llm_feedback: str, pose_metrics: Dict[str, float]) -> str:
        # You can add more logic here to combine the feedback with additional information or motivational messages
        return f"{llm_feedback} Keep up the great work!"

# Update the process_landmarks function to use the new agents

@app.post("/api/py/process_landmarks")
async def process_landmarks(data: LandmarksData):
    try:
        landmarkNames = ['Nose', 'Left Eye (Inner)', 'Left Eye', 'Left Eye (Outer)', 'Right Eye (Inner)',
            'Right Eye', 'Right Eye (Outer)', 'Left Ear', 'Right Ear', 'Mouth (Left)',
            'Mouth (Right)', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
            'Left Wrist', 'Right Wrist', 'Left Pinky', 'Right Pinky', 'Left Index',
            'Right Index', 'Left Thumb', 'Right Thumb', 'Left Hip', 'Right Hip',
            'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle', 'Left Heel',
            'Right Heel', 'Left Foot Index', 'Right Foot Index']  # Add this line
        frame_index = data.frameIndex
        landmarks = {name: landmark for name, landmark in zip(landmarkNames, data.landmarks)}
        
        # Use the Landmark Analysis Agent
        landmark_agent = LandmarkAnalysisAgent()
        pose_metrics = landmark_agent.process_landmarks(landmarks)
        
        # Generate feedback every FEEDBACK_INTERVAL frames
        if frame_index % FEEDBACK_INTERVAL == 0:
            # Use the LLM Feedback Agent
            llm_agent = LLMFeedbackAgent()
            llm_feedback = await llm_agent.generate_feedback(pose_metrics)
            
            # Use the Coordination Agent
            coordination_agent = CoordinationAgent()
            final_feedback = coordination_agent.combine_feedback(llm_feedback, pose_metrics)
        else:
            final_feedback = "Analyzing your form..."

        return {
            "status": "success", 
            "processed_frame": frame_index, 
            "feedback": final_feedback,
        }
        
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

# Helper functions for LandmarkAnalysisAgent (you'll need to implement these)

def calculate_hip_angle(landmarks: Dict[str, Dict[float, float, float, float]]) -> float:
    # Implement the calculation of hip angle using the landmarks
    # This is a placeholder implementation
    return 160.0

def calculate_shoulder_hip_alignment(landmarks: Dict[str, Dict[float, float, float, float]]) -> str:
    # Implement the calculation of shoulder-hip alignment using the landmarks
    # This is a placeholder implementation
    return "good"

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt