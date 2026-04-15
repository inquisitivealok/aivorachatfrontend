import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Clock, X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Layout from '../components/Layout';
import api from '../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultForm = { title: '', startTime: '09:00', endTime: '11:00', days: [] };

export default function Schedule() {
  const { isDark } = useTheme();
  const [schedules, setSchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/schedule').then(r => setSchedules(r.data)).catch(() => {});
  }, []);

  const toggleDay = (day) => {
    setForm(p => ({
      ...p,
      days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.startTime >= form.endTime) return toast.error('End time must be after start time');
    setLoading(true);
    try {
      if (editId) {
        const { data } = await api.put(`/schedule/${editId}`, form);
        setSchedules(p => p.map(s => s._id === editId ? data : s));
        toast.success('Schedule updated!');
      } else {
        const { data } = await api.post('/schedule', form);
        setSchedules(p => [data, ...p]);
        toast.success('Schedule created!');
      }
      setShowForm(false);
      setForm(defaultForm);
      setEditId(null);
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (s) => {
    setForm({ title: s.title, startTime: s.startTime, endTime: s.endTime, days: s.days || [] });
    setEditId(s._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/schedule/${id}`);
      setSchedules(p => p.filter(s => s._id !== id));
      toast.success('Schedule deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const inputClass = `w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-all
    ${isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-violet-500'
      : 'bg-white/80 border-gray-200 text-gray-900 focus:border-violet-500'
    }`;

  return (
    <>
      <Navbar />
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Study Schedule</h1>
            <button onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl
                hover:from-violet-500 hover:to-purple-500 transition-all text-sm font-medium">
              <Plus size={16} /> Add Session
            </button>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold">{editId ? 'Edit Session' : 'New Study Session'}</h2>
                  <button onClick={() => { setShowForm(false); setEditId(null); }}
                    className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Session Title</label>
                    <input className={inputClass} placeholder="e.g. Mathematics" value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Start Time</label>
                      <input className={inputClass} type="time" value={form.startTime}
                        onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} required />
                    </div>
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>End Time</label>
                      <input className={inputClass} type="time" value={form.endTime}
                        onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Days (leave empty for daily)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(day => (
                        <button key={day} type="button" onClick={() => toggleDay(day)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                            ${form.days.includes(day)
                              ? 'bg-violet-600 text-white'
                              : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all
                        ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      Cancel
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium
                        hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50">
                      {loading ? 'Saving...' : editId ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Schedule List */}
          {schedules.length === 0 ? (
            <div className={`text-center py-16 rounded-2xl ${isDark ? 'glass' : 'glass-light'}`}>
              <Clock size={40} className="mx-auto text-gray-400 mb-3" />
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No study sessions yet</p>
              <button onClick={() => setShowForm(true)}
                className="text-violet-400 text-sm hover:underline mt-2 inline-block">
                + Create your first session
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {schedules.map(s => {
                const cur = new Date().toTimeString().slice(0, 5);
                const isActive = cur >= s.startTime && cur <= s.endTime;
                return (
                  <div key={s._id} className={`p-5 rounded-2xl ${isDark ? 'glass' : 'glass-light'}
                    ${isActive ? 'ring-1 ring-violet-500/50' : ''} transition-all`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{s.title}</h3>
                          {isActive && <span className="text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full">Active Now</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={14} className="text-violet-400" />
                          <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                            {s.startTime} – {s.endTime}
                          </span>
                        </div>
                        {s.days?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {s.days.map(d => (
                              <span key={d} className={`text-xs px-2 py-0.5 rounded-full
                                ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                {d.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        )}
                        {!s.days?.length && (
                          <span className={`text-xs mt-2 inline-block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Every day
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button onClick={() => handleEdit(s)}
                          className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(s._id)}
                          className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
