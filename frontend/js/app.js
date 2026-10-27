// Global State
let currentUser = {
    id: 1,
    name: "Rohit Patil",
    email: "rohit@somnosense.org",
    age: 32,
    gender: "Male",
    height_cm: 175,
    weight_kg: 78,
    bmi: 25.5,
    bmi_category: "Overweight"
};

let shapChartInstance = null;
let trendChartInstance = null;

// ================= THEME CONTROLLER =================
function initTheme() {
    // Default to dark per user specification, toggleable to light
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
        document.documentElement.removeAttribute('data-theme'); // default is dark in :root
    }
    localStorage.setItem('somnosense-theme', theme);
    
    // Update theme toggle buttons (NO EMOJIS)
    document.querySelectorAll('#themeLabel').forEach(el => {
        el.textContent = theme === 'light' ? 'Dark' : 'Light';
    });

    if (trendChartInstance) loadDashboardData();
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
    } else if (pageId === 'history') {
        loadPatientHistory();
    } else if (pageId === 'settings') {
        populateSettingsForm();
    }
}

// ================= AUTHENTICATION & MODAL =================
function openAuthModal() {
    document.getElementById('authModal').classList.add('open');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('open');
}

function switchAuthTab(tab) {
    if (tab === 'login') {
        document.getElementById('tabLoginBtn').style.fontWeight = '600';
        document.getElementById('tabLoginBtn').style.color = 'var(--text-primary)';
        document.getElementById('tabRegisterBtn').style.fontWeight = '400';
        document.getElementById('tabRegisterBtn').style.color = 'var(--text-secondary)';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    } else {
        document.getElementById('tabRegisterBtn').style.fontWeight = '600';
        document.getElementById('tabRegisterBtn').style.color = 'var(--text-primary)';
        document.getElementById('tabLoginBtn').style.fontWeight = '400';
        document.getElementById('tabLoginBtn').style.color = 'var(--text-secondary)';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('loginForm').style.display = 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Authentication failed');

        currentUser = data.user;
        updateUserUI();
        closeAuthModal();
        navigate('dashboard');
    } catch (err) {
        alert('Authentication error: ' + err.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPass').value,
        age: parseInt(document.getElementById('regAge').value),
        gender: document.getElementById('regGender').value,
        height_cm: parseFloat(document.getElementById('regHeight').value),
        weight_kg: parseFloat(document.getElementById('regWeight').value)
    };

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');

        currentUser = data.user;
        updateUserUI();
        closeAuthModal();
        navigate('dashboard');
    } catch (err) {
        alert('Registration error: ' + err.message);
    }
}

function updateUserUI() {
    document.getElementById('sidebarUserName').textContent = currentUser.name;
    document.getElementById('sidebarUserBMI').textContent = `BMI ${currentUser.bmi} (${currentUser.bmi_category})`;
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
            renderDashboardCards(logs[0]);
        }

        renderAnalyticsCharts(analyticsData);
    } catch (err) {
        console.warn('Dashboard fetch error:', err);
    }
}

