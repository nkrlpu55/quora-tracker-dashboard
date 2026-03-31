import { auth, db, signOut, collection, query, where, getDoc, getDocs, doc, onSnapshot, orderBy, addDoc, updateDoc, Timestamp, increment } from "./firebase-config.js";
import { calculateWorkingMinutes, resolveScore, checkAndApplyMissedPenalties } from "./utils.js";

let userData = null;
let tasks = [];
let submissions = [];
let currentFilter = 'all';

// Initialize
const userId = localStorage.getItem("trackerUserId");
if (!userId) window.location.href = "index.html";

async function init() {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (!snap.exists() || snap.data().role !== "user") return window.location.href = "index.html";

    userData = { id: snap.id, ...snap.data() };
    document.getElementById("s-role-name").textContent = userData.name;
    document.getElementById("s-role-name-act").textContent = userData.name;
    
    checkAndApplyMissedPenalties();
    setupListeners();
}
init();

// Global Logic
window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId + '-page').classList.add('active');
    document.querySelectorAll('.s-nav-link').forEach(l => l.classList.remove('active'));
    event.currentTarget.classList.add('active');
};

window.logout = function() {
    signOut(auth).then(() => {
        localStorage.removeItem("trackerUserId");
        window.location.href = "index.html";
    });
};

function showToast(msg, type = 'ok') {
    const toast = document.getElementById('toast');
    toast.className = `toast show ${type}`;
    document.getElementById('toast-msg').textContent = msg;
    document.getElementById('toast-icon').innerHTML = type === 'ok' 
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Data listening
function setupListeners() {
    onSnapshot(query(collection(db, "tasks"), where("assignedTo", "==", userId)), (snapshot) => {
        tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        tasks.sort((a, b) => (b.assignedAt ? b.assignedAt.toMillis() : 0) - (a.assignedAt ? a.assignedAt.toMillis() : 0));
        renderDash();
    }, (error) => showToast("Database error: " + error.message, "err"));

    onSnapshot(query(collection(db, "submissions"), where("userId", "==", userId)), (snapshot) => {
        submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        submissions.sort((a, b) => (b.submittedAt ? b.submittedAt.toMillis() : 0) - (a.submittedAt ? a.submittedAt.toMillis() : 0));
        renderDash();
        updateCharts();
    }, (error) => showToast("Database error: " + error.message, "err"));
}

// Rendering Dash
function renderDash() {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === "pending").length;
    const missed = tasks.filter(t => t.status === "missed").length;
    
    const mySubmissions = submissions.filter(s => s.userId === userData.id);
    const totalScore = mySubmissions.reduce((sum, s) => sum + (s.scoreDelta || 0), 0);
    const avgScore = mySubmissions.length > 0 ? totalScore / mySubmissions.length : 0;
    const eff = Math.max(0, Math.min(100, 50 + avgScore * 10));

    document.getElementById("kpi-total").textContent = total || "0";
    document.getElementById("kpi-pending").textContent = pending || "0";
    document.getElementById("kpi-score").textContent = totalScore || "0";
    document.getElementById("kpi-missed").textContent = missed || "0";
    document.getElementById("kpi-eff").textContent = eff.toFixed(0) + "% reputation";
    
    // Act page chips
    if(document.getElementById("act-chip-total")) document.getElementById("act-chip-total").textContent = total;
    if(document.getElementById("act-chip-sub")) document.getElementById("act-chip-sub").textContent = totalScore;

    renderTable();
}

