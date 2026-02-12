import { useState } from "react";
import { 
  ShieldCheck, 
  User, 
  ChevronRight, 
  Radio, 
  ArrowLeft, 
  Key, 
  Mail, 
  Lock, 
  Fingerprint, 
  Activity
} from "lucide-react";
import { signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [mode, setMode] = useState("select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passKey, setPassKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ---------------- ADMIN LOGIN (UNCHANGED) ----------------
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("trackerUserId", res.user.uid);
      navigate("/dashboard");
    } catch (err) {
      setError("Access Denied: Invalid Administrative Credentials.");
    } finally {
      setLoading(false);
    }
  };

  // ------------- CONTRIBUTOR LOGIN (UNCHANGED) -------------
  const handleUserLogin = async (e) => {
    e.preventDefault();
    if (!passKey) {
      setError("Security Alert: Pass Key Required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInAnonymously(auth);

      const q = query(
        collection(db, "users"),
        where("passKey", "==", passKey),
        where("role", "==", "user")
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        setError("Security Alert: Unauthorized Pass Key.");
        return;
      }

      localStorage.setItem("trackerUserId", snap.docs[0].id);
      navigate("/dashboard");
    } catch (err) {
      setError("System Error: Protocol synchronization failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-sans text-slate-200">
      
      {/* --- GLOBAL CSS FOR CUSTOM ANIMATIONS --- */}
      <style>{`
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes grid-scroll {
          from { background-position: 0 0; }
          to { background-position: 40px 40px; }
        }
        @keyframes drift {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
          100% { transform: translate(-20px, 30px) scale(1); }
        }
        .animate-rotate-slow { animation: rotate-slow 8s linear infinite; }
        .animate-grid-scroll { animation: grid-scroll 3s linear infinite; }
        .animate-drift { animation: drift 15s ease-in-out infinite alternate; }
        .delay-2000 { animation-delay: 2s; }
      `}</style>

      {/* --- BACKGROUND LAYER --- */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        
        {/* Drifting Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 blur-[120px] rounded-full animate-drift" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full animate-drift delay-2000" />
        
        {/* Animated Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03] animate-grid-scroll" 
             style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-0 overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] z-10 bg-slate-900/40 backdrop-blur-3xl animate-in zoom-in-95 duration-700">
        
        {/* --- BRAND PANEL (LEFT) --- */}
        <div className="bg-[#0f172a] p-12 flex flex-col justify-between relative overflow-hidden border-r border-white/5 hidden md:flex">
           <div className="absolute inset-0 opacity-5">
              <div className="w-full h-full animate-grid-scroll" 
                   style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
           </div>
           
           <div className="relative z-10">
             {/* ROTATING ICON BOX */}
             <div className="relative w-20 h-20 mb-12 group">
               {/* Original Indigo-600 color restored and rotating */}
               <div className="absolute inset-0 bg-indigo-600/20 rounded-2xl animate-rotate-slow group-hover:bg-indigo-600/30 transition-colors border border-indigo-600/40" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <Radio className="text-indigo-600 group-hover:scale-110 transition-transform animate-pulse" size={32} />
               </div>
               <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center animate-bounce shadow-lg">
                 <Activity size={12} className="text-white" />
               </div>
             </div>

             <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.85] mb-6">
               QACKER<br />
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-black">NEXUS</span>
             </h1>
             <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xs border-l-2 border-indigo-500/50 pl-4 py-1">
               Advanced tracking protocol for the Quora data ecosystem.
             </p>
           </div>

           <div className="relative z-10 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              <div className="flex items-center gap-3">
                <Fingerprint size={16} className="text-indigo-500 animate-pulse" /> 
                <span className="opacity-70">AUTH_V5.0_STABLE</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                SECURE_LINK
              </div>
           </div>
        </div>

        {/* --- FORM PANEL (RIGHT) --- */}
        <div className="p-8 md:p-16 flex flex-col justify-center relative bg-slate-900/60 backdrop-blur-md min-h-[500px]">
          {error && (
            <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              {error}
            </div>
          )}

          {/* Mode Selector */}
          {mode === "select" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="mb-10">
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Access Gate</h2>
                <div className="h-1 w-12 bg-indigo-500 rounded-full mb-4" />
                <p className="text-slate-500 text-sm font-medium">Clearance required to proceed to the core interface.</p>
              </div>

              <button 
                onClick={() => setMode("admin")}
                className="group w-full flex items-center justify-between p-6 bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-indigo-600/10 hover:border-indigo-500/50 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-indigo-500/10 rounded-2xl group-hover:bg-indigo-500/30 group-hover:rotate-12 transition-all">
                    <ShieldCheck className="text-indigo-400" size={24} />
                  </div>
                  <div>
                    <div className="text-white font-black uppercase tracking-wide">Admin</div>
                    <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5 group-hover:text-indigo-400 transition-colors">For control & management</div>
                  </div>
                </div>
                <ChevronRight className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" size={20} />
              </button>

              <button 
                onClick={() => setMode("user")}
                className="group w-full flex items-center justify-between p-6 bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-emerald-600/10 hover:border-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/30 group-hover:-rotate-12 transition-all">
                    <User className="text-emerald-400" size={24} />
                  </div>
                  <div>
                    <div className="text-white font-black uppercase tracking-wide">Contributor</div>
                    <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5 group-hover:text-emerald-400 transition-colors">Activity & Collaboration</div>
                  </div>
                </div>
                <ChevronRight className="text-slate-700 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" size={20} />
              </button>
            </div>
          )}

          {/* Admin Form */}
          {mode === "admin" && (
            <form onSubmit={handleAdminLogin} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Admin Credentials</h3>
                  <div className="h-1 w-8 bg-indigo-500 rounded-full mt-1" />
                </div>
                <button type="button" onClick={() => setMode("select")} className="text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <ArrowLeft size={14} /> Back
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-400 transition-colors">Identity Path</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@nexus.io"
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 transition-all font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-400 transition-colors">Encryption Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 transition-all font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 overflow-hidden"
              >
                {loading ? <Activity className="animate-spin" size={16} /> : "VALIDATE & ENTER"}
              </button>
            </form>
          )}

          {/* User Form */}
          {mode === "user" && (
            <form onSubmit={handleUserLogin} className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 text-center">
              <div className="mb-2 flex items-center justify-between text-left">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Operative Entry</h3>
                  <div className="h-1 w-8 bg-emerald-500 rounded-full mt-1" />
                </div>
                <button type="button" onClick={() => setMode("select")} className="text-slate-500 hover:text-emerald-400 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <ArrowLeft size={14} /> Back
                </button>
              </div>

              <div className="space-y-6">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20 relative group">
                  <Key size={36} className="group-hover:rotate-45 transition-transform" />
                  <div className="absolute inset-0 rounded-[2rem] border border-emerald-500/40 animate-ping opacity-20" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Alpha-Numeric Pass Key</label>
                  <input
                    type="password"
                    required
                    value={passKey}
                    onChange={(e) => setPassKey(e.target.value)}
                    placeholder="REQUIRED_ID"
                    className="w-full px-4 py-5 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-emerald-500 transition-all text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <Activity className="animate-spin" size={16} /> : "DECRYPT ACCESS"}
              </button>
              
              <p className="text-[9px] text-slate-600 font-mono tracking-widest uppercase animate-pulse">
                System is monitoring all clearing attempts
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
