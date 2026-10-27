from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
import shap

app = FastAPI(title="SomnoSense API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = joblib.load("somnosense_pipeline.pkl")
ref_data = pd.read_csv("background_reference.csv")
transformed_bg = pipeline.named_steps['preprocessor'].transform(ref_data)
explainer = shap.TreeExplainer(pipeline.named_steps['classifier'], transformed_bg)

num_cols = ['Age', 'Sleep Duration', 'Quality of Sleep', 'Physical Activity Level', 
            'Stress Level', 'Heart Rate', 'Daily Steps', 'Systolic_BP', 
            'Diastolic_BP', 'Pulse_Pressure', 'Sleep_Efficiency']
cat_cols = ['Gender', 'BMI Category']

class PatientData(BaseModel):
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

from fastapi.responses import FileResponse
import os

@app.get("/")
def read_root():
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    return {"status": "online", "message": "SomnoSense API is running"}

@app.get("/health")
def read_health():
    return {"status": "online", "message": "SomnoSense API is running"}

@app.post("/predict")
def predict_disorder(data: PatientData):
    payload = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    payload['Sleep Duration'] = payload.pop('Sleep_Duration')
    payload['Quality of Sleep'] = payload.pop('Quality_of_Sleep')
    payload['Physical Activity Level'] = payload.pop('Physical_Activity_Level')
    payload['Stress Level'] = payload.pop('Stress_Level')
    payload['BMI Category'] = payload.pop('BMI_Category')
    payload['Heart Rate'] = payload.pop('Heart_Rate')
    payload['Daily Steps'] = payload.pop('Daily_Steps')
    
    # Normalize BMI Category to match training labels
    if payload['BMI Category'] == 'Normal Weight':
        payload['BMI Category'] = 'Normal'

    # Derived features
    payload['Pulse_Pressure'] = payload['Systolic_BP'] - payload['Diastolic_BP']
    payload['Sleep_Efficiency'] = (payload['Sleep Duration'] / 8.0) * (payload['Quality of Sleep'] / 10.0)

    # Order dataframe columns cleanly to match training schema
    input_df = pd.DataFrame([payload])[num_cols + cat_cols]
    
    # Probabilities & Prediction
    probs = pipeline.predict_proba(input_df)[0].tolist()
    pred_idx = int(pipeline.predict(input_df)[0])
    labels = ["Healthy / Normal", "Insomnia", "Sleep Apnea"]
    
    # SHAP Explainability
    transformed_input = pipeline.named_steps['preprocessor'].transform(input_df)
    shap_vals = explainer.shap_values(transformed_input)
    
    # Feature names
    cat_encoder = pipeline.named_steps['preprocessor'].named_transformers_['cat']
    encoded_cat_names = list(cat_encoder.get_feature_names_out(cat_cols))
    all_feature_names = num_cols + encoded_cat_names

    # Robust multi-class SHAP handling (shap >= 0.40 produces (n_samples, n_features, n_classes) 3D array)
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
        "top_contributing_factors": top_factors
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
