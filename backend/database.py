import sqlite3
import hashlib
import os
import random
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "somnosense.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
    
    # Check existing users table schema; recreate cleanly for single test user
    cursor.execute("DROP TABLE IF EXISTS otps")
    cursor.execute("""
    CREATE TABLE otps (
        email TEXT PRIMARY KEY,
        otp_code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL
    );
    """)

    # Drop old users table to clean out old password columns and ensure clean schema
    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute("""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        height_cm REAL NOT NULL,
        weight_kg REAL NOT NULL,
        bmi REAL NOT NULL,
        bmi_category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Insert single test user (rohit@gmail.com)
    cursor.execute("""
        INSERT INTO users (id, name, email, age, gender, height_cm, weight_kg, bmi, bmi_category)
        VALUES (1, 'Rohit Patil', 'rohit@gmail.com', 32, 'Male', 175.0, 75.0, 24.5, 'Normal')
    """)

    # Daily Patient Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        log_date DATE NOT NULL,
        bedtime TEXT,
        wake_time TEXT,
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

    # Verify daily_logs has bedtime and wake_time columns
    cursor.execute("PRAGMA table_info(daily_logs)")
    columns = [row[1] for row in cursor.fetchall()]
    if 'bedtime' not in columns:
        cursor.execute("ALTER TABLE daily_logs ADD COLUMN bedtime TEXT")
    if 'wake_time' not in columns:
        cursor.execute("ALTER TABLE daily_logs ADD COLUMN wake_time TEXT")

    # Ensure user 1 has initial historical logs for rich charts
    cursor.execute("SELECT COUNT(*) FROM daily_logs WHERE user_id = 1")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_logs = [
            (1, '2026-10-21', '23:30', '05:45', 6.25, 6.0, 45.0, 6.0, 78.0, 5200.0, 132.0, 84.0, 48.0, 80.0, 'Mild restlessness during sleep', 'neutral', 'Mild restlessness', 'Insomnia Risk', 12.0, 78.0, 10.0, 'Historical Baseline'),
            (1, '2026-10-22', '23:45', '05:30', 5.75, 5.0, 30.0, 7.0, 82.0, 4800.0, 135.0, 86.0, 49.0, 74.0, 'Difficulty falling asleep', 'borderline', 'Sleep onset latency', 'Insomnia Risk', 8.0, 84.0, 8.0, 'Historical Baseline'),
            (1, '2026-10-23', '00:15', '06:00', 5.75, 5.0, 35.0, 7.0, 80.0, 5100.0, 136.0, 88.0, 48.0, 72.0, 'Woke up at 3 am', 'borderline', 'Nocturnal awakening', 'Insomnia Risk', 6.0, 86.0, 8.0, 'Historical Baseline'),
            (1, '2026-10-24', '23:00', '06:30', 7.50, 7.0, 60.0, 4.0, 72.0, 7500.0, 124.0, 80.0, 44.0, 88.0, 'Slept reasonably well', 'positive', 'Normal restorative sleep', 'Healthy / Normal', 88.0, 8.0, 4.0, 'Historical Baseline'),
            (1, '2026-10-25', '23:15', '06:45', 7.50, 8.0, 55.0, 4.0, 70.0, 8200.0, 122.0, 79.0, 43.0, 90.0, 'Refreshed morning', 'positive', 'Normal restorative sleep', 'Healthy / Normal', 92.0, 5.0, 3.0, 'Historical Baseline'),
            (1, '2026-10-26', '00:30', '05:45', 5.25, 4.0, 20.0, 8.0, 85.0, 3900.0, 138.0, 90.0, 48.0, 68.0, 'Severe work stress, racing heartbeat', 'elevated', 'Nocturnal arousal, hypertension', 'Insomnia Risk', 4.0, 91.0, 5.0, 'Historical Baseline'),
            (1, '2026-10-27', '23:15', '06:30', 7.25, 7.0, 50.0, 5.0, 74.0, 6400.0, 126.0, 82.0, 44.0, 87.0, 'Felt moderate fatigue but fell asleep smoothly', 'neutral', 'Mild fatigue', 'Healthy / Normal', 85.0, 10.0, 5.0, 'Daily Assessment')
        ]
        cursor.executemany("""
            INSERT INTO daily_logs (
                user_id, log_date, bedtime, wake_time, sleep_duration, quality_of_sleep,
                physical_activity, stress_level, heart_rate, daily_steps,
                systolic_bp, diastolic_bp, pulse_pressure, sleep_efficiency,
                journal_text, nlp_sentiment, nlp_symptoms, prediction,
                prob_healthy, prob_insomnia, prob_apnea, data_source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_logs)

    # Clinical Questionnaires Table (STOP-BANG & Epworth Sleepiness Scale)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clinical_screenings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        screener_date DATE NOT NULL,
        stop_bang_score INTEGER NOT NULL,
        stop_bang_risk TEXT NOT NULL,
        ess_score INTEGER NOT NULL,
        ess_severity TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    conn.commit()
    conn.close()

# --- OTP Authentication Functions ---

def create_or_get_otp(email: str) -> str:
    """Generates a 6-digit OTP code for Gmail verification with a 15-minute expiration."""
    clean_email = email.strip().lower()
    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.now() + timedelta(minutes=15)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO otps (email, otp_code, expires_at) 
        VALUES (?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET otp_code=excluded.otp_code, expires_at=excluded.expires_at
    """, (clean_email, otp_code, expires_at))
    conn.commit()
    conn.close()
    return otp_code

def verify_otp_code(email: str, entered_code: str) -> bool:
    clean_email = email.strip().lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT otp_code, expires_at FROM otps WHERE email = ?", (clean_email,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return False
    
    saved_code = row['otp_code']
    expires_at = datetime.strptime(row['expires_at'], "%Y-%m-%d %H:%M:%S.%f") if '.' in row['expires_at'] else datetime.strptime(row['expires_at'], "%Y-%m-%d %H:%M:%S")
    
    if datetime.now() > expires_at:
        return False
        
    return saved_code.strip() == entered_code.strip()

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),))
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

def register_user(name: str, email: str, age: int, gender: str, height_cm: float, weight_kg: float) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    bmi, bmi_category = calculate_bmi(weight_kg, height_cm)
    clean_email = email.strip().lower()
    try:
        cursor.execute("""
            INSERT INTO users (name, email, age, gender, height_cm, weight_kg, bmi, bmi_category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, clean_email, age, gender, height_cm, weight_kg, bmi, bmi_category))
        conn.commit()
        user_id = cursor.lastrowid
        return get_user_by_id(user_id)
    except sqlite3.IntegrityError:
        return get_user_by_email(clean_email)
    finally:
        conn.close()

def save_daily_log(user_id: int, log_data: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO daily_logs (
            user_id, log_date, bedtime, wake_time, sleep_duration, quality_of_sleep,
            physical_activity, stress_level, heart_rate, daily_steps,
            systolic_bp, diastolic_bp, pulse_pressure, sleep_efficiency,
            journal_text, nlp_sentiment, nlp_symptoms,
            prediction, prob_healthy, prob_insomnia, prob_apnea, data_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        log_data.get('log_date', datetime.now().strftime("%Y-%m-%d")),
        log_data.get('bedtime', '23:00'),
        log_data.get('wake_time', '06:30'),
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
        log_data.get('nlp_sentiment', 'Normal'),
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
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT log_date, bedtime, wake_time, sleep_duration, quality_of_sleep, heart_rate, systolic_bp, diastolic_bp, pulse_pressure, prediction
        FROM daily_logs 
        WHERE user_id = ? 
        ORDER BY log_date ASC
        LIMIT 30
    """, (user_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not rows:
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

def save_clinical_screener(user_id: int, stop_bang_score: int, stop_bang_risk: str, ess_score: int, ess_severity: str, notes: str = "") -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("""
        INSERT INTO clinical_screenings (user_id, screener_date, stop_bang_score, stop_bang_risk, ess_score, ess_severity, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, today_str, stop_bang_score, stop_bang_risk, ess_score, ess_severity, notes))
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()
    return {
        "id": inserted_id,
        "user_id": user_id,
        "screener_date": today_str,
        "stop_bang_score": stop_bang_score,
        "stop_bang_risk": stop_bang_risk,
        "ess_score": ess_score,
        "ess_severity": ess_severity,
        "notes": notes
    }

def get_latest_clinical_screener(user_id: int) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM clinical_screenings WHERE user_id = ? ORDER BY screener_date DESC, id DESC LIMIT 1
    """, (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

init_db()
