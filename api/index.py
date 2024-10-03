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
from typing import List, Dict, Any
import random
import time
from openai import OpenAI
from dotenv import load_dotenv
import json
import asyncio

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

# Define agent classes
class LandmarkPreProcessingAgent:
    def process(self, landmarks: List[Landmark]) -> Dict[str, Any]:
        landmarkNames = [
            "nose", "left_eye", "right_eye", "left_ear", "right_ear",
            "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
            "left_wrist", "right_wrist", "left_hip", "right_hip",
            "left_knee", "right_knee", "left_ankle", "right_ankle"
        ]
        processed_landmarks = {}
        for landmark_index, landmark_data in enumerate(landmarks):
            landmark_name = landmarkNames[landmark_index]
            processed_landmarks[landmark_name] = {
                "x": round(landmark_data.x, 3),
                "y": round(landmark_data.y, 3),
                "z": round(landmark_data.z, 3),
                "visibility": landmark_data.visibility
            }
        return processed_landmarks

class LLMAnalysisAgent:
    async def analyze(self, processed_landmarks: Dict[str, Any]) -> str:
        openai_response = await openai_client.chat.completions.acreate(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": OPENAI_PROMPT},
                {"role": "user", "content": json.dumps(processed_landmarks)}
            ],
        )
        return openai_response.choices[0].message.content

class PoseFeedbackAgent:
    def generate_feedback(self, llm_analysis: str) -> str:
        # For now, we'll just return the LLM analysis as feedback
        return llm_analysis

class FeedbackVerificationAgent:
    def verify(self, feedback: str) -> bool:
        # Implement verification logic here
        # For now, we'll just return True
        return True

class MotivationProgressTrackingAgent:
    def __init__(self):
        self.progress_history = []

    def update_progress(self, feedback: str):
        self.progress_history.append(feedback)

    def get_motivation_message(self) -> str:
        # Implement motivation logic based on progress history
        return "Keep up the good work!"

class CoordinationAgent:
    def __init__(self):
        self.landmark_agent = LandmarkPreProcessingAgent()
        self.llm_agent = LLMAnalysisAgent()
        self.feedback_agent = PoseFeedbackAgent()
        self.verification_agent = FeedbackVerificationAgent()
        self.motivation_agent = MotivationProgressTrackingAgent()

    async def process_frame(self, landmarks: List[Landmark], frame_index: int) -> Dict[str, Any]:
        processed_landmarks = self.landmark_agent.process(landmarks)
        llm_analysis = await self.llm_agent.analyze(processed_landmarks)
        feedback = self.feedback_agent.generate_feedback(llm_analysis)
        
        if self.verification_agent.verify(feedback):
            self.motivation_agent.update_progress(feedback)
            motivation_message = self.motivation_agent.get_motivation_message()
            
            return {
                "status": "success",
                "processed_frame": frame_index,
                "feedback": feedback,
                "motivation": motivation_message
            }
        else:
            return {
                "status": "error",
                "message": "Feedback verification failed"
            }

# Initialize the coordination agent
coordination_agent = CoordinationAgent()

# Update the process_landmarks endpoint
@app.post("/api/py/process_landmarks")
async def process_landmarks(data: LandmarksData):
    try:
        frame_index = data.frameIndex
        landmarks = data.landmarks

        if frame_index % FEEDBACK_INTERVAL == 0:
            result = await coordination_agent.process_frame(landmarks, frame_index)
            return result
        else:
            return {
                "status": "success",
                "processed_frame": frame_index,
                "feedback": "No feedback yet",
                "motivation": "Keep going!"
            }

    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt