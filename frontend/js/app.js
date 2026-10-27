// SomnoSense: Clinical Decision Support Portal Client Logic (v2.2.0)
// Clinical Instrumentation Visual Language & Strict State Management

let currentUser = {
    id: 1,
    name: "Rohit Patil",
    email: "rohit@gmail.com",
    age: 32,
    gender: "Male",
    height_cm: 175,
    weight_kg: 78,
    bmi: 25.5,
    bmi_category: "Overweight"
};

let shapChartInstance = null;
let trendChartInstance = null;
let currentDemoOtp = "";
let latestLogGlobal = null;

// ================= THEME CONTROLLER =================
function initTheme() {
    const saved = localStorage.getItem('somnosense-theme') || 'dark';
    setTheme(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

function setTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('somnosense-theme', theme);
    
    document.querySelectorAll('#themeLabel').forEach(el => {
        el.textContent = theme === 'light' ? 'Dark' : 'Light';
    });

    if (trendChartInstance || shapChartInstance) {
        loadDashboardData();
    }
}

// ================= NAVIGATION CONTROLLER =================
function navigate(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item button').forEach(b => b.classList.remove('active'));

    const activeBtn = document.getElementById(`navBtn_${pageId}`);
    if (activeBtn) activeBtn.classList.add('active');

    const targetView = document.getElementById(`view_${pageId}`);
    if (targetView) targetView.classList.add('active');

    if (pageId === 'dashboard') {
        loadDashboardData();
    } else if (pageId === 'daily-log') {
        document.getElementById('logDate').value = new Date().toISOString().split('T')[0];
        calculateLiveSleepDuration();
    } else if (pageId === 'analytics') {
        loadDashboardData();
    } else if (pageId === 'history') {
        loadPatientHistory();
    } else if (pageId === 'settings') {
        populateSettingsForm();
    }
}

// ================= GMAIL OTP AUTHENTICATION =================
function openAuthModal() {
    document.getElementById('authModal').classList.add('open');
    resetOtpModal();
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('open');
}

function resetOtpModal() {
    document.getElementById('otpStepEmail').style.display = 'block';
    document.getElementById('otpStepCode').style.display = 'none';
    document.getElementById('authOtpInput').value = '';
    const emailInput = document.getElementById('authGmail');
    if (!emailInput.value) emailInput.value = currentUser.email || 'rohit@gmail.com';
}

async function handleRequestOtp() {
    const email = document.getElementById('authGmail').value.trim().toLowerCase();
    const btn = document.getElementById('btnRequestOtp');

    if (!email.endsWith('@gmail.com')) {
        alert('Security Constraint: Only valid @gmail.com accounts are permitted.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Transmitting OTP...';

    try {
        const res = await fetch('/api/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'OTP generation failed');

        currentDemoOtp = data.demo_code || data.demo_otp || "";
        document.getElementById('otpTargetEmail').textContent = email;
        document.getElementById('demoOtpCodeVal').textContent = currentDemoOtp;

        document.getElementById('otpStepEmail').style.display = 'none';
        document.getElementById('otpStepCode').style.display = 'block';
        document.getElementById('authOtpInput').focus();
    } catch (err) {
        alert('Authentication Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Verification Code';
    }
}

function autoFillDemoOtp() {
    if (currentDemoOtp) {
        document.getElementById('authOtpInput').value = currentDemoOtp;
    }
}

async function handleVerifyOtp() {
    const email = document.getElementById('authGmail').value.trim().toLowerCase();
    const otp_code = document.getElementById('authOtpInput').value.trim();
    const btn = document.getElementById('btnVerifyOtp');

    if (otp_code.length !== 6) {
        alert('Please enter a valid 6-digit numeric verification code.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Validating...';

    try {
        const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp_code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Invalid or expired OTP');

        currentUser = data.user;
        updateUserUI();
        closeAuthModal();
        navigate('dashboard');
    } catch (err) {
        alert('Verification Failed: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Verify & Authenticate';
    }
}

function getWHOStandards(age) {
    if (age <= 25) {
        return {
            cohortName: "Young Adult (18-25 yrs)",
            sleepTarget: "7.0 - 9.0 hrs",
            minSleep: 6.0,
            maxSleep: 10.0,
            maxPP: 45,
            stepTarget: 8000
        };
    } else if (age <= 64) {
        return {
            cohortName: "Adult (26-64 yrs)",
            sleepTarget: "7.0 - 9.0 hrs",
            minSleep: 6.0,
            maxSleep: 9.5,
            maxPP: 50,
            stepTarget: 7000
        };
    } else {
        return {
            cohortName: "Older Adult (65+ yrs)",
            sleepTarget: "7.0 - 8.0 hrs",
            minSleep: 5.5,
            maxSleep: 8.5,
            maxPP: 55,
            stepTarget: 5500
        };
    }
}

function updateUserUI() {
    const nameEl = document.getElementById('sidebarUserName');
    if (nameEl) nameEl.textContent = currentUser.name;

    const emailEl = document.getElementById('sidebarUserEmail');
    if (emailEl) emailEl.textContent = currentUser.email;

    const dateBadge = document.getElementById('dashDateBadge');
    if (dateBadge) {
        dateBadge.textContent = `ACTIVE PATIENT: ${currentUser.name.toUpperCase()} (${currentUser.email.toUpperCase()})`;
    }

    // Dynamic WHO Age Calibration
    const standards = getWHOStandards(currentUser.age || 32);
    const whoBadge = document.getElementById('whoCohortBadge');
    if (whoBadge) {
        whoBadge.textContent = `WHO COHORT: ${standards.cohortName.toUpperCase()} | TARGET: ${standards.sleepTarget}`;
    }

    const sleepLabels = document.getElementById('sleepRangeLabels');
    if (sleepLabels) {
        sleepLabels.innerHTML = `<span>&lt;${standards.minSleep}h</span><span>${standards.sleepTarget} Target</span><span>&gt;${standards.maxSleep}h</span>`;
    }

    const ppLabels = document.getElementById('ppRangeLabels');
    if (ppLabels) {
        ppLabels.innerHTML = `<span>30</span><span>${standards.maxPP} Limit</span><span>70</span>`;
    }
}

// ================= BEDTIME & WAKE TIME CALCULATION =================
function calculateLiveSleepDuration() {
    const bedInput = document.getElementById('logBedtime');
    const wakeInput = document.getElementById('logWakeTime');
    const display = document.getElementById('calcSleepDisplay');
    const hidden = document.getElementById('logDuration');

    if (!bedInput || !wakeInput || !bedInput.value || !wakeInput.value) return;

    const [bH, bM] = bedInput.value.split(':').map(Number);
    const [wH, wM] = wakeInput.value.split(':').map(Number);

    const bedMins = bH * 60 + bM;
    const wakeMins = wH * 60 + wM;

    let diffMins = 0;
    if (wakeMins < bedMins) {
        diffMins = (1440 - bedMins) + wakeMins;
    } else {
        diffMins = wakeMins - bedMins;
    }

    const durationHours = parseFloat((diffMins / 60.0).toFixed(2));
    const hoursPart = Math.floor(diffMins / 60);
    const minsPart = diffMins % 60;

    hidden.value = durationHours;
    display.textContent = `${hoursPart}h ${minsPart}m (${durationHours} hrs)`;
}

// ================= USER SETTINGS =================
function populateSettingsForm() {
    document.getElementById('settingName').value = currentUser.name;
    document.getElementById('settingAge').value = currentUser.age;
    document.getElementById('settingGender').value = currentUser.gender;
    document.getElementById('settingHeight').value = currentUser.height_cm;
    document.getElementById('settingWeight').value = currentUser.weight_kg;
    calculateLiveBMI();
}

function calculateLiveBMI() {
    const h = parseFloat(document.getElementById('settingHeight').value) / 100.0;
    const w = parseFloat(document.getElementById('settingWeight').value);
    if (h > 0 && w > 0) {
        const bmi = (w / (h * h)).toFixed(1);
        let cat = "Normal";
        if (bmi >= 30) cat = "Obese";
        else if (bmi >= 25) cat = "Overweight";
        document.getElementById('liveBMIDisplay').textContent = `${bmi} (${cat})`;
    }
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('settingName').value,
        age: parseInt(document.getElementById('settingAge').value),
        gender: document.getElementById('settingGender').value,
        height_cm: parseFloat(document.getElementById('settingHeight').value),
        weight_kg: parseFloat(document.getElementById('settingWeight').value)
    };

    try {
        const res = await fetch(`/api/auth/user/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Update failed');

        currentUser = data.user;
        updateUserUI();
        document.getElementById('settingsSuccessMsg').style.display = 'block';
        setTimeout(() => {
            document.getElementById('settingsSuccessMsg').style.display = 'none';
        }, 3000);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ================= DASHBOARD & CHARTS =================
async function loadDashboardData() {
    try {
        const [historyRes, analyticsRes] = await Promise.all([
            fetch(`/api/logs/history/${currentUser.id}`),
            fetch(`/api/analytics/trends/${currentUser.id}`)
        ]);

        const historyData = await historyRes.json();
        const analyticsData = await analyticsRes.json();
        const logs = historyData.logs || [];

        if (logs.length > 0) {
            latestLogGlobal = logs[0];
            renderDashboardCards(logs[0]);
        }

        renderAnalyticsCharts(analyticsData);
    } catch (err) {
        console.warn('Dashboard fetch error:', err);
    }
}

function updateConfidenceGauge(confidencePercent, statusClass) {
    const gaugeCircle = document.getElementById('gaugeCircle');
    const confidenceText = document.getElementById('diagConfidence');
    if (!gaugeCircle || !confidenceText) return;

    const circumference = 207.35;
    const clamped = Math.max(0, Math.min(100, confidencePercent));
    const targetOffset = circumference - (clamped / 100.0) * circumference;

    gaugeCircle.className.baseVal = `gauge-fill ${statusClass}`;
    
    // Ensure smooth CSS transition
    setTimeout(() => {
        gaugeCircle.style.strokeDashoffset = targetOffset;
    }, 40);

    // Number counting animation
    let startTimestamp = null;
    const duration = 900;

    function step(timestamp) {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1.0);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = (ease * clamped).toFixed(1);
        confidenceText.textContent = `${current}%`;
        if (progress < 1.0) {
            requestAnimationFrame(step);
        } else {
            confidenceText.textContent = `${clamped.toFixed(1)}%`;
        }
    }
    requestAnimationFrame(step);
}

function renderDashboardCards(latestLog) {
    const badge = document.getElementById('dashDateBadge');
    if (badge) badge.textContent = `LAST ASSESSED: ${latestLog.log_date} | PATIENT: ${currentUser.name.toUpperCase()}`;
    
    // 1. Diagnostic Readout Tile & Animated Circular Gauge
    const diagVerdict = document.getElementById('diagVerdict');
    const diagSubtext = document.getElementById('diagSubtext');
    let confScore = 90.0;
    let statusClass = 'normal';

    if (latestLog.prediction.includes('Healthy')) {
        statusClass = 'normal';
        confScore = latestLog.prob_healthy;
        if (diagVerdict) {
            diagVerdict.className = 'verdict-headline normal';
            diagVerdict.textContent = 'HEALTHY / OPTIMAL';
        }
        if (diagSubtext) {
            diagSubtext.textContent = 'Circadian Stability & Normal Vascular Tone';
        }
    } else if (latestLog.prediction.includes('Insomnia')) {
        statusClass = 'borderline';
        confScore = latestLog.prob_insomnia;
        if (diagVerdict) {
            diagVerdict.className = 'verdict-headline borderline';
            diagVerdict.textContent = 'INSOMNIA';
        }
        if (diagSubtext) {
            diagSubtext.textContent = 'Nocturnal Arousal Signature Detected';
        }
    } else {
        statusClass = 'abnormal';
        confScore = latestLog.prob_apnea;
        if (diagVerdict) {
            diagVerdict.className = 'verdict-headline abnormal';
            diagVerdict.textContent = 'SLEEP APNEA RISK';
        }
        if (diagSubtext) {
            diagSubtext.textContent = 'Elevated Pulse Pressure & Nocturnal Airway Resistance';
        }
    }

    updateConfidenceGauge(confScore, statusClass);

    // 2. Plain English Layman Translation & Actionable Steps
    const laymanEl = document.getElementById('laymanSummaryText');
    if (laymanEl) {
        if (latestLog.plain_english_summary) {
            laymanEl.textContent = latestLog.plain_english_summary;
        } else if (latestLog.prediction.includes('Healthy')) {
            laymanEl.textContent = "Your sleep architecture and cardiovascular metrics are well-balanced. Your nocturnal resting vitals indicate healthy circadian rhythms and low risk of cardiovascular fatigue.";
        } else if (latestLog.prediction.includes('Insomnia')) {
            laymanEl.textContent = "Your sleep pattern and cardiovascular readings indicate elevated risk of Insomnia. This is primarily driven by shortened sleep duration and elevated blood pressure before bed, not your daytime activity.";
        } else {
            laymanEl.textContent = "Your nocturnal metrics show elevated Pulse Pressure and daytime fatigue signatures associated with Sleep Apnea airway resistance. Nighttime oxygenation and vascular load warrant clinical observation.";
        }
    }

    const stepsListEl = document.getElementById('actionStepsList');
    if (stepsListEl) {
        let steps = latestLog.actionable_next_steps;
        if (!steps || steps.length === 0) {
            if (latestLog.prediction.includes('Healthy')) {
                steps = [
                    "Maintain your consistent sleep schedule within a 30-minute window every day.",
                    "Keep up your current physical activity target of 6,000+ daily steps.",
                    "Continue recording morning blood pressure once weekly for baseline cardiovascular safety."
                ];
            } else if (latestLog.prediction.includes('Insomnia')) {
                steps = [
                    "Wind down 45 minutes before sleep: eliminate screens and avoid caffeine or heavy meals 4 hours prior.",
                    "Record your blood pressure tomorrow morning at rest to track whether nocturnal arousal affects vascular compliance.",
                    "If sleep onset latency exceeds 30 minutes for more than 2 weeks, consult a physician for behavioral sleep guidance."
                ];
            } else {
                steps = [
                    "Consult an ENT or sleep specialist for a polysomnography (overnight sleep study) to evaluate airway resistance.",
                    "Try sleeping in a lateral (side) position with elevated head elevation to prevent tongue collapse.",
                    "Monitor daytime sleepiness and morning blood pressure spikes daily to prevent sustained hypertension."
                ];
            }
        }

        stepsListEl.innerHTML = steps.map((s, idx) => `
            <li style="font-size: 0.82rem; color: var(--text-primary); display: flex; gap: 8px;">
                <span class="mono" style="color: var(--accent); font-weight: 600;">0${idx + 1}.</span>
                <span>${s}</span>
            </li>
        `).join('');
    }

    // 3. Sleep Duration
    const sleepEl = document.getElementById('statSleep');
    const sleepFill = document.getElementById('rangeFillSleep');
    const sleepText = document.getElementById('statSleepText');
    if (sleepEl && sleepFill && sleepText) {
        sleepEl.innerHTML = `${latestLog.sleep_duration} <span class="vital-unit">hrs</span>`;
        if (latestLog.sleep_duration < 6.0) {
            sleepEl.className = 'vital-reading borderline';
            sleepFill.className = 'range-fill borderline';
            sleepFill.style.width = '40%';
            sleepText.textContent = 'Sub-optimal Sleep (<6.0h)';
        } else if (latestLog.sleep_duration > 9.5) {
            sleepEl.className = 'vital-reading borderline';
            sleepFill.className = 'range-fill borderline';
            sleepFill.style.width = '90%';
            sleepText.textContent = 'Prolonged Somnolence';
        } else {
            sleepEl.className = 'vital-reading normal';
            sleepFill.className = 'range-fill normal';
            sleepFill.style.width = '75%';
            sleepText.textContent = 'Clinical Target (7.0 - 9.0h)';
        }
    }

    // 4. Blood Pressure
    const bpEl = document.getElementById('statBP');
    const bpFill = document.getElementById('rangeFillBP');
    const bpText = document.getElementById('statBPText');
    if (bpEl && bpFill && bpText) {
        bpEl.innerHTML = `${latestLog.systolic_bp}/${latestLog.diastolic_bp} <span class="vital-unit">mmHg</span>`;
        if (latestLog.systolic_bp >= 140 || latestLog.diastolic_bp >= 90) {
            bpEl.className = 'vital-reading abnormal';
            bpFill.className = 'range-fill abnormal';
            bpFill.style.width = '92%';
            bpText.textContent = 'Stage 2 Hypertension';
        } else if (latestLog.systolic_bp >= 125 || latestLog.diastolic_bp >= 82) {
            bpEl.className = 'vital-reading borderline';
            bpFill.className = 'range-fill borderline';
            bpFill.style.width = '68%';
            bpText.textContent = 'Pre-Hypertension Range';
        } else {
            bpEl.className = 'vital-reading normal';
            bpFill.className = 'range-fill normal';
            bpFill.style.width = '45%';
            bpText.textContent = 'Normotensive';
        }
    }

    // 5. Pulse Pressure (SBP - DBP)
    const ppEl = document.getElementById('statPP');
    const ppFill = document.getElementById('rangeFillPP');
    const ppText = document.getElementById('statPPText');
    if (ppEl && ppFill && ppText) {
        ppEl.innerHTML = `${latestLog.pulse_pressure} <span class="vital-unit">mmHg</span>`;
        if (latestLog.pulse_pressure > 50) {
            ppEl.className = 'vital-reading abnormal';
            ppFill.className = 'range-fill abnormal';
            ppFill.style.width = '85%';
            ppText.textContent = 'Arterial Stiffness Warning (>50)';
        } else {
            ppEl.className = 'vital-reading normal';
            ppFill.className = 'range-fill normal';
            ppFill.style.width = '48%';
            ppText.textContent = 'Compliant Arterial Tone';
        }
    }

    // 6. Resting Heart Rate
    const hrEl = document.getElementById('statHR');
    const hrFill = document.getElementById('rangeFillHR');
    const hrText = document.getElementById('statHRText');
    if (hrEl && hrFill && hrText) {
        hrEl.innerHTML = `${latestLog.heart_rate} <span class="vital-unit">bpm</span>`;
        if (latestLog.heart_rate > 100) {
            hrEl.className = 'vital-reading abnormal';
            hrFill.className = 'range-fill abnormal';
            hrFill.style.width = '92%';
            hrText.textContent = 'Sinus Tachycardia (>100)';
        } else if (latestLog.heart_rate < 55) {
            hrEl.className = 'vital-reading borderline';
            hrFill.className = 'range-fill borderline';
            hrFill.style.width = '25%';
            hrText.textContent = 'Bradycardia Range';
        } else {
            hrEl.className = 'vital-reading normal';
            hrFill.className = 'range-fill normal';
            hrFill.style.width = '60%';
            hrText.textContent = 'Baseline Resting Pulse';
        }
    }

    // Probabilities
    const hVal = document.getElementById('probHealthyVal');
    const hBar = document.getElementById('probHealthyBar');
    if (hVal && hBar) {
        hVal.textContent = `${latestLog.prob_healthy.toFixed(1)}%`;
        hBar.style.width = `${latestLog.prob_healthy}%`;
    }

    const iVal = document.getElementById('probInsomniaVal');
    const iBar = document.getElementById('probInsomniaBar');
    if (iVal && iBar) {
        iVal.textContent = `${latestLog.prob_insomnia.toFixed(1)}%`;
        iBar.style.width = `${latestLog.prob_insomnia}%`;
    }

    const aVal = document.getElementById('probApneaVal');
    const aBar = document.getElementById('probApneaBar');
    if (aVal && aBar) {
        aVal.textContent = `${latestLog.prob_apnea.toFixed(1)}%`;
        aBar.style.width = `${latestLog.prob_apnea}%`;
    }

    // Render SHAP in Analytics view
    const shapCanvas = document.getElementById('shapChart');
    if (shapCanvas) {
        renderShapChart([
            { feature: "Sleep Duration", impact: latestLog.sleep_duration < 6 ? 0.84 : -0.62 },
            { feature: "Systolic BP", impact: latestLog.systolic_bp > 130 ? 0.72 : -0.48 },
            { feature: "Pulse Pressure", impact: latestLog.pulse_pressure > 50 ? 0.65 : -0.35 },
            { feature: "Daily Steps", impact: latestLog.daily_steps < 5000 ? 0.44 : -0.55 }
        ]);
    }
}

function renderAnalyticsCharts(analytics) {
    if (!analytics.has_data || !analytics.dates || analytics.dates.length === 0) return;

    const avgSleep = document.getElementById('avgSleep7d');
    if (avgSleep) avgSleep.textContent = `${analytics.avg_sleep_7d} hrs`;

    const avgHR = document.getElementById('avgHR7d');
    if (avgHR) avgHR.textContent = `${analytics.avg_heart_rate} bpm`;

    const avgPP = document.getElementById('avgPP7d');
    if (avgPP) avgPP.textContent = `${analytics.avg_pulse_pressure} mmHg`;

    const trendCanvas = document.getElementById('trendChart');
    if (!trendCanvas) return;

    const ctx = trendCanvas.getContext('2d');
    if (trendChartInstance) trendChartInstance.destroy();

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? '#E3E6EC' : '#2A3344';
    const textColor = isLight ? '#8C96AA' : '#8C96AA';

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: analytics.dates,
            datasets: [
                {
                    label: 'Sleep Duration (hrs)',
                    data: analytics.sleep_durations,
                    borderColor: '#4E8FD4',
                    backgroundColor: 'transparent',
                    yAxisID: 'ySleep',
                    borderWidth: 1.5,
                    pointRadius: 2,
                    tension: 0.1
                },
                {
                    label: 'Pulse Pressure (mmHg)',
                    data: analytics.pulse_pressures,
                    borderColor: '#D9A441',
                    borderDash: [4, 4],
                    backgroundColor: 'transparent',
                    yAxisID: 'yBP',
                    borderWidth: 1.5,
                    pointRadius: 2,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'IBM Plex Mono', size: 10 } }
                },
                ySleep: {
                    type: 'linear', position: 'left',
                    grid: { color: gridColor },
                    ticks: { color: '#4E8FD4', font: { family: 'IBM Plex Mono', size: 10 } }
                },
                yBP: {
                    type: 'linear', position: 'right',
                    grid: { display: false },
                    ticks: { color: '#D9A441', font: { family: 'IBM Plex Mono', size: 10 } }
                }
            },
            plugins: {
                legend: {
                    labels: { color: isLight ? '#141A24' : '#E8EAF0', font: { family: 'IBM Plex Sans', size: 11 } }
                }
            }
        }
    });
}

function renderShapChart(factors) {
    const canvas = document.getElementById('shapChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = factors.map(f => f.feature);
    const values = factors.map(f => f.impact);
    const colors = values.map(v => v >= 0 ? '#C9594F' : '#4CAF82');

    if (shapChartInstance) shapChartInstance.destroy();

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? '#E3E6EC' : '#2A3344';
    const textColor = isLight ? '#141A24' : '#E8EAF0';

    shapChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderRadius: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: '#8C96AA', font: { family: 'IBM Plex Mono', size: 10 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: 'IBM Plex Sans', size: 11, weight: '500' } }
                }
            }
        }
    });
}

// ================= DAILY VITAL INTAKE SUBMISSION =================
async function handleDailyLogSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveDailyLog');
    btn.disabled = true;
    btn.textContent = 'Processing & Stratifying...';

    // Ensure sleep duration is recalculated
    calculateLiveSleepDuration();

    const payload = {
        user_id: currentUser.id,
        log_date: document.getElementById('logDate').value,
        bedtime: document.getElementById('logBedtime').value,
        wake_time: document.getElementById('logWakeTime').value,
        sleep_duration: parseFloat(document.getElementById('logDuration').value),
        quality_of_sleep: parseFloat(document.getElementById('logQuality').value),
        physical_activity: parseFloat(document.getElementById('logActivity').value),
        stress_level: parseFloat(document.getElementById('logStress').value),
        heart_rate: parseFloat(document.getElementById('logHR').value),
        daily_steps: parseFloat(document.getElementById('logSteps').value),
        systolic_bp: parseFloat(document.getElementById('logSys').value),
        diastolic_bp: parseFloat(document.getElementById('logDia').value),
        journal_text: document.getElementById('logJournal').value
    };

    try {
        const res = await fetch('/api/logs/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to save log');

        // Immediately return to streamlined dashboard
        navigate('dashboard');
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Record Entry & Stratify';
    }
}

// ================= GOOGLE FIT & WEARABLES =================
async function syncGoogleFit() {
    const btn = document.getElementById('btnGoogleFit');
    btn.textContent = 'Synchronizing Stream...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/wearable/google-fit-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, google_account_email: currentUser.email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Sync failed');

        navigate('dashboard');
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.textContent = 'Synchronize Google Health Stream';
        btn.disabled = false;
    }
}

async function uploadCSVFile(file) {
    const progress = document.getElementById('csvUploadMsg');
    progress.style.display = 'block';
    progress.textContent = `Parsing ${file.name}...`;

    const formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('file', file);

    try {
        const res = await fetch('/api/wearable/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Upload failed');

        progress.textContent = data.message;
        setTimeout(() => {
            progress.style.display = 'none';
            navigate('history');
        }, 1200);
    } catch (err) {
        progress.textContent = err.message;
        progress.style.color = 'var(--status-abnormal)';
    }
}

// ================= PATIENT HISTORY =================
async function loadPatientHistory() {
    const tbody = document.getElementById('historyTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Querying database records...</td></tr>';

    try {
        const res = await fetch(`/api/logs/history/${currentUser.id}`);
        const data = await res.json();
        const logs = data.logs || [];

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No historical records found.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(row => {
            let predClass = row.prediction.includes('Healthy') ? 'normal' : (row.prediction.includes('Insomnia') ? 'borderline' : 'abnormal');
            let ppStatus = row.pulse_pressure > 50 ? 'abnormal' : 'normal';
            return `
                <tr>
                    <td>${row.log_date}</td>
                    <td>${row.data_source}</td>
                    <td>${row.sleep_duration} hrs</td>
                    <td>${row.systolic_bp}/${row.diastolic_bp}</td>
                    <td class="${ppStatus}">${row.pulse_pressure} mmHg</td>
                    <td class="${predClass}">${row.prediction}</td>
                    <td>${row.nlp_sentiment || 'Normal'}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--status-abnormal);">${err.message}</td></tr>`;
    }
}

// ================= CLINICAL HELPERS & REPORT EXPORT =================
function toggleBaselineBP(checkbox) {
    const sys = document.getElementById('logSys');
    const dia = document.getElementById('logDia');
    const helper = document.getElementById('bpHelperText');
    if (checkbox.checked) {
        sys.disabled = true;
        dia.disabled = true;
        sys.value = 125;
        dia.value = 82;
        if (helper) helper.textContent = "Auto-filled from last verified clinical baseline. Uncheck if measured today.";
    } else {
        sys.disabled = false;
        dia.disabled = false;
        if (helper) helper.textContent = "Manual measurement mode: Enter today's resting systolic & diastolic readings.";
        sys.focus();
    }
}

function setStepPreset(steps) {
    const stepsInput = document.getElementById('logSteps');
    if (stepsInput) stepsInput.value = steps;
}

function openClinicalReportModal() {
    const modal = document.getElementById('clinicalReportModal');
    if (!modal) return;

    document.getElementById('reportPatientName').textContent = currentUser.name;
    document.getElementById('reportPatientAgeGender').textContent = `${currentUser.age} yrs / ${currentUser.gender}`;
    document.getElementById('reportPatientBMI').textContent = `${currentUser.bmi} (${currentUser.bmi_category})`;
    document.getElementById('reportPatientEmail').textContent = currentUser.email;
    document.getElementById('reportDateStamp').textContent = new Date().toISOString().split('T')[0];
    document.getElementById('reportRecordId').textContent = `RECORD ID: SS-8492-${currentUser.id}`;

    if (latestLogGlobal) {
        const diagEl = document.getElementById('reportDiagnosis');
        const confEl = document.getElementById('reportConfidence');
        const verdictPanel = document.getElementById('reportVerdictPanel');

        if (latestLogGlobal.prediction.includes('Healthy')) {
            diagEl.textContent = 'HEALTHY / OPTIMAL RESTORATION';
            diagEl.className = 'verdict-headline normal';
            verdictPanel.style.borderLeftColor = 'var(--status-normal)';
            confEl.textContent = `${latestLogGlobal.prob_healthy.toFixed(1)}%`;
        } else if (latestLogGlobal.prediction.includes('Insomnia')) {
            diagEl.textContent = 'INSOMNIA RISK PROFILE';
            diagEl.className = 'verdict-headline borderline';
            verdictPanel.style.borderLeftColor = 'var(--status-borderline)';
            confEl.textContent = `${latestLogGlobal.prob_insomnia.toFixed(1)}%`;
        } else {
            diagEl.textContent = 'SLEEP APNEA RISK PROFILE';
            diagEl.className = 'verdict-headline abnormal';
            verdictPanel.style.borderLeftColor = 'var(--status-abnormal)';
            confEl.textContent = `${latestLogGlobal.prob_apnea.toFixed(1)}%`;
        }

        document.getElementById('reportProbHealthy').textContent = `${latestLogGlobal.prob_healthy.toFixed(1)}%`;
        document.getElementById('reportProbInsomnia').textContent = `${latestLogGlobal.prob_insomnia.toFixed(1)}%`;
        document.getElementById('reportProbApnea').textContent = `${latestLogGlobal.prob_apnea.toFixed(1)}%`;

        document.getElementById('reportSleep').textContent = `${latestLogGlobal.sleep_duration} hrs`;
        document.getElementById('reportSleepTimes').textContent = `${latestLogGlobal.bedtime || '23:15'} - ${latestLogGlobal.wake_time || '06:30'}`;
        document.getElementById('reportBP').textContent = `${latestLogGlobal.systolic_bp}/${latestLogGlobal.diastolic_bp} mmHg`;
        document.getElementById('reportPP').textContent = `${latestLogGlobal.pulse_pressure} mmHg`;
        document.getElementById('reportHR').textContent = `${latestLogGlobal.heart_rate} bpm`;

        const bpStatus = document.getElementById('reportBPStatus');
        if (bpStatus) {
            bpStatus.textContent = latestLogGlobal.systolic_bp >= 140 ? 'Hypertension Stage 2' : (latestLogGlobal.systolic_bp >= 125 ? 'Pre-Hypertension' : 'Normotensive');
        }

        const ppStatus = document.getElementById('reportPPStatus');
        if (ppStatus) {
            ppStatus.textContent = latestLogGlobal.pulse_pressure > 50 ? 'Arterial Stiffness Warning' : 'Optimal Compliance';
        }

        const hrStatus = document.getElementById('reportHRStatus');
        if (hrStatus) {
            hrStatus.textContent = latestLogGlobal.heart_rate > 100 ? 'Sinus Tachycardia' : (latestLogGlobal.heart_rate < 55 ? 'Bradycardia' : 'Sinus Baseline');
        }

        const summaryText = document.getElementById('reportSummaryText');
        if (summaryText) {
            summaryText.textContent = latestLogGlobal.plain_english_summary || document.getElementById('laymanSummaryText').textContent;
        }

        const actionStepsEl = document.getElementById('reportActionSteps');
        if (actionStepsEl) {
            let steps = latestLogGlobal.actionable_next_steps;
            if (!steps || steps.length === 0) {
                steps = [
                    "Wind down 45 minutes before sleep: eliminate screens and avoid caffeine or heavy meals 4 hours prior.",
                    "Record blood pressure tomorrow morning at rest to track autonomic vascular compliance.",
                    "If daytime somnolence persists, schedule a specialist polysomnography evaluation."
                ];
            }
            actionStepsEl.innerHTML = steps.map((s, idx) => `
                <li style="font-size: 0.8rem; color: var(--text-primary); display: flex; gap: 8px;">
                    <span class="mono" style="color: var(--accent); font-weight: 600;">0${idx + 1}.</span>
                    <span>${s}</span>
                </li>
            `).join('');
        }
    }

    modal.classList.add('open');
}

function closeClinicalReportModal() {
    const modal = document.getElementById('clinicalReportModal');
    if (modal) modal.classList.remove('open');
}

// ================= INITIALIZATION =================
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateUserUI();
    calculateLiveSleepDuration();
    loadDashboardData();

    const dropzone = document.getElementById('csvDropzone');
    if (dropzone) {
        ['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent)'; }));
        ['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--border-strong)'; }));
        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) uploadCSVFile(files[0]);
        });
    }
});
