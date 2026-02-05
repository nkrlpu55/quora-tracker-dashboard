import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { checkAndApplyMissedPenalties } from "../utils/missedTaskAutomation";
import "../styles/AdminDashboard.css";

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  // -----------------------------
  // LOAD USER (UNCHANGED LOGIC)
  // -----------------------------
  useEffect(() => {
    const loadUser = async () => {
      const userId = localStorage.getItem("trackerUserId");

      if (!userId) {
        navigate("/");
        return;
      }

      const ref = doc(db, "users", userId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setUserData(snap.data());
      }
    };

    loadUser();
    checkAndApplyMissedPenalties();
  }, [navigate]);

  // -----------------------------
  // MOUSE FOLLOW EFFECT (UI ONLY)
  // -----------------------------
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      document.querySelectorAll(".admin-card").forEach(card => {
        card.addEventListener("mousemove", (e) => {
          const { left, top, width, height } = card.getBoundingClientRect();
          const x = ((e.clientX - left) / width) * 100;
          const y = ((e.clientY - top) / height) * 100;
          card.style.background =
            `radial-gradient(circle at ${x}% ${y}%, #ffffff 0%, #f9fafb 100%)`;
        });

        card.addEventListener("mouseleave", () => {
          card.style.background = "white";
        });
      });
    }
  }, []);

  if (!userData) return <p>Loading...</p>;

  return (
    <div className="admin-body">
      {/* BACKGROUND DECOR */}
      <div className="bg-decor">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>

      <div className="admin-container">
        {/* HEADER */}
        <header className="admin-header">
          <span className="badge">Qacker Workspace</span>
          <h1>Welcome, {userData.name}</h1>
          <p className="subtext">
            {userData.role === "admin"
              ? "Control center for Quora content operations and team analytics."
              : "Track your tasks, submissions, and leaderboard position."}
          </p>
        </header>

        {/* DASHBOARD */}
        {userData.role === "admin" ? (
          <main className="dashboard-grid">
            {/* ASSIGN TASKS */}
            <div className="admin-card card-assign">
              <h2 className="card-title">Assign Tasks</h2>
              <p className="card-desc">
                Distribute high-intent Quora questions to contributors.
              </p>

              <div className="card-visual">
                <svg viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="#e0e7ff" className="pulse" />
                  <rect x="50" y="65" width="100" height="14" rx="7" fill="#6366f1" className="floating" />
                  <rect x="50" y="95" width="70" height="14" rx="7" fill="#818cf8" className="floating" />
                  <rect x="50" y="125" width="85" height="14" rx="7" fill="#a5b4fc" className="floating" />
                </svg>
              </div>

              <button
                className="btn btn-blue"
                onClick={() => navigate("/admin-tasks")}
              >
                Task Assignment →
              </button>
            </div>

            {/* PERFORMANCE */}
            <div className="admin-card card-perf">
              <h2 className="card-title">Performance</h2>
              <p className="card-desc">
                Audit contributor scores, submissions, and rankings.
              </p>

              <div className="card-visual">
                <svg viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="#d1fae5" className="pulse" />
                  <path
                    d="M40 140 Q 70 140 85 100 T 130 80 T 160 50"
                    stroke="#10b981"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    className="floating"
                  />
                </svg>
              </div>

              <button
                className="btn btn-mint"
                onClick={() => navigate("/admin-performance")}
              >
                Performance Hub →
              </button>
            </div>
          </main>
        ) : (
          <main className="dashboard-grid">
            {/* MY TASKS */}
            <div className="admin-card card-assign">
              <h2 className="card-title">My Tasks</h2>
              <p className="card-desc">
                View assigned questions and submit answers.
              </p>

              <button
                className="btn btn-blue"
                onClick={() => navigate("/my-tasks")}
              >
                View Tasks →
              </button>
            </div>

            {/* LEADERBOARD */}
            <div className="admin-card card-perf">
              <h2 className="card-title">Leaderboard</h2>
              <p className="card-desc">
                See how you rank among the team.
              </p>

              <button
                className="btn btn-mint"
                onClick={() => navigate("/leaderboard")}
              >
                View Leaderboard →
              </button>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
