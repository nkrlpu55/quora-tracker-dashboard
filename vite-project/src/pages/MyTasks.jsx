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
  Timestamp,
  increment
} from "firebase/firestore";
import {
  calculateWorkingMinutes,
  resolveScore
} from "../utils/timeCalculator";

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [answerLinks, setAnswerLinks] = useState({});
  const [submissions, setSubmissions] = useState({});
  const [loadingTaskId, setLoadingTaskId] = useState(null);

  // -----------------------------
  // FETCH TASKS & SUBMISSIONS
  // -----------------------------
  const fetchData = async () => {
    const userId = localStorage.getItem("trackerUserId");

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

  useEffect(() => {
    fetchData();
  }, []);

  // -----------------------------
  // SCORE PER TASK
  // -----------------------------
  const getTaskScore = (task) => {
    if (task.status === "missed") return -5;
    if (submissions[task.id]) return submissions[task.id].scoreDelta;
    return null;
  };

  // -----------------------------
  // SUBMIT ANSWER
  // -----------------------------
  const submitAnswer = async (task) => {
    const link = answerLinks[task.id];

    if (!link || !link.trim()) {
      alert("Please paste the answer link before submitting");
      return;
    }

    if (task.status === "missed") {
      alert("This task is missed. Submission is disabled.");
      return;
    }

    setLoadingTaskId(task.id);

    try {
      const userId = localStorage.getItem("trackerUserId");
      const submittedAt = Timestamp.now();

      const workingMinutes = calculateWorkingMinutes(
        task.assignedAt.toDate(),
        submittedAt.toDate()
      );

      const scoreDelta = resolveScore(workingMinutes);

      await addDoc(collection(db, "submissions"), {
        taskId: task.id,
        userId,
        answerLink: link,
        submittedAt,
        workingMinutes,
        scoreDelta
      });

      await updateDoc(doc(db, "tasks", task.id), {
        status: "submitted"
      });

      await updateDoc(doc(db, "users", userId), {
        score: increment(scoreDelta)
      });

      // Optimistic UI update
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id ? { ...t, status: "submitted" } : t
        )
      );

      setSubmissions(prev => ({
        ...prev,
        [task.id]: {
          taskId: task.id,
          userId,
          answerLink: link,
          submittedAt,
          scoreDelta
        }
      }));

      setAnswerLinks(prev => {
        const copy = { ...prev };
        delete copy[task.id];
        return copy;
      });

    } catch (error) {
      alert(error.message);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ padding: "20px", background: "#f9fafb" }}>
      <h2 style={{ marginBottom: "20px" }}>My Assigned Tasks</h2>

      {tasks.length === 0 && <p>No tasks assigned</p>}

      {tasks.map(task => {
        const taskScore = getTaskScore(task);

        return (
          <div
            key={task.id}
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.04)"
            }}
          >
            {/* QUESTION */}
            <p>
              <b>Question:</b>{" "}
              <a href={task.questionLink} target="_blank" rel="noreferrer">
                {task.questionLink}
              </a>
            </p>

            {/* ADMIN ANSWER */}
            <details>
              <summary style={{ cursor: "pointer", fontWeight: "600" }}>
                View Assigned Answer
              </summary>
              <textarea
                value={task.answerText || ""}
                readOnly
                rows={6}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb"
                }}
              />
            </details>

            {/* STATUS BADGE */}
            <div style={{ marginTop: "10px" }}>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "white",
                  background:
                    task.status === "submitted"
                      ? "#16a34a"
                      : task.status === "missed"
                        ? "#dc2626"
                        : "#d97706"
                }}
              >
                {task.status.toUpperCase()}
              </span>
            </div>

            {/* SCORE */}
            <p style={{ marginTop: "8px" }}>
              <b>Score:</b>{" "}
              {taskScore === null ? (
                <span style={{ color: "#6b7280" }}>—</span>
              ) : (
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "16px",
                    color: taskScore > 0 ? "#16a34a" : "#dc2626"
                  }}
                >
                  {taskScore > 0 ? "+" : ""}
                  {taskScore}
                </span>
              )}
            </p>

            {/* SUBMIT SECTION */}
            {task.status === "pending" && (
              <>
                <input
                  placeholder="Paste Quora Answer Link"
                  value={answerLinks[task.id] || ""}
                  onChange={(e) =>
                    setAnswerLinks(prev => ({
                      ...prev,
                      [task.id]: e.target.value
                    }))
                  }
                  disabled={loadingTaskId === task.id}
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginTop: "8px",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb"
                  }}
                />
                <button
                  onClick={() => submitAnswer(task)}
                  disabled={loadingTaskId === task.id}
                  style={{
                    marginTop: "10px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    opacity: loadingTaskId === task.id ? 0.6 : 1
                  }}
                >
                  {loadingTaskId === task.id ? "Submitting…" : "Submit"}
                </button>
              </>
            )}

            {task.status === "missed" && (
              <p style={{ color: "#dc2626", fontWeight: "600" }}>
                Submission closed for this task
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

 

}
