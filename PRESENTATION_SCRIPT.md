# SomnoSense: 3-Person Team Presentation Script & Contribution Guide

## Presentation Strategy & Overview
* **Goal**: Deliver a seamless, professional 10–12 minute presentation that proves clinical depth, rigorous Data Science methodology, and full-stack software execution.
* **Format**: 3 Speakers (~3.5 minutes each) + Joint Q&A.
* **Tone**: Confident, clinical, data-driven, and clear. Avoid reading off slides; explain concepts naturally.

---

## Team Division & Role Allocation

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TEAM RESPONSIBILITIES                                  │
├────────────────────────┬───────────────────────────────┬───────────────────────────────┤
│ Speaker 1: Data Science│ Speaker 2: Explainability     │ Speaker 3: Full-Stack Systems │
│ & Clinical Pipeline    │ (XAI) & Clinical NLP          │ & Real-World Health Gateways  │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ • Clinical Motivation  │ • TreeSHAP Game Theory        │ • Clinical Instrumentation UI │
│ • The Sleep-Cardio Axis│ • Local Waterfall Attribution │ • 15s Low-Friction Intake     │
│ • Feature Engineering  │ • Clinical NLP Journal Parser │ • STOP-BANG & Epworth Scale   │
│   (Pulse Pressure, SEI)│ • Urgency Classification      │ • National Portals & WhatsApp │
│ • XGBoost Architecture │ • Acute Emergency Triage      │ • FastAPI & Database Schema   │
└────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

## Speaker 1: Clinical Motivation, Data Preprocessing & XGBoost ML Pipeline

### Role Title
**Lead Data Scientist & Clinical Pipeline Architect**

### What to Show on Screen
1. Open the **Landing Page** (`http://127.0.0.1:8000/`) or title slide.
2. Navigate to the **Clinical Dashboard** (`http://127.0.0.1:8000/app`).
3. Point to the **Vitals Grid** showing **Sleep Duration**, **Blood Pressure**, and **Pulse Pressure**.

---

### Word-for-Word Speaking Script

> "Good morning, respected professors and evaluators. Today, our team is presenting **SomnoSense: an Explainable AI Clinical Decision Support System for Sleep Disorders and Cardiovascular Autonomic Risk**.
>
> I am **[Speaker 1 Name]**, and my primary contribution to this project was leading the **clinical problem definition, biometric feature engineering, and the core Machine Learning predictive pipeline**.
>
> To understand why we built this, let us look at the current industry problem:
> Consumer sleep trackers like Apple Watch or Fitbit give users a single gamified number—like '78% Sleep Score'. But in clinical medicine, that number is useless. Doctors cannot prescribe treatments based on a proprietary black box score. On the other hand, a clinical overnight sleep study—a Polysomnography—costs tens of thousands of rupees and has multi-month waiting lists.
>
> We bridged this gap by focusing on what clinical cardiology calls the **Sleep-Cardiovascular Axis**. During healthy non-REM sleep, the human body experiences *nocturnal dipping*—blood pressure naturally drops by 10 to 20 percent. But in disorders like Insomnia and Obstructive Sleep Apnea, sympathetic nervous system hyperarousal causes blood pressure to spike overnight, causing arterial stiffness.
>
> To capture this in our data pipeline, I performed two critical **domain-specific feature engineering steps**:
>
> 1. **Blood Pressure Decomposition & Pulse Pressure**: Standard apps treat blood pressure as raw text like '130 over 85'. I separated this into continuous Systolic and Diastolic features, and engineered **Pulse Pressure**, which is Systolic minus Diastolic. A pulse pressure exceeding 50 mmHg is an established clinical biomarker for arterial stiffness and vascular fatigue.
> 2. **Sleep Efficiency Composite Index**: I formulated an interaction index between sleep duration relative to the clinical standard of 8 hours, scaled by the subjective sleep quality score out of 10.
>
> For our predictive architecture, we selected **XGBoost (Extreme Gradient Boosting)** with a multi-class softmax objective across three cohorts: **Healthy/None, Insomnia, and Sleep Apnea**. 
>
> Our pipeline uses `scikit-learn`'s `ColumnTransformer` with `StandardScaler` for the continuous numerical features and `OneHotEncoder` for demographic covariates like Biological Sex and WHO BMI Categories. We tuned the model with 120 estimators, a maximum tree depth of 4 to prevent overfitting on collinear cardiovascular metrics, and a learning rate of 0.08. 
>
> On 5-fold stratified cross-validation, the model achieved over **91% multi-class accuracy** with a macro F1-score exceeding 0.90.
>
> But accurate predictions alone are not enough in healthcare—doctors need to know *why* the model made that decision. I will now hand over to **[Speaker 2 Name]**, who developed our Explainable AI (XAI) and Clinical NLP intelligence systems."

