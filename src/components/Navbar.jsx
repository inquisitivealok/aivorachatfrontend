import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, LayoutDashboard, MessageSquare, Calendar, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
];

export default function Navbar() {
  const { isDark, toggle } = useTheme();
  const location = useLocation();

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 ${isDark ? 'glass border-b border-white/10' : 'glass-light border-b border-black/10'}`}>
      <div className="flex items-center gap-2">
        <Zap className="text-violet-500" size={24} />
        <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent">
          AI Vora
        </span>
      </div>

      <div className="flex items-center gap-1">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${location.pathname === path
                ? 'bg-violet-600 text-white'
                : isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-black/10'
              }`}>
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
      </div>

      <button onClick={toggle}
        className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-yellow-400' : 'hover:bg-black/10 text-gray-700'}`}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </nav>
  );
}
