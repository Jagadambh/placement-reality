import React, { useState, useEffect, useRef } from 'react';
import { aiApi } from '../api/aiApi';
import { useAuth } from '../context/AuthContext';
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Cpu,
  BookOpen,
  Info,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const AiPlacementAssistantPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am **Placement AI**, your objective placement analytics assistant. Every answer I provide is strictly grounded in officially reported NIRF documents, verified student offers, and institute disclosures. Ask me anything, or pick a sample question below!',
      citations: [],
      provider: 'Placement Ground-Truth RAG',
      timestamp: new Date(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    aiApi.getStatus().then((res) => {
      if (res.data?.success) setAiStatus(res.data.data);
    }).catch(console.warn);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const quickQuestions = [
    'Compare KIIT and VIT for CSE placements.',
    'What is the median package at my college?',
    'Which companies offered more than 10 LPA?',
    'How have placement figures changed over three years?',
    'How many internship records are verified?',
    'What percentage of eligible students were placed?',
    'Which colleges have reliable cybersecurity internship opportunities?',
  ];

  const handleSend = async (questionText = null) => {
    const textToSend = questionText || inputPrompt;
    if (!textToSend.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!questionText) setInputPrompt('');
    setLoading(true);

    try {
      const res = await aiApi.chat(textToSend, sessionId);
      if (res.data?.success) {
        const { answer, citations, provider, sessionId: returnedSessionId, setupNotice } = res.data.data;
        if (returnedSessionId) setSessionId(returnedSessionId);

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: answer,
            citations: citations || [],
            provider: provider || 'Platform Ground-Truth Engine',
            setupNotice,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue querying the database: ' + err.message,
          citations: [],
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header & AI Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-navy-950">Placement AI Assistant</h1>
          </div>
          <p className="text-xs text-slate-500">
            Truth-in-data conversational assistant. Never hallucinates packages or fabricates missing statistics.
          </p>
        </div>

        {/* Engine Status indicator */}
        <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <Cpu className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-slate-500">Active Engine:</span>
          <span className="font-semibold text-slate-800">
            {aiStatus?.activeProvider || 'Grounded Deterministic RAG'}
          </span>
        </div>
      </div>

      {/* CHAT CONTAINER */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-3xl rounded-3xl px-6 py-4 space-y-3 text-xs leading-relaxed shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-brand-primary text-white rounded-br-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-4 text-[10px] pb-1 border-b border-slate-200/50">
                  <span className="font-bold flex items-center gap-1.5">
                    {msg.role === 'user' ? (
                      'You'
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span className="text-purple-700">Placement AI</span>
                      </>
                    )}
                  </span>
                  <span className="opacity-60">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Content */}
                <div className="whitespace-pre-line text-xs font-normal">
                  {msg.content}
                </div>

                {/* Setup notice if external key not present */}
                {msg.setupNotice && (
                  <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-900 text-[11px] space-y-1">
                    <span className="font-bold block">Engine Notice:</span>
                    <span>{msg.setupNotice}</span>
                  </div>
                )}

                {/* Citations List */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-brand-secondary" />
                      <span>Verified Citations ({msg.citations.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.slice(0, 3).map((cit, cIdx) => (
                        <div
                          key={cIdx}
                          className="px-2 py-1 bg-white rounded-lg border border-slate-200 text-[10px] text-slate-600 space-y-0.5 shadow-2xs"
                        >
                          <div className="font-semibold text-slate-800">{cit.collegeName} ({cit.academicYear})</div>
                          <div className="text-[9px] text-purple-700">{cit.sourceType} • {cit.verificationTier}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                <span>Searching verified college disclosures and calculating statistics...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="font-semibold text-slate-500 shrink-0">Sample prompts:</span>
          {quickQuestions.map((q, qIdx) => (
            <button
              key={qIdx}
              onClick={() => handleSend(q)}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 whitespace-nowrap transition shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask Placement AI about college placement realities, comparisons, or recruiters..."
              className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="px-5 py-3 bg-brand-primary hover:bg-navy-800 text-white rounded-2xl text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
