import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Zap, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.user, data.token);
      toast.success(`Welcome to AI Vora, ${data.user.name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all text-sm
    ${isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-violet-500 focus:bg-white/10'
      : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:bg-white'
    }`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300
      ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-violet-950' : 'bg-gradient-to-br from-violet-50 via-white to-purple-50'}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl ${isDark ? 'glass' : 'glass-light'}`}>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="text-violet-500" size={32} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent">
              AI Vora
            </h1>
          </div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-gray-400" size={16} />
            <input className={inputClass} placeholder="Full Name" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-gray-400" size={16} />
            <input className={inputClass} type="email" placeholder="Email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-gray-400" size={16} />
            <input className={inputClass} type={showPass ? 'text' : 'password'} placeholder="Password"
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-300">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold
              hover:from-violet-500 hover:to-purple-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-violet-500/25">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className={`text-center text-sm mt-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
