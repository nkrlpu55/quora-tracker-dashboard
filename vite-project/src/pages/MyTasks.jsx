import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  Timestamp
} from "firebase/firestore";

export default function MyTasks() {
  // Stores tasks assigned to this contributor
  const [tasks, setTasks] = useState([]);

  // Stores pasted Quora answer link (input)
  const [answerLink, setAnswerLink] = useState("");

  // Stores submissions mapped by taskId
  const [submissions, setSubmissions] = useState({});

  // -----------------------------
  // FETCH TASKS + SUBMISSIONS
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      const userId = localStorage.getItem("trackerUserId");

      // 1️⃣ Fetch assigned tasks
      const taskQuery = query(
        collection(db, "tasks"),
        where("assignedTo", "==", userId)
      );

      const taskSnap = await getDocs(taskQuery);
      const taskList = taskSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTasks(taskList);

      // 2️⃣ Fetch submissions done by this user
      const subQuery = query(
        collection(db, "submissions"),
        where("userId", "==", userId)
      );

      const subSnap = await getDocs(subQuery);

      const subMap = {};
      subSnap.docs.forEach(doc => {
        subMap[doc.data().taskId] = doc.data();
      });

      setSubmissions(subMap);
    };

    fetchData();
  }, []);

  // -----------------------------
  // SUBMIT ANSWER LINK
  // -----------------------------
  const submitAnswer = async (taskId, dueAt) => {
    const userId = localStorage.getItem("trackerUserId");

    if (!answerLink) {
      alert("Paste answer link");
      return;
    }

    const isLate = Timestamp.now().toMillis() > dueAt.toMillis();

    // Save submission
    await addDoc(collection(db, "submissions"), {
      taskId,
      userId,
      answerLink,
      submittedAt: Timestamp.now(),
      isLate
    });

    // Update task status
    await updateDoc(doc(db, "tasks", taskId), {
      status: "submitted"
    });

    alert("Answer submitted successfully");

    // Update UI instantly (no page reload)
    setSubmissions(prev => ({
      ...prev,
      [taskId]: {
        answerLink,
        submittedAt: Timestamp.now(),
        isLate
      }
    }));

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, status: "submitted" } : t
      )
    );

    setAnswerLink("");
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div>
      <h2>My Assigned Tasks</h2>

      {tasks.length === 0 && <p>No tasks assigned</p>}

      {tasks.map(task => (
        <div
          key={task.id}
          style={{
            border: "1px solid #ccc",
            padding: "12px",
            margin: "12px"
          }}
        >
          {/* QUESTION LINK */}
          <p>
            <b>Question:</b>{" "}
            <a href={task.questionLink} target="_blank" rel="noreferrer">
              {task.questionLink}
            </a>
          </p>

          {/* COLLAPSIBLE ADMIN ANSWER (READ-ONLY, COPYABLE) */}
          <details>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
              View Assigned Answer
            </summary>

            <textarea
              value={task.answerText || ""}
              readOnly
              rows={6}
              style={{ width: "100%", marginTop: "8px" }}
            />
          </details>

          {/* TASK STATUS */}
          <p>
            <b>Status:</b> {task.status}
          </p>

          {/* IF ALREADY SUBMITTED – SHOW DETAILS */}
          {submissions[task.id] && (
            <>
              <p style={{ color: "green" }}>
                Answer submitted
              </p>
              <p>
                <b>Post Link:</b>{" "}
                <a
                  href={submissions[task.id].answerLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Posted Answer
                </a>
              </p>
              <p>
                <b>Submitted At:</b>{" "}
                {submissions[task.id].submittedAt
                  .toDate()
                  .toLocaleString()}
              </p>
            </>
          )}

          {/* SHOW INPUT ONLY IF PENDING */}
          {task.status === "pending" && (
            <>
              <input
                placeholder="Paste Quora Answer Link"
                value={answerLink}
                onChange={(e) => setAnswerLink(e.target.value)}
              />
              <br />
              <button onClick={() => submitAnswer(task.id, task.dueAt)}>
                Submit
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
