import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

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

        const submittedTasks = userTasks.filter(t => t.status === "submitted").length;
        const missedTasks = userTasks.filter(t => t.status === "missed").length;

        const totalScore = user.score || 0;

        const avgScore =
          userSubs.length > 0
            ? (
                userSubs.reduce((sum, s) => sum + (s.scoreDelta || 0), 0) /
                userSubs.length
              ).toFixed(2)
            : "0.00";

        const lastSubmission =
          userSubs.length > 0
            ? userSubs
                .map(s => s.submittedAt?.toDate())
                .filter(Boolean)
                .sort((a, b) => b - a)[0]
                ?.toLocaleString()
            : "—";

        return {
          id: user.id,
          name: user.name,
          totalTasks: userTasks.length,
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
