import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { checkAndApplyMissedPenalties } from "../utils/missedTaskAutomation";

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

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

  if (!userData) return <p>Loading...</p>;

  return (
    <div
      style={{
        padding: "24px",
        background: "#f9fafb",
        minHeight: "100vh"
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ marginBottom: "4px" }}>
          Welcome, {userData.name}
        </h2>
        <p style={{ color: "#6b7280", margin: 0 }}>
          {userData.role === "admin"
            ? "Manage tasks and monitor performance"
            : "Track your assigned tasks and scores"}
        </p>
      </div>

      {/* DASHBOARD CARDS */}
      {userData.role === "admin" ? (
        <>
          <h3 style={{ marginBottom: "12px" }}>Admin Dashboard</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px"
            }}
          >
            {/* ASSIGN TASKS */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "18px",
                boxShadow: "0 6px 16px rgba(0,0,0,0.05)"
              }}
            >
              <h4 style={{ marginBottom: "8px" }}>Assign Tasks</h4>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                Create and assign Quora questions to contributors.
              </p>
              <button
                onClick={() => navigate("/admin-tasks")}
                style={buttonStyle}
              >
                Go to Task Assignment
              </button>
            </div>

            {/* PERFORMANCE */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "18px",
                boxShadow: "0 6px 16px rgba(0,0,0,0.05)"
              }}
            >
              <h4 style={{ marginBottom: "8px" }}>
                Performance Dashboard
              </h4>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                View contributor performance, scores, and submissions.
              </p>
              <button
                onClick={() => navigate("/admin-performance")}
                style={buttonStyle}
              >
                View Performance
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <h3 style={{ marginBottom: "12px" }}>Contributor Dashboard</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px"
            }}
          >
            {/* MY TASKS */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "18px",
                boxShadow: "0 6px 16px rgba(0,0,0,0.05)"
              }}
            >
              <h4 style={{ marginBottom: "8px" }}>My Tasks</h4>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                View assigned Quora questions and submit answers.
              </p>
              <button
                onClick={() => navigate("/my-tasks")}
                style={buttonStyle}
              >
                View My Tasks
              </button>
            </div>

            {/* LEADERBOARD */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "18px",
                boxShadow: "0 6px 16px rgba(0,0,0,0.05)"
              }}
            >
              <h4 style={{ marginBottom: "8px" }}>Leaderboard</h4>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                See how you rank among other contributors.
              </p>
              <button
                onClick={() => navigate("/leaderboard")}
                style={buttonStyle}
              >
                View Leaderboard
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* -----------------------------
   Shared Button Style
----------------------------- */
const buttonStyle = {
  marginTop: "10px",
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer"
};
