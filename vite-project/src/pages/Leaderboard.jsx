import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs
} from "firebase/firestore";

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const currentUserId = localStorage.getItem("trackerUserId");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // 1️⃣ Fetch users
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.role === "user");

      // 2️⃣ Fetch submissions
      const subsSnap = await getDocs(collection(db, "submissions"));
      const submissions = subsSnap.docs.map(d => d.data());

      // 3️⃣ Build leaderboard rows
      const leaderboardData = users.map(user => {
        const userSubs = submissions.filter(
          s => s.userId === user.id
        );

        // Deduplicate submissions per task (latest wins)
        const latestByTask = {};
        userSubs.forEach(sub => {
          const existing = latestByTask[sub.taskId];
          if (
            !existing ||
            sub.submittedAt?.toMillis() > existing.submittedAt?.toMillis()
          ) {
            latestByTask[sub.taskId] = sub;
          }
        });

        const finalSubs = Object.values(latestByTask);

        const totalScore = finalSubs.reduce(
          (sum, s) => sum + (s.scoreDelta || 0),
          0
        );

        return {
          id: user.id,
          name: user.name,
          totalScore
        };
      });

      // 4️⃣ Sort by TRUE score
      leaderboardData.sort((a, b) => b.totalScore - a.totalScore);

      setRows(leaderboardData);
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return index + 1;
  };

  return (
    <div
      style={{
        padding: "24px",
        background: "#f9fafb",
        minHeight: "100vh"
      }}
    >
      <h2 style={{ marginBottom: "16px" }}>
        🏆 Team Leaderboard
      </h2>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "16px",
          boxShadow: "0 6px 16px rgba(0,0,0,0.05)"
        }}
      >
        {rows.length === 0 ? (
          <p>No contributors found</p>
        ) : (
          <table
            cellPadding="10"
            style={{
              width: "100%",
              borderCollapse: "collapse"
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                <th>Rank</th>
                <th>Name</th>
                <th>Total Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isCurrentUser = row.id === currentUserId;

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: isCurrentUser
                        ? "#e6f7ff"
                        : "transparent",
                      fontWeight: isCurrentUser ? "700" : "500"
                    }}
                  >
                    <td>{getRankIcon(index)}</td>
                    <td>{row.name}</td>
                    <td
                      style={{
                        color: row.totalScore < 0 ? "#dc2626" : "#16a34a",
                        fontWeight: "700"
                      }}
                    >
                      {row.totalScore > 0 ? "+" : ""}
                      {row.totalScore}
                    </td>
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
