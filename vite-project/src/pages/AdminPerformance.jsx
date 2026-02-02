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
        // Tasks assigned to user
        const userTasks = tasks.filter(t => t.assignedTo === user.id);

        // All submissions by user
        const userSubs = submissions.filter(s => s.userId === user.id);

        // Keep ONLY latest submission per task
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
      });
  };



  const performance = buildPerformanceData();

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin Performance Dashboard</h2>

      <button
        onClick={async () => {
          await rebuildUserScores();
          alert("User scores rebuilt successfully");
          window.location.reload();
        }}
        style={{
          marginTop: "10px",
          marginBottom: "20px",
          padding: "8px 12px",
          cursor: "pointer"
        }}
      >
        Rebuild All User Scores
      </button>

      {performance.length === 0 ? (
        <p>No contributor data available</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          style={{ marginTop: "20px", borderCollapse: "collapse", width: "100%" }}
        >
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th>Name</th>
              <th>Total Tasks</th>
              <th>Submitted</th>
              <th>Missed</th>
              <th>Total Score</th>
              <th>Avg Score</th>
              <th>Last Submission</th>
            </tr>
          </thead>
          <tbody>
            {performance.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.totalTasks}</td>
                <td>{user.submittedTasks}</td>
                <td>{user.missedTasks}</td>
                <td>{user.totalScore}</td>
                <td>{user.avgScore}</td>
                <td>{user.lastSubmission}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
