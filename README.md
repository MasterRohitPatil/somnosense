# SomnoSense: Clinical Sleep & Cardiovascular Decision Support Platform

> **Data Science Honours Project**  
> An explainable machine learning & clinical decision support platform bridging polysomnography indicators, wearable health telemetry (Google Fit / Apple Health), and cardiovascular risk stratification.

---

## 🌟 Key Capabilities

1. **Clinical Decision Support (3-Class Triage)**:
   - Stratifies individuals into **Healthy / Normal**, **Insomnia**, and **Sleep Apnea** with 93% accuracy using an optimized XGBoost classifier.
2. **Cardiovascular Risk Flag (Arterial Compliance)**:
   - Calculates **Pulse Pressure ($PP = SBP - DBP$)**. Automatically warns of elevated arterial stiffness risk when $PP > 50\text{ mmHg}$.
3. **Explainable AI (TreeSHAP)**:
   - Provides per-patient local Shapley attributions, ensuring compliance with clinical AI interpretability requirements (FDA SAMD & EU AI Act).
4. **Clinical NLP Symptom Journal Screener**:
   - Analyzes free-text sleep notes to extract nocturnal choking/gasping, morning migraines, sleep latency, and flags urgency tiers.
5. **Google Health Connect & Wearable Telemetry Sync**:
   - Ingests multi-day time-series telemetry from Google Fit / Apple Health / Fitbit with drag-and-drop CSV parser.
6. **Multi-User Local Storage & Profile Management**:
   - Zero-setup local database (`backend/somnosense.db`).
   - Collects Height & Weight and automatically calculates WHO clinical BMI live.
   - Allows updating biometrics from the User Settings page.

---

## 🏗️ Project Architecture

```
somnosense_project/
├── backend/
│   ├── api.py                  # FastAPI application & REST routing
│   ├── database.py             # Local SQLite database & analytics aggregations
│   ├── nlp_screener.py         # Clinical NLP rule-based symptom extraction
│   ├── train.py                # Model training & feature engineering script
│   ├── somnosense_pipeline.pkl # Serialized XGBoost model & preprocessing pipeline
│   └── background_reference.csv# TreeSHAP baseline distribution
├── frontend/
│   ├── index.html              # Main Clinical App with Left Sidebar Navigation
│   ├── landing.html            # Public marketing / product landing page
│   ├── css/
│   │   └── styles.css          # Design system & responsive styles
│   └── js/
│       └── app.js              # State management, Chart.js trends & API client
├── data/
│   ├── Sleep_health_and_lifestyle_dataset.csv  # Base training dataset
│   └── sample_wearable_export.csv              # 7-day wearable test export
├── run.py                      # 1-Click root launcher
├── requirements.txt            # Python dependencies
└── README.md                   # Project documentation
```

---

## 🚀 Quickstart Guide

### 1. Clone & Set Up Environment
```bash
git clone https://github.com/MasterRohitPatil/somnosense.git
cd somnosense

# (Optional) Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Launch the Platform
```bash
python run.py
```
- **Public Product Landing Page**: Open **`http://127.0.0.1:8000/`**
- **Patient Portal & Dashboard**: Open **`http://127.0.0.1:8000/app`**
- **Interactive Swagger Docs**: Open **`http://127.0.0.1:8000/docs`**

---

## 📊 Market Comparison (Oura vs. Whoop vs. SomnoSense)

| Feature | Oura / Whoop | Apple / Google Health | **SomnoSense** |
| :--- | :---: | :---: | :---: |
| **Diagnostic Triage** | ❌ Generic 0-100 score | ❌ Raw telemetry log | ✅ **Clinical Multi-Class Triage** (Healthy, Insomnia, Sleep Apnea) |
| **Cardiovascular Risk** | ❌ Resting HR only | ❌ BP logging only | ✅ **Pulse Pressure (>50 mmHg) Arterial Stiffness Alert** |
| **AI Transparency** | ❌ Proprietary black-box | ❌ None | ✅ **TreeSHAP Game-Theoretic Attributions** |
| **Symptom NLP** | ❌ None | ❌ None | ✅ **Rule-Based Clinical Symptom Screener** |
| **Patient Profile Engine** | ✅ Available | ✅ Available | ✅ **Auto-Calculated WHO Clinical BMI** |

---

## 📄 License
Academic & Research Use · Data Science Honours Curriculum
