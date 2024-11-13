#-----------------------------------------------------------------------------------------

##Prompt for the LLM:

# As an expert coach, analyze the following anomalous landmarks detected from the user's exercise performance compared to a reference video. These anomalies represent areas where the user's pose differs from the ideal execution. Provide quick, concise, empathetic, and positive feedback to help the user improve their exercise execution. Focus on encouragement and offer simple, actionable advice without mentioning the technical details or the anomalies directly.

# Anomalous Landmarks: [Insert the list of anomalous landmarks here]

# Your Feedback:

#-----------------------------------------------------------------------------------------

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
from typing import List, Dict
import random
import time
from openai import OpenAI
from dotenv import load_dotenv
import json
from unittest.mock import Mock

# Needed for Text to Speech
from gtts import gTTS
import io
import base64

# Secret key to encode and decode JWT tokens
# SECRET_KEY is a strong, random string used for encoding and decoding JWT tokens. 
# It is generated using `secrets.token_hex(32)`, which produces a 64-character hexadecimal string, 
# ensuring a high level of security for the secret key.
SECRET_KEY = secrets.token_hex(32)  
ALGORITHM = "HS256"

# MODEL_DIR = os.path.join("app", "static", "models")
# MODEL_PATH = os.path.join(MODEL_DIR, "pose_landmarker_heavy.task")

DOTENV_PATH = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(DOTENV_PATH)

# openai_client = OpenAI(
#     # This is the default and can be omitted
#     api_key=os.getenv("OPENAI_API_KEY"),
# )

# Mock the OpenAI client
openai_client = Mock()

# Define the mock response
mock_response = Mock()
mock_response.choices = [Mock()]
mock_response.choices[0].message.content = "Mocked feedback message."

# Set the return value of the mock OpenAI API call
openai_client.chat.completions.create.return_value = mock_response

OPENAI_PROMPT = """As a fitness expert, analyze a client’s isometric workout using the provided JSON
body landmarks. In one short sentence (no more than 20 words), provide feedback that highlights key strengths and
offers specific adjustments to body alignment or muscle engagement to maximize stability and reduce strain during static holds."""

# List of feedback templates with a placeholder for the anomalous landmark
feedback_templates = [
    "Great effort! To enhance your form, try focusing on keeping your {landmark} aligned.",
    "You're doing fantastic! Engaging your {landmark} a bit more will make this exercise even more effective.",
    "Excellent work! Remember to keep your {landmark} relaxed and in a natural position.",
    "Well done! Maintaining a steady position with your {landmark} can help improve your balance.",
    "You're making wonderful progress! Keeping your {landmark} straight will enhance your posture.",
    "Impressive! Try to ensure your {landmark} moves smoothly with the rest of your body.",
    "Keep it up! Paying a little more attention to your {landmark} can make the movement feel more comfortable.",
    "Fantastic effort! Aligning your {landmark} will support better overall form.",
    "You're on the right track! Engaging your {landmark} can provide extra stability during this exercise.",
    "Great dedication! Keeping your {landmark} in mind will help you get the most out of this session."
]

# Function to generate feedback based on anomalous landmarks
def generate_feedback(anomalous_landmarks):
    import random
    feedback_messages = []
    for landmark in anomalous_landmarks:
        template = random.choice(feedback_templates)
        message = template.format(landmark=landmark)
        feedback_messages.append(message)
    return feedback_messages




app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.mount("/static", StaticFiles(directory=MODEL_DIR), name="static") # Mount the static files directory 

# Middleware for authentication (example)

@app.middleware("http")
async def authenticate(request: Request, call_next):
    # Skip authentication for certain paths (e.g., /token, /api/model, and /process-landmarks)
    if request.url.path in ["/api/py", "/api/py/token", "/api/py/model", "/api/py/process_landmarks", "/api/py/process_anomalous_landmarks"]:
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

"""
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
"""

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

@app.post("/api/py/process_landmarks")
async def process_landmarks(data: LandmarksData):
    
    print("test_frame: ", data.frameIndex,"\n")
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
            # Use the mocked OpenAI API call
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
            current_feedback = openai_response.choices[0].message.content
            # Generate audio from the feedback
            try:
                feedback_audio = message_to_audio_gtts(current_feedback)
            except Exception as e:
                print(f"Error generating audio: {e}")
                feedback_audio = None
            print("current_feedback: ", current_feedback, "\n")
        else:
            current_feedback = "No feedback yet"
            feedback_audio = None
            print("current_feedback: ", current_feedback, "\n")

        return {
            "status": "success", 
            "processed_frame": frame_index, 
            "feedback": current_feedback,
            "feedback_audio": feedback_audio
        }
        
    except Exception as e:
        print(f"Error processing landmarks: {e}")
        raise HTTPException(status_code=422, detail=str(e))

class AnomalousLandmarksData(BaseModel):
    frameIndex: int
    landmarks_indexes: List[int]
    
@app.post("/api/py/process_anomalous_landmarks")
async def process_anomalous_landmarks(data: AnomalousLandmarksData):
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
        print("data: ", data,"\n")
        anomalous_landmarks = [landmarkNames[i] for i in data.landmarks_indexes]
        feedback = generate_feedback(anomalous_landmarks)
        current_feedback = feedback[0]
        print("current_feedback: ", current_feedback, "\n")
        try:
            feedback_audio = message_to_audio_gtts(current_feedback)##esto es para que tengamos 
                                                                        #el primer feedback pero hay que 
                                                                        #cambiarlo
        except Exception as e:
            print(f"Error generating audio: {e}")
            feedback_audio = None
        
        return {
            "status": "success", 
            "feedback": current_feedback,
            "feedback_audio": feedback_audio
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

def message_to_audio_gtts(message, lang='en', slow=False):
    tts = gTTS(tld='hk', text=message, lang=lang, slow=slow)

    # Save to a buffer
    with io.BytesIO() as buffer:
        tts.write_to_fp(buffer)
        buffer.seek(0)
        audio_data = buffer.read()

    # Convert to base64
    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
    return audio_base64

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt