import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import gsap from "gsap";
import "../styles/adminTasks.css";

export default function AdminTasks() {
  // 🔒 EXISTING STATE (UNCHANGED)
  const [users, setUsers] = useState([]);
  const [questionLink, setQuestionLink] = useState("");
  const [topic, setTopic] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState("");

  // 🎯 UI STATE
  const [showToast, setShowToast] = useState(false);
  const cardRef = useRef(null);

  // 🔒 FETCH USERS (UNCHANGED)
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      setUsers(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      );
    };
    fetchUsers();
  }, []);

  // 🎬 GSAP ANIMATIONS (UNCHANGED)
  useEffect(() => {
    const tl = gsap.timeline();

    tl.from(cardRef.current, {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: "expo.out"
    });

    tl.to(".input-group", {
      y: 0,
      opacity: 1,
      stagger: 0.1,
      duration: 0.8,
      ease: "back.out(1.7)"
    }, "-=0.8");

    tl.to(".submit-wrap", {
      opacity: 1,
      duration: 0.5
    }, "-=0.3");

    gsap.to(".shape-1", {
      x: 100,
      y: 50,
      duration: 20,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    gsap.to(".shape-2", {
      x: -100,
      y: -50,
      duration: 15,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, []);

  // 🔒 SUBMIT LOGIC (UNCHANGED)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!questionLink || !assignedTo || !dueAt) {
      alert("Fill all required fields");
      return;
    }

    await addDoc(collection(db, "tasks"), {
      questionLink,
      topic,
      answerText,
      assignedTo,
      assignedAt: Timestamp.now(),
      dueAt: Timestamp.fromDate(new Date(dueAt)),
      status: "pending"
    });

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    setQuestionLink("");
    setTopic("");
    setAnswerText("");
    setAssignedTo("");
    setDueAt("");
  };

  return (
    <div className="assign-body">
      {/* Background blobs */}
      <div className="shape shape-1"></div>
      <div className="shape shape-2"></div>

      {/* Toast */}
      {showToast && (
        <div className="success-toast">
          ✅ Task Assigned Successfully
        </div>
      )}

      <div className="glass-card" ref={cardRef}>
        <div className="header">
          <h1>Assign Quora Task</h1>
          <p>Set up and delegate answering responsibilities</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Question */}
          <div className="input-group">
            <input
              value={questionLink}
              onChange={(e) => setQuestionLink(e.target.value)}
              placeholder=" "
              required
            />
            <label>Quora Question Link</label>
          </div>

          {/* Topic */}
          <div className="input-group">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder=" "
            />
            <label>Topic (optional)</label>
          </div>

          {/* Answer */}
          <div className="input-group">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder=" "
              rows={6}
              required
            />
            <label>Paste full Quora answer text here</label>
          </div>

          {/* Grid */}
          <div className="grid">
            {/* ✅ FIXED SELECT */}
            <div className={`input-group ${assignedTo ? "has-value" : ""}`}>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                required
              >
                <option value="" disabled>
                  {/* Blank while selecting the option to assign */}
                </option>
                {users
                  .filter(u => u.role === "user")
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
              </select>
              <label>Assign to</label>
            </div>

            {/* Deadline */}
            <div className="input-group">
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                placeholder=" "
                required
              />
              <label>Deadline</label>
            </div>
          </div>

          <div className="submit-wrap">
            <button className="btn-assign">
              Assign Task →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
