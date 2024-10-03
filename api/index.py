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
from typing import List, Dict, Tuple, Optional, Any
import random
import time
from openai import OpenAI
from dotenv import load_dotenv
import json
import re

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
class NLUAgent:
    def __init__(self):
        self.exercise_keywords = ["plank", "wall sit", "isometric hold", "bridge"]
        self.body_parts = ["core", "legs", "arms", "back", "shoulders", "glutes"]
        self.action_verbs = ["hold", "maintain", "keep", "engage", "tighten"]
        self.positive_words = ["good", "great", "excellent", "well done"]
        self.constructive_words = ["try", "should", "could", "improve"]
        self.intensity_words = {
            "low": ["gentle", "easy", "light"],
            "medium": ["moderate", "steady"],
            "high": ["intense", "hard", "challenging"]
        }

    def parse(self, text: str) -> Dict[str, Any]:
        text = text.lower()
        parsed_data = {
            "exercise": None,
            "body_parts": [],
            "actions": [],
            "feedback_type": None,
            "duration": None,
            "intensity": None
        }

        # Extract exercise
        for exercise in self.exercise_keywords:
            if exercise in text:
                parsed_data["exercise"] = exercise
                break

        # Extract body parts
        parsed_data["body_parts"] = [part for part in self.body_parts if part in text]

        # Extract actions
        parsed_data["actions"] = [verb for verb in self.action_verbs if verb in text]

        # Determine feedback type
        if any(word in text for word in self.positive_words):
            parsed_data["feedback_type"] = "positive"
        elif any(word in text for word in self.constructive_words):
            parsed_data["feedback_type"] = "constructive"

        # Extract duration
        duration_match = re.search(r'(\d+)\s*(second|minute)', text)
        if duration_match:
            parsed_data["duration"] = f"{duration_match.group(1)} {duration_match.group(2)}s"

        # Determine intensity
        for intensity, words in self.intensity_words.items():
            if any(word in text for word in words):
                parsed_data["intensity"] = intensity
                break

        print("NLU Agent parsing feedback: ", text)
        print("Parsed data: ", parsed_data, "\n")
        return parsed_data

