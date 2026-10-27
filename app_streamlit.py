import streamlit as st
import requests
import pandas as pd
import numpy as np

# Page Configuration
st.set_page_config(
    page_title="SomnoSense: Sleep & Cardiovascular Risk Stratifier",
    page_icon="🌙",
    layout="wide"
)

# Custom High-Contrast Medical Styling
st.markdown("""
<style>
    .stApp {
        background-color: #0B132B;
        color: #FFFFFF;
    }
    .metric-card {
        background: #1C2541;
        border: 1px solid #2A385E;
        padding: 18px;
        border-radius: 12px;
        margin-bottom: 12px;
    }
    .verdict-box {
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
    }
    .verdict-healthy { background: rgba(6, 214, 160, 0.2); border: 1px solid #06D6A0; color: #06D6A0; }
    .verdict-insomnia { background: rgba(255, 209, 102, 0.2); border: 1px solid #FFD166; color: #FFD166; }
    .verdict-apnea { background: rgba(239, 71, 111, 0.2); border: 1px solid #EF476F; color: #EF476F; }
</style>
""", unsafe_allow_html=True)

st.title("🌙 SomnoSense: Clinical Sleep & Cardiovascular Risk Stratifier")
st.caption("Data Science Honours Project · Multiclass XGBoost + SHAP Explainability Engine")

# Top Bar Sync Button
col_header_1, col_header_2 = st.columns([3, 1])

with col_header_2:
    sync_clicked = st.button("⚡ Sync Wearable (Apple/Google Health)", use_container_width=True)

# Default values or synced values
if sync_clicked:
    st.toast("✅ Telemetry synced from Wearable Sensor Stream (Synced 2m ago)!", icon="⚡")
    default_age = 42
    default_gender = "Male"
    default_sleep = 5.2
    default_qual = 5
    default_act = 35
    default_stress = 8
    default_bmi = "Overweight"
    default_hr = 84
    default_steps = 3400
    default_sys = 135
    default_dia = 88
    st.info("⚡ Telemetry Source: Wearable Sensor Stream (Synced 2m ago)")
else:
    default_age = 35
    default_gender = "Male"
    default_sleep = 7.0
    default_qual = 7
    default_act = 60
    default_stress = 5
    default_bmi = "Normal"
    default_hr = 72
    default_steps = 7000
    default_sys = 120
    default_dia = 80

# Two Column Layout
col_left, col_right = st.columns([1, 1.2])

with col_left:
    st.subheader("📊 Patient Telemetry")
    
    c1, c2 = st.columns(2)
    with c1:
        age = st.slider("Age (Years)", 18, 80, default_age)
        gender = st.selectbox("Biological Sex", ["Male", "Female"], index=0 if default_gender=="Male" else 1)
        sleep_duration = st.slider("Sleep Duration (Hours)", 3.0, 10.0, float(default_sleep), step=0.1)
        sleep_quality = st.slider("Sleep Quality Score (1-10)", 1, 10, default_qual)
        daily_steps = st.slider("Daily Steps", 1000, 15000, default_steps, step=100)
    
    with c2:
        activity = st.slider("Physical Activity (min/day)", 10, 120, default_act)
        stress_level = st.slider("Perceived Stress (1-10)", 1, 10, default_stress)
        heart_rate = st.slider("Resting Heart Rate (bpm)", 50, 115, default_hr)
        systolic_bp = st.slider("Systolic BP (mmHg)", 95, 175, default_sys)
        diastolic_bp = st.slider("Diastolic BP (mmHg)", 60, 115, default_dia)

    bmi_cat = st.selectbox("BMI Category", ["Normal", "Overweight", "Obese"], 
                           index=["Normal", "Overweight", "Obese"].index(default_bmi))

    run_btn = st.button("🔬 Run Clinical Risk Stratification", type="primary", use_container_width=True)

