import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminTasks from "./pages/AdminTasks";
import MyTasks from "./pages/MyTasks";
import Leaderboard from "./pages/Leaderboard";
import AdminPerformance from "./pages/AdminPerformance";
import "./styles/theme.css";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-tasks" element={<AdminTasks />} />
      <Route path="/my-tasks" element={<MyTasks />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/admin-performance" element={<AdminPerformance />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
    </Routes>
  );
}

export default App;

