import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const name = "Nachiketa";

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

  return (
    <div className="admin-body">
      <div className="bg-decor">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>

      <div className="admin-container">
        <header className="admin-header">
          <span className="badge">Qacker Workspace</span>
          <h1>Welcome, {name}</h1>
          <p className="subtext">
            Control center for Quora content operations and team analytics.
          </p>
        </header>

        <main className="dashboard-grid">
          {/* Assign Tasks */}
          <div className="admin-card card-assign">
            <h2 className="card-title">Assign Tasks</h2>
            <p className="card-desc">
              Distribute high-intent questions to contributors efficiently.
            </p>

            <div className="card-visual">
              <svg viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="#e0e7ff" className="pulse"/>
                <rect x="50" y="65" width="100" height="14" rx="7" fill="#6366f1" className="floating"/>
                <rect x="50" y="95" width="70" height="14" rx="7" fill="#818cf8" className="floating"/>
                <rect x="50" y="125" width="85" height="14" rx="7" fill="#a5b4fc" className="floating"/>
              </svg>
            </div>

            <button className="btn btn-blue" onClick={() => navigate("/admin-tasks")}>
              Task Assignment →
            </button>
          </div>

          {/* Performance */}
          <div className="admin-card card-perf">
            <h2 className="card-title">Performance</h2>
            <p className="card-desc">
              Audit quality metrics, engagement, and contributor rankings.
            </p>

            <div className="card-visual">
              <svg viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="#d1fae5" className="pulse"/>
                <path d="M40 140 Q 70 140 85 100 T 130 80 T 160 50"
                  stroke="#10b981" strokeWidth="10" fill="none"
                  strokeLinecap="round" className="floating"/>
              </svg>
            </div>

            <button className="btn btn-mint" onClick={() => navigate("/admin-performance")}>
              Performance Hub →
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
