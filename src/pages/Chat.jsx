import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, Trash2, Bot, User, Loader, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import api from '../api';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(sec) {
  if (sec <= 0) return '00:00';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function calcSecs(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) * 60);
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Message({ msg, isDark }) {
  const isUser = msg.role === 'user';
  // render markdown-style bold (**text**) simply
  const formatted = msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-gray-600 to-gray-700'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed
        ${isUser
          ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-tr-sm'
          : isDark ? 'bg-white/8 border border-white/10 text-gray-100 rounded-tl-sm'
                   : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
        <p dangerouslySetInnerHTML={{ __html: formatted }} />
        <p className={`text-xs mt-1 ${isUser ? 'text-violet-200' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {new Date(msg.createdAt || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Chat() {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const session = location.state?.session || null;
  const startLearning = !!location.state?.startLearning;
  const SUBTOPICS_PER_TOPIC = 3;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // session mode state
  const [sessionActive, setSessionActive] = useState(!!session);
  const [remaining, setRemaining] = useState(session ? calcSecs(session.startTime, session.endTime) : 0);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const [currentSubtopicIdx, setCurrentSubtopicIdx] = useState(0);
  const [learningStage, setLearningStage] = useState('roadmap'); // roadmap | teaching | completed
  const [learningReady, setLearningReady] = useState(!session || !startLearning);
  const [waitingDone, setWaitingDone] = useState(false); // waiting for student to say done

  const timerRef = useRef(null);
  const bottomRef = useRef(null);
  const autoSentRef = useRef(false);
  const initDoneRef = useRef(false);
  const normalizedDone = (value) => value.trim().toLowerCase().replace(/[.!?]/g, '') === 'done';

  const buildLearningContext = () => {
    const topics = session?.topics || [];
    return {
      active: !!session,
      stage: learningStage,
      sessionTitle: session?.title || '',
      topic: topics[currentTopicIdx] || session?.title || '',
      topicNumber: topics.length ? currentTopicIdx + 1 : 1,
      totalTopics: topics.length || 1,
      subtopicNumber: currentSubtopicIdx || 1,
      totalSubtopics: SUBTOPICS_PER_TOPIC
    };
  };

  // load history
  useEffect(() => {
    api.get('/chat/history')
      .then(r => setMessages(r.data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (!session || !startLearning || initDoneRef.current || fetching) return;
    initDoneRef.current = true;

    const initializeLearningSession = async () => {
      try {
        await api.delete('/chat/history');
        setMessages([]);
      } catch {
        // Keep going even if history clear fails; roadmap flow can still run.
      } finally {
        setLearningReady(true);
      }
    };

    initializeLearningSession();
  }, [session, startLearning, fetching]);

  // countdown timer
  useEffect(() => {
    if (sessionActive && remaining > 0) {
      timerRef.current = setInterval(() => setRemaining(r => {
        if (r <= 1) { clearInterval(timerRef.current); setSessionActive(false); return 0; }
        return r - 1;
      }), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionActive]);

  // auto-send roadmap once session is ready
  useEffect(() => {
    if (!session || autoSentRef.current || fetching || loading || !learningReady || (startLearning && !initDoneRef.current)) return;
    autoSentRef.current = true;
    const topics = session.topics?.length ? session.topics.join(', ') : session.title;
    const prompt = `I am starting a focused study session for "${session.title}". Topics: ${topics}.
Create a concise roadmap with numbered steps for this session. Do not teach any topic yet.
After roadmap, ask me to reply with "done" to start the first subtopic lesson.`;
    sendAuto(prompt, {
      active: true,
      stage: 'roadmap',
      sessionTitle: session.title,
      topic: session.topics?.[0] || session.title,
      topicNumber: 1,
      totalTopics: session.topics?.length || 1,
      subtopicNumber: 1,
      totalSubtopics: SUBTOPICS_PER_TOPIC
    });
    setLearningStage('roadmap');
    setWaitingDone(true);
  }, [session, fetching, loading, startLearning, learningReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendAuto = async (text, contextOverride) => {
    const userMsg = { role: 'user', content: text, createdAt: new Date() };
    setMessages(p => [...p, userMsg]);
    setLoading(true);
    try {
      const { data } = await api.post('/chat/send', {
        message: text,
        learningContext: contextOverride || buildLearningContext()
      });
      setMessages(p => [...p, { role: 'assistant', content: data.response, createdAt: new Date() }]);
    } catch { toast.error('AI failed to respond'); }
    finally { setLoading(false); }
  };

  const handleDone = async () => {
    const topics = session?.topics || [];
    setWaitingDone(false);

    let prompt;
    if (learningStage === 'roadmap') {
      const firstTopic = topics[0] || session?.title || 'the planned study topic';
      prompt = `Done. Start teaching now.
Teach subtopic 1 for "${firstTopic}" in a simple way:
- short concept explanation
- one example
- one quick practice question
End by asking me to reply "done" for the next subtopic.`;
      setLearningStage('teaching');
      setCurrentTopicIdx(0);
      setCurrentSubtopicIdx(1);
      setWaitingDone(true);
      await sendAuto(prompt, {
        active: true,
        stage: 'teaching',
        sessionTitle: session?.title || '',
        topic: firstTopic,
        topicNumber: 1,
        totalTopics: topics.length || 1,
        subtopicNumber: 1,
        totalSubtopics: SUBTOPICS_PER_TOPIC
      });
      return;
    }

    if (learningStage !== 'teaching') {
      return;
    }

    if (!topics.length) {
      prompt = `Done. Continue with the next short subtopic for this session.
Keep it concise and end by asking me to reply "done" for the next subtopic.`;
      const nextSubtopic = currentSubtopicIdx + 1;
      setCurrentSubtopicIdx(nextSubtopic);
      setWaitingDone(true);
      await sendAuto(prompt, {
        active: true,
        stage: 'teaching',
        sessionTitle: session?.title || '',
        topic: session?.title || 'Session topic',
        topicNumber: 1,
        totalTopics: 1,
        subtopicNumber: nextSubtopic,
        totalSubtopics: SUBTOPICS_PER_TOPIC
      });
      return;
    }

    if (currentSubtopicIdx < SUBTOPICS_PER_TOPIC) {
      const nextSubtopic = currentSubtopicIdx + 1;
      prompt = `Done.
Teach subtopic ${nextSubtopic} for "${topics[currentTopicIdx]}".
Keep it concise with one concept, one example, and one quick check question.
End by asking me to reply "done" for the next subtopic.`;
      setCurrentSubtopicIdx(nextSubtopic);
      setWaitingDone(true);
      await sendAuto(prompt, {
        active: true,
        stage: 'teaching',
        sessionTitle: session?.title || '',
        topic: topics[currentTopicIdx],
        topicNumber: currentTopicIdx + 1,
        totalTopics: topics.length,
        subtopicNumber: nextSubtopic,
        totalSubtopics: SUBTOPICS_PER_TOPIC
      });
      return;
    }

    const nextTopicIdx = currentTopicIdx + 1;
    if (nextTopicIdx < topics.length) {
      const nextTopic = topics[nextTopicIdx];
      prompt = `Done with the previous topic. Start a new topic: "${nextTopic}".
Teach subtopic 1 with:
- simple explanation
- one example
- one quick practice question
End by asking me to reply "done" for the next subtopic.`;
      setCurrentTopicIdx(nextTopicIdx);
      setCurrentSubtopicIdx(1);
      setWaitingDone(true);
      await sendAuto(prompt, {
        active: true,
        stage: 'teaching',
        sessionTitle: session?.title || '',
        topic: nextTopic,
        topicNumber: nextTopicIdx + 1,
        totalTopics: topics.length,
        subtopicNumber: 1,
        totalSubtopics: SUBTOPICS_PER_TOPIC
      });
      return;
    }

    prompt = `Done. I completed all planned topics for this session.
Give a short recap, list key takeaways, and suggest 3 next topics to continue learning.`;
    setLearningStage('completed');
    await sendAuto(prompt, {
      active: true,
      stage: 'completed',
      sessionTitle: session?.title || '',
      topic: topics[topics.length - 1] || session?.title || '',
      topicNumber: topics.length || 1,
      totalTopics: topics.length || 1,
      subtopicNumber: SUBTOPICS_PER_TOPIC,
      totalSubtopics: SUBTOPICS_PER_TOPIC
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');

    // if student types "done" manually in session mode
    if (sessionActive && waitingDone && normalizedDone(text)) {
      await handleDone();
      return;
    }

    const userMsg = { role: 'user', content: text, createdAt: new Date() };
    setMessages(p => [...p, userMsg]);
    setLoading(true);
    try {
      const { data } = await api.post('/chat/send', {
        message: text,
        learningContext: session ? buildLearningContext() : null
      });
      setMessages(p => [...p, { role: 'assistant', content: data.response, createdAt: new Date() }]);
    } catch {
      toast.error('Failed to send message');
      setMessages(p => p.slice(0, -1));
    } finally { setLoading(false); }
  };

  const clearHistory = async () => {
    try {
      await api.delete('/chat/history');
      setMessages([]);
      toast.success('Chat history cleared');
    } catch { toast.error('Failed to clear history'); }
  };

  const topics = session?.topics || [];
  const pct = topics.length > 0 ? Math.round((currentTopicIdx / topics.length) * 100) : 0;

  return (
    <>
      <Navbar />
      <div className={`min-h-screen pt-16 transition-colors duration-300
        ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-violet-950'
                 : 'bg-gradient-to-br from-violet-50 via-white to-purple-50'}`}>
        <div className="max-w-3xl mx-auto h-[calc(100vh-4rem)] flex flex-col">

          {/* ── Header ── */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <div className="flex items-center gap-3">
              {session && (
                <button onClick={() => navigate('/schedule')}
                  className={`p-1.5 rounded-lg mr-1 ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {session ? `📚 ${session.title}` : 'AI Vora Assistant'}
                </p>
                <p className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>● Online</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* countdown */}
              {sessionActive && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold
                  ${remaining < 300
                    ? 'bg-red-500/20 text-red-400'
                    : isDark ? 'bg-white/10 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                  <Clock size={13} />
                  {fmt(remaining)}
                </div>
              )}
              {messages.length > 0 && (
                <button onClick={clearHistory}
                  className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-red-400' : 'hover:bg-black/10 text-red-500'}`}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* ── Session progress bar + topics ── */}
          {session && (
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10 bg-white/3' : 'border-gray-100 bg-violet-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Progress — topic {Math.min(currentTopicIdx + 1, topics.length || 1)} of {topics.length || '?'}
                  {learningStage === 'teaching' && currentSubtopicIdx > 0 ? ` · subtopic ${currentSubtopicIdx}/${SUBTOPICS_PER_TOPIC}` : ''}
                </span>
                <span className="text-xs text-violet-400 font-semibold">{pct}%</span>
              </div>
              {/* progress bar */}
              <div className={`h-1.5 rounded-full mb-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
              {/* topic chips */}
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((t, i) => (
                    <span key={t} className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all
                      ${i < currentTopicIdx
                        ? 'bg-green-500/20 text-green-400 line-through opacity-60'
                        : i === currentTopicIdx
                          ? 'bg-violet-500/30 text-violet-300 ring-1 ring-violet-500/50'
                          : isDark ? 'bg-white/8 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                      {i < currentTopicIdx && <CheckCircle size={10} className="inline mr-1" />}
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {fetching ? (
              <div className="flex justify-center pt-10">
                <Loader className="animate-spin text-violet-400" size={24} />
              </div>
            ) : messages.length === 0 && !session ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot size={32} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Hi there! 👋</h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    I'm your AI study assistant. Ask me anything!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {['Help me study math', 'Create a study plan', 'Explain photosynthesis', 'Tips for focus'].map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className={`text-xs p-2 rounded-xl text-left transition-all
                        ${isDark ? 'glass hover:bg-white/10' : 'glass-light hover:bg-white/90'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <Message key={i} msg={msg} isDark={isDark} />)
            )}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${isDark ? 'glass' : 'glass-light'}`}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Done button (session mode) ── */}
          {sessionActive && waitingDone && !loading && (
            <div className={`px-4 py-2 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
              <button onClick={handleDone}
                className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl font-medium text-sm
                  bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white transition-all">
                <CheckCircle size={16} /> Done — Next Topic
              </button>
            </div>
          )}

          {/* ── Input ── */}
          <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <form onSubmit={sendMessage} className="flex gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={sessionActive ? 'Ask a question or type "done" to continue...' : 'Ask anything...'}
                className={`flex-1 px-4 py-3 rounded-xl border outline-none text-sm transition-all
                  ${isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-violet-500'
                    : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-500'}`}
              />
              <button type="submit" disabled={!input.trim() || loading}
                className="px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl
                  hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={18} />
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}