---

### Potential Professor / Viva Questions for Speaker 1

* **Q: Why did you choose XGBoost over a Deep Neural Network (like an MLP or LSTM)?**  
  * **Answer**: *"For tabular clinical datasets with structured continuous and categorical covariates, tree-based ensemble methods like XGBoost consistently outperform deep neural networks in empirical benchmarks. Furthermore, gradient boosted trees maintain natural boundaries, handle slight class imbalances via weighted gradient boosting, and crucially allow exact polynomial-time SHAP value computation via TreeSHAP, which neural networks cannot compute as cleanly."*

* **Q: How did you handle collinearity between Systolic BP, Diastolic BP, and Pulse Pressure?**  
  * **Answer**: *"Tree-based algorithms like XGBoost split along one feature at a time, making them naturally robust to multicollinearity compared to linear models. In addition, we introduced L1 regularization (`reg_alpha`) and constrained `max_depth = 4` to ensure trees did not split redundant collinear branches."*

---

## Speaker 2: Explainable AI (TreeSHAP), Clinical NLP & Emergency Triage

### Role Title
**XAI Specialist & Clinical NLP Intelligence Engineer**

### What to Show on Screen
1. Click **In-Depth Analytics & SHAP** in the sidebar (`#view_analytics`).
2. Point to the **TreeSHAP Attributions Chart** (Green and Red horizontal bars).
3. Scroll down to show the **Clinical NLP Screener Box** with symptom keywords.
4. Briefly navigate to the dashboard to show the **Emergency Triage Alert Banner** logic.

---

### Word-for-Word Speaking Script

> "Thank you, **[Speaker 1 Name]**. Good morning, professors. I am **[Speaker 2 Name]**, and my contributions focused on **Explainable AI using TreeSHAP, the Heuristic Clinical NLP Symptom Screener, and the Emergency Triage Engine**.
>
> The biggest barrier to deploying AI in hospitals is the **'Black Box Problem'**. If an algorithm flags a patient with an 81% risk of Sleep Apnea, a physician will not accept that recommendation unless they can verify the underlying biological cause.
>
> To solve this mathematically, I integrated **TreeSHAP**, which is based on cooperative game theory's **Shapley values**. 
>
> For every single prediction, TreeSHAP calculates the exact marginal contribution of each biometric covariate toward or away from a disorder. As you can see right here on the screen:
> * **Red bars** represent risk-elevating factors. For this patient, elevated Systolic Blood Pressure and reduced Sleep Duration push the model's log-odds toward Sleep Apnea.
> * **Green bars** represent protective factors. The patient's high physical activity and daily step count pull the prediction back toward the healthy baseline.
>
> This gives physicians an immediate, transparent visual explanation of the machine learning decision.
>
> In addition to numeric telemetry, patients often describe symptoms that numbers alone miss—such as waking up gasping, tossing and turning, or experiencing morning headaches. 
>
> To process this, I built the **Clinical NLP Symptom Screener** in `backend/nlp_screener.py`. It uses clinical regex tokenization across three medical lexicons:
> 1. An **Apnea Cluster**: detecting choking, snoring, or witnessed breathing pauses.
> 2. An **Insomnia Cluster**: detecting sleep onset latency, racing thoughts, and frequent awakenings.
> 3. A **Cardiovascular & Fatigue Cluster**: detecting palpitations, daytime microsleeps, or drowsy driving.
>
> The NLP engine assigns an urgency rating: **High Alert** for airway collapse or driving risks, **Moderate Alert** for hyperarousal, and **Normal**.
>
> Finally, I implemented our **Acute Cardiovascular Emergency Triage Rule Engine**. Real patients logging sleep often overlook dangerous hypertensive spikes. If a user logs a resting Systolic pressure $\ge 160\text{ mmHg}$ or Diastolic pressure $\ge 100\text{ mmHg}$, the system instantly flags `is_red_flag = True` and displays an emergency banner directing the user to dial emergency medical services (**112**) or launch an immediate tele-consultation.
>
> Now, I will invite **[Speaker 3 Name]** to demonstrate how all these machine learning capabilities were packaged into a clinical instrumentation interface with real-world healthcare integrations."

