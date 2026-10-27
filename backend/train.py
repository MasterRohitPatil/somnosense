import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import xgboost as xgb

def train_somnosense():
    df = pd.read_csv("Sleep_health_and_lifestyle_dataset.csv")

    # 1. Target Labeling (0: None, 1: Insomnia, 2: Sleep Apnea)
    df['Sleep Disorder'] = df['Sleep Disorder'].fillna('None')
    target_map = {'None': 0, 'Insomnia': 1, 'Sleep Apnea': 2}
    y = df['Sleep Disorder'].map(target_map)

    # 2. Data Science Feature Engineering
    # Split Blood Pressure '120/80' into two continuous features
    bp_split = df['Blood Pressure'].str.split('/', expand=True).astype(float)
    df['Systolic_BP'] = bp_split[0]
    df['Diastolic_BP'] = bp_split[1]
    
    # Pulse Pressure: clinical cardiovascular risk marker
    df['Pulse_Pressure'] = df['Systolic_BP'] - df['Diastolic_BP']
    
    # Sleep Deficit Index: composite ratio
    df['Sleep_Efficiency'] = (df['Sleep Duration'] / 8.0) * (df['Quality of Sleep'] / 10.0)

    # Normalize slight categorical naming inconsistencies
    df['BMI Category'] = df['BMI Category'].replace({'Normal Weight': 'Normal'})

    # 3. Column Grouping
    num_cols = ['Age', 'Sleep Duration', 'Quality of Sleep', 'Physical Activity Level', 
                'Stress Level', 'Heart Rate', 'Daily Steps', 'Systolic_BP', 
                'Diastolic_BP', 'Pulse_Pressure', 'Sleep_Efficiency']
    cat_cols = ['Gender', 'BMI Category']

    X = df[num_cols + cat_cols]

    # 4. Pipeline with Preprocessor & XGBoost
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore'), cat_cols)
        ]
    )

    model = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.08,
        random_state=42,
        eval_metric='mlogloss'
    )

    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', model)
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline.fit(X_train, y_train)

    # 5. Validation Check
    preds = pipeline.predict(X_test)
    print("\n--- Model Evaluation ---")
    print(classification_report(y_test, preds, target_names=['None', 'Insomnia', 'Sleep Apnea']))

    # Save artifacts
    joblib.dump(pipeline, "somnosense_pipeline.pkl")
    X_train.to_csv("background_reference.csv", index=False)
    print("Saved 'somnosense_pipeline.pkl' and 'background_reference.csv' successfully.")

if __name__ == "__main__":
    train_somnosense()
