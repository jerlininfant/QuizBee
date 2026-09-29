import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  PlusCircle,
  Play,
  Edit3,
  Trash2,
  Users,
  Trophy,
  Activity,
  CheckCircle,
  HelpCircle,
  Clock,
  Radio,
  FileQuestion,
  Settings,
  ListOrdered
} from 'lucide-react';

export default function HostDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quizzes'); // 'quizzes', 'rooms', 'results', 'settings'
  const [creatingRoomFor, setCreatingRoomFor] = useState(null);
  const [error, setError] = useState('');

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await api.getQuizzes();
      if (res.success) {
        setQuizzes(res.quizzes || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleLaunchRoom = async (quizId) => {
    try {
      setCreatingRoomFor(quizId);
      const res = await api.createRoom(quizId);
      if (res.success && res.room) {
        navigate(`/host/room/${res.room.room_code}`);
      }
    } catch (err) {
      alert('Error launching room: ' + err.message);
    } finally {
      setCreatingRoomFor(null);
    }
  };

  const handleDeleteQuiz = async (quizId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.deleteQuiz(quizId);
      setQuizzes(quizzes.filter(q => q.id !== quizId));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const totalQuestionsSum = quizzes.reduce((sum, q) => sum + (q.actual_question_count || q.question_count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white">Host Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Host Console
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Welcome back, <strong className="text-white">{user?.name || 'Educator'}</strong>. Prepare AI quizzes and launch live multiplayer arenas.
          </p>
        </div>

        {/* Primary Action Button (Section 15) */}
        <Link
          to="/host/create"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5"
        >
          <PlusCircle className="w-5 h-5" />
          <span>+ CREATE NEW QUIZ</span>
        </Link>
      </div>

      {/* Statistics Cards Grid (Section 15) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-8">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quizzes</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-3">{quizzes.length}</p>
          <span className="text-xs text-slate-500 font-medium">Ready in library</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Questions</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileQuestion className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-3">{totalQuestionsSum}</p>
          <span className="text-xs text-slate-500 font-medium">Curated & AI Generated</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Rooms</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-3">Live</p>
          <span className="text-xs text-slate-500 font-medium">Socket.IO real-time ready</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multiplayer Modes</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-3">Solo & Teams</p>
          <span className="text-xs text-slate-500 font-medium">Up to 4 players per squad</span>
        </div>
      </div>

      {/* Section Navigation Tabs (Section 15) */}
      <div className="flex border-b border-slate-800 mb-6 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'quizzes'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          My Quizzes ({quizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'settings'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Host Settings
        </button>
      </div>

      {/* Quizzes List */}
      {activeTab === 'quizzes' && (
        <div>
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-400">Loading your quiz collection...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-slate-800 glass-card">
              <FileQuestion className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No quizzes created yet</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                Upload your study material or specify a topic to let AI construct your first competitive multiplayer quiz.
              </p>
              <Link
                to="/host/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Create First Quiz
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => {
                const qCount = quiz.actual_question_count || quiz.question_count || 5;
                const timeSec = quiz.time_per_question || 20;

                return (
                  <div
                    key={quiz.id}
                    className="glass-card rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all hover:shadow-xl group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 text-amber-400 border border-slate-700">
                          {quiz.subject || 'General'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          quiz.difficulty === 'Hard'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : quiz.difficulty === 'Easy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {quiz.difficulty || 'Medium'}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors mb-2">
                        {quiz.title}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mb-6">
                        <span className="flex items-center gap-1">
                          <FileQuestion className="w-3.5 h-3.5 text-slate-500" />
                          <strong>{qCount}</strong> Questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <strong>{timeSec}s</strong> / question
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="capitalize">{quiz.mode || 'Solo'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {/* Host Room Button */}
                      <button
                        onClick={() => handleLaunchRoom(quiz.id)}
                        disabled={creatingRoomFor === quiz.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {creatingRoomFor === quiz.id ? (
                          <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>LAUNCH ROOM</span>
                          </>
                        )}
                      </button>

                      <Link
                        to={`/host/quiz/${quiz.id}`}
                        title="Edit Questions"
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                        title="Delete Quiz"
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="glass-card max-w-3xl p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-black text-white">System & Cloud Integrations</h3>
              <p className="text-xs text-slate-400 mt-1">
                Manage backend AI and Database connections. Secrets are strictly stored in backend environment variables.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Host Security
            </span>
          </div>

          {/* Cloud Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* OpenAI Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-white text-sm">OpenAI Integration</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  gpt-4o-mini Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generates 4-choice questions, identifies correct answers, and crafts clear explanations with fallback protection.
              </p>
            </div>

            {/* Supabase Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-white text-sm">Supabase PostgreSQL</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  7 Tables Schema Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                RLS-enabled schema for users, quizzes, questions, rooms, players, teams, and answers with cascade deletes.
              </p>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Environment Variables Configuration (server/.env)
            </h4>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-amber-300/90 overflow-x-auto">
              <p># OpenAI API Key</p>
              <p>OPENAI_API_KEY=sk-proj-xxxxxxxx</p>
              <p className="mt-2"># Supabase PostgreSQL Connection</p>
              <p>SUPABASE_URL=https://your-project.supabase.co</p>
              <p>SUPABASE_SERVICE_ROLE_KEY=eyJhxxxxxxx</p>
            </div>
            <p className="text-xs text-slate-500">
              Database schema is located at <code className="text-amber-400">server/src/db/schema.sql</code>. Execute it in your Supabase SQL Editor to initialize all 7 tables.
            </p>
          </div>

          {/* Authoritative Server Details */}
          <div className="pt-2 text-xs text-slate-400 space-y-1">
            <p>• Authoritative Scoring: Active (500 Base + up to 500 Speed Bonus).</p>
            <p>• Host Account: {user?.email}</p>
          </div>
        </div>
      )}
    </div>
  );
}
