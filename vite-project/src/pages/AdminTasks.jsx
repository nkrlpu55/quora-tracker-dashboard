import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";

export default function AdminTasks() {
  const [users, setUsers] = useState([]);
  const [questionLink, setQuestionLink] = useState("");
  const [topic, setTopic] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsers();
  }, []);

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

    alert("Task assigned");
    setQuestionLink("");
    setTopic("");
    setAnswerText("");
    setAssignedTo("");
    setDueAt("");
  };

  return (
    <div>
      <h2>Assign Quora Task</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Quora Question Link"
          value={questionLink}
          onChange={(e) => setQuestionLink(e.target.value)}
        />
        <br />

        <input
          placeholder="Topic (optional)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <br />

        <textarea
          placeholder="Paste full Quora answer text here"
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          rows={6}
          style={{ width: "100%" }}
        />
        <br />

        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">Assign to</option>
          {users
            .filter(u => u.role === "user")
            .map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
        </select>
        <br />

        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
        <br />
        
        <button>Assign Task</button>
      </form>
    </div>
  );
}
