import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { rebuildUserScores } from "../utils/rebuildScores";

export default function AdminPerformance() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // -----------------------------
  // FETCH ALL DATA
  // -----------------------------
  useEffect(() => {
    const fetchAllData = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      const tasksSnap = await getDocs(collection(db, "tasks"));
      const subsSnap = await getDocs(collection(db, "submissions"));

      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSubmissions(subsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    fetchAllData();
  }, []);

  // -----------------------------
  // BUILD PERFORMANCE DATA
  // -----------------------------
  const buildPerformanceData = () => {
    return users
      .filter(u => u.role === "user")
      .map(user => {
        const userTasks = tasks.filter(t => t.assignedTo === user.id);
        const userSubs = submissions.filter(s => s.userId === user.id);

        // Keep latest submission per task
        const latestSubByTask = {};
        userSubs.forEach(sub => {
          const existing = latestSubByTask[sub.taskId];
          if (
            !existing ||
            sub.submittedAt?.toMillis() > existing.submittedAt?.toMillis()
          ) {
            latestSubByTask[sub.taskId] = sub;
          }
        });

        const finalSubs = Object.values(latestSubByTask);

        const totalTasks = userTasks.length;
        const submittedTasks = finalSubs.length;
        const missedTasks = Math.max(0, totalTasks - submittedTasks);

        const totalScore = finalSubs.reduce(
          (sum, s) => sum + (s.scoreDelta || 0),
          0
        );

        const avgScore =
          submittedTasks > 0
            ? (totalScore / submittedTasks).toFixed(2)
            : "0.00";

        const lastSubmission =
          finalSubs.length > 0
            ? finalSubs
                .map(s => s.submittedAt?.toDate())
                .filter(Boolean)
                .sort((a, b) => b - a)[0]
                .toLocaleString()
            : "—";

        return {
          id: user.id,
          name: user.name,
          totalTasks,
          submittedTasks,
          missedTasks,
          totalScore,
          avgScore,
          lastSubmission
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  };

  const performance = buildPerformanceData();

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div
      style={{
        padding: "24px",
        background: "#f9fafb",
        minHeight: "100vh"
      }}
    >
      <h2 style={{ marginBottom: "6px" }}>
        Admin Performance Dashboard
      </h2>
      <p style={{ color: "#6b7280", marginBottom: "16px" }}>
        Overview of contributor productivity and scoring
      </p>

      {/* REBUILD BUTTON */}
      <button
        onClick={async () => {
          await rebuildUserScores();
          alert("User scores rebuilt successfully");
          window.location.reload();
        }}
        style={{
          background: "#2563eb",
          color: "white",
          border: "none",
          padding: "8px 14px",
          borderRadius: "8px",
          fontWeight: "600",
          cursor: "pointer",
          marginBottom: "20px"
        }}
      >
        Rebuild All User Scores
      </button>

      {/* PERFORMANCE TABLE */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "16px",
          boxShadow: "0 6px 16px rgba(0,0,0,0.05)"
        }}
      >
        {performance.length === 0 ? (
          <p>No contributor data available</p>
        ) : (
          <table
            cellPadding="10"
            style={{
              borderCollapse: "collapse",
              width: "100%"
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                <th>Name</th>
                <th>Total Tasks</th>
                <th>Submitted</th>
                <th>Pending</th>
                <th>Total Score</th>
                <th>Avg Score</th>
                <th>Last Submission</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((user, index) => {
                const isTop = index === 0;

                return (
                  <tr
                    key={user.id}
                    style={{
                      background: isTop ? "#ecfeff" : "transparent",
                      fontWeight: isTop ? "700" : "500"
                    }}
                  >
                    <td>{isTop ? "🏆 " : ""}{user.name}</td>
                    <td>{user.totalTasks}</td>
                    <td>{user.submittedTasks}</td>
                    <td
                      style={{
                        color: user.missedTasks > 0 ? "#dc2626" : "#16a34a"
                      }}
                    >
                      {user.missedTasks}
                    </td>
                    <td
                      style={{
                        color: user.totalScore < 0 ? "#dc2626" : "#16a34a",
                        fontWeight: "700"
                      }}
                    >
                      {user.totalScore > 0 ? "+" : ""}
                      {user.totalScore}
                    </td>
                    <td>{user.avgScore}</td>
                    <td>{user.lastSubmission}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
