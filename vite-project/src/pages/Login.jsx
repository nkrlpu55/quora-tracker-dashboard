import { useState } from "react";
import { signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [mode, setMode] = useState(null); // "admin" | "user"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passKey, setPassKey] = useState("");

  const navigate = useNavigate();

  // ADMIN LOGIN
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("trackerUserId", res.user.uid);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Admin login failed");
    }
  };

  // CONTRIBUTOR LOGIN
  const handleUserLogin = async (e) => {
    e.preventDefault();

    if (!passKey) {
      alert("Enter pass key");
      return;
    }

    try {
      await signInAnonymously(auth);

      const q = query(
        collection(db, "users"),
        where("passKey", "==", passKey),
        where("role", "==", "user")
      );

      const snapshot = await getDocs(q);

    //   if (snapshot.empty) {
    //     alert("Invalid pass key");
    //     return;
    //   }
        if (snapshot.empty) {
  alert("Pass key not found in database");
  return;
    }


      const userDoc = snapshot.docs[0];
      localStorage.setItem("trackerUserId", userDoc.id);
      navigate("/dashboard");
    } catch (err) {
    //   console.error(err);
    //   alert("User login failed");
    console.error("LOGIN ERROR:", err);
    alert(err.message);
    }
  };

  return (
    <div>
      <h2>Quora Tracker Login</h2>

      {!mode && (
        <>
          <button onClick={() => setMode("admin")}>Login as Admin</button>
          <br /><br />
          <button onClick={() => setMode("user")}>Login as Contributor</button>
        </>
      )}

      {mode === "admin" && (
        <form onSubmit={handleAdminLogin}>
          <h3>Admin Login</h3>
          <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <br />
          <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
          <br />
          <button>Login</button>
          <br /><br />
          <button type="button" onClick={() => setMode(null)}>Back</button>
        </form>
      )}

      {mode === "user" && (
        <form onSubmit={handleUserLogin}>
          <h3>Contributor Login</h3>
          <input
            placeholder="Enter Pass Key"
            value={passKey}
            onChange={(e) => setPassKey(e.target.value)}
          />
          <br />
          <button>Enter</button>
          <br /><br />
          <button type="button" onClick={() => setMode(null)}>Back</button>
        </form>
      )}
    </div>
  );
}
