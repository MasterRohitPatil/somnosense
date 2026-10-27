# SomnoSense: Clinical Sleep & Cardiovascular Risk Stratifier

> **Data Science Honours Project**  
> An explainable machine learning system bridging polysomnography indicators, wearable telemetry, and cardiovascular risk stratification.

---

## 📌 Overview

**SomnoSense** is an end-to-end clinical decision support platform designed to stratify individuals into three diagnostic categories:
1. **Healthy / Normal**
2. **Insomnia**
3. **Sleep Apnea**

Beyond standard diagnostic classification, SomnoSense integrates **clinical biomarker engineering** (Pulse Pressure for arterial stiffness assessment and Sleep Efficiency ratios) and **TreeSHAP local attributions** to provide transparent, interpretable risk factors for clinical practitioners and patients.

---

## 🏗️ Architecture

```
SomnoSense
├── Sleep_health_and_lifestyle_dataset.csv   # Source clinical & lifestyle dataset
├── train.py                                 # Feature engineering & XGBoost pipeline trainer
├── somnosense_pipeline.pkl                  # Serialized model & preprocessing pipeline
├── background_reference.csv                 # Background baseline for TreeSHAP explainer
├── api.py                                   # FastAPI inference & SHAP computation engine
├── index.html                               # Modern high-contrast interactive frontend
├── app_streamlit.py                         # Streamlit alternative for Python-centric workflows
├── requirements.txt                         # Python dependencies
└── README.md                                # Project documentation
```

---

## 🧬 Feature Engineering & Clinical Rationale

- **Pulse Pressure ($PP = \text{Systolic BP} - \text{Diastolic BP}$)**:
  - Clinical significance: $PP > 50\text{ mmHg}$ serves as a surrogate marker of arterial stiffness and isolated systolic hypertension, closely linked to sleep-disordered breathing.
- **Sleep Efficiency Index**:
  - Normalized composite ratio: $(\text{Sleep Duration} / 8.0) \times (\text{Quality of Sleep} / 10.0)$.
- **Explainable AI (TreeSHAP)**:
  - Provides per-patient local Shapley attributions, ensuring compliance with clinical AI interpretability requirements (FDA SAMD & EU AI Act).

---

## 🚀 Getting Started

### 1. Clone & Set Up Environment
```bash
git clone https://github.com/MasterRohitPatil/somnosense.git
cd somnosense

# Create and activate virtual environment (optional)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Train the Model
```bash
python train.py
```
*Outputs: 93% classification accuracy on stratified test split.*

### 3. Run the Backend API & Web App
```bash
python api.py
```
- Open browser at **`http://127.0.0.1:8000/`** to access the web interface.
- Interactive API documentation available at **`http://127.0.0.1:8000/docs`**.

### 4. (Optional) Run Streamlit Dashboard
```bash
streamlit run app_streamlit.py
```

---

## 🧪 Model Performance Summary

| Class | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :---: |
| **Healthy / Normal** | 1.00 | 0.98 | 0.99 | 44 |
| **Insomnia** | 0.92 | 0.80 | 0.86 | 15 |
| **Sleep Apnea** | 0.79 | 0.94 | 0.86 | 16 |
| **Overall Accuracy** | | | **0.93** | 75 |

---

## 📄 License
Academic & Research Use · Data Science Honours Curriculum
