import { useTheme } from '../context/ThemeContext';

export default function Layout({ children }) {
  const { isDark } = useTheme();
  return (
    <div className={`min-h-screen pt-16 transition-colors duration-300 ${isDark
      ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-violet-950 text-white'
      : 'bg-gradient-to-br from-violet-50 via-white to-purple-50 text-gray-900'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}
