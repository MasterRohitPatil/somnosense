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

// ================= NAVIGATION CONTROLLER =================
function navigate(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item button').forEach(b => b.classList.remove('active'));

    const activeBtn = document.getElementById(`navBtn_${pageId}`);
    if (activeBtn) activeBtn.classList.add('active');

    const targetView = document.getElementById(`view_${pageId}`);
    if (targetView) targetView.classList.add('active');

    // Action per page
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
        document.getElementById('tabLoginBtn').classList.add('active');
        document.getElementById('tabRegisterBtn').classList.remove('active');
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    } else {
        document.getElementById('tabRegisterBtn').classList.add('active');
        document.getElementById('tabLoginBtn').classList.remove('active');
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
        if (!res.ok) throw new Error(data.detail || 'Login failed');

        currentUser = data.user;
        updateUserUI();
        closeAuthModal();
        navigate('dashboard');
    } catch (err) {
        alert('Sign in error: ' + err.message);
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
        alert(`Account created for ${currentUser.name}! Calculated BMI: ${currentUser.bmi} (${currentUser.bmi_category}).`);
    } catch (err) {
        alert('Registration error: ' + err.message);
    }
}

function updateUserUI() {
    document.getElementById('sidebarUserName').textContent = currentUser.name;
    document.getElementById('sidebarUserBMI').textContent = `BMI: ${currentUser.bmi} · ${currentUser.bmi_category}`;
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('sidebarAvatar').textContent = initials;
}

// ================= USER SETTINGS & LIVE BMI RECALCULATION =================
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
        if (!res.ok) throw new Error(data.detail || 'Failed to update settings');

        currentUser = data.user;
        updateUserUI();
        document.getElementById('settingsSuccessMsg').style.display = 'block';
        setTimeout(() => {
            document.getElementById('settingsSuccessMsg').style.display = 'none';
        }, 3000);
    } catch (err) {
        alert('Error updating settings: ' + err.message);
    }
}

// ================= DASHBOARD & CHARTS =================
async function loadDashboardData() {
    try {
        // Fetch latest logs and analytics
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
    document.getElementById('dashDateBadge').textContent = `Last Assessment: ${latestLog.log_date}`;
    document.getElementById('statSleep').innerHTML = `${latestLog.sleep_duration} <span style="font-size: 0.8rem; color: var(--text-muted);">hrs</span>`;
    document.getElementById('statBP').textContent = `${latestLog.systolic_bp}/${latestLog.diastolic_bp}`;
    document.getElementById('statPP').innerHTML = `${latestLog.pulse_pressure} <span style="font-size: 0.8rem; color: var(--text-muted);">mmHg</span>`;
    document.getElementById('statHR').innerHTML = `${latestLog.heart_rate} <span style="font-size: 0.8rem; color: var(--text-muted);">bpm</span>`;

    // PP Alert Status
    const ppEl = document.getElementById('statPPStatus');
    if (latestLog.pulse_pressure > 50) {
        ppEl.style.color = 'var(--status-apnea)';
        ppEl.textContent = '⚠️ Elevated Arterial Stiffness Risk';
    } else {
        ppEl.style.color = 'var(--status-healthy)';
        ppEl.textContent = '● Compliant Arterial Tone';
    }

    // Verdict Banner
    const banner = document.getElementById('diagBanner');
    const title = document.getElementById('diagTitle');
    const prob = document.getElementById('diagProb');

    banner.className = 'diagnosis-banner';
    if (latestLog.prediction.includes('Healthy')) {
        banner.classList.add('healthy');
        title.textContent = 'HEALTHY / OPTIMAL';
        prob.textContent = latestLog.prob_healthy.toFixed(1) + '%';
    } else if (latestLog.prediction.includes('Insomnia')) {
        banner.classList.add('insomnia');
        title.textContent = 'INSOMNIA';
        prob.textContent = latestLog.prob_insomnia.toFixed(1) + '%';
    } else {
        banner.classList.add('apnea');
        title.textContent = 'SLEEP APNEA RISK';
        prob.textContent = latestLog.prob_apnea.toFixed(1) + '%';
    }

    // Probabilities
    document.getElementById('probHealthyVal').textContent = latestLog.prob_healthy.toFixed(1) + '%';
    document.getElementById('probHealthyBar').style.width = latestLog.prob_healthy + '%';

    document.getElementById('probInsomniaVal').textContent = latestLog.prob_insomnia.toFixed(1) + '%';
    document.getElementById('probInsomniaBar').style.width = latestLog.prob_insomnia + '%';

    document.getElementById('probApneaVal').textContent = latestLog.prob_apnea.toFixed(1) + '%';
    document.getElementById('probApneaBar').style.width = latestLog.prob_apnea + '%';

    // NLP Journal display
    const nlpBox = document.getElementById('dashNlpBox');
    if (latestLog.journal_text && latestLog.journal_text.length > 2) {
        nlpBox.style.display = 'block';
        document.getElementById('dashNlpText').textContent = `"${latestLog.journal_text}"`;
        document.getElementById('dashNlpTag').textContent = latestLog.nlp_sentiment || 'Normal';
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

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: analytics.dates,
            datasets: [
                {
                    label: 'Sleep Duration (hrs)',
                    data: analytics.sleep_durations,
                    borderColor: '#38BDF8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    yAxisID: 'ySleep',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Pulse Pressure (mmHg)',
                    data: analytics.pulse_pressures,
                    borderColor: '#F59E0B',
                    borderDash: [5, 5],
                    yAxisID: 'yBP',
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748B' } },
                ySleep: {
                    type: 'linear', position: 'left',
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#38BDF8' },
                    title: { display: true, text: 'Sleep Hours', color: '#38BDF8' }
                },
                yBP: {
                    type: 'linear', position: 'right',
                    grid: { display: false },
                    ticks: { color: '#F59E0B' },
                    title: { display: true, text: 'Pulse Pressure', color: '#F59E0B' }
                }
            },
            plugins: {
                legend: { labels: { color: '#F8FAFC' } }
            }
        }
    });
}

