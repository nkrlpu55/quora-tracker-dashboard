import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  ShieldCheck,
  ExternalLink,
  Send,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  LogOut,
  ChevronRight,
  Fingerprint,
  Cpu,
  Zap,
  Activity,
  Globe,
  Radio
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  doc,
  updateDoc,
  Timestamp,
  increment,
  onSnapshot,
  orderBy,
  limit
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import {
  calculateWorkingMinutes,
  resolveScore
} from "../utils/timeCalculator";
import { checkAndApplyMissedPenalties } from "../utils/missedTaskAutomation";

// --- ANIMATION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [newTask, setNewTask] = useState({ 
    questionLink: '', 
    answerText: '', 
    dueAt: '', 
    assignedTo: '',
    topic: ''
  });
  const [answerLinks, setAnswerLinks] = useState({});
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const navigate = useNavigate();

  // -----------------------------
  // LOAD USER DATA
  // -----------------------------
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
    checkAndApplyMissedPenalties();
  }, [navigate]);

  // -----------------------------
  // REAL-TIME TASKS SUBSCRIPTION
  // -----------------------------
  useEffect(() => {
    if (!userData) return;

    const userId = userData.id;
    const isAdmin = userData.role === "admin";

    let tasksQuery;
    if (isAdmin) {
      tasksQuery = query(
        collection(db, "tasks"),
        orderBy("assignedAt", "desc"),
        limit(50)
      );
    } else {
      tasksQuery = query(
        collection(db, "tasks"),
        where("assignedTo", "==", userId),
        orderBy("assignedAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (isAdmin) {
        setAllTasks(taskList);
        setTasks(taskList);
      } else {
        setTasks(taskList);
      }
    });

    return () => unsubscribe();
  }, [userData]);

  // -----------------------------
  // REAL-TIME SUBMISSIONS SUBSCRIPTION
  // -----------------------------
  useEffect(() => {
    if (!userData) return;

    const userId = userData.id;
    const isAdmin = userData.role === "admin";

    let subsQuery;
    if (isAdmin) {
      subsQuery = query(
        collection(db, "submissions"),
        orderBy("submittedAt", "desc"),
        limit(100)
      );
    } else {
      subsQuery = query(
        collection(db, "submissions"),
        where("userId", "==", userId),
        orderBy("submittedAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(subsQuery, (snapshot) => {
      const subsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSubmissions(subsList);
    });

    return () => unsubscribe();
  }, [userData]);

  // -----------------------------
  // REAL-TIME USERS SUBSCRIPTION (ADMIN ONLY)
  // -----------------------------
  useEffect(() => {
    if (!userData || userData.role !== "admin") return;

    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    });

    return () => unsubscribe();
  }, [userData]);

  // -----------------------------
  // BUILD ANALYTICS DATA FROM SUBMISSIONS
  // -----------------------------
  useEffect(() => {
    if (submissions.length === 0) {
      setAnalyticsData([
        { name: '01', submissions: 0, quality: 0 },
        { name: '02', submissions: 0, quality: 0 },
        { name: '03', submissions: 0, quality: 0 },
        { name: '04', submissions: 0, quality: 0 },
        { name: '05', submissions: 0, quality: 0 },
        { name: '06', submissions: 0, quality: 0 },
        { name: '07', submissions: 0, quality: 0 },
      ]);
      return;
    }

    // Group submissions by day of week (last 7 days)
    const now = new Date();
    const dayData = {};
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayKey = String(date.getDate()).padStart(2, '0');
      dayData[dayKey] = { submissions: 0, totalScore: 0, count: 0 };
    }

    submissions.forEach(sub => {
      if (sub.submittedAt) {
        const subDate = sub.submittedAt.toDate();
        const dayKey = String(subDate.getDate()).padStart(2, '0');
        
        if (dayData[dayKey]) {
          dayData[dayKey].submissions += 1;
          dayData[dayKey].totalScore += sub.scoreDelta || 0;
          dayData[dayKey].count += 1;
        }
      }
    });

    const chartData = Object.keys(dayData).map(day => ({
      name: day,
      submissions: dayData[day].submissions,
      quality: dayData[day].count > 0 
        ? Math.max(0, Math.min(100, 50 + (dayData[day].totalScore / dayData[day].count) * 10))
        : 0
    }));

    setAnalyticsData(chartData);
  }, [submissions]);

  // -----------------------------
  // ADMIN: CREATE TASK
  // -----------------------------
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

      setNewTask({ 
        questionLink: '', 
        answerText: '', 
        dueAt: '', 
        assignedTo: '',
        topic: ''
      });
    } catch (error) {
      alert("Error creating task: " + error.message);
    }
  };

  // -----------------------------
  // CONTRIBUTOR: SUBMIT ANSWER
  // -----------------------------
  const handleSubmitLiveLink = async (task, liveLink) => {
    if (!liveLink || !liveLink.trim()) {
      alert("Please paste the answer link before submitting");
      return;
    }

    if (task.status === "missed" || task.status === "submitted") {
      alert("This task cannot be submitted.");
      return;
    }

    setLoadingTaskId(task.id);

    try {
      const userId = userData.id;
      const submittedAt = Timestamp.now();

      const workingMinutes = calculateWorkingMinutes(
        task.assignedAt.toDate(),
        submittedAt.toDate()
      );

      const scoreDelta = resolveScore(workingMinutes);

      await addDoc(collection(db, "submissions"), {
        taskId: task.id,
        userId,
        answerLink: liveLink,
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

      setAnswerLinks(prev => {
        const copy = { ...prev };
        delete copy[task.id];
        return copy;
      });
    } catch (error) {
      alert("Error submitting: " + error.message);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // -----------------------------
  // LOGOUT
  // -----------------------------
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("trackerUserId");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // -----------------------------
  // BUILD LEADERBOARD DATA
  // -----------------------------
  const buildLeaderboard = () => {
    const contributorUsers = users.filter(u => u.role === "user");
    
    return contributorUsers.map(user => {
      const userSubs = submissions.filter(s => s.userId === user.id);
      
      // Deduplicate submissions per task (latest wins)
      const latestByTask = {};
      userSubs.forEach(sub => {
        const existing = latestByTask[sub.taskId];
        if (
          !existing ||
          sub.submittedAt?.toMillis() > existing.submittedAt?.toMillis()
        ) {
          latestByTask[sub.taskId] = sub;
        }
      });

      const finalSubs = Object.values(latestByTask);
      const totalScore = finalSubs.reduce((sum, s) => sum + (s.scoreDelta || 0), 0);

      return {
        id: user.id,
        name: user.name,
        totalScore,
        level: Math.floor((totalScore || 0) / 10)
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  };

  // -----------------------------
  // BUILD PERFORMANCE DATA (ADMIN)
  // -----------------------------
  const buildPerformanceData = () => {
    return users
      .filter(u => u.role === "user")
      .map(user => {
        const userTasks = tasks.filter(t => t.assignedTo === user.id);
        const userSubs = submissions.filter(s => s.userId === user.id);

        // Keep latest submission per task
        const latestSubByTask = {};
        userSubs.forEach(sub => {
          const existing = latestSubByTask[sub.taskId];
          if (
            !existing ||
            sub.submittedAt?.toMillis() > existing.submittedAt?.toMillis()
          ) {
            latestSubByTask[sub.taskId] = sub;
          }
        });

        const finalSubs = Object.values(latestSubByTask);
        const totalTasks = userTasks.length;
        const submittedTasks = finalSubs.length;
        const missedTasks = userTasks.filter(t => t.status === "missed").length;

        const totalScore = finalSubs.reduce((sum, s) => sum + (s.scoreDelta || 0), 0);
        const avgScore = submittedTasks > 0 ? (totalScore / submittedTasks).toFixed(2) : "0.00";

        const lastSubmission = finalSubs.length > 0
          ? finalSubs
              .map(s => s.submittedAt?.toDate())
              .filter(Boolean)
              .sort((a, b) => b - a)[0]
              .toLocaleString()
          : "—";

        return {
          id: user.id,
          name: user.name,
          totalTasks,
          submittedTasks,
          missedTasks,
          totalScore,
          avgScore,
          lastSubmission
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  };

  // -----------------------------
  // CALCULATE STATS
  // -----------------------------
  const getStats = () => {
    if (userData?.role === "admin") {
      const activeTasks = tasks.filter(t => t.status === "pending" || t.status === "assigned").length;
      const completedTasks = tasks.filter(t => t.status === "submitted").length;
      const avgResponseTime = submissions.length > 0
        ? (submissions.reduce((sum, s) => sum + (s.workingMinutes || 0), 0) / submissions.length / 60).toFixed(1)
        : 0;
      
      return {
        activeQueue: activeTasks,
        trustScore: completedTasks > 0 ? `${((completedTasks / tasks.length) * 100).toFixed(1)}%` : "0%",
        response: `${avgResponseTime}h`,
        processing: activeTasks > 10 ? "High" : activeTasks > 5 ? "Medium" : "Low"
      };
    } else {
      const mySubmissions = submissions.filter(s => s.userId === userData?.id);
      const completedCount = tasks.filter(t => t.status === "submitted").length;
      const totalScore = mySubmissions.reduce((sum, s) => sum + (s.scoreDelta || 0), 0);
      const avgScore = mySubmissions.length > 0
        ? (mySubmissions.reduce((sum, s) => sum + (s.scoreDelta || 0), 0) / mySubmissions.length)
        : 0;
      
      return {
        activeQueue: tasks.filter(t => t.status === "pending" || t.status === "assigned").length,
        trustScore: `${Math.max(0, Math.min(100, 50 + avgScore * 10)).toFixed(1)}%`,
        response: mySubmissions.length > 0
          ? `${(mySubmissions.reduce((sum, s) => sum + (s.workingMinutes || 0), 0) / mySubmissions.length / 60).toFixed(1)}h`
          : "0h",
        processing: totalScore > 50 ? "High" : totalScore > 20 ? "Medium" : "Low"
      };
    }
  };

  const stats = getStats();

  // -----------------------------
  // UI COMPONENTS
  // -----------------------------
  const GlassCard = ({ children, className = "", noHover = false }) => (
    <motion.div
      variants={itemVariants}
      whileHover={noHover ? {} : { y: -5, borderColor: 'rgba(99, 102, 241, 0.4)' }}
      className={`bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <GlassCard className="p-6 flex items-center space-x-4 border-l-4" style={{ borderLeftColor: color === 'indigo' ? '#6366f1' : color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : '#a855f7' }}>
      <div className={`p-3 rounded-2xl ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400' : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : color === 'amber' ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'} shadow-inner`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">{label}</p>
        <motion.p
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-2xl font-black text-white tracking-tighter"
        >
          {value}
        </motion.p>
      </div>
    </GlassCard>
  );

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const isAdmin = userData.role === "admin";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30"
    >
      {/* Animated Background Grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1)_0%,transparent_50%)]" />
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
      </div>

      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div className="flex items-center space-x-4">
          <motion.div
            whileHover={{ rotate: 180 }}
            className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]"
          >
            <Radio className="text-white" size={32} />
          </motion.div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">QACKER<span className="text-indigo-500">CORE</span></h1>
            <div className="flex items-center gap-2 mt-1">
               <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${isAdmin ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                 {isAdmin ? 'ADMIN' : 'CONTRIBUTOR'} ACCESS
               </span>
               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-white/5">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                 <span className="text-[9px] text-slate-500 font-mono font-bold tracking-widest uppercase">Live_Session</span>
               </div>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-black bg-slate-900 border border-white/10 text-slate-400 transition-all hover:text-rose-400 hover:border-rose-400/30 group"
        >
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> TERMINATE_SESSION
        </motion.button>
      </header>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-10 relative z-10"
      >
        {/* Analytics Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard icon={LayoutDashboard} label="Active Queue" value={stats.activeQueue} color="indigo" />
          <StatCard icon={CheckCircle2} label="Trust Score" value={stats.trustScore} color="emerald" />
          <StatCard icon={Clock} label="Response" value={stats.response} color="amber" />
          <StatCard icon={Zap} label="Processing" value={stats.processing} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Real-time Graph */}
            <GlassCard className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-3">
                    <Activity className="text-indigo-400" />
                    {isAdmin ? 'NETWORK_THROUGHPUT' : 'PERSONAL_VELOCITY'}
                  </h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">Historical performance visualization</p>
                </div>
                <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                   <div className="w-3 h-3 rounded-full bg-white/5" />
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isAdmin ? '#6366f1' : '#10b981'} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={isAdmin ? '#6366f1' : '#10b981'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="5 5" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="submissions"
                      stroke={isAdmin ? '#6366f1' : '#10b981'}
                      fill="url(#chartGradient)"
                      strokeWidth={4}
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Task List */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <h3 className="text-[11px] font-black text-slate-500 tracking-[0.3em] uppercase whitespace-nowrap">
                   Mission_Registry_ST_004
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              <AnimatePresence mode="popLayout">
                {tasks.length === 0 ? (
                  <GlassCard className="p-8 text-center">
                    <p className="text-slate-500">No tasks available</p>
                  </GlassCard>
                ) : (
                  (showAllTasks ? tasks : tasks.slice(0, 5)).map((task, index) => {
                    const assignedUser = users.find(u => u.id === task.assignedTo);
                    const taskSubmission = submissions.find(s => s.taskId === task.id && s.userId === (isAdmin ? undefined : userData.id));
                    const dueDate = task.dueAt?.toDate ? task.dueAt.toDate().toLocaleDateString() : task.dueAt;

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <GlassCard className="p-8 group">
                          <div className="flex flex-col md:flex-row justify-between gap-10">
                            <div className="space-y-5 flex-1">
                              <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${task.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : task.status === 'missed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                                  {task.status}
                                </span>
                                <a href={task.questionLink} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-white transition-colors flex items-center gap-2 font-black text-xs group/link">
                                  FETCH_TARGET <ExternalLink size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                </a>
                              </div>
                              <div className="relative group/draft">
                                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-indigo-500/20 group-hover/draft:bg-indigo-500 transition-colors rounded-full" />
                                <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest">Encrypted_Draft</p>
                                <p className="text-slate-300 text-sm leading-relaxed font-medium">"{task.answerText || 'No draft provided'}"</p>
                              </div>
                            </div>

                            <div className="md:w-80 flex flex-col justify-between md:border-l border-white/5 md:pl-10 gap-8">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-mono">
                                  <span className="text-slate-600 uppercase font-bold tracking-widest">Operative</span>
                                  <span className="text-slate-200 font-black">{assignedUser?.name || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-mono">
                                  <span className="text-slate-600 uppercase font-bold tracking-widest">Expiry</span>
                                  <span className="text-rose-500 font-black">{dueDate || 'N/A'}</span>
                                </div>
                                {taskSubmission && (
                                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2 border-t border-white/5 space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                      <span className="text-slate-600 uppercase font-bold">Score</span>
                                      <span className="text-emerald-400 font-black">{taskSubmission.scoreDelta > 0 ? '+' : ''}{taskSubmission.scoreDelta}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                      <span className="text-slate-600 uppercase font-bold">Time</span>
                                      <span className="text-amber-400 font-black">{taskSubmission.workingMinutes}m</span>
                                    </div>
                                  </motion.div>
                                )}
                              </div>

                              {!isAdmin && task.status === "pending" && (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="DEPLOY_LINK..."
                                    className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs w-full focus:outline-none focus:border-indigo-500 transition-all font-mono placeholder:text-slate-700"
                                    value={answerLinks[task.id] || ""}
                                    onChange={(e) => setAnswerLinks(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    disabled={loadingTaskId === task.id}
                                  />
                                  <motion.button
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleSubmitLiveLink(task, answerLinks[task.id])}
                                    disabled={loadingTaskId === task.id}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                  >
                                    <Send size={18} />
                                  </motion.button>
                                </div>
                              )}

                              {taskSubmission && (
                                <div className="text-[10px] bg-emerald-500/5 text-emerald-500/70 p-4 rounded-2xl border border-emerald-500/10 break-all font-mono flex items-center gap-3">
                                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                                  {taskSubmission.answerLink}
                                </div>
                              )}
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
              
              {tasks.length > 5 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAllTasks(!showAllTasks)}
                  className="w-full py-4 bg-slate-900/60 border border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2"
                >
                  {showAllTasks ? (
                    <>
                      <ChevronRight size={16} className="rotate-90" />
                      SHOW LESS
                    </>
                  ) : (
                    <>
                      <ChevronRight size={16} className="-rotate-90" />
                      SHOW MORE ({tasks.length - 5} MORE TASKS)
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-10">
            {isAdmin ? (
              <GlassCard className="p-8 sticky top-8 border-indigo-500/20" noHover>
                <div className="absolute top-0 right-0 p-4">
                   <Cpu size={40} className="text-indigo-500/10" />
                </div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <PlusCircle className="text-indigo-500" /> MISSION_DEPLOY
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Quora Target URL</label>
                    <input
                      type="text"
                      placeholder="HTTPS://..."
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                      value={newTask.questionLink}
                      onChange={(e) => setNewTask({...newTask, questionLink: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select Operative</label>
                    <select
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                    >
                      <option value="">TIER_PERSONNEL...</option>
                      {users.filter(u => u.role === "user").map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} [LVL_{Math.floor((user.score || 0) / 10)}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Context Directive</label>
                    <textarea
                      placeholder="Input encrypted copy instructions..."
                      rows={4}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                      value={newTask.answerText}
                      onChange={(e) => setNewTask({...newTask, answerText: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Deadline</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={newTask.dueAt}
                      onChange={(e) => setNewTask({...newTask, dueAt: e.target.value})}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateTask}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                  >
                    <ShieldCheck size={20} /> INITIALIZE_DEPLOYMENT
                  </motion.button>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-8 sticky top-8 border-emerald-500/20" noHover>
                <div className="absolute top-0 right-0 p-4">
                   <Globe size={40} className="text-emerald-500/10" />
                </div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <Award className="text-emerald-400" /> OPERATIVE_METRICS
                </h3>
                <div className="space-y-10">
                  <div className="flex justify-between items-end">
                    <div>
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Current Tier</p>
                       <p className="text-5xl font-black text-white leading-none mt-2">Lvl {Math.floor((userData.score || 0) / 10)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Net Yield</p>
                       <p className="text-2xl font-black text-emerald-400 leading-none mt-2">{userData.score || 0} XP</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <span>Monthly_Quota</span>
                      <span className="text-emerald-400">{tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "submitted").length / tasks.length) * 100) : 0}%_LOGGED</span>
                    </div>
                    <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden p-1 border border-white/5 shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === "submitted").length / tasks.length) * 100 : 0}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5 space-y-6">
                    <h4 className="text-[9px] font-black text-slate-600 tracking-[0.2em] uppercase">Achievements_Unlocked</h4>
                    {submissions.length >= 14 && (
                      <div className="flex items-center gap-5 group cursor-pointer">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20 transition-all group-hover:scale-110">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-white font-black uppercase">Steadfast_Pulse</p>
                          <p className="text-[10px] text-slate-500 font-mono tracking-tighter">14 Day Streak Established</p>
                        </div>
                      </div>
                    )}
                    {submissions.some(s => s.scoreDelta >= 5) && (
                      <div className="flex items-center gap-5 group cursor-pointer">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition-all group-hover:scale-110">
                          <Award size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-white font-black uppercase">Apex_Strategist</p>
                          <p className="text-[10px] text-slate-500 font-mono tracking-tighter">Answer Score {'>'} 90% Global</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Leaderboard for Contributors */}
            {!isAdmin && (
              <GlassCard className="p-8 border-emerald-500/20" noHover>
                <div className="absolute top-0 right-0 p-4">
                  <TrendingUp size={40} className="text-emerald-500/10" />
                </div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <Award className="text-emerald-400" /> RANKING_BOARD
                </h3>
                <div className="space-y-4">
                  {buildLeaderboard().slice(0, 10).map((player, index) => {
                    const isCurrentUser = player.id === userData.id;
                    const rankIcon = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
                    
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCurrentUser
                            ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                            : 'bg-slate-900/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`text-2xl font-black ${index < 3 ? '' : 'text-slate-500'}`}>
                              {rankIcon}
                            </div>
                            <div>
                              <p className={`text-sm font-black ${isCurrentUser ? 'text-emerald-400' : 'text-white'}`}>
                                {player.name}
                                {isCurrentUser && <span className="ml-2 text-[10px] text-emerald-400">(YOU)</span>}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">Level {player.level}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-black ${player.totalScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {player.totalScore > 0 ? '+' : ''}{player.totalScore}
                            </p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">XP</p>
                          </div>
                        </div>
                        {index < 3 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="mt-2 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                            style={{ width: `${(player.totalScore / Math.max(buildLeaderboard()[0]?.totalScore || 1, 1)) * 100}%` }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {/* Performance Table for Admin */}
            {isAdmin && (
              <GlassCard className="p-8 border-indigo-500/20" noHover>
                <div className="absolute top-0 right-0 p-4">
                  <TrendingUp size={40} className="text-indigo-500/10" />
                </div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <ShieldCheck className="text-indigo-400" /> OPERATIVE_PERFORMANCE
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="pb-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Rank</th>
                        <th className="pb-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Name</th>
                        <th className="pb-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Tasks</th>
                        <th className="pb-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Submitted</th>
                        <th className="pb-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Missed</th>
                        <th className="pb-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Score</th>
                        <th className="pb-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildPerformanceData().map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                            index === 0 ? 'bg-indigo-500/5' : ''
                          }`}
                        >
                          <td className="py-3 text-sm font-black text-slate-400">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </td>
                          <td className="py-3 text-sm font-black text-white">{user.name}</td>
                          <td className="py-3 text-xs font-mono text-slate-400">{user.totalTasks}</td>
                          <td className="py-3 text-xs font-mono text-emerald-400">{user.submittedTasks}</td>
                          <td className={`py-3 text-xs font-mono ${user.missedTasks > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {user.missedTasks}
                          </td>
                          <td className={`py-3 text-sm font-black ${user.totalScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {user.totalScore > 0 ? '+' : ''}{user.totalScore}
                          </td>
                          <td className="py-3 text-xs font-mono text-slate-400">{user.avgScore}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}

            {/* Global Feed */}
            <GlassCard className="p-8 bg-indigo-900/10 border-indigo-500/10" noHover>
              <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-6 flex items-center gap-3">
                <AlertCircle size={14} className="text-indigo-500" /> SYSTEM_LOGS_STREAM
              </h3>
              <div className="space-y-5">
                {[
                  { time: new Date().toLocaleTimeString().slice(0, 5), msg: `${isAdmin ? 'Admin' : 'User'} [${userData.name}] session active` },
                  { time: new Date(Date.now() - 3600000).toLocaleTimeString().slice(0, 5), msg: 'System check: 100% data integrity' },
                  { time: new Date(Date.now() - 7200000).toLocaleTimeString().slice(0, 5), msg: 'Network packet flow optimized' }
                ].map((log, i) => (
                  <div key={i} className="flex gap-5 text-[10px] font-mono group cursor-default">
                    <span className="text-indigo-500/40 group-hover:text-indigo-400 transition-colors shrink-0">{log.time}</span>
                    <span className="text-slate-500 group-hover:text-slate-300 transition-colors leading-tight">{log.msg}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </motion.main>

      <footer className="max-w-7xl mx-auto mt-24 pb-12 flex flex-col md:flex-row justify-between items-center text-[9px] font-mono text-slate-700 gap-6 border-t border-white/5 pt-10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          QACKER_ENCRYPTION_LAYER_ACTIVE // ID:0x4F92A
        </div>
        <div className="flex gap-8 uppercase tracking-[0.3em] font-black">
          <span className="hover:text-indigo-500 cursor-pointer transition-colors">Infra_Status</span>
          <span className="hover:text-indigo-500 cursor-pointer transition-colors">Neural_Link</span>
          <span className="text-emerald-500/50">Secure_Node_01</span>
        </div>
      </footer>
    </motion.div>
  );
}
