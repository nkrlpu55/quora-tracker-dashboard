import { auth, db, signInWithEmailAndPassword, signInAnonymously, collection, query, where, getDocs } from "./firebase-config.js";

document.getElementById("admin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;
  const submitBtn = document.getElementById("admin-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Loading...";
  hideError();

  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem("trackerUserId", res.user.uid);
    window.location.href = "admin.html";
  } catch (err) {
    showError("Access Denied: Invalid Administrative Credentials.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Validate & Enter";
  }
});

document.getElementById("user-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const passKey = document.getElementById("user-passkey").value;
  if (!passKey) return showError("Security Alert: Pass Key Required.");
  
  const submitBtn = document.getElementById("user-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Loading...";
  hideError();

  try {
    await signInAnonymously(auth);
    const q = query(
      collection(db, "users"),
      where("passKey", "==", passKey),
      where("role", "==", "user")
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      showError("Security Alert: Unauthorized Pass Key.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Decrypt Access";
      return;
    }
    localStorage.setItem("trackerUserId", snap.docs[0].id);
    window.location.href = "dashboard.html";
  } catch (err) {
    showError("System Error: Protocol synchronization failed.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Decrypt Access";
  }
});

function showError(msg) {
  document.getElementById("error-text").textContent = msg;
  document.getElementById("error-alert").classList.remove("hidden");
  document.getElementById("error-alert").classList.add("flex");
}

function hideError() {
  document.getElementById("error-alert").classList.add("hidden");
  document.getElementById("error-alert").classList.remove("flex");
}
