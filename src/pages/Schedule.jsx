import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Clock, X, Play, Square, BookOpen, Calendar, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Layout from '../components/Layout';
import api from '../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const defaultForm = { title: '', startTime: '09:00', endTime: '11:00', days: [], topics: [] };

function fmt(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}


function duration(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? mins % 60 + 'm' : ''}`.trim() : `${mins}m`;
}

export default function Schedule() {
  const { isDark } = useTheme();
  const [schedules, setSchedules] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const loadSchedules = async () => {
    setLoadError('');
    try {
      const { data } = await api.get('/schedule');
      setSchedules(data);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load schedules';
      setLoadError(msg);
      toast.error('Failed to load schedules');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    if (!schedules.length) {
      if (selected) setSelected(null);
      return;
    }

    if (!selected?._id) {
      setSelected(schedules[0]);
      return;
    }

    const updatedSelected = schedules.find(s => s._id === selected._id);
    if (!updatedSelected) {
      setSelected(schedules[0]);
      return;
    }

    if (updatedSelected !== selected) {
      setSelected(updatedSelected);
    }
  }, [schedules, selected]);

  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(timerRef.current); setActiveSession(null); return 0; }
          return r - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [activeSession]);

  const calcTotalSecs = (s) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return Math.max(0, (eh * 60 + em - sh * 60 - sm) * 60);
  };

  const startSession = (s) => {
    const total = calcTotalSecs(s);
    setActiveSession(s._id);
    setRemaining(total);
    setSelected(s);
    navigate('/chat', { state: { session: s, startLearning: true } });
  };

  const stopSession = () => {
    setActiveSession(null);
    setRemaining(0);
  };

  const toggleDay = (day) =>
    setForm(p => ({ ...p, days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day] }));

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !form.topics.includes(t)) setForm(p => ({ ...p, topics: [...p.topics, t] }));
    setTopicInput('');
  };

  const removeTopic = (t) => setForm(p => ({ ...p, topics: p.topics.filter(x => x !== t) }));

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setTopicInput('');
    setForm(defaultForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.startTime >= form.endTime) return toast.error('End time must be after start time');
    setLoading(true);
    try {
      if (editId) {
        const { data } = await api.put(`/schedule/${editId}`, form);
        setSchedules(p => p.map(s => s._id === editId ? data : s));
        if (selected?._id === editId) setSelected(data);
        toast.success('Schedule updated!');
      } else {
        await api.post('/schedule', form);
        toast.success('Schedule created!');
      }
      await loadSchedules();
      closeForm();
      setForm(defaultForm);
    } catch { toast.error('Failed to save schedule'); }
    finally { setLoading(false); }
  };

  const handleEdit = (s) => {
    setForm({ title: s.title, startTime: s.startTime, endTime: s.endTime, days: s.days || [], topics: s.topics || [] });
    setEditId(s._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/schedule/${id}`);
      setSchedules(p => p.filter(s => s._id !== id));
      if (selected?._id === id) setSelected(null);
      if (activeSession === id) { setActiveSession(null); setRemaining(0); }
      toast.success('Schedule deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const inputClass = `w-full px-3 py-2.5 rounded-xl border outline-none text-sm transition-all
    ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-violet-500'
              : 'bg-white/80 border-gray-200 text-gray-900 focus:border-violet-500'}`;

  const cur = new Date().toTimeString().slice(0, 5);

  return (
    <>
      <Navbar />
      <Layout>
        <div className="flex gap-6 h-full" style={{ minHeight: '70vh' }}>

          {/* LEFT — session list */}
          <div className="w-full md:w-80 flex-shrink-0 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Study Schedule</h1>
              <button onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); setTopicInput(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl
                  hover:from-violet-500 hover:to-purple-500 transition-all text-xs font-medium">
                <Plus size={14} /> Add Session
              </button>
            </div>

            {schedules.length === 0 ? (
              <div className={`text-center py-12 rounded-2xl ${isDark ? 'glass' : 'glass-light'}`}>
                <Clock size={36} className="mx-auto text-gray-400 mb-2" />
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {initialLoading ? 'Loading sessions...' : loadError ? 'Could not load sessions' : 'No sessions yet'}
                </p>
                {loadError && (
                  <p className={`text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                    {loadError}
                  </p>
                )}
                {loadError && (
                  <button
                    onClick={loadSchedules}
                    className="text-violet-400 text-xs hover:underline mt-2 inline-block"
                  >
                    Retry load
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowForm(true);
                    setEditId(null);
                    setForm(defaultForm);
                    setTopicInput('');
                  }}
                  className="text-violet-400 text-xs hover:underline mt-1 inline-block"
                >
                  + Create first session
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {schedules.map(s => {
                  const isActive = cur >= s.startTime && cur <= s.endTime;
                  const isRunning = activeSession === s._id;
                  const isSelected = selected?._id === s._id;
                  return (
                    <div key={s._id}
                      onClick={() => setSelected(s)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border
                        ${isSelected
                          ? 'border-violet-500/60 bg-violet-600/10'
                          : isDark ? 'glass border-white/5 hover:border-white/20' : 'glass-light border-gray-100 hover:border-violet-200'}
                        ${isRunning ? 'ring-1 ring-green-500/50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm truncate">{s.title}</span>
                            {isRunning && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />}
                            {isActive && !isRunning && <span className="text-xs bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full flex-shrink-0">Now</span>}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={11} />
                            <span>{s.startTime} – {s.endTime}</span>
                            <span className="text-gray-500">· {duration(s.startTime, s.endTime)}</span>
                          </div>
                          {s.topics?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {s.topics.map(t => (
                                <span key={t} className={`text-xs px-2 py-0.5 rounded-full
                                  ${isDark ? 'bg-violet-600/20 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ChevronRight size={14} className={`ml-2 flex-shrink-0 ${isSelected ? 'text-violet-400' : 'text-gray-500'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT — detail panel */}
          <div className="flex-1">
            {!selected ? (
              <div className={`h-full flex flex-col items-center justify-center rounded-2xl ${isDark ? 'glass' : 'glass-light'}`}>
                <BookOpen size={48} className="text-gray-400 mb-3" />
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Select a session to view details</p>
              </div>
            ) : (
              <div className={`h-full rounded-2xl p-6 ${isDark ? 'glass' : 'glass-light'} space-y-6`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selected.title}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock size={14} className="text-violet-400" />
                      <span>{selected.startTime} – {selected.endTime}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                        {duration(selected.startTime, selected.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(selected)}
                      className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/10 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(selected._id)}
                      className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Topics */}
                {selected.topics?.length > 0 && (
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Topics to Cover
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.topics.map((t, i) => (
                        <span key={t} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
                          ${isDark ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                                   : 'bg-violet-50 text-violet-700 border border-violet-200'}`}>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                            ${isDark ? 'bg-violet-500/30' : 'bg-violet-200'}`}>{i + 1}</span>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Days */}
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Schedule
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-violet-400" />
                    {selected.days?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.days.map(d => (
                          <span key={d} className={`text-xs px-2.5 py-1 rounded-lg font-medium
                            ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Every day</span>
                    )}
                  </div>
                </div>

                {/* Timer + Start/Stop */}
                <div className={`rounded-2xl p-5 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
                  {activeSession === selected._id ? (
                    <div className="text-center space-y-4">
                      <div>
                        <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-1">Session Running</p>
                        <p className="text-4xl font-mono font-bold text-green-400">{fmt(remaining)}</p>
                        <p className="text-xs text-gray-500 mt-1">remaining</p>
                      </div>
                      <button onClick={stopSession}
                        className="flex items-center gap-2 mx-auto px-6 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl font-medium transition-all">
                        <Square size={16} fill="white" /> Stop Session
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Ready to study <span className="font-semibold text-violet-400">{selected.title}</span>?
                      </p>
                      {selected.topics?.length > 0 && (
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {selected.topics.length} topic{selected.topics.length > 1 ? 's' : ''} planned
                        </p>
                      )}
                      <button
                        onClick={() => startSession(selected)}
                        disabled={!!activeSession}
                        className="flex items-center gap-2 mx-auto px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600
                          hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all
                          disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20">
                        <Play size={16} fill="white" /> Start Session
                      </button>
                      {activeSession && activeSession !== selected._id && (
                        <p className="text-xs text-amber-400">Another session is already running</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">{editId ? 'Edit Session' : 'New Study Session'}</h2>
                <button onClick={closeForm} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
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
                  <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Topics to Learn</label>
                  <div className="flex gap-2 mb-2">
                    <input className={inputClass} placeholder="e.g. Trigonometry" value={topicInput}
                      onChange={e => setTopicInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())} />
                    <button type="button" onClick={addTopic}
                      className="px-3 py-2 bg-violet-600 text-white rounded-xl text-sm hover:bg-violet-500 transition-all">
                      Add
                    </button>
                  </div>
                  {form.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.topics.map(t => (
                        <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-violet-600/20 text-violet-400 rounded-full text-xs">
                          {t}
                          <button type="button" onClick={() => removeTopic(t)} className="hover:text-red-400"><X size={11} /></button>
                        </span>
                      ))}
                    </div>
                  )}
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
                            : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeForm}
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
      </Layout>
    </>
  );
}
