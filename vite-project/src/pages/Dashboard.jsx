import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
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
  }, []);

  if (!userData) return <p>Loading...</p>;

  return (
  <div>
    <h2>Welcome, {userData.name}</h2>

    {userData.role === "admin" ? (
      <>
        <h3>Admin Dashboard</h3>
        <a href="/admin-tasks">Assign Tasks</a>
      </>
    ) : (
      <>
        <h3>Contributor Dashboard</h3>
        <a href="/my-tasks">View My Tasks</a>
      </>
    )}
  </div>
  );
}