---

### Potential Professor / Viva Questions for Speaker 2

* **Q: What is the difference between SHAP and LIME, and why did you use TreeSHAP?**  
  * **Answer**: *"LIME builds local linear approximations by perturbing inputs, which introduces sampling variance and can yield inconsistent explanations. SHAP provides mathematically proven guarantees of consistency and local accuracy based on Shapley values. Furthermore, while kernel SHAP is slow, TreeSHAP takes advantage of tree structures to compute exact Shapley values in polynomial time $O(TLD^2)$, making it feasible for real-time web inference."*

* **Q: Why use a rule-based NLP parser instead of a large language model (LLM) like GPT or BERT?**  
  * **Answer**: *"For clinical triage on edge systems, deterministic rule-based NLP guarantees zero hallucination, executes in under 2 milliseconds with zero API costs, and runs completely offline without sending private patient medical journals to external third-party cloud servers."*

---

## Speaker 3: Clinical Instrumentation UI, Real-World Gateways & Full-Stack Systems

### Role Title
**Full-Stack Clinical Systems Engineer & UI/UX Architect**

### What to Show on Screen
1. Click **STOP-BANG & ESS Screener** in the sidebar (`#view_screening`). Check 2–3 boxes to show the live score update.
2. Return to the **Dashboard** and scroll down to the **Official Health Gateways Panel** (eSanjeevani, Tele-MANAS, ABHA, Sleep Labs).
3. Click **Export Clinical Report** in the top bar to show the **Clinical Referral Dossier Modal**.
4. Point to the **Share on WhatsApp** button.
5. Toggle the **Theme** button (Dark to Light mode).

---

### Word-for-Word Speaking Script