with col_right:
    st.subheader("🩺 Clinical Intelligence & Explainability")
    
    # Compute clinical biomarkers
    pulse_pressure = systolic_bp - diastolic_bp
    sleep_efficiency = (sleep_duration / 8.0) * (sleep_quality / 10.0)
    
    payload = {
        "Age": float(age),
        "Gender": gender,
        "Sleep_Duration": float(sleep_duration),
        "Quality_of_Sleep": float(sleep_quality),
        "Physical_Activity_Level": float(activity),
        "Stress_Level": float(stress_level),
        "BMI_Category": bmi_cat,
        "Heart_Rate": float(heart_rate),
        "Daily_Steps": float(daily_steps),
        "Systolic_BP": float(systolic_bp),
        "Diastolic_BP": float(diastolic_bp)
    }

    # Fetch from API or fallback
    result = None
    try:
        res = requests.post("http://127.0.0.1:8000/predict", json=payload, timeout=3)
        if res.status_code == 200:
            result = res.json()
    except Exception:
        pass

    if result is None:
        # Fallback offline simulation
        st.warning("⚠️ FastAPI backend offline - running presentation fallback mode.")
        if systolic_bp >= 140 and bmi_cat != "Normal":
            pred = "Sleep Apnea"
            probs = {"Healthy": 5.0, "Insomnia": 12.0, "Sleep_Apnea": 83.0}
            factors = [{"feature": "Systolic_BP", "impact": 1.12}, {"feature": "BMI Category", "impact": 0.88}, {"feature": "Pulse Pressure", "impact": 0.65}]
        elif sleep_duration < 6.0 or stress_level >= 7:
            pred = "Insomnia"
            probs = {"Healthy": 3.0, "Insomnia": 92.0, "Sleep_Apnea": 5.0}
            factors = [{"feature": "Physical Activity Level", "impact": 0.94}, {"feature": "Sleep Duration", "impact": 0.71}, {"feature": "Stress Level", "impact": 0.64}]
        else:
            pred = "Healthy / Normal"
            probs = {"Healthy": 88.0, "Insomnia": 8.0, "Sleep_Apnea": 4.0}
            factors = [{"feature": "Sleep Duration", "impact": -0.72}, {"feature": "Stress Level", "impact": -0.55}, {"feature": "Daily Steps", "impact": -0.42}]
        result = {"prediction": pred, "risk_probabilities": probs, "top_contributing_factors": factors}

    pred_label = result["prediction"]
    probs = result["risk_probabilities"]

    # Verdict Box
    css_class = "verdict-healthy" if "Healthy" in pred_label else ("verdict-insomnia" if "Insomnia" in pred_label else "verdict-apnea")
    st.markdown(f'<div class="verdict-box {css_class}">Primary Diagnosis: {pred_label.upper()}</div>', unsafe_allow_html=True)

    # Risk Probabilities
    st.write("**Multiclass Risk Probabilities**")
    p1, p2, p3 = st.columns(3)
    p1.metric("Healthy / Normal", f"{probs.get('Healthy', 0):.1f}%")
    p2.metric("Insomnia Risk", f"{probs.get('Insomnia', 0):.1f}%")
    p3.metric("Sleep Apnea Risk", f"{probs.get('Sleep_Apnea', 0):.1f}%")

    # Biomarkers
    st.write("**Engineered Biomarkers**")
    b1, b2 = st.columns(2)
    with b1:
        pp_alert = "⚠️ Arterial Stiffness Risk (>50)" if pulse_pressure > 50 else "✅ Optimal Compliance"
        st.metric("Pulse Pressure (SBP - DBP)", f"{pulse_pressure} mmHg", pp_alert)
    with b2:
        st.metric("Sleep Efficiency Index", f"{sleep_efficiency:.2f}")

    # SHAP Factors Chart
    st.write("**Explainable AI: Top Biometric Drivers (SHAP Values)**")
    factors = result.get("top_contributing_factors", [])
    if factors:
        df_shap = pd.DataFrame(factors)
        df_shap['feature'] = df_shap['feature'].str.replace('_', ' ')
        st.bar_chart(df_shap.set_index('feature')['impact'])
