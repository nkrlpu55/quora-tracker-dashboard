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
      if (!task.assignedAt) {
        throw new Error("Task assignedAt timestamp is missing");
      }

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

      const userRef = doc(db, "users", userId);

      // Ensure score exists before incrementing
      await updateDoc(userRef, {
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

      alert(`Submission successful for Task ID: ${task.id}`);
    } catch (error) {
      console.error("Submission failed:", error.message);
      alert(error.message);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div>
      <h2>My Assigned Tasks</h2>

      {tasks.length === 0 && <p>No tasks assigned</p>}

      {tasks.map(task => {
        const taskScore = getTaskScore(task);

        return (
          <div
            key={task.id}
            style={{ border: "1px solid #ccc", padding: "12px", margin: "12px" }}
          >
            <p>
              <b>Question:</b>{" "}
              <a href={task.questionLink} target="_blank" rel="noreferrer">
                {task.questionLink}
              </a>
            </p>

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

            <p>
              <b>Status:</b>{" "}
              <span
                style={{
                  color:
                    task.status === "missed"
                      ? "red"
                      : task.status === "submitted"
                        ? "green"
                        : "black",
                  fontWeight: "bold"
                }}
              >
                {task.status}
              </span>
            </p>

            <p>
              <b>Score for this task:</b>{" "}
              {taskScore === null ? "—" : (taskScore > 0 ? "+" : "") + taskScore}
            </p>

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
                />
                <br />
                <button
                  onClick={() => submitAnswer(task)}
                  disabled={loadingTaskId === task.id || task.status !== "pending"}
                >
                  {loadingTaskId === task.id ? "Submitting..." : "Submit"}
                </button>
              </>
            )}

            {task.status === "missed" && (
              <p style={{ color: "red", fontWeight: "bold" }}>
                Submission closed for this task
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
