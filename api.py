from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
import shap
import os
import io
import json
from typing import Optional, List, Dict, Any

import database
from nlp_screener import analyze_sleep_journal

app = FastAPI(title="SomnoSense Clinical Decision Support API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Trained Model & TreeSHAP Explainer
pipeline = joblib.load("somnosense_pipeline.pkl")
ref_data = pd.read_csv("background_reference.csv")
transformed_bg = pipeline.named_steps['preprocessor'].transform(ref_data)
explainer = shap.TreeExplainer(pipeline.named_steps['classifier'], transformed_bg)

num_cols = ['Age', 'Sleep Duration', 'Quality of Sleep', 'Physical Activity Level', 
            'Stress Level', 'Heart Rate', 'Daily Steps', 'Systolic_BP', 
            'Diastolic_BP', 'Pulse_Pressure', 'Sleep_Efficiency']
cat_cols = ['Gender', 'BMI Category']

# --- Pydantic Request Schemas ---

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    age: int
    gender: str
    height_cm: float
    weight_kg: float

class LoginRequest(BaseModel):
    email: str
    password: str

class DailyLogRequest(BaseModel):
    user_id: int
    sleep_duration: float
    quality_of_sleep: float
    physical_activity: float
    stress_level: float
    heart_rate: float
    daily_steps: float
    systolic_bp: float
    diastolic_bp: float
    journal_text: Optional[str] = ""
    log_date: Optional[str] = None

class PatientDataLegacy(BaseModel):
    Age: float
    Gender: str
    Sleep_Duration: float
    Quality_of_Sleep: float
    Physical_Activity_Level: float
    Stress_Level: float
    BMI_Category: str
    Heart_Rate: float
    Daily_Steps: float
    Systolic_BP: float
    Diastolic_BP: float

# --- Helper Model Inference Function ---

def run_ml_inference(payload: dict):
    # Normalized BMI
    if payload.get('BMI Category') == 'Normal Weight':
        payload['BMI Category'] = 'Normal'

    # Derived Features
    payload['Pulse_Pressure'] = payload['Systolic_BP'] - payload['Diastolic_BP']
    payload['Sleep_Efficiency'] = (payload['Sleep Duration'] / 8.0) * (payload['Quality of Sleep'] / 10.0)

    input_df = pd.DataFrame([payload])[num_cols + cat_cols]

    # Predict Probabilities
    probs = pipeline.predict_proba(input_df)[0].tolist()
    pred_idx = int(pipeline.predict(input_df)[0])
    labels = ["Healthy / Normal", "Insomnia", "Sleep Apnea"]

    # SHAP Attributions
    transformed_input = pipeline.named_steps['preprocessor'].transform(input_df)
    shap_vals = explainer.shap_values(transformed_input)

    cat_encoder = pipeline.named_steps['preprocessor'].named_transformers_['cat']
    encoded_cat_names = list(cat_encoder.get_feature_names_out(cat_cols))
    all_feature_names = num_cols + encoded_cat_names

    if isinstance(shap_vals, list):
        class_shap = shap_vals[pred_idx][0]
    elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 3:
        class_shap = shap_vals[0, :, pred_idx]
    else:
        class_shap = shap_vals[0]

    top_indices = (-np.abs(class_shap)).argsort()[:3]
    top_factors = [
        {"feature": all_feature_names[int(i)], "impact": round(float(class_shap[int(i)]), 3)}
        for i in top_indices
    ]

    return {
        "prediction": labels[pred_idx],
        "risk_probabilities": {
            "Healthy": round(probs[0] * 100, 1),
            "Insomnia": round(probs[1] * 100, 1),
            "Sleep_Apnea": round(probs[2] * 100, 1)
        },
        "top_contributing_factors": top_factors,
        "pulse_pressure": round(payload['Pulse_Pressure'], 1),
        "sleep_efficiency": round(payload['Sleep_Efficiency'], 2)
    }

# --- Routes ---

@app.get("/")
def serve_frontend():
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    return {"status": "online", "message": "SomnoSense API is running"}

@app.get("/health")
def health():
    return {"status": "healthy", "model_version": "2.0.0"}

# --- Auth Endpoints ---

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    user = database.register_user(
        name=req.name,
        email=req.email,
        password=req.password,
        age=req.age,
        gender=req.gender,
        height_cm=req.height_cm,
        weight_kg=req.weight_kg
    )
    if not user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    return {"status": "success", "user": user}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = database.authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    # Exclude password_hash
    user.pop("password_hash", None)
    return {"status": "success", "user": user}

@app.get("/api/auth/user/{user_id}")
def get_user_profile(user_id: int):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user

# --- Clinical Daily Logging with NLP ---

@app.post("/api/logs/create")
def create_daily_log(req: DailyLogRequest):
    user = database.get_user_by_id(req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")

    # Clinical NLP Analysis on Free-text Journal
    nlp_results = analyze_sleep_journal(req.journal_text or "")

    # Run Machine Learning Inference
    payload = {
        'Age': float(user['age']),
        'Gender': user['gender'],
        'Sleep Duration': req.sleep_duration,
        'Quality of Sleep': req.quality_of_sleep,
        'Physical Activity Level': req.physical_activity,
        'Stress Level': req.stress_level,
        'BMI Category': user['bmi_category'],
        'Heart Rate': req.heart_rate,
        'Daily Steps': req.daily_steps,
        'Systolic_BP': req.systolic_bp,
        'Diastolic_BP': req.diastolic_bp
    }
    ml_res = run_ml_inference(payload)

    # Save to SQLite Database
    log_record = {
        'log_date': req.log_date,
        'sleep_duration': req.sleep_duration,
        'quality_of_sleep': req.quality_of_sleep,
        'physical_activity': req.physical_activity,
        'stress_level': req.stress_level,
        'heart_rate': req.heart_rate,
        'daily_steps': req.daily_steps,
        'systolic_bp': req.systolic_bp,
        'diastolic_bp': req.diastolic_bp,
        'pulse_pressure': ml_res['pulse_pressure'],
        'sleep_efficiency': ml_res['sleep_efficiency'],
        'journal_text': req.journal_text,
        'nlp_sentiment': nlp_results['urgency'],
        'nlp_symptoms': "; ".join(nlp_results['detected_symptoms']),
        'prediction': ml_res['prediction'],
        'prob_healthy': ml_res['risk_probabilities']['Healthy'],
        'prob_insomnia': ml_res['risk_probabilities']['Insomnia'],
        'prob_apnea': ml_res['risk_probabilities']['Sleep_Apnea'],
        'data_source': 'Daily Manual Log'
    }
    log_id = database.save_daily_log(req.user_id, log_record)

    return {
        "status": "success",
        "log_id": log_id,
        "prediction": ml_res['prediction'],
        "risk_probabilities": ml_res['risk_probabilities'],
        "top_contributing_factors": ml_res['top_contributing_factors'],
        "pulse_pressure": ml_res['pulse_pressure'],
        "sleep_efficiency": ml_res['sleep_efficiency'],
        "nlp_analysis": nlp_results
    }

@app.get("/api/logs/history/{user_id}")
def get_user_history(user_id: int):
    logs = database.get_user_logs(user_id, limit=30)
    return {"user_id": user_id, "logs": logs}

# --- Wearable CSV Upload & Sample Download ---

@app.get("/api/wearable/sample-csv")
def download_sample_csv():
    if os.path.exists("sample_wearable_export.csv"):
        return FileResponse("sample_wearable_export.csv", media_type="text/csv", filename="sample_wearable_export.csv")
    raise HTTPException(status_code=404, detail="Sample CSV not found")

@app.post("/api/wearable/upload")
async def upload_wearable_csv(user_id: int = Form(...), file: UploadFile = File(...)):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    # Flexible column mapping for standard wearable formats
    column_map = {
        'Sleep_Duration_Hours': 'sleep_duration',
        'Sleep Duration': 'sleep_duration',
        'Sleep_Quality_Score': 'quality_of_sleep',
        'Quality of Sleep': 'quality_of_sleep',
        'Physical_Activity_Minutes': 'physical_activity',
        'Physical Activity Level': 'physical_activity',
        'Stress_Level': 'stress_level',
        'Stress Level': 'stress_level',
        'Resting_Heart_Rate': 'heart_rate',
        'Heart Rate': 'heart_rate',
        'Daily_Steps': 'daily_steps',
        'Daily Steps': 'daily_steps',
        'Systolic_BP': 'systolic_bp',
        'Diastolic_BP': 'diastolic_bp'
    }
    df = df.rename(columns=column_map)

    required_fields = ['sleep_duration', 'quality_of_sleep', 'physical_activity', 'stress_level', 'heart_rate', 'daily_steps', 'systolic_bp', 'diastolic_bp']
    for req in required_fields:
        if req not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing expected column '{req}' in uploaded CSV. Please check formatting or download our sample template.")

    imported_logs = []
    latest_ml_res = None

    for _, row in df.iterrows():
        payload = {
            'Age': float(user['age']),
            'Gender': user['gender'],
            'Sleep Duration': float(row['sleep_duration']),
            'Quality of Sleep': float(row['quality_of_sleep']),
            'Physical Activity Level': float(row['physical_activity']),
            'Stress Level': float(row['stress_level']),
            'BMI Category': user['bmi_category'],
            'Heart Rate': float(row['heart_rate']),
            'Daily Steps': float(row['daily_steps']),
            'Systolic_BP': float(row['systolic_bp']),
            'Diastolic_BP': float(row['diastolic_bp'])
        }
        ml_res = run_ml_inference(payload)
        latest_ml_res = ml_res

        log_record = {
            'log_date': str(row.get('Date', pd.Timestamp.now().strftime("%Y-%m-%d"))),
            'sleep_duration': float(row['sleep_duration']),
            'quality_of_sleep': float(row['quality_of_sleep']),
            'physical_activity': float(row['physical_activity']),
            'stress_level': float(row['stress_level']),
            'heart_rate': float(row['heart_rate']),
            'daily_steps': float(row['daily_steps']),
            'systolic_bp': float(row['systolic_bp']),
            'diastolic_bp': float(row['diastolic_bp']),
            'pulse_pressure': ml_res['pulse_pressure'],
            'sleep_efficiency': ml_res['sleep_efficiency'],
            'journal_text': str(row.get('Device_Notes', 'Imported via Wearable Telemetry')),
            'nlp_sentiment': 'Wearable Verified',
            'nlp_symptoms': 'Device Telemetry Stream',
            'prediction': ml_res['prediction'],
            'prob_healthy': ml_res['risk_probabilities']['Healthy'],
            'prob_insomnia': ml_res['risk_probabilities']['Insomnia'],
            'prob_apnea': ml_res['risk_probabilities']['Sleep_Apnea'],
            'data_source': 'Wearable Stream Sync'
        }
        database.save_daily_log(user_id, log_record)
        imported_logs.append(log_record)

    return {
        "status": "success",
        "rows_imported": len(imported_logs),
        "latest_diagnosis": latest_ml_res,
        "message": f"Successfully parsed and ingested {len(imported_logs)} days of telemetry."
    }

# --- Legacy Single Prediction Endpoint ---

@app.post("/predict")
def predict_legacy(data: PatientDataLegacy):
    payload = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    payload['Sleep Duration'] = payload.pop('Sleep_Duration')
    payload['Quality of Sleep'] = payload.pop('Quality_of_Sleep')
    payload['Physical Activity Level'] = payload.pop('Physical_Activity_Level')
    payload['Stress Level'] = payload.pop('Stress_Level')
    payload['BMI Category'] = payload.pop('BMI_Category')
    payload['Heart Rate'] = payload.pop('Heart_Rate')
    payload['Daily Steps'] = payload.pop('Daily_Steps')
    return run_ml_inference(payload)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
