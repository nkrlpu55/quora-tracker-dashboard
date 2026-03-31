import { auth, db, signOut, collection, query, where, getDoc, getDocs, doc, onSnapshot, orderBy, limit, addDoc, Timestamp } from "./firebase-config.js";
import { resolveScore, checkAndApplyMissedPenalties } from "./utils.js";

let userData = null;
let tasks = [];
let submissions = [];
let users = [];
let currentFilter = 'all';

// Initialize
const userId = localStorage.getItem("trackerUserId");
if (!userId) window.location.href = "index.html";

async function init() {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (!snap.exists() || snap.data().role !== "admin") return window.location.href = "index.html";

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
    onSnapshot(collection(db, "users"), (snapshot) => {
        users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const select = document.getElementById("taskAssignee");
        select.innerHTML = '<option value="">Select operative</option>';
        users.filter(u => u.role === "user").forEach(u => {
            select.innerHTML += `<option value="${u.id}">${u.name}</option>`;
        });
    });

    onSnapshot(query(collection(db, "tasks"), orderBy("assignedAt", "desc"), limit(100)), (snapshot) => {
        tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDash();
    });

    onSnapshot(query(collection(db, "submissions"), orderBy("submittedAt", "desc"), limit(150)), (snapshot) => {
        submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDash();
        updateCharts();
    });
}

// Rendering Dash
function renderDash() {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === "pending").length;
    const submitted = tasks.filter(t => t.status === "submitted").length;
    const missed = tasks.filter(t => t.status === "missed").length;
    const eff = total > 0 ? Math.round((submitted / total) * 100) : 0;

    document.getElementById("kpi-total").textContent = total || "—";
    document.getElementById("kpi-pending").textContent = pending || "—";
    document.getElementById("kpi-submitted").textContent = submitted || "—";
    document.getElementById("kpi-missed").textContent = missed || "—";
    document.getElementById("kpi-eff").textContent = eff + "% efficiency";
    
    // Act page chips
    if(document.getElementById("act-chip-total")) document.getElementById("act-chip-total").textContent = total;
    if(document.getElementById("act-chip-sub")) document.getElementById("act-chip-sub").textContent = submitted;

    renderTable();
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

    const generateRow = (t) => {
        const u = users.find(user => user.id === t.assignedTo)?.name || "—";
        const dateOpt = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const assigned = t.assignedAt ? t.assignedAt.toDate().toLocaleString('en-US', dateOpt) : "—";
        const due = t.dueAt ? t.dueAt.toDate().toLocaleString('en-US', dateOpt) : "—";
        
        let subDate = "—"; let score = "—";
        if(t.status === "submitted") {
            const sub = submissions.find(s => s.taskId === t.id);
            if(sub) {
                subDate = sub.submittedAt ? sub.submittedAt.toDate().toLocaleString('en-US', dateOpt) : "—";
                score = `<span class="cell-score">${sub.scoreDelta > 0 ? '+'+sub.scoreDelta : sub.scoreDelta}</span>`;
            }
        } else if (t.status === "missed") {
            score = `<span class="cell-dash" style="color:var(--red)">-5</span>`;
        }

        let statusHTML = "";
        if(t.status === "submitted") statusHTML = `<div class="pill pill-green"><div class="pill-dot"></div>Submitted</div>`;
        else if(t.status === "missed") statusHTML = `<div class="pill pill-red"><div class="pill-dot"></div>Missed</div>`;
        else statusHTML = `<div class="pill pill-amber"><div class="pill-dot"></div>Pending</div>`;

        return `
            <tr>
                <td>${statusHTML}</td>
                <td>
                    <a href="${t.questionLink}" target="_blank" class="cell-link">${t.questionLink}</a>
                    ${t.answerText ? `<div class="cell-mono" style="margin-top:4px">${t.answerText.substring(0,30)}...</div>` : ''}
                </td>
                <td class="cell-mono">${assigned}</td>
                <td class="cell-mono">${t.status === 'pending'? `Due: ${due}` : subDate}</td>
                <td class="cell-dash" style="color:var(--text)">${u}</td>
                <td style="text-align:right">${score}</td>
            </tr>
        `;
    };

    filtered.slice(0, 10).forEach(t => tbody.innerHTML += generateRow(t));
    tasks.forEach(t => actTbody.innerHTML += generateRow(t));
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
    const total = tasks.length;
    const eff = total > 0 ? Math.round((submitted/total)*100) : 0;
    document.getElementById("donut-pct").textContent = eff + "%";

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

// Create Task
document.getElementById("create-task-btn").addEventListener("click", async () => {
    const link = document.getElementById("taskLink").value;
    const content = document.getElementById("taskContent").value;
    const assignee = document.getElementById("taskAssignee").value;
    const dueAtDate = document.getElementById("taskDueDate").value;

    if (!link || !assignee || !dueAtDate) return showToast("Mission details incomplete", "err");

    const btn = document.getElementById("create-task-btn");
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Deploying...`;
    btn.disabled = true;

    try {
        await addDoc(collection(db, "tasks"), {
            questionLink: link,
            topic: "",
            answerText: content,
            assignedTo: assignee,
            assignedAt: Timestamp.now(),
            dueAt: Timestamp.fromDate(new Date(dueAtDate)),
            status: "pending"
        });
        document.getElementById("taskLink").value = "";
        document.getElementById("taskContent").value = "";
        showToast("Mission deployed to Operative.");
    } catch (e) {
        showToast("Error: " + e.message, "err");
    } finally {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Deploy Task`;
        btn.disabled = false;
    }
});
