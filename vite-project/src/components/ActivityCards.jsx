import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, PlusCircle, Cpu, ShieldCheck } from "lucide-react";

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export const SharedGlassCard = ({ children, className = "", noHover = false, theme = "neon" }) => (
  <motion.div
    variants={itemVariants}
    whileHover={noHover ? {} : { 
      y: -5, 
      borderColor: theme === 'pastel' ? 'rgba(167, 139, 250, 0.4)' : 'rgba(99, 102, 241, 0.4)',
      boxShadow: theme === 'pastel' ? '0 10px 30px rgba(167, 139, 250, 0.15)' : undefined
    }}
    className={`bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    {children}
  </motion.div>
);

export const LatestOperationsLog = ({
  tasks,
  users,
  submissions,
  localTaskScores,
  isAdmin,
  answerLinks,
  setAnswerLinks,
  loadingTaskId,
  handleSubmitLiveLink,
  setIsTaskModalOpen,
  theme = "neon"
}) => {
  const isPastel = theme === "pastel";
  
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setIsTaskModalOpen(true)}
        className="flex items-center gap-4 px-2 group w-full"
      >
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex flex-col items-center">
          <h3 className={`text-[11px] font-black text-slate-500 tracking-[0.3em] uppercase whitespace-nowrap transition-colors ${isPastel ? 'group-hover:text-purple-300' : 'group-hover:text-indigo-400'}`}>
            Task_Log
          </h3>
          <p className="text-[9px] text-slate-600 font-mono tracking-[0.25em] uppercase mt-1">
            Tap to view full history
          </p>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </button>

      <AnimatePresence mode="popLayout">
        {tasks.length === 0 ? (
          <SharedGlassCard className="p-8 text-center" theme={theme}>
            <p className="text-slate-500">No tasks available</p>
          </SharedGlassCard>
        ) : (
          <SharedGlassCard className="overflow-hidden" theme={theme}>
            <div className="px-6 pt-6 pb-2 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">
                Latest_Operations_Log
              </p>
              <span className="text-[10px] text-slate-600 font-mono">
                Showing {Math.min(5, tasks.length)} of {tasks.length}
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto px-2 pb-2">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-slate-500 border-b border-white/10 text-[9px] uppercase tracking-[0.2em]">
                    <th className="py-2 px-4">Status</th>
                    <th className="py-2 px-4">Content</th>
                    <th className="py-2 px-4 hidden md:table-cell">Assigned</th>
                    <th className="py-2 px-4 hidden md:table-cell">Submitted</th>
                    <th className="py-2 px-4 hidden md:table-cell">Contributors</th>
                    <th className="py-2 px-4 text-right">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks
                    .slice(0, 5)
                    .map((task, index) => {
                      const assignedUser = users.find(u => u.id === task.assignedTo);
                      const taskSubs = submissions.filter(s => s.taskId === task.id);
                      const latestSub = taskSubs
                        .slice()
                        .sort((a, b) => (b.submittedAt?.toMillis?.() || 0) - (a.submittedAt?.toMillis?.() || 0))[0];
                      const baseScore = latestSub?.scoreDelta ?? 0;
                      const score = localTaskScores[task.id] ?? baseScore;
                      const assignedDate = task.assignedAt?.toDate
                        ? task.assignedAt.toDate().toLocaleDateString()
                        : task.assignedAt;
                      const submittedDate = latestSub?.submittedAt?.toDate
                        ? latestSub.submittedAt.toDate().toLocaleDateString()
                        : latestSub?.submittedAt;

                      const statusColors = {
                        submitted: isPastel ? "bg-teal-500/10 text-teal-300 border-teal-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                        missed: isPastel ? "bg-rose-500/10 text-rose-300 border-rose-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30",
                        pending: isPastel ? "bg-blue-500/10 text-blue-300 border-blue-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30",
                      };
                      
                      const linkColor = isPastel ? "text-purple-300" : "text-indigo-400";
                      const hoverBg = isPastel ? "hover:bg-purple-900/10" : "hover:bg-white/5";

                      return (
                        <motion.tr
                          key={task.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`border-b border-white/5 last:border-b-0 transition-colors ${hoverBg}`}
                        >
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${task.status === "submitted" ? statusColors.submitted : task.status === "missed" ? statusColors.missed : statusColors.pending}`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-2">
                              <a
                                href={task.questionLink}
                                target="_blank"
                                rel="noreferrer"
                                className={`text-xs ${linkColor} hover:text-white font-black line-clamp-2 break-all`}
                              >
                                FETCH_TARGET
                              </a>
                              {!isAdmin && task.status === "pending" && (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Paste answer link..."
                                    className={`bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-[10px] w-full focus:outline-none focus:border-${isPastel ? 'blue-300' : 'indigo-500'} transition-all font-mono placeholder:text-slate-700`}
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
                                    whileHover={{ scale: 1.08, rotate: 4, boxShadow: isPastel ? '0 0 15px rgba(167, 139, 250, 0.5)' : undefined }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() =>
                                      handleSubmitLiveLink(task, answerLinks[task.id])
                                    }
                                    disabled={loadingTaskId === task.id}
                                    className={`${isPastel ? 'bg-purple-500/80 hover:bg-purple-400' : 'bg-indigo-600 hover:bg-indigo-500'} text-white p-2 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50`}
                                  >
                                    <Send size={14} />
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell text-[10px] text-slate-400 font-mono">
                            {assignedDate || "—"}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell text-[10px] text-slate-400 font-mono">
                            {submittedDate || "—"}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell text-[10px] text-slate-300 font-mono">
                            {assignedUser?.name || "Unknown"}
                          </td>
                          <td
                            className={`py-3 px-4 text-right text-xs font-black ${score >= 0 ? (isPastel ? "text-teal-300" : "text-emerald-400") : "text-rose-400"}`}
                          >
                            {score > 0 ? "+" : ""}
                            {score}
                          </td>
                        </motion.tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {tasks.length > 5 && (
              <div className="px-6 pb-4 pt-2 border-t border-white/5 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setIsTaskModalOpen(true)}
                  className={`text-[10px] px-4 py-2 rounded-full bg-slate-900 border ${isPastel ? 'border-teal-500/40 text-teal-300' : 'border-emerald-500/40 text-emerald-400'} font-black tracking-[0.2em] uppercase`}
                >
                  Show_Full_Log
                </motion.button>
              </div>
            )}
          </SharedGlassCard>
        )}
      </AnimatePresence>
    </div>
  );
};

