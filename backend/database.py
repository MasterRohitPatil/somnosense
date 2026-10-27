import sqlite3
import hashlib
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "somnosense.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def calculate_bmi(weight_kg: float, height_cm: float) -> tuple[float, str]:
    """Calculate clinical BMI and categorization according to WHO standards."""
    height_m = height_cm / 100.0
    if height_m <= 0:
        return 22.0, "Normal"
    bmi = round(weight_kg / (height_m * height_m), 1)
    if bmi < 25.0:
        category = "Normal"
    elif bmi < 30.0:
        category = "Overweight"
    else:
        category = "Obese"
    return bmi, category

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        height_cm REAL NOT NULL,
        weight_kg REAL NOT NULL,
        bmi REAL NOT NULL,
        bmi_category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Daily Patient Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        log_date DATE NOT NULL,
        sleep_duration REAL NOT NULL,
        quality_of_sleep REAL NOT NULL,
        physical_activity REAL NOT NULL,
        stress_level REAL NOT NULL,
        heart_rate REAL NOT NULL,
        daily_steps REAL NOT NULL,
        systolic_bp REAL NOT NULL,
        diastolic_bp REAL NOT NULL,
        pulse_pressure REAL NOT NULL,
        sleep_efficiency REAL NOT NULL,
        journal_text TEXT,
        nlp_sentiment TEXT,
        nlp_symptoms TEXT,
        prediction TEXT NOT NULL,
        prob_healthy REAL NOT NULL,
        prob_insomnia REAL NOT NULL,
        prob_apnea REAL NOT NULL,
        data_source TEXT DEFAULT 'Manual Entry',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    conn.commit()

    # Seed default demonstration user if table is empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        demo_hash = hash_password("demo123")
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, age, gender, height_cm, weight_kg, bmi, bmi_category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("Rohit Patil (Demo Patient)", "rohit@somnosense.org", demo_hash, 32, "Male", 175.0, 78.0, 25.5, "Overweight"))
        conn.commit()

    conn.close()

def register_user(name: str, email: str, password: str, age: int, gender: str, height_cm: float, weight_kg: float) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    bmi, bmi_category = calculate_bmi(weight_kg, height_cm)
    pwd_hash = hash_password(password)
    try:
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, age, gender, height_cm, weight_kg, bmi, bmi_category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, email.strip().lower(), pwd_hash, age, gender, height_cm, weight_kg, bmi, bmi_category))
        conn.commit()
        user_id = cursor.lastrowid
        return get_user_by_id(user_id)
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def update_user_settings(user_id: int, name: str, age: int, gender: str, height_cm: float, weight_kg: float) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    bmi, bmi_category = calculate_bmi(weight_kg, height_cm)
    cursor.execute("""
        UPDATE users 
        SET name = ?, age = ?, gender = ?, height_cm = ?, weight_kg = ?, bmi = ?, bmi_category = ?
        WHERE id = ?
    """, (name, age, gender, height_cm, weight_kg, bmi, bmi_category, user_id))
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    pwd_hash = hash_password(password)
    cursor.execute("SELECT * FROM users WHERE email = ? AND password_hash = ?", (email.strip().lower(), pwd_hash))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, age, gender, height_cm, weight_kg, bmi, bmi_category, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def save_daily_log(user_id: int, log_data: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO daily_logs (
            user_id, log_date, sleep_duration, quality_of_sleep,
            physical_activity, stress_level, heart_rate, daily_steps,
            systolic_bp, diastolic_bp, pulse_pressure, sleep_efficiency,
            journal_text, nlp_sentiment, nlp_symptoms,
            prediction, prob_healthy, prob_insomnia, prob_apnea, data_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        log_data.get('log_date', datetime.now().strftime("%Y-%m-%d")),
        log_data['sleep_duration'],
        log_data['quality_of_sleep'],
        log_data['physical_activity'],
        log_data['stress_level'],
        log_data['heart_rate'],
        log_data['daily_steps'],
        log_data['systolic_bp'],
        log_data['diastolic_bp'],
        log_data['pulse_pressure'],
        log_data['sleep_efficiency'],
        log_data.get('journal_text', ''),
        log_data.get('nlp_sentiment', 'Neutral'),
        log_data.get('nlp_symptoms', ''),
        log_data['prediction'],
        log_data['prob_healthy'],
        log_data['prob_insomnia'],
        log_data['prob_apnea'],
        log_data.get('data_source', 'Manual Entry')
    ))
    conn.commit()
    log_id = cursor.lastrowid
    conn.close()
    return log_id

def get_user_logs(user_id: int, limit: int = 30) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM daily_logs 
        WHERE user_id = ? 
        ORDER BY log_date DESC, id DESC 
        LIMIT ?
    """, (user_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_user_analytics(user_id: int) -> Dict[str, Any]:
    """Computes weekly and monthly trends and averages for dashboard charts."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT log_date, sleep_duration, quality_of_sleep, heart_rate, systolic_bp, diastolic_bp, pulse_pressure, prediction
        FROM daily_logs 
        WHERE user_id = ? 
        ORDER BY log_date ASC
        LIMIT 30
    """, (user_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not rows:
        # Default baseline if empty
        return {
            "has_data": False,
            "avg_sleep_7d": 0,
            "avg_heart_rate": 0,
            "avg_pulse_pressure": 0,
            "dates": [],
            "sleep_durations": [],
            "pulse_pressures": [],
            "heart_rates": []
        }

    recent_7 = rows[-7:] if len(rows) >= 7 else rows
    avg_sleep = round(sum(r['sleep_duration'] for r in recent_7) / len(recent_7), 1)
    avg_hr = round(sum(r['heart_rate'] for r in recent_7) / len(recent_7), 0)
    avg_pp = round(sum(r['pulse_pressure'] for r in recent_7) / len(recent_7), 0)

    return {
        "has_data": True,
        "total_records": len(rows),
        "avg_sleep_7d": avg_sleep,
        "avg_heart_rate": int(avg_hr),
        "avg_pulse_pressure": int(avg_pp),
        "dates": [r['log_date'] for r in rows],
        "sleep_durations": [r['sleep_duration'] for r in rows],
        "pulse_pressures": [r['pulse_pressure'] for r in rows],
        "heart_rates": [r['heart_rate'] for r in rows],
        "predictions": [r['prediction'] for r in rows]
    }

init_db()
