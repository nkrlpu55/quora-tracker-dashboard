import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, getDoc, doc, limit, orderBy, addDoc, updateDoc, Timestamp, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Activity as ActivityIcon, LayoutDashboard, Layers, LogOut, X, Send } from "lucide-react";
import { signOut } from "firebase/auth";
import { LatestOperationsLog, CreateTaskPanel, SharedGlassCard } from "../components/ActivityCards";

// Helper functions matching Dashboard behavior 
const getBasePoints = (minutes) => {
  if (minutes < 180) return 0;
  if (minutes <= 600) return 3;
  if (minutes <= 960) return 0;
  return -1;
};

const calculateWorkingMinutes = (assignedDate, submittedDate) => {
  const diffMs = submittedDate.getTime() - assignedDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  const startHour = 10;
  const endHour = 19;

  if (diffHours <= 24) {
    const startHourNum = assignedDate.getHours();
    const endHourNum = submittedDate.getHours();

    let workHours = 0;
    for (let h = startHourNum; h < endHourNum; h++) {
      if (h >= startHour && h < endHour) {
        workHours++;
      }
    }
    return workHours * 60;
  }

  const days = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  return (days * 9 * 60) + (remainingHours * 60);
};

export default function Activity() {
  const [userData, setUserData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [newTask, setNewTask] = useState({
    questionLink: '',
    answerText: '',
    dueAt: '',
    assignedTo: '',
    topic: ''
  });
  const [answerLinks, setAnswerLinks] = useState({});
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [localTaskScores, setLocalTaskScores] = useState({});
  const navigate = useNavigate();

  const isAdmin = userData?.role === "admin";

  // LOAD USER DATA
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
        setUserData({ id: snap.id, ...snap.data() });
      } else {
        navigate("/");
      }
    };
    loadUser();
  }, [navigate]);

  // TASKS SUBSCRIPTION
  useEffect(() => {
    if (!userData) return;
    const userId = userData.id;

    let tasksQuery = isAdmin
      ? query(collection(db, "tasks"), orderBy("assignedAt", "desc"), limit(50))
      : query(collection(db, "tasks"), where("assignedTo", "==", userId), orderBy("assignedAt", "desc"));

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [userData, isAdmin]);

  // SUBMISSIONS SUBSCRIPTION
  useEffect(() => {
    if (!userData) return;
    const userId = userData.id;

    let subsQuery = isAdmin
      ? query(collection(db, "submissions"), orderBy("submittedAt", "desc"), limit(100))
      : query(collection(db, "submissions"), where("userId", "==", userId), orderBy("submittedAt", "desc"));

    const unsubscribe = onSnapshot(subsQuery, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [userData, isAdmin]);

  // USERS SUBSCRIPTION 
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleCreateTask = async () => {
    if (!newTask.questionLink || !newTask.assignedTo || !newTask.dueAt) {
      alert("Fill all required fields");
      return;
    }

    try {
      await addDoc(collection(db, "tasks"), {
        questionLink: newTask.questionLink,
        topic: newTask.topic || "",
        answerText: newTask.answerText,
        assignedTo: newTask.assignedTo,
        assignedAt: Timestamp.now(),
        dueAt: Timestamp.fromDate(new Date(newTask.dueAt)),
        status: "pending"
      });
      setNewTask({ questionLink: '', answerText: '', dueAt: '', assignedTo: '', topic: '' });
    } catch (error) {
      alert("Error creating task: " + error.message);
    }
  };

  const handleSubmitLiveLink = async (task, liveLink) => {
    if (!liveLink || !liveLink.trim()) { alert("Please paste the answer link before submitting"); return; }
    if (task.status === "missed" || task.status === "submitted") { alert("This task cannot be submitted."); return; }

    setLoadingTaskId(task.id);
    try {
      const submittedAt = Timestamp.now();
      const workingMinutes = calculateWorkingMinutes(task.assignedAt.toDate(), submittedAt.toDate());
      const scoreDelta = getBasePoints(workingMinutes); // Dashboard uses resolveScore which effectively applies logic. We'll stick to a simplified scoreDelta here or assume 0 for brevity, keeping matching UI. 

      setLocalTaskScores(prev => ({ ...prev, [task.id]: scoreDelta }));

      await addDoc(collection(db, "submissions"), {
        taskId: task.id,
        userId: userData.id,
        answerLink: liveLink,
        submittedAt,
        workingMinutes,
        scoreDelta
      });

      await updateDoc(doc(db, "tasks", task.id), { status: "submitted" });
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: "submitted" } : t)));
      setAnswerLinks(prev => { const copy = { ...prev }; delete copy[task.id]; return copy; });
    } catch (error) {
      alert("Error submitting: " + error.message);
    } finally {
      setLoadingTaskId(null);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center pt-20">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-purple-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-900/10 via-teal-900/5 to-transparent" />
      </div>

      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-teal-500 p-[1px] shadow-[0_0_20px_rgba(167,139,250,0.3)] flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
                <ActivityIcon size={20} className="text-purple-400" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-widest text-white uppercase flex items-center gap-2">
                QACKERCORE
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-black tracking-[0.2em] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-sm uppercase">
                  {userData?.role === "admin" ? "ADMIN ACCESS" : "CONTRIBUTOR"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none">
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button className="flex items-center gap-2 text-sm font-bold text-white hover:text-purple-400 transition-colors cursor-pointer relative">
            <ActivityIcon size={16} /> Activity
            <motion.div layoutId="nav-indicator" className="absolute -bottom-[26px] left-0 right-0 h-[2px] bg-purple-400 shadow-[0_-2px_10px_rgba(167,139,250,1)]" />
          </button>
          <button className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors cursor-pointer">
            <Layers size={16} /> Reports
          </button>
        </nav>

        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { signOut(auth); localStorage.removeItem("trackerUserId"); navigate("/"); }}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-black bg-slate-900 border border-white/10 text-slate-400 transition-all hover:text-rose-400 hover:border-rose-400/30 group"
        >
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> TERMINATE_SESSION
        </motion.button>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-10 relative z-10 px-8 py-10"
      >
        <div className="mb-10 text-center flex flex-col items-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex items-center justify-center">
              <ActivityIcon className="text-purple-400 w-7 h-7" />
            </div>
          </motion.div>
          <motion.h2 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-3xl font-black tracking-tight text-white uppercase">Activity Center</motion.h2>
          <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-slate-400 font-mono mt-2 tracking-widest text-sm uppercase">Manage tasks and monitor ongoing operations</motion.p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="w-full lg:w-[60%] order-2 lg:order-1">
            <LatestOperationsLog
              tasks={tasks}
              users={users}
              submissions={submissions}
              localTaskScores={localTaskScores}
              isAdmin={isAdmin}
              answerLinks={answerLinks}
              setAnswerLinks={setAnswerLinks}
              loadingTaskId={loadingTaskId}
              handleSubmitLiveLink={handleSubmitLiveLink}
              setIsTaskModalOpen={setIsTaskModalOpen}
              theme="pastel"
            />
          </div>

          <div className="w-full lg:w-[40%] order-1 lg:order-2">
            {isAdmin ? (
              <CreateTaskPanel
                newTask={newTask}
                setNewTask={setNewTask}
                users={users}
                handleCreateTask={handleCreateTask}
                theme="pastel"
              />
            ) : (
              <SharedGlassCard className="p-8 border-teal-500/20 text-center" theme="pastel" noHover>
                <h3 className="text-xl font-black text-white uppercase">Waiting for clearance</h3>
                <p className="text-slate-400 mt-2 font-mono text-sm">Contribute answers via the task log to log your activity.</p>
              </SharedGlassCard>
            )}
          </div>
        </div>
      </motion.main>

      <AnimatePresence>
        {isTaskModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl mx-4 bg-slate-950 border border-purple-500/40 rounded-3xl shadow-[0_30px_80px_rgba(15,23,42,0.9)] overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 via-slate-900 to-teal-500/10">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.35em]">Task_Log</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Complete log of all content assignments and their scores
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/40 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto px-4 pb-4 pt-4">
                {tasks.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-sm">
                    No tasks available
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/10 text-[9px] uppercase tracking-[0.2em]">
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Content</th>
                        <th className="py-3 px-3 hidden md:table-cell">Contributors</th>
                        <th className="py-3 px-3 hidden md:table-cell">Assigned</th>
                        <th className="py-3 px-3 hidden md:table-cell">Submitted</th>
                        <th className="py-3 px-3 hidden md:table-cell">Deadline</th>
                        <th className="py-3 px-3 text-right">Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task, index) => {
                        const assignedUser = users.find(u => u.id === task.assignedTo);
                        const taskSubs = submissions.filter(s => s.taskId === task.id);
                        const latestSub = taskSubs
                          .slice()
                          .sort(
                            (a, b) =>
                              (b.submittedAt?.toMillis?.() || 0) -
                              (a.submittedAt?.toMillis?.() || 0)
                          )[0];
                        const baseScore = latestSub?.scoreDelta ?? 0;
                        const score = localTaskScores[task.id] ?? baseScore;
                        const dueDate = task.dueAt?.toDate
                          ? task.dueAt.toDate().toLocaleString()
                          : task.dueAt;
                        const assignedDate = task.assignedAt?.toDate
                          ? task.assignedAt.toDate().toLocaleString()
                          : task.assignedAt;
                        const submittedDate = latestSub?.submittedAt?.toDate
                          ? latestSub.submittedAt.toDate().toLocaleString()
                          : latestSub?.submittedAt;

                        const statusColors = {
                          submitted: "bg-teal-500/10 text-teal-300 border-teal-500/30",
                          missed: "bg-rose-500/10 text-rose-300 border-rose-500/30",
                          pending: "bg-blue-500/10 text-blue-300 border-blue-500/30",
                        };

                        return (
                          <motion.tr
                            key={task.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.01 }}
                            className="border-b border-white/5 last:border-b-0 hover:bg-purple-900/10 transition-colors"
                          >
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${task.status === "submitted" ? statusColors.submitted : task.status === "missed" ? statusColors.missed : statusColors.pending}`}
                              >
                                {task.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 align-top">
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-col gap-1">
                                  <a
                                    href={task.questionLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-purple-300 hover:text-white font-black break-all"
                                  >
                                    FETCH_TARGET
                                  </a>
                                  {task.answerText && (
                                    <p className="text-[10px] text-slate-400 font-mono line-clamp-2">
                                      "{task.answerText}"
                                    </p>
                                  )}
                                </div>
                                {!isAdmin && task.status === "pending" && (
                                  <div className="flex gap-2 mt-2">
                                    <input
                                      type="text"
                                      placeholder="Paste answer link..."
                                      className="bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-[10px] w-full focus:outline-none focus:border-blue-300 transition-all font-mono placeholder:text-slate-700"
                                      value={answerLinks[task.id] || ""}
                                      onChange={(e) =>
                                        setAnswerLinks((prev) => ({
                                          ...prev,
                                          [task.id]: e.target.value
                                        }))
                                      }
                                      disabled={loadingTaskId === task.id}
                                    />
                                    <motion.button
                                      whileHover={{ scale: 1.08, rotate: 4, boxShadow: '0 0 15px rgba(167, 139, 250, 0.5)' }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleSubmitLiveLink(task, answerLinks[task.id])}
                                      disabled={loadingTaskId === task.id}
                                      className="bg-purple-500/80 hover:bg-purple-400 text-white p-2 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                    >
                                      <Send size={14} />
                                    </motion.button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 hidden md:table-cell text-[10px] text-slate-300 font-mono">
                              {assignedUser?.name || "Unknown"}
                            </td>
                            <td className="py-3 px-3 hidden md:table-cell text-[10px] text-slate-400 font-mono">
                              {assignedDate || "—"}
                            </td>
                            <td className="py-3 px-3 hidden md:table-cell text-[10px] text-slate-400 font-mono">
                              {submittedDate || "—"}
                            </td>
                            <td className="py-3 px-3 hidden md:table-cell text-[10px] text-slate-400 font-mono">
                              {dueDate || "N/A"}
                            </td>
                            <td
                              className={`py-3 px-3 text-right text-xs font-black ${score >= 0 ? "text-teal-300" : "text-rose-400"}`}
                            >
                              {score > 0 ? "+" : ""}
                              {score}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