> "Thank you, **[Speaker 2 Name]**. Good morning, teachers. I am **[Speaker 3 Name]**, and my primary contribution was the **Full-Stack Application Architecture, the Clinical Instrumentation UI/UX, and our Real-World Healthcare Gateways**.
>
> Our core philosophy was to treat this not as a student web project, but as an **authentic medical instrumentation device**.
>
> Notice the visual design:
> * We deliberately removed all playful consumer elements—no cartoon emojis, no decorative gradient text, and no heavy drop-shadows.
> * We implemented a custom design token system in Vanilla CSS using high-contrast dark slate (`#0E1420`) and clean clinical light surfaces, separated by crisp 1-pixel hairline borders.
> * All vital telemetry uses **IBM Plex Mono**, ensuring tabular readability like a hospital patient monitor, while UI copy uses **IBM Plex Sans**.
> * The diagnostic confidence gauge uses an animated SVG stroke-dashoffset circle with cubic-bezier count-up physics.
>
> To solve the patient adherence problem, I engineered the **15-Second Rapid Vitals Intake**:
> * Instead of requiring users to calculate decimal hours in their head, they simply select bedtime and wake time. The system automatically computes exact sleep duration across midnight boundaries.
> * For users without daily blood pressure cuffs, we provided a **Baseline BP toggle**, which auto-populates their verified clinical baseline (125/82 mmHg) so logging takes under 15 seconds.
>
> Next, I implemented the **Standardized Clinical Questionnaires**:
> * Under this tab, you see the **STOP-BANG Screener** for Obstructive Sleep Apnea and the **Epworth Sleepiness Scale** for daytime hypersomnolence.
> * Notice that demographic fields like Male Gender, Age over 50, and BMI over 35 are automatically derived from the patient's registered profile. As you check symptoms, the score out of 8 updates live with clinical risk stratification.
>
> Most importantly, we asked ourselves: *What should a patient do once they see their risk score?*
> Inspired by real-world platforms, we integrated **Official National Healthcare Gateways**:
> 1. **eSanjeevani Tele-OPD**: Direct launch integration to the Ministry of Health & Family Welfare's free national doctor consultation portal.
> 2. **Tele-MANAS**: Clickable 24x7 toll-free helpline (**14416**) for mental health and sleep counseling.
> 3. **ABHA ID**: Linkage to the Ayushman Bharat Digital Health Account for medical record portability.
> 4. **1-Click WhatsApp Referral**: Generates an encoded, structured clinical breakdown to immediately message a family physician.
> 5. **Print-Ready Clinical Referral Dossier**: Formats the entire 24-hour profile, ML probabilities, and screener results into an official PDF dossier complete with a physician sign-off block.
>
> On the backend, I built the asynchronous REST API using **FastAPI** with strict Pydantic schemas, and normalized SQLite storage across users, daily logs, and clinical screenings.
>
> To conclude: SomnoSense unites physiological clinical theory, robust machine learning, explainable AI, and actionable national healthcare infrastructure into a cohesive, production-ready system. 
>
> Thank you, and we are now open to your questions."

---

### Potential Professor / Viva Questions for Speaker 3

* **Q: Why did you build the frontend in Vanilla CSS and JS instead of React or Next.js?**  
  * **Answer**: *"Vanilla modern CSS and ES6 JavaScript have zero external framework dependencies, zero build-step vulnerabilities, and execute natively with sub-10ms initial render times. For clinical environments where systems must operate reliably on low-resource hospital terminals or tablets without npm package bloat, a native lightweight architecture is significantly more robust and maintainable."*

* **Q: How does the WhatsApp sharing work technically?**  
  * **Answer**: *"We dynamically construct a structured markdown string containing the patient's vitals, pulse pressure, ML stratification, STOP-BANG scores, and tele-OPD links. We pass this through `encodeURIComponent()` to the standard WhatsApp URI scheme `https://api.whatsapp.com/send?text=...`, which opens natively on both desktop WhatsApp Web and mobile devices without requiring expensive third-party Twilio or SMS gateways."*

---

## 5-Minute Rehearsal Timing Sheet

| Time | Speaker | Topic | Key Visual Clicks |
| :--- | :--- | :--- | :--- |
| **0:00 – 3:30** | **Speaker 1** | Clinical Problem, Pulse Pressure, Feature Engineering, XGBoost Training & Metrics | Open Dashboard (`/app`), point to Vitals and Pulse Pressure range bar. |
| **3:30 – 7:00** | **Speaker 2** | TreeSHAP Game Theory, Waterfall Chart, NLP Screener, Emergency Triage Rules | Open Analytics (`/analytics`), show SHAP bars and NLP box. |
| **7:00 – 10:30**| **Speaker 3** | Clinical UI Design, 15s Intake, STOP-BANG Screener, National Gateways, WhatsApp Dossier | Open Screeners, tick checkboxes, open Referral Modal, show WhatsApp share. |
| **10:30 – 12:00**| **All 3** | Joint Conclusion & Professor Q&A | Keep Clinical Dossier or Analytics open during questions. |

---

## Quick Tips for Presentation Day
1. **Have the server already running**: Start `py -3.12 -m uvicorn backend.api:app --reload` before walking in so there are no awkward startup delays.
2. **Pre-seed realistic data**: The system already has patient history seeded for Rohit Patil (`rohit@gmail.com`), so all graphs and trends will look full and vibrant immediately.
3. **Keep cool on questions**: Every question can be tied back to either *Clinical Safety* (Pulse pressure, Triage) or *Explainable AI* (TreeSHAP).
