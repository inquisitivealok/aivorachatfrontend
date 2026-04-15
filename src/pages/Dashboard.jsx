import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Calendar, Activity, Clock, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Layout from '../components/Layout';
import CameraTracker from '../components/CameraTracker';
import { useCameraTracker } from '../hooks/useCameraTracker';
import api from '../api';

const StatCard = ({ icon: Icon, label, value, color, isDark }) => (
  <div className={`p-5 rounded-2xl ${isDark ? 'glass' : 'glass-light'} flex items-center gap-4`}>
    <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const { isDark } = useTheme();
  const [schedules, setSchedules] = useState([]);
  const [time, setTime] = useState(new Date());

  // Use camera tracker state directly — single source of truth
  const cameraTracker = useCameraTracker();
  const { isActive, cameraEnabled } = cameraTracker;

  useEffect(() => {
    api.get('/schedule').then(r => setSchedules(r.data)).catch(() => {});
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayName = time.toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedules = schedules.filter(s => !s.days?.length || s.days.includes(todayName));

  const isStudyTime = todaySchedules.some(s => {
    const cur = time.toTimeString().slice(0, 5);
    return cur >= s.startTime && cur <= s.endTime;
  });

  const activityValue = !cameraEnabled
    ? '📷 Camera Off'
    : isActive ? '🟢 Active' : '🔴 Inactive';

  const activityColor = !cameraEnabled
    ? 'from-gray-500 to-gray-600'
    : isActive ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600';

  return (
    <>
      <Navbar />
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Good {time.getHours() < 12 ? 'Morning' : time.getHours() < 17 ? 'Afternoon' : 'Evening'} 👋
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className={`text-right px-4 py-2 rounded-xl ${isDark ? 'glass' : 'glass-light'}`}>
              <p className="text-2xl font-mono font-bold text-violet-400">
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Activity} label="Activity Status"
              value={activityValue}
              color={activityColor}
              isDark={isDark} />
            <StatCard icon={Calendar} label="Today's Sessions"
              value={`${todaySchedules.length} scheduled`}
              color="from-violet-500 to-purple-600" isDark={isDark} />
            <StatCard icon={Clock} label="Study Time"
              value={isStudyTime ? '📖 In Session' : '⏸ Not Active'}
              color={isStudyTime ? 'from-blue-500 to-cyan-600' : 'from-gray-500 to-gray-600'}
              isDark={isDark} />
          </div>

          {isStudyTime && cameraEnabled && !isActive && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-400">You're inactive during study time!</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>An email alert will be sent if you remain inactive.</p>
              </div>
            </div>
          )}

          <div className={`p-6 rounded-2xl ${isDark ? 'glass' : 'glass-light'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar size={20} className="text-violet-400" /> Today's Schedule
              </h2>
              <Link to="/schedule" className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1">
                Manage <ChevronRight size={14} />
              </Link>
            </div>
            {todaySchedules.length === 0 ? (
              <div className="text-center py-8">
                <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No sessions scheduled for today</p>
                <Link to="/schedule" className="text-violet-400 text-sm hover:underline mt-2 inline-block">
                  + Add a study session
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedules.map(s => {
                  const cur = time.toTimeString().slice(0, 5);
                  const active = cur >= s.startTime && cur <= s.endTime;
                  return (
                    <div key={s._id} className={`flex items-center justify-between p-3 rounded-xl
                      ${active ? 'bg-violet-500/20 border border-violet-500/30' : isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {s.startTime} – {s.endTime}
                        </p>
                      </div>
                      {active && <span className="text-xs bg-violet-500 text-white px-2 py-1 rounded-full">Active</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Camera Tracker — receives shared tracker instance */}
          <CameraTracker tracker={cameraTracker} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/chat" className={`p-6 rounded-2xl ${isDark ? 'glass hover:bg-white/10' : 'glass-light hover:bg-white/90'} transition-all duration-200 group`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                  <MessageSquare size={20} className="text-white" />
                </div>
                <h3 className="font-semibold">AI Chat</h3>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Ask questions, get explanations, and study smarter with AI.
              </p>
              <div className="flex items-center gap-1 mt-3 text-violet-400 text-sm group-hover:gap-2 transition-all">
                Start chatting <ChevronRight size={14} />
              </div>
            </Link>

            <Link to="/schedule" className={`p-6 rounded-2xl ${isDark ? 'glass hover:bg-white/10' : 'glass-light hover:bg-white/90'} transition-all duration-200 group`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600">
                  <Calendar size={20} className="text-white" />
                </div>
                <h3 className="font-semibold">Study Planner</h3>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Plan your study sessions and track your daily progress.
              </p>
              <div className="flex items-center gap-1 mt-3 text-blue-400 text-sm group-hover:gap-2 transition-all">
                Plan sessions <ChevronRight size={14} />
              </div>
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
}