function renderDashboardCards(latestLog) {
    document.getElementById('dashDateBadge').textContent = `LAST ASSESSED: ${latestLog.log_date}`;
    
    // 1. Sleep Duration
    const sleepEl = document.getElementById('statSleep');
    const sleepFill = document.getElementById('rangeFillSleep');
    const sleepText = document.getElementById('statSleepText');
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

    // 2. Blood Pressure
    const bpEl = document.getElementById('statBP');
    const bpFill = document.getElementById('rangeFillBP');
    const bpText = document.getElementById('statBPText');
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

    // 3. Pulse Pressure (SBP - DBP)
    const ppEl = document.getElementById('statPP');
    const ppFill = document.getElementById('rangeFillPP');
    const ppText = document.getElementById('statPPText');
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
        ppText.textContent = 'Optimal Arterial Compliance';
    }

    // 4. Resting Heart Rate
    const hrEl = document.getElementById('statHR');
    const hrFill = document.getElementById('rangeFillHR');
    const hrText = document.getElementById('statHRText');
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

    // Diagnostic Readout Tile (Reduced from oversized banner to match vital visual weight)
    const diagVerdict = document.getElementById('diagVerdict');
    const diagConfidence = document.getElementById('diagConfidence');
    
    if (latestLog.prediction.includes('Healthy')) {
        diagVerdict.className = 'verdict-headline normal';
        diagVerdict.textContent = 'HEALTHY / OPTIMAL';
        diagConfidence.textContent = `${latestLog.prob_healthy.toFixed(1)}%`;
    } else if (latestLog.prediction.includes('Insomnia')) {
        diagVerdict.className = 'verdict-headline borderline';
        diagVerdict.textContent = 'INSOMNIA';
        diagConfidence.textContent = `${latestLog.prob_insomnia.toFixed(1)}%`;
    } else {
        diagVerdict.className = 'verdict-headline abnormal';
        diagVerdict.textContent = 'SLEEP APNEA RISK';
        diagConfidence.textContent = `${latestLog.prob_apnea.toFixed(1)}%`;
    }

    // Probabilities
    document.getElementById('probHealthyVal').textContent = `${latestLog.prob_healthy.toFixed(1)}%`;
    document.getElementById('probHealthyBar').style.width = `${latestLog.prob_healthy}%`;

    document.getElementById('probInsomniaVal').textContent = `${latestLog.prob_insomnia.toFixed(1)}%`;
    document.getElementById('probInsomniaBar').style.width = `${latestLog.prob_insomnia}%`;

    document.getElementById('probApneaVal').textContent = `${latestLog.prob_apnea.toFixed(1)}%`;
    document.getElementById('probApneaBar').style.width = `${latestLog.prob_apnea}%`;

    // NLP Journal
    const nlpBox = document.getElementById('dashNlpBox');
    if (latestLog.journal_text && latestLog.journal_text.length > 2) {
        nlpBox.style.display = 'block';
        document.getElementById('dashNlpText').textContent = `"${latestLog.journal_text}"`;
        document.getElementById('dashNlpTag').textContent = latestLog.nlp_sentiment ? latestLog.nlp_sentiment.toUpperCase() : 'NORMAL';
        document.getElementById('dashNlpUrgency').textContent = latestLog.nlp_symptoms || 'Clinical Journal Logged';
    } else {
        nlpBox.style.display = 'none';
    }

    // Render SHAP
    renderShapChart([
        { feature: "Sleep Duration", impact: latestLog.sleep_duration < 6 ? 0.84 : -0.62 },
        { feature: "Systolic BP", impact: latestLog.systolic_bp > 130 ? 0.72 : -0.48 },
        { feature: "Daily Steps", impact: latestLog.daily_steps < 5000 ? 0.44 : -0.55 }
    ]);
}

function renderAnalyticsCharts(analytics) {
    if (!analytics.has_data || analytics.dates.length === 0) return;

    document.getElementById('avgSleep7d').textContent = `${analytics.avg_sleep_7d} hrs`;
    document.getElementById('avgHR7d').textContent = `${analytics.avg_heart_rate} bpm`;
    document.getElementById('avgPP7d').textContent = `${analytics.avg_pulse_pressure} mmHg`;

    const ctx = document.getElementById('trendChart').getContext('2d');
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
                    borderColor: '#4E8FD4', // functional accent only
                    backgroundColor: 'transparent',
                    yAxisID: 'ySleep',
                    borderWidth: 1.5,
                    pointRadius: 2,
                    tension: 0.1
                },
                {
                    label: 'Pulse Pressure (mmHg)',
                    data: analytics.pulse_pressures,
                    borderColor: '#D9A441', // borderline amber
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
    const ctx = document.getElementById('shapChart').getContext('2d');
    const labels = factors.map(f => f.feature);
    const values = factors.map(f => f.impact);
    // Only in-range green #4CAF82 or abnormal red #C9594F
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

// ================= DAILY LOG =================
async function handleDailyLogSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveDailyLog');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const payload = {
        user_id: currentUser.id,
        log_date: document.getElementById('logDate').value,
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

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateUserUI();
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
