import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const q = query(
        collection(db, "users"),
        where("role", "==", "user")
      );

      const snap = await getDocs(q);

      const list = snap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      setUsers(list);
    };

    fetchLeaderboard();
  }, []);

  return (
    <div>
      <h2>🏆 Team Leaderboard</h2>

      {users.length === 0 && <p>No contributors found</p>}

      <table
        border="1"
        cellPadding="8"
        style={{ borderCollapse: "collapse", marginTop: "12px" }}
      >
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Total Score</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id}>
              <td>{index + 1}</td>
              <td>{user.name}</td>
              <td
                style={{
                  color: user.score < 0 ? "red" : "green",
                  fontWeight: "bold"
                }}
              >
                {user.score > 0 ? "+" : ""}
                {user.score || 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