window.submitTask = async function(taskId) {
    const input = document.getElementById(`link-${taskId}`);
    const liveLink = input.value.trim();
    if(!liveLink) return showToast("Target link required.", "err");
    
    const task = tasks.find(t => t.id === taskId);
    if (task.status === "missed" || task.status === "submitted") return showToast("Dossier locked.", "err");
    
    document.getElementById(`btn-${taskId}`).innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
    document.getElementById(`btn-${taskId}`).disabled = true;

    try {
        const submittedAt = Timestamp.now();
        const workingMinutes = calculateWorkingMinutes(task.assignedAt.toDate(), submittedAt.toDate());
        const scoreDelta = resolveScore(workingMinutes);

        await addDoc(collection(db, "submissions"), {
            taskId, userId: userData.id, answerLink: liveLink, submittedAt, workingMinutes, scoreDelta
        });

        await updateDoc(doc(db, "tasks", taskId), { status: "submitted" });
        await updateDoc(doc(db, "users", userData.id), { score: increment(scoreDelta) });
        showToast("Intelligence submitted successfully.");
    } catch (error) {
        showToast("Error: " + error.message, "err");
        document.getElementById(`btn-${taskId}`).innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
        document.getElementById(`btn-${taskId}`).disabled = false;
    }
}

function renderTable() {
    const tbody = document.getElementById("task-tbody");
    const actTbody = document.getElementById("act-task-tbody");
    tbody.innerHTML = "";
    actTbody.innerHTML = "";
    
    let filtered = tasks;
    if(currentFilter !== 'all') filtered = tasks.filter(t => t.status === currentFilter);
    document.getElementById("task-count").textContent = filtered.length + " entries";
    document.getElementById("act-task-count").textContent = tasks.length + " entries";

    const generateRow = (t, forActPage = false) => {
        const dateOpt = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const assigned = t.assignedAt ? t.assignedAt.toDate().toLocaleString('en-US', dateOpt) : "—";
        const due = t.dueAt ? t.dueAt.toDate().toLocaleString('en-US', dateOpt) : "—";
        
        let subDate = "—"; let score = "—";
        if(t.status === "submitted") {
            const sub = submissions.find(s => s.taskId === t.id);
            if(sub) {
                subDate = sub.submittedAt ? sub.submittedAt.toDate().toLocaleString('en-US', dateOpt) : "—";
                score = `<span class="cell-score" style="color:var(--green)">${sub.scoreDelta > 0 ? '+'+sub.scoreDelta : sub.scoreDelta}</span>`;
            }
        } else if (t.status === "missed") {
            score = `<span class="cell-dash" style="color:var(--red)">-5</span>`;
        }

        let statusHTML = "";
        if(t.status === "submitted") statusHTML = `<div class="pill pill-green"><div class="pill-dot"></div>Submitted</div>`;
        else if(t.status === "missed") statusHTML = `<div class="pill pill-red"><div class="pill-dot"></div>Missed</div>`;
        else statusHTML = `<div class="pill pill-amber"><div class="pill-dot"></div>Pending</div>`;

        let actionHTML = "—";
        if (t.status === "pending") {
            actionHTML = `
                <div class="inline-row">
                    <input type="text" id="link-${t.id}" class="inline-url-input" placeholder="Paste link...">
                    <button class="inline-submit-btn" id="btn-${t.id}" onclick="submitTask('${t.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                </div>
            `;
        } else if (t.status === "submitted") {
             const sub = submissions.find(s => s.taskId === t.id);
             if(sub && sub.answerLink) actionHTML = `<a href="${sub.answerLink}" target="_blank" class="cell-link text-indigo-400">View Intel</a>`;
        }

        if(forActPage) {
            return `
            <tr>
                <td>${statusHTML}</td>
                <td>
                    <a href="${t.questionLink}" target="_blank" class="cell-link">${t.questionLink}</a>
                    ${t.answerText ? `<div class="cell-mono" style="margin-top:4px">${t.answerText.substring(0,30)}...</div>` : ''}
                </td>
                <td class="cell-mono">${assigned}</td>
                <td class="cell-mono">${t.status === 'pending'? `Due: ${due}` : subDate}</td>
                <td style="text-align:right">${score}</td>
            </tr>`;
        } else {
             return `
            <tr>
                <td>${statusHTML}</td>
                <td>
                    <a href="${t.questionLink}" target="_blank" class="cell-link">${t.questionLink}</a>
                    ${t.answerText ? `<div class="cell-mono" style="margin-top:4px">${t.answerText.substring(0,30)}...</div>` : ''}
                </td>
                <td class="cell-mono">${assigned}</td>
                <td class="cell-mono">${due}</td>
                <td class="cell-dash">${actionHTML}</td>
                <td style="text-align:right">${score}</td>
            </tr>
            `;
        }
    };

    filtered.slice(0, 10).forEach(t => tbody.innerHTML += generateRow(t, false));
    tasks.forEach(t => actTbody.innerHTML += generateRow(t, true));
}

