
import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
};

type Language = 'English' | 'Hinglish';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const STORAGE_KEY = 'healthcopilot_chat_sessions';

const createMessage = (
  role: ChatMessage['role'],
  text: string
): ChatMessage => ({
  id: `${Date.now()}-${Math.random()}`,
  role,
  text,
  timestamp: new Date().toISOString(),
});

const createSession = (): ChatSession => ({
  id: `${Date.now()}-${Math.random()}`,
  title: 'New Consultation',
  messages: [
    createMessage(
      'assistant',
      'Hello! I am Smart Health Assistant. You can describe your symptoms or ask me a health-related question. I can communicate in English or Hinglish.\n\nPlease remember that I provide health information, not a medical diagnosis.'
    ),
  ],
  updatedAt: new Date().toISOString(),
});

const getInitialSessions = (): ChatSession[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (error) {
    console.error('Could not load chat history:', error);
  }

  return [createSession()];
};

export default function AIConsult() {
  const [sessions, setSessions] = useState<ChatSession[]>(getInitialSessions);
  const [activeSessionId, setActiveSessionId] = useState(
    () => getInitialSessions()[0]?.id
  );
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState<Language>('English');
  const [loading, setLoading] = useState(false);
  const [useLatestReport, setUseLatestReport] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || sessions[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, loading]);

  const updateActiveSession = (updatedSession: ChatSession) => {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === updatedSession.id ? updatedSession : session
      )
    );
  };

  const startNewChat = () => {
    const newSession = createSession();
    setSessions((previous) => [newSession, ...previous]);
    setActiveSessionId(newSession.id);
    setMessage('');
  };

  const deleteSession = (sessionId: string) => {
    const remaining = sessions.filter(
      (session) => session.id !== sessionId
    );

    if (remaining.length === 0) {
      const newSession = createSession();
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      return;
    }

    setSessions(remaining);

    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const userMessage = message.trim();

    if (!userMessage || loading || !activeSession) return;

    const userChatMessage = createMessage('user', userMessage);

    const updatedMessages = [
      ...activeSession.messages,
      userChatMessage,
    ];

    const updatedSession: ChatSession = {
      ...activeSession,
      title:
        activeSession.title === 'New Consultation'
          ? userMessage.slice(0, 35)
          : activeSession.title,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    updateActiveSession(updatedSession);
    setMessage('');
    setLoading(true);

    try {
      const languageInstruction =
        language === 'Hinglish'
          ? 'Reply in natural Hinglish (Hindi and English written in Roman script). Keep medical terms understandable. Continue replying in Hinglish unless the user requests another language.'
          : 'Reply in clear, simple English. Continue replying in English unless the user requests another language.';

      const conversationContext = updatedMessages
        .slice(-12)
        .map((item) =>
          `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.text}`
        )
        .join('\n');

      const apiMessage = `${languageInstruction}

Continue this conversation using the previous messages for context.
Do not repeat previous answers unnecessarily.

${conversationContext}

Assistant:`;

      const token = localStorage.getItem('access_token');

      const response = await fetch(`${API_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: apiMessage,
          use_latest_report: useLatestReport,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || 'Unable to get an AI response.'
        );
      }

      const aiReply =
        data.response ||
        data.reply ||
        data.answer ||
        data.message ||
        'I could not generate a response. Please try again.';

      const reportNotice = data.report_used
        ? `\n\n📄 Report context used: ${data.report_filename || 'Latest medical report'}`
        : '';

      const assistantMessage = createMessage(
        'assistant',
        `${String(aiReply)}${reportNotice}`
      );

      updateActiveSession({
        ...updatedSession,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('AI Consult error:', error);

      const errorText =
        error instanceof Error
          ? error.message
          : 'Something went wrong while connecting to the AI server.';

      updateActiveSession({
        ...updatedSession,
        messages: [
          ...updatedMessages,
          createMessage(
            'assistant',
            `I could not process your request. ${errorText}\n\nPlease check that the backend is running and try again.`
          ),
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    'I have a headache. What could be the reason?',
    'Mujhe fever aur weakness ho rahi hai.',
    'How can I improve my sleep?',
    'Mujhe healthy diet ke tips do.',
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background text-primary p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">AI Consult</h1>
              <p className="text-sm opacity-70 mt-1">
                Your interactive health information assistant
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Language:</span>
              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as Language)
                }
                className="border-2 border-primary bg-background text-primary p-2 rounded-lg"
              >
                <option value="English">English</option>
                <option value="Hinglish">Hinglish</option>
              </select>

              <button
                onClick={startNewChat}
                className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90"
              >
                + New Chat
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Chat history */}
            <aside className="lg:col-span-1 border-2 border-primary rounded-xl p-4 bg-background">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Chat History</h2>
                <span className="text-xs opacity-60">
                  {sessions.length} chats
                </span>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                      activeSessionId === session.id
                        ? 'border-primary bg-secondary-container'
                        : 'border-transparent hover:border-primary'
                    }`}
                  >
                    <button
                      onClick={() => setActiveSessionId(session.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-semibold text-sm truncate">
                        {session.title}
                      </p>
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </p>
                    </button>

                    <button
                      onClick={() => deleteSession(session.id)}
                      title="Delete chat"
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </aside>

            {/* Main chat */}
            <section className="lg:col-span-3 border-2 border-primary rounded-xl overflow-hidden flex flex-col min-h-[650px] bg-background">
              <div className="p-4 border-b-2 border-primary flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center text-xl">
                    ✦
                  </div>
                  <div>
                    <h2 className="font-bold">Smart Health Assistant</h2>
                    <p className="text-xs text-green-600">
                      ● Consultation assistant
                    </p>
                  </div>
                </div>

                <span className="text-xs opacity-60">
                  {language} mode
                </span>
              </div>

              {/* Medical report option */}
              <div className="px-4 py-3 border-b border-primary/20 bg-secondary-container/30">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLatestReport}
                    onChange={(event) =>
                      setUseLatestReport(event.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-primary"
                  />

                  <span>
                    <span className="block text-sm font-semibold">
                      Use my latest medical report
                    </span>
                    <span className="block text-xs opacity-70 mt-1">
                      When enabled, your latest saved report will be shared
                      with AI Consult to help answer your question.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto max-h-[600px]">
                {activeSession?.messages.map((chatMessage) => (
                  <div
                    key={chatMessage.id}
                    className={`flex ${
                      chatMessage.role === 'user'
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-xl p-4 ${
                        chatMessage.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-secondary-container text-primary border border-primary/20'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-6">
                        {chatMessage.text}
                      </p>
                      <p className="text-[10px] opacity-60 mt-2 text-right">
                        {new Date(chatMessage.timestamp).toLocaleTimeString(
                          [],
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </p>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary-container rounded-xl p-4 text-sm">
                      Smart Health Assistant is typing...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested questions */}
              {activeSession?.messages.length <= 1 && (
                <div className="px-4 pb-3">
                  <p className="text-xs font-semibold opacity-70 mb-2">
                    TRY ASKING
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        onClick={() => setMessage(question)}
                        className="text-xs border border-primary rounded-full px-3 py-2 hover:bg-secondary-container"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message input */}
              <form
                onSubmit={handleSubmit}
                className="p-4 border-t-2 border-primary"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder={
                      language === 'Hinglish'
                        ? 'Apna question yahan type karein...'
                        : 'Type your health question here...'
                    }
                    rows={2}
                    className="flex-1 resize-none border-2 border-primary rounded-lg p-3 bg-background text-primary outline-none focus:ring-2 focus:ring-primary"
                  />

                  <button
                    type="submit"
                    disabled={!message.trim() || loading}
                    className="bg-primary text-white px-5 py-3 rounded-lg font-semibold disabled:opacity-40"
                  >
                    {loading ? '...' : 'Send'}
                  </button>
                </div>

                <p className="text-[11px] opacity-60 mt-2">
                  Press Enter to send. Shift + Enter for a new line.
                </p>
              </form>
            </section>
          </div>

          <p className="text-xs text-center opacity-60 mt-5">
            Smart Health Assistant provides general health information and is not a
            substitute for professional medical advice, diagnosis, or
            treatment. For emergencies, contact local emergency services.
          </p>
        </div>
      </div>
    </Layout>
  );
}