function renderShapChart(factors) {
    const ctx = document.getElementById('shapChart').getContext('2d');
    const labels = factors.map(f => f.feature);
    const values = factors.map(f => f.impact);
    const colors = values.map(v => v >= 0 ? '#EF4444' : '#10B981');

    if (shapChartInstance) shapChartInstance.destroy();

    shapChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748B' } },
                y: { grid: { display: false }, ticks: { color: '#F8FAFC', font: { weight: '600' } } }
            }
        }
    });
}

// ================= DAILY LOG SUBMIT =================
async function handleDailyLogSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveDailyLog');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Processing...';

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
        alert('Error saving log: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>💾</span> Save Daily Entry & Stratify Risk';
    }
}

// ================= GOOGLE FIT & WEARABLES =================
async function syncGoogleFit() {
    const btn = document.getElementById('btnGoogleFit');
    btn.innerHTML = '<span>⏳</span> Connecting to Google Health Connect...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/wearable/google-fit-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, google_account_email: currentUser.email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Sync failed');

        alert(`✅ ${data.message}\nDiagnosis computed: ${data.diagnosis.prediction} (${data.diagnosis.risk_probabilities.Sleep_Apnea}% Apnea Risk).`);
        navigate('dashboard');
    } catch (err) {
        alert('Google Fit Sync Error: ' + err.message);
    } finally {
        btn.innerHTML = '<span>⚡</span> Connect & Sync Google Health';
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

        progress.textContent = `✅ ${data.message}`;
        setTimeout(() => {
            progress.style.display = 'none';
            navigate('history');
        }, 1500);
    } catch (err) {
        progress.textContent = `❌ ${err.message}`;
        progress.style.color = 'var(--status-apnea)';
    }
}

// ================= PATIENT HISTORY =================
async function loadPatientHistory() {
    const tbody = document.getElementById('historyTbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Fetching records...</td></tr>';

    try {
        const res = await fetch(`/api/logs/history/${currentUser.id}`);
        const data = await res.json();
        const logs = data.logs || [];

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No entries recorded. Add a manual log or sync wearable data!</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(row => {
            let predColor = row.prediction.includes('Healthy') ? 'var(--status-healthy)' : (row.prediction.includes('Insomnia') ? 'var(--status-insomnia)' : 'var(--status-apnea)');
            let ppAlert = row.pulse_pressure > 50 ? `<span style="color: var(--status-apnea); font-weight: bold;">${row.pulse_pressure} (Stiffness Alert)</span>` : `${row.pulse_pressure} mmHg`;
            return `
                <tr>
                    <td><strong>${row.log_date}</strong></td>
                    <td><span style="font-size: 0.75rem; background: var(--bg-surface-elevated); padding: 2px 8px; border-radius: 4px;">${row.data_source}</span></td>
                    <td>${row.sleep_duration} hrs</td>
                    <td>${row.systolic_bp}/${row.diastolic_bp}</td>
                    <td>${ppAlert}</td>
                    <td><span style="color: ${predColor}; font-weight: 700;">● ${row.prediction}</span></td>
                    <td><span style="font-size: 0.75rem; color: var(--text-muted);">${row.nlp_sentiment || 'Normal'}</span></td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--status-apnea);">Failed to load history: ${err.message}</td></tr>`;
    }
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    updateUserUI();
    loadDashboardData();

    // Drag and Drop listeners
    const dropzone = document.getElementById('csvDropzone');
    if (dropzone) {
        ['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--brand-primary)'; }));
        ['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--border-subtle)'; }));
        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) uploadCSVFile(files[0]);
        });
    }
});
