import { useState } from "react";
import { signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

export default function Login() {
  const [mode, setMode] = useState("select"); // select | admin | user

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passKey, setPassKey] = useState("");

  const navigate = useNavigate();

  // -----------------------------
  // ADMIN LOGIN (UNCHANGED LOGIC)
  // -----------------------------
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

  // -----------------------------
  // CONTRIBUTOR LOGIN (UNCHANGED LOGIC)
  // -----------------------------
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

      if (snapshot.empty) {
        alert("Pass key not found in database");
        return;
      }

      const userDoc = snapshot.docs[0];
      localStorage.setItem("trackerUserId", userDoc.id);
      navigate("/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert(err.message);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="login-body">
      <div className="blob one"></div>
      <div className="blob two"></div>

      <div className="wrapper">
        <div className="card">
          <div className="logo">Qacker</div>
          <div className="tagline">Quora Content Tracker</div>

          {/* ROLE SELECTION */}
          {mode === "select" && (
            <div className="role-buttons">
              <button className="role-btn" onClick={() => setMode("admin")}>
                Admin Login
              </button>
              <button className="role-btn" onClick={() => setMode("user")}>
                Contributor Login
              </button>
            </div>
          )}

          {/* ADMIN FORM */}
          {mode === "admin" && (
            <form className="form active" onSubmit={handleAdminLogin}>
              <div className="form-group">
                <label>EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button className="btn">Login as Admin</button>

              <div className="back" onClick={() => setMode("select")}>
                ← Change login type
              </div>
            </form>
          )}

          {/* CONTRIBUTOR FORM */}
          {mode === "user" && (
            <form className="form active" onSubmit={handleUserLogin}>
              <div className="form-group">
                <label>PASS KEY</label>
                <input
                  type="password"
                  value={passKey}
                  onChange={(e) => setPassKey(e.target.value)}
                  required
                />
              </div>

              <button className="btn">Enter Workspace</button>

              <div className="back" onClick={() => setMode("select")}>
                ← Change login type
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
