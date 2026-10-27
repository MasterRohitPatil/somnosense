import re
from typing import Dict, List, Any

# Clinical Symptom Lexicons for Sleep Disorders & Cardiovascular Risk
APNEA_TRIGGERS = [
    r"\bgasp(ing)?\b", r"\bchok(ing)?\b", r"\bsnor(e|ing|ed)?\b",
    r"\bmorning headache(s)?\b", r"\bdry mouth\b", r"\bstopped breathing\b",
    r"\bwak(e|ing) up abruptly\b", r"\bchoking sensation\b", r"\bpartner noticed\b"
]

INSOMNIA_TRIGGERS = [
    r"\btoss(ing)? and turn(ing)?\b", r"\bcan(')?t fall asleep\b",
    r"\bcouldn(')?t sleep\b", r"\bracing thoughts?\b", r"\bwoke up at (2|3|4)\s?(am)?\b",
    r"\blay awake\b", r"\bhours to sleep\b", r"\brestless\b", r"\binsomnia\b",
    r"\bstaring at (the )?ceiling\b"
]

FATIGUE_CARDIO_TRIGGERS = [
    r"\bheart rac(ing)?\b", r"\bpalpitation(s)?\b", r"\bchest heav(y|iness)\b",
    r"\bexhaust(ed|ion)\b", r"\bbrain fog\b", r"\bdaytime fatigue\b",
    r"\bfalling asleep driving\b", r"\bdrowsy\b", r"\bcaffeine\b"
]

def analyze_sleep_journal(text: str) -> Dict[str, Any]:
    """
    Performs Rule-based Clinical NLP on free-text patient daily sleep journals.
    Identifies symptom clusters, sentiment tone, and flags clinical alert urgency.
    """
    if not text or len(text.strip()) == 0:
        return {
            "has_journal": False,
            "detected_symptoms": [],
            "urgency": "Normal",
            "clinical_notes": "No daily symptom notes recorded."
        }

    lower_text = text.lower()
    detected_apnea = []
    detected_insomnia = []
    detected_cardio = []

    # Check for Apnea symptoms
    for pattern in APNEA_TRIGGERS:
        match = re.search(pattern, lower_text)
        if match:
            detected_apnea.append(match.group(0))

    # Check for Insomnia symptoms
    for pattern in INSOMNIA_TRIGGERS:
        match = re.search(pattern, lower_text)
        if match:
            detected_insomnia.append(match.group(0))

    # Check for Daytime somnolence & cardio alerts
    for pattern in FATIGUE_CARDIO_TRIGGERS:
        match = re.search(pattern, lower_text)
        if match:
            detected_cardio.append(match.group(0))

    all_symptoms = []
    if detected_apnea:
        all_symptoms.append(f"Sleep-Disordered Breathing flags: {', '.join(set(detected_apnea))}")
    if detected_insomnia:
        all_symptoms.append(f"Sleep-Onset / Maintenance flags: {', '.join(set(detected_insomnia))}")
    if detected_cardio:
        all_symptoms.append(f"Vascular / Fatigue flags: {', '.join(set(detected_cardio))}")

    # Determine Urgency Level
    if detected_apnea or ("chest" in lower_text) or ("falling asleep driving" in lower_text):
        urgency = "High Alert"
        clinical_notes = "⚠️ Nocturnal airway disruption or daytime microsleep risk detected. Polysomnography recommended."
    elif detected_insomnia or detected_cardio:
        urgency = "Moderate Alert"
        clinical_notes = "⚡ Elevated sleep fragmentation and hyperarousal noted. Sleep hygiene & stress mitigation indicated."
    else:
        urgency = "Low"
        clinical_notes = "✅ No acute clinical nocturnal disruptions flagged in journal notes."

    return {
        "has_journal": True,
        "word_count": len(text.split()),
        "detected_symptoms": all_symptoms,
        "urgency": urgency,
        "clinical_notes": clinical_notes
    }