export const CreateTaskPanel = ({
  newTask,
  setNewTask,
  users,
  handleCreateTask,
  theme = "neon"
}) => {
  const isPastel = theme === "pastel";
  
  return (
    <SharedGlassCard className={`p-8 sticky top-8 ${isPastel ? 'border-purple-500/20' : 'border-indigo-500/20'}`} noHover theme={theme}>
      <div className="absolute top-0 right-0 p-4">
        <Cpu size={40} className={isPastel ? 'text-purple-300/20' : 'text-indigo-500/10'} />
      </div>
      <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-white">
        <PlusCircle className={isPastel ? 'text-purple-400' : 'text-indigo-500'} /> CREATE_TASK
      </h3>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Quora QUESTION URL</label>
          <input
            type="text"
            placeholder="HTTPS://..."
            className={`w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-${isPastel ? 'purple-400' : 'indigo-500'} transition-all font-mono text-white`}
            value={newTask.questionLink}
            onChange={(e) => setNewTask({ ...newTask, questionLink: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select Member</label>
          <select
            className={`w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-${isPastel ? 'purple-400' : 'indigo-500'} transition-all text-white`}
            value={newTask.assignedTo}
            onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
          >
            <option value="">MEMBER...</option>
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
            className={`w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-${isPastel ? 'purple-400' : 'indigo-500'} transition-all resize-none text-white`}
            value={newTask.answerText}
            onChange={(e) => setNewTask({ ...newTask, answerText: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Deadline</label>
          <input
            type="datetime-local"
            className={`w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-${isPastel ? 'purple-400' : 'indigo-500'} transition-all text-white`}
            value={newTask.dueAt}
            onChange={(e) => setNewTask({ ...newTask, dueAt: e.target.value })}
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: isPastel ? '0 15px 30px rgba(167, 139, 250, 0.4)' : undefined }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreateTask}
          className={`w-full ${isPastel ? 'bg-gradient-to-r from-purple-500 to-indigo-400 hover:from-purple-400 hover:to-indigo-300' : 'bg-indigo-600 hover:bg-indigo-500'} text-white font-black py-5 rounded-2xl shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs`}
        >
          <ShieldCheck size={20} /> START_TASK
        </motion.button>
      </div>
    </SharedGlassCard>
  );
};
