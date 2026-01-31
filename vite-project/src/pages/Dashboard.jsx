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

    // Run missed-task automation once on dashboard load
    checkAndApplyMissedPenalties();
  }, [navigate]);

  if (!userData) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Welcome, {userData.name}</h2>

      {userData.role === "admin" ? (
        <>
          <h3>Admin Dashboard</h3>

          <ul>
            <li>
              <button onClick={() => navigate("/admin-tasks")}>
                Assign Tasks
              </button>
            </li>

            <li>
              <button onClick={() => navigate("/admin-performance")}>
                Performance Dashboard
              </button>
            </li>
          </ul>
        </>
      ) : (
        <>
          <h3>Contributor Dashboard</h3>

          <ul>
            <li>
              <button onClick={() => navigate("/my-tasks")}>
                View My Tasks
              </button>
            </li>

            <li>
              <button onClick={() => navigate("/leaderboard")}>
                View Leaderboard
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