class ExerciseRecognitionAgent:
    def __init__(self):
        self.exercise_database = {
            "plank": {
                "primary_muscles": ["core", "shoulders", "back"],
                "difficulty": "medium",
                "recommended_duration": "30-60 seconds"
            },
            "wall sit": {
                "primary_muscles": ["quadriceps", "glutes", "calves"],
                "difficulty": "medium",
                "recommended_duration": "30-60 seconds"
            },
            "isometric hold": {
                "primary_muscles": ["varies"],
                "difficulty": "varies",
                "recommended_duration": "15-30 seconds"
            },
            "bridge": {
                "primary_muscles": ["glutes", "lower back", "hamstrings"],
                "difficulty": "easy",
                "recommended_duration": "30-60 seconds"
            }
        }

    def recognize(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        print("Exercise Recognition Agent recognizing exercise: ", parsed_data, "\n")
        
        recognized_exercise = {
            "name": None,
            "confidence": 0,
            "metadata": {}
        }

        # Check if the exercise is directly mentioned
        if parsed_data["exercise"] in self.exercise_database:
            recognized_exercise["name"] = parsed_data["exercise"]
            recognized_exercise["confidence"] = 1.0
            recognized_exercise["metadata"] = self.exercise_database[parsed_data["exercise"]]
        else:
            # If not directly mentioned, try to infer from body parts and actions
            for exercise, data in self.exercise_database.items():
                score = 0
                for body_part in parsed_data["body_parts"]:
                    if body_part in data["primary_muscles"]:
                        score += 0.3
                for action in parsed_data["actions"]:
                    if action in ["hold", "maintain"]:
                        score += 0.2
                if score > recognized_exercise["confidence"]:
                    recognized_exercise["name"] = exercise
                    recognized_exercise["confidence"] = score
                    recognized_exercise["metadata"] = data

        # Add additional information from parsed_data
        recognized_exercise["duration"] = parsed_data.get("duration")
        recognized_exercise["intensity"] = parsed_data.get("intensity")

        print("Recognized exercise: ", recognized_exercise, "\n")
        return recognized_exercise

class FormFeedbackAgent:
    def __init__(self):
        self.form_criteria = {
            "plank": {
                "straight_back": {"shoulders": [11, 12], "hips": [23, 24], "ankles": [27, 28]},
                "engaged_core": {"shoulders": [11, 12], "hips": [23, 24]},
            },
            "wall sit": {
                "90_degree_knee_angle": {"hips": [23, 24], "knees": [25, 26], "ankles": [27, 28]},
                "back_against_wall": {"shoulders": [11, 12], "hips": [23, 24]},
            },
            "bridge": {
                "hips_raised": {"shoulders": [11, 12], "hips": [23, 24], "knees": [25, 26]},
                "shoulders_on_ground": {"shoulders": [11, 12]},
            },
        }

    def analyze(self, parsed_data: Dict[str, Any], pose_data: Dict[str, Any]) -> Dict[str, Any]:
        print("Form Feedback Agent analyzing form feedback: ", parsed_data, pose_data, "\n")
        
        exercise = parsed_data.get("exercise")
        feedback = {
            "exercise": exercise,
            "form_score": 0,
            "feedback": [],
            "improvements": []
        }

        if exercise not in self.form_criteria:
            feedback["feedback"].append("Exercise not recognized for form analysis.")
            return feedback

        criteria = self.form_criteria[exercise]
        total_checks = len(criteria)
        passed_checks = 0

        for check, landmarks in criteria.items():
            if self.check_alignment(landmarks, pose_data):
                passed_checks += 1
                feedback["feedback"].append(f"Good job maintaining {check}.")
            else:
                feedback["improvements"].append(f"Try to improve your {check}.")

        feedback["form_score"] = (passed_checks / total_checks) * 100

        # Incorporate NLU parsed feedback
        if parsed_data.get("feedback_type") == "positive":
            feedback["feedback"].append("Overall, your form looks good!")
        elif parsed_data.get("feedback_type") == "constructive":
            feedback["feedback"].append("There's room for improvement in your form.")

        print("Form feedback: ", feedback, "\n")
        return feedback

    def check_alignment(self, landmarks: Dict[str, list], pose_data: Dict[str, Any]) -> bool:
        # This is a simplified alignment check. In a real scenario, you'd implement
        # more sophisticated geometry calculations here.
        points = []
        for body_part, indices in landmarks.items():
            for index in indices:
                if index in pose_data:
                    points.append(pose_data[index])
                else:
                    return False  # If any required landmark is missing, assume misalignment

        # Simple check: are all points roughly in a line?
        # This is an oversimplification and should be replaced with proper geometric calculations
        if len(points) < 2:
            return False
        
        x_coords = [p['x'] for p in points]
        y_coords = [p['y'] for p in points]
        
        x_range = max(x_coords) - min(x_coords)
        y_range = max(y_coords) - min(y_coords)
        
        return x_range < 0.1 or y_range < 0.1  # Arbitrary threshold, adjust as needed

class MotivationProgressTrackingAgent:
    def generate_message(self, feedback: Dict[str, Any]) -> str:
        print("Motivation Progress Tracking Agent generating message: ", feedback, "\n")
        
        form_score = feedback.get('form_score', 0)
        exercise = feedback.get('exercise', 'your exercise')
        
        if form_score >= 90:
            message = f"Excellent work! Your {exercise} form is outstanding at {form_score}%. Keep it up!"
        elif form_score >= 70:
            message = f"Great job on your {exercise}! Your form is good at {form_score}%. Small improvements can make it perfect."
        elif form_score >= 50:
            message = f"You're making progress with your {exercise}. Your form is at {form_score}%. Focus on the feedback to improve further."
        else:
            message = f"Keep practicing your {exercise}. Your form needs work, but don't get discouraged. Focus on one improvement at a time."

        if feedback.get('improvements'):
            message += f" Try to {feedback['improvements'][0].lower()}"

        return message

class IsometricSpecificAnalysisAgent:
    def analyze(self, exercise_data: Dict[str, Any], form_feedback: Dict[str, Any]) -> Dict[str, Any]:
        print("Isometric Specific Analysis Agent analyzing isometric specific data: ", exercise_data, form_feedback, "\n")
        
        analysis = {
            "exercise": exercise_data.get("name"),
            "hold_quality": 0,
            "stability": 0,
            "endurance": 0,
            "recommendations": []
        }

        # Assess hold quality based on form score
        form_score = form_feedback.get("form_score", 0)
        if form_score >= 90:
            analysis["hold_quality"] = "Excellent"
        elif form_score >= 70:
            analysis["hold_quality"] = "Good"
        elif form_score >= 50:
            analysis["hold_quality"] = "Fair"
        else:
            analysis["hold_quality"] = "Needs Improvement"

        # Assess stability
        improvements = form_feedback.get("improvements", [])
        if not improvements:
            analysis["stability"] = "High"
        elif len(improvements) <= 2:
            analysis["stability"] = "Moderate"
        else:
            analysis["stability"] = "Low"

        # Assess endurance (this would ideally use data from multiple frames)
        # For now, we'll use a placeholder based on the exercise difficulty
        difficulty = exercise_data.get("metadata", {}).get("difficulty", "medium")
        if difficulty == "easy":
            analysis["endurance"] = "High"
        elif difficulty == "medium":
            analysis["endurance"] = "Moderate"
        else:
            analysis["endurance"] = "Challenging"

        # Generate recommendations
        if analysis["hold_quality"] != "Excellent":
            analysis["recommendations"].append(f"Focus on maintaining proper form throughout the {exercise_data.get('name')} hold.")
        
        if analysis["stability"] != "High":
            analysis["recommendations"].append("Work on stabilizing your core and key muscle groups to improve overall stability.")
        
        if analysis["endurance"] != "High":
            analysis["recommendations"].append(f"Gradually increase your hold time to improve endurance in the {exercise_data.get('name')}.")

        return analysis

class ResponseCoordinationAgent:
    def compile_response(self, agent_outputs: List[Dict[str, Any]]) -> str:
        print("Response Coordination Agent compiling response: ", agent_outputs, "\n")
        
        parsed_data, exercise_data, form_feedback, isometric_analysis, motivation_message = agent_outputs
        
        exercise_name = exercise_data.get("name", "your exercise")
        
        response = f"Exercise: {exercise_name.capitalize()}\n\n"
        
        # Form feedback
        response += f"Form Score: {form_feedback.get('form_score', 0)}%\n"
        if form_feedback.get('feedback'):
            response += "Positive Points:\n- " + "\n- ".join(form_feedback['feedback']) + "\n"
        if form_feedback.get('improvements'):
            response += "Areas for Improvement:\n- " + "\n- ".join(form_feedback['improvements']) + "\n"
        
        response += "\n"
        
        # Isometric analysis
        response += f"Hold Quality: {isometric_analysis.get('hold_quality', 'N/A')}\n"
        response += f"Stability: {isometric_analysis.get('stability', 'N/A')}\n"
        response += f"Endurance: {isometric_analysis.get('endurance', 'N/A')}\n"
        
        if isometric_analysis.get('recommendations'):
            response += "Recommendations:\n- " + "\n- ".join(isometric_analysis['recommendations']) + "\n"
        
        response += "\n"
        
        # Motivation message
        response += f"Motivation: {motivation_message}\n"
        
        return response.strip()

# Modify the process_landmarks function
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
            nlu_agent = NLUAgent()
            exercise_agent = ExerciseRecognitionAgent()
            form_agent = FormFeedbackAgent()
            motivation_agent = MotivationProgressTrackingAgent()
            isometric_agent = IsometricSpecificAnalysisAgent()
            response_agent = ResponseCoordinationAgent()
            
            parsed_data = nlu_agent.parse(feedback)
            exercise_data = exercise_agent.recognize(parsed_data)
            form_feedback = form_agent.analyze(parsed_data, processed_landmarks)
            isometric_analysis = isometric_agent.analyze(exercise_data, form_feedback)
            motivation_message = motivation_agent.generate_message(isometric_analysis)
            
            final_response = response_agent.compile_response([
                parsed_data, exercise_data, form_feedback, isometric_analysis, motivation_message
            ])
            
            current_feedback = final_response
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