// Handling Tabs
document.querySelectorAll('.ftab').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-filter');
        renderTable();
    });
});

// Chart.js Setup
let areaChart, donutChart;
function updateCharts() {
    const dayData = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        dayData[d.toLocaleDateString('en-US', {weekday:'short'})] = 0;
    }
    submissions.forEach(s => {
        if(s.submittedAt) {
            const key = s.submittedAt.toDate().toLocaleDateString('en-US', {weekday:'short'});
            if(dayData[key] !== undefined) dayData[key]++;
        }
    });

    const labels = Object.keys(dayData);
    const data = Object.values(dayData);

    const areaCtx = document.getElementById('area-chart');
    if(areaCtx && !areaChart) {
        let grad = areaCtx.getContext('2d').createLinearGradient(0,0,0,180);
        grad.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
        grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
        
        areaChart = new Chart(areaCtx, {
            type: 'line',
            data: { labels, datasets: [{
                data, borderColor: '#22c55e', backgroundColor: grad,
                borderWidth: 2, tension: 0.4, fill: true, 
                pointRadius: 4, pointBackgroundColor: '#22c55e', pointBorderColor: '#22c55e', pointHitRadius: 10
            }]},
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: true, color: 'rgba(0,0,0,0.05)', drawBorder: false }, ticks: { font: {family: 'DM Mono', size: 10}, color: '#6B7280' } },
                    y: { grid: { display: true, color: 'rgba(0,0,0,0.05)', drawBorder: false }, ticks: { font: {family: 'DM Mono', size: 10}, color: '#6B7280' }, beginAtZero: true }
                }
            }
        });
    } else if (areaChart) {
        areaChart.data.datasets[0].data = data;
        areaChart.update();
    }

    const pending = tasks.filter(t => t.status === "pending").length;
    const submitted = tasks.filter(t => t.status === "submitted").length;
    const missed = tasks.filter(t => t.status === "missed").length;

    const mySubmissions = submissions.filter(s => s.userId === userData.id);
    const totalScore = mySubmissions.reduce((sum, s) => sum + (s.scoreDelta || 0), 0);
    const avgScore = mySubmissions.length > 0 ? totalScore / mySubmissions.length : 0;
    const eff = Math.max(0, Math.min(100, 50 + avgScore * 10));
    document.getElementById("donut-pct").textContent = eff.toFixed(0) + "%";

    const donutCtx = document.getElementById('donut-chart');
    if(donutCtx && !donutChart) {
        donutChart = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Submitted', 'Missed'],
                datasets: [{
                    data: [pending, submitted, missed],
                    backgroundColor: ['#f59e0b', '#22c55e', '#ef4444'],
                    borderWidth: 0, cutout: '80%'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    } else if(donutChart) {
        donutChart.data.datasets[0].data = [pending, submitted, missed];
        donutChart.update();
    }

    const leg = document.getElementById("donut-legend");
    leg.innerHTML = `
        <div class="legend-row">
            <div class="legend-label"><div class="legend-dot" style="background:#22c55e"></div>Submitted</div>
            <div class="legend-val">${submitted}</div>
        </div>
        <div class="legend-row">
            <div class="legend-label"><div class="legend-dot" style="background:#f59e0b"></div>Pending</div>
            <div class="legend-val">${pending}</div>
        </div>
        <div class="legend-row">
            <div class="legend-label"><div class="legend-dot" style="background:#ef4444"></div>Missed</div>
            <div class="legend-val">${missed}</div>
        </div>
    `;
}
