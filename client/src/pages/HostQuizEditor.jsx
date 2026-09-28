import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Edit3,
  Trash2,
  PlusCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Save,
  Play,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

export default function HostQuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [launchingRoom, setLaunchingRoom] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const res = await api.getQuiz(id);
      if (res.success && res.quiz) {
        setQuiz(res.quiz);
        setQuestions(res.quiz.questions || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    const newQ = {
      id: `q_new_${Date.now()}`,
      question_text: 'New Question Text...',
      option_a: 'Option A',
      option_b: 'Option B',
      option_c: 'Option C',
      option_d: 'Option D',
      correct_answer: 'A',
      explanation: 'Explanation for correct choice.',
      order_index: questions.length
    };
    setQuestions([...questions, newQ]);
  };

  const handleDeleteQuestion = (index) => {
    if (questions.length <= 1) {
      alert('A quiz must have at least 1 question.');
      return;
    }
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated);
  };

  const handleMoveQuestion = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= questions.length) return;

    const copy = [...questions];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setQuestions(copy);
  };

  const handleRegenerateQuestion = async (index) => {
    try {
      setRegeneratingIndex(index);
      const targetQ = questions[index];
      const res = await api.regenerateQuestion({
        topic: quiz?.subject || quiz?.title || 'General',
        existingQuestionText: targetQ.question_text,
        difficulty: quiz?.difficulty || 'Medium'
      });

      if (res.success && res.question) {
        const updated = [...questions];
        updated[index] = {
          ...res.question,
          id: targetQ.id,
          order_index: index
        };
        setQuestions(updated);
      }
    } catch (err) {
      alert('Regeneration failed: ' + err.message);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const res = await api.updateQuiz(id, {
        title: quiz.title,
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        time_per_question: quiz.time_per_question,
        mode: quiz.mode,
        questions
      });

      if (res.success) {
        setMessage('Quiz & questions saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunchRoom = async () => {
    try {
      setLaunchingRoom(true);
      await handleSave(); // save any unsaved edits first
      const res = await api.createRoom(id);
      if (res.success && res.room) {
        navigate(`/host/room/${res.room.room_code}`);
      }
    } catch (err) {
      alert('Failed to launch room: ' + err.message);
    } finally {
      setLaunchingRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Loading quiz editor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <Link
            to="/host"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white">{quiz?.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {questions.length} Questions
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Review, edit, reorder, regenerate options, or add new challenges before launching your room.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleLaunchRoom}
            disabled={launchingRoom}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
          >
            {launchingRoom ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>LAUNCH ROOM NOW</span>
              </>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Questions Stack (Section 5) */}
      <div className="mt-8 space-y-6">
        {questions.map((q, index) => {
          const isRegen = regeneratingIndex === index;
          return (
            <div
              key={q.id || index}
              className="glass-card rounded-2xl border border-slate-800 p-6 relative group hover:border-slate-700 transition-all"
            >
              {/* Question Header & Order Controls */}
              <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-sm flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Question #{index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(index, -1)}
                    disabled={index === 0}
                    title="Move Question Up"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(index, 1)}
                    disabled={index === questions.length - 1}
                    title="Move Question Down"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRegenerateQuestion(index)}
                    disabled={isRegen}
                    title="Regenerate question using AI"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold ml-2 disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin' : ''}`} />
                    <span>{isRegen ? 'Regenerating...' : 'Regenerate'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(index)}
                    title="Delete question"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Question Text
                </label>
                <textarea
                  rows={2}
                  value={q.question_text || ''}
                  onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white text-sm"
                />
              </div>

              {/* 4 Choices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {['A', 'B', 'C', 'D'].map((letter) => {
                  const fieldKey = `option_${letter.toLowerCase()}`;
                  const isCorrect = (q.correct_answer || 'A').toUpperCase() === letter;

                  return (
                    <div
                      key={letter}
                      className={`p-3 rounded-xl border transition-all ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-500/5'
                          : 'border-slate-800 bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-black ${isCorrect ? 'text-emerald-400' : 'text-slate-400'}`}>
                          Option {letter}
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                          <input
                            type="radio"
                            name={`correct_${q.id || index}`}
                            checked={isCorrect}
                            onChange={() => handleQuestionChange(index, 'correct_answer', letter)}
                            className="text-emerald-500 focus:ring-emerald-400"
                          />
                          <span className={isCorrect ? 'text-emerald-400' : 'text-slate-500'}>
                            {isCorrect ? 'Correct Answer' : 'Mark Correct'}
                          </span>
                        </label>
                      </div>

                      <input
                        type="text"
                        value={q[fieldKey] || ''}
                        onChange={(e) => handleQuestionChange(index, fieldKey, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs sm:text-sm"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Explanation Field */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Explanation / Answer Rationale
                </label>
                <input
                  type="text"
                  value={q.explanation || ''}
                  onChange={(e) => handleQuestionChange(index, 'explanation', e.target.value)}
                  placeholder="Displayed to players after the question timer closes..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-300 text-xs"
                />
              </div>
            </div>
          );
        })}

        {/* Add Question Button */}
        <button
          type="button"
          onClick={handleAddQuestion}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-900/30 hover:bg-slate-900/60 text-slate-300 hover:text-amber-400 font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          <span>+ Add Another Question</span>
        </button>
      </div>
    </div>
  );
}
