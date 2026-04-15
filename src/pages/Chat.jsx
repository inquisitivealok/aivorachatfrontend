import { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Bot, User, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Layout from '../components/Layout';
import api from '../api';

const Message = ({ msg, isDark }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-gray-600 to-gray-700'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed
        ${isUser
          ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-tr-sm'
          : isDark ? 'glass text-gray-100 rounded-tl-sm' : 'glass-light text-gray-800 rounded-tl-sm'
        }`}>
        {msg.content}
        <p className={`text-xs mt-1 ${isUser ? 'text-violet-200' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {new Date(msg.createdAt || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { isDark } = useTheme();
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/chat/history')
      .then(r => setMessages(r.data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input, createdAt: new Date() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat/send', { message: input });
      setMessages(p => [...p, { role: 'assistant', content: data.response, createdAt: new Date() }]);
    } catch {
      toast.error('Failed to send message');
      setMessages(p => p.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await api.delete('/chat/history');
      setMessages([]);
      toast.success('Chat history cleared');
    } catch {
      toast.error('Failed to clear history');
    }
  };

  return (
    <>
      <Navbar />
      <div className={`min-h-screen pt-16 transition-colors duration-300
        ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-violet-950' : 'bg-gradient-to-br from-violet-50 via-white to-purple-50'}`}>
        <div className="max-w-3xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
          {/* Chat Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">AI Vora Assistant</p>
                <p className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>● Online</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={clearHistory}
                className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-red-400' : 'hover:bg-black/10 text-red-500'}`}>
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {fetching ? (
              <div className="flex justify-center pt-10">
                <Loader className="animate-spin text-violet-400" size={24} />
              </div>
            ) : messages.length === 0 ? (
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

          {/* Input */}
          <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <form onSubmit={sendMessage} className="flex gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything..."
                className={`flex-1 px-4 py-3 rounded-xl border outline-none text-sm transition-all
                  ${isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-violet-500'
                    : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-500'
                  }`}
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
