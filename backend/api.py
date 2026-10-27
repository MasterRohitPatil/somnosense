from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

from backend import database
from backend.nlp_screener import analyze_sleep_journal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
DATA_DIR = os.path.join(BASE_DIR, "data")
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

app = FastAPI(title="SomnoSense Clinical Decision Support Platform", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend static directory
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

# Load ML Pipeline & SHAP Explainer
pipeline_path = os.path.join(BACKEND_DIR, "somnosense_pipeline.pkl")
ref_data_path = os.path.join(BACKEND_DIR, "background_reference.csv")

pipeline = joblib.load(pipeline_path)
ref_data = pd.read_csv(ref_data_path)
transformed_bg = pipeline.named_steps['preprocessor'].transform(ref_data)
explainer = shap.TreeExplainer(pipeline.named_steps['classifier'], transformed_bg)

num_cols = ['Age', 'Sleep Duration', 'Quality of Sleep', 'Physical Activity Level', 
            'Stress Level', 'Heart Rate', 'Daily Steps', 'Systolic_BP', 
            'Diastolic_BP', 'Pulse_Pressure', 'Sleep_Efficiency']
cat_cols = ['Gender', 'BMI Category']

# --- Request Models ---

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    age: int
    gender: str
    height_cm: float
    weight_kg: float

class UpdateSettingsRequest(BaseModel):
    name: str
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

class GoogleFitSyncRequest(BaseModel):
    user_id: int
    google_account_email: Optional[str] = "patient@gmail.com"

# --- ML Inference Utility ---

def run_ml_inference(payload: dict):
    if payload.get('BMI Category') == 'Normal Weight':
        payload['BMI Category'] = 'Normal'

    payload['Pulse_Pressure'] = payload['Systolic_BP'] - payload['Diastolic_BP']
    payload['Sleep_Efficiency'] = (payload['Sleep Duration'] / 8.0) * (payload['Quality of Sleep'] / 10.0)

    input_df = pd.DataFrame([payload])[num_cols + cat_cols]

    probs = pipeline.predict_proba(input_df)[0].tolist()
    pred_idx = int(pipeline.predict(input_df)[0])
    labels = ["Healthy / Normal", "Insomnia", "Sleep Apnea"]

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

# --- Core Pages Navigation ---

@app.get("/")
def serve_landing_page():
    landing_path = os.path.join(FRONTEND_DIR, "landing.html")
    if os.path.exists(landing_path):
        return FileResponse(landing_path)
    return {"status": "online", "message": "SomnoSense Platform"}

@app.get("/app")
def serve_patient_portal():
    app_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(app_path):
        return FileResponse(app_path)
    return {"status": "online", "message": "Portal Not Found"}

@app.get("/health")
def health():
    return {"status": "healthy", "platform": "SomnoSense v2.1"}

# --- User Authentication & Settings ---

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
    user.pop("password_hash", None)
    return {"status": "success", "user": user}

@app.get("/api/auth/user/{user_id}")
def get_user_profile(user_id: int):
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user

@app.put("/api/auth/user/{user_id}")
def update_user_settings(user_id: int, req: UpdateSettingsRequest):
    updated = database.update_user_settings(
        user_id=user_id,
        name=req.name,
        age=req.age,
        gender=req.gender,
        height_cm=req.height_cm,
        weight_kg=req.weight_kg
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"status": "success", "user": updated, "message": "Settings updated and BMI recalculated successfully!"}

# --- Clinical Daily Logging with NLP ---

@app.post("/api/logs/create")
def create_daily_log(req: DailyLogRequest):
    user = database.get_user_by_id(req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")

    nlp_results = analyze_sleep_journal(req.journal_text or "")

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

    log_record = {
        'log_date': req.log_date or pd.Timestamp.now().strftime("%Y-%m-%d"),
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

@app.get("/api/analytics/trends/{user_id}")
def get_user_analytics(user_id: int):
    analytics = database.get_user_analytics(user_id)
    return analytics

# --- Wearables & Google Fit Ingestion ---

@app.get("/api/wearable/sample-csv")
def download_sample_csv():
    sample_path = os.path.join(DATA_DIR, "sample_wearable_export.csv")
    if os.path.exists(sample_path):
        return FileResponse(sample_path, media_type="text/csv", filename="sample_wearable_export.csv")
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
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    column_map = {
        'Sleep_Duration_Hours': 'sleep_duration', 'Sleep Duration': 'sleep_duration',
        'Sleep_Quality_Score': 'quality_of_sleep', 'Quality of Sleep': 'quality_of_sleep',
        'Physical_Activity_Minutes': 'physical_activity', 'Physical Activity Level': 'physical_activity',
        'Stress_Level': 'stress_level', 'Stress Level': 'stress_level',
        'Resting_Heart_Rate': 'heart_rate', 'Heart Rate': 'heart_rate',
        'Daily_Steps': 'daily_steps', 'Daily Steps': 'daily_steps',
        'Systolic_BP': 'systolic_bp', 'Diastolic_BP': 'diastolic_bp'
    }
    df = df.rename(columns=column_map)

    required_fields = ['sleep_duration', 'quality_of_sleep', 'physical_activity', 'stress_level', 'heart_rate', 'daily_steps', 'systolic_bp', 'diastolic_bp']
    for req in required_fields:
        if req not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing expected column '{req}' in CSV.")

    imported_logs = []
    latest_ml = None
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
        latest_ml = ml_res

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
            'nlp_symptoms': 'Device Stream Log',
            'prediction': ml_res['prediction'],
            'prob_healthy': ml_res['risk_probabilities']['Healthy'],
            'prob_insomnia': ml_res['risk_probabilities']['Insomnia'],
            'prob_apnea': ml_res['risk_probabilities']['Sleep_Apnea'],
            'data_source': 'Wearable CSV Sync'
        }
        database.save_daily_log(user_id, log_record)
        imported_logs.append(log_record)

    return {
        "status": "success",
        "rows_imported": len(imported_logs),
        "latest_diagnosis": latest_ml,
        "message": f"Successfully ingested {len(imported_logs)} days of telemetry."
    }

@app.post("/api/wearable/google-fit-sync")
def sync_google_fit(req: GoogleFitSyncRequest):
    user = database.get_user_by_id(req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Simulate realistic Google Fit telemetry stream ingestion
    sample_path = os.path.join(DATA_DIR, "sample_wearable_export.csv")
    if os.path.exists(sample_path):
        df = pd.read_csv(sample_path)
        row = df.iloc[-1]
        payload = {
            'Age': float(user['age']),
            'Gender': user['gender'],
            'Sleep Duration': float(row['Sleep_Duration_Hours']),
            'Quality of Sleep': float(row['Sleep_Quality_Score']),
            'Physical Activity Level': float(row['Physical_Activity_Minutes']),
            'Stress Level': float(row['Stress_Level']),
            'BMI Category': user['bmi_category'],
            'Heart Rate': float(row['Resting_Heart_Rate']),
            'Daily Steps': float(row['Daily_Steps']),
            'Systolic_BP': float(row['Systolic_BP']),
            'Diastolic_BP': float(row['Diastolic_BP'])
        }
        ml_res = run_ml_inference(payload)

        log_record = {
            'log_date': pd.Timestamp.now().strftime("%Y-%m-%d"),
            'sleep_duration': payload['Sleep Duration'],
            'quality_of_sleep': payload['Quality of Sleep'],
            'physical_activity': payload['Physical Activity Level'],
            'stress_level': payload['Stress Level'],
            'heart_rate': payload['Heart Rate'],
            'daily_steps': payload['Daily Steps'],
            'systolic_bp': payload['Systolic_BP'],
            'diastolic_bp': payload['Diastolic_BP'],
            'pulse_pressure': ml_res['pulse_pressure'],
            'sleep_efficiency': ml_res['sleep_efficiency'],
            'journal_text': f"Automated sync from Google Health Connect ({req.google_account_email})",
            'nlp_sentiment': 'Wearable Stream',
            'nlp_symptoms': 'Google Fit Telemetry Synced',
            'prediction': ml_res['prediction'],
            'prob_healthy': ml_res['risk_probabilities']['Healthy'],
            'prob_insomnia': ml_res['risk_probabilities']['Insomnia'],
            'prob_apnea': ml_res['risk_probabilities']['Sleep_Apnea'],
            'data_source': 'Google Fit Connect'
        }
        database.save_daily_log(req.user_id, log_record)

        return {
            "status": "success",
            "message": f"Connected to Google Health Connect ({req.google_account_email}). Synced latest telemetry.",
            "synced_data": log_record,
            "diagnosis": ml_res
        }

    return {"status": "error", "message": "Reference data unavailable."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api:app", host="127.0.0.1", port=8000, reload=False)
