import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket, emitWhenConnected } from '../services/socket';
import { api } from '../services/api';
import Timer from '../components/Timer';
import {
  Users,
  Play,
  Pause,
  SkipForward,
  StopCircle,
  Copy,
  Check,
  Trophy,
  Activity,
  CheckCircle,
  HelpCircle,
  Radio,
  Flame,
  Clock,
  Sparkles
} from 'lucide-react';

export default function HostRoom() {
  const { code } = useParams();
  const roomCode = code?.toUpperCase();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [status, setStatus] = useState('waiting'); // waiting, live, paused, finished

  // Live Question State
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [questionEndedData, setQuestionEndedData] = useState(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState([]);

  // Copy helper
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Initial REST fetch for room and quiz state
    const fetchInitial = async () => {
      try {
        const res = await api.getRoom(roomCode);
        if (res.success) {
          setRoom(res.room);
          setQuiz(res.quiz);
          setPlayers(res.players || []);
          setTeams(res.teams || []);
          setStatus(res.room.status || 'waiting');
          if (res.room.status === 'finished') {
            navigate(`/results/${roomCode}`);
          }
        }
      } catch (err) {
        console.error('Fetch room error:', err);
      }
    };

    fetchInitial();

    // 2. Connect Socket.IO
    const socket = getSocket();
    emitWhenConnected('join_room', { roomCode, isHost: true });

    socket.on('room_state_update', (data) => {
      if (data.room) {
        setRoom(data.room);
        setStatus(data.room.status);
      }
      if (data.quiz) setQuiz(data.quiz);
      if (data.players) setPlayers(data.players);
      if (data.teams) setTeams(data.teams);
    });

    socket.on('quiz_started', (data) => {
      setStatus('live');
    });

    socket.on('question_started', (data) => {
      setStatus('live');
      setActiveQuestion(data.hostPayload);
      setQuestionEndedData(null);
      setAnsweredCount(0);
    });

    socket.on('answer_submitted', (data) => {
      setAnsweredCount(data.answeredCount);
    });

    socket.on('question_ended', (data) => {
      setQuestionEndedData(data);
    });

    socket.on('leaderboard_updated', (data) => {
      setLeaderboard(data.leaderboard || []);
      if (data.players) setPlayers(data.players);
    });

    socket.on('quiz_paused', () => {
      setStatus('paused');
    });

    socket.on('quiz_resumed', () => {
      setStatus('live');
    });

    socket.on('quiz_finished', (data) => {
      setStatus('finished');
      navigate(`/results/${roomCode}`);
    });

    return () => {
      socket.off('room_state_update');
      socket.off('quiz_started');
      socket.off('question_started');
      socket.off('answer_submitted');
      socket.off('question_ended');
      socket.off('leaderboard_updated');
      socket.off('quiz_paused');
      socket.off('quiz_resumed');
      socket.off('quiz_finished');
    };
  }, [roomCode, navigate]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Host Controls
  const handleStartQuiz = () => {
    getSocket().emit('start_quiz', { roomCode });
  };

  const handlePauseQuiz = () => {
    getSocket().emit('pause_quiz', { roomCode });
  };

  const handleResumeQuiz = () => {
    getSocket().emit('resume_quiz', { roomCode });
  };

  const handleNextQuestion = () => {
    getSocket().emit('next_question', { roomCode });
  };

  const handleEndQuiz = () => {
    if (window.confirm('Are you sure you want to end this quiz now? Final results will be generated.')) {
      getSocket().emit('end_quiz', { roomCode });
    }
  };

  const isTeamMode = (room?.mode || quiz?.mode) === 'team';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Status & Controls Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                status === 'live' ? 'bg-emerald-400' : status === 'paused' ? 'bg-amber-400' : 'bg-blue-400'
              } opacity-75`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                status === 'live' ? 'bg-emerald-500' : status === 'paused' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Host Live Console • Room {status.toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{quiz?.title || 'Quizbee Challenge'}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Mode: <strong className="text-white capitalize">{isTeamMode ? 'Team Battle (Up to 4)' : 'Solo Battle'}</strong> • {quiz?.total_questions || quiz?.question_count || 5} Questions
          </p>
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center gap-4 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-700">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-400">ROOM CODE</span>
            <span className="text-3xl font-black text-white tracking-widest">{roomCode}</span>
          </div>
          <button
            onClick={copyRoomCode}
            title="Copy Room Code"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        {/* Host Live Controls (Section 11) */}
        <div className="flex flex-wrap items-center gap-2">
          {status === 'waiting' && (
            <button
              onClick={handleStartQuiz}
              disabled={players.length === 0}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>START QUIZ</span>
            </button>
          )}

          {status === 'live' && (
            <>
              <button
                onClick={handlePauseQuiz}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
              >
                <SkipForward className="w-4 h-4" />
                <span>Next Question</span>
              </button>
            </>
          )}

          {status === 'paused' && (
            <button
              onClick={handleResumeQuiz}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Resume Quiz</span>
            </button>
          )}

          {(status === 'live' || status === 'paused') && (
            <button
              onClick={handleEndQuiz}
              className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-colors"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Live Screen vs Host Live Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Waiting Lobby OR Active Question Display */}
        <div className="lg:col-span-7 space-y-6">
          {status === 'waiting' ? (
            /* Waiting Room Lobby Screen (Section 18) */
            <div className="glass-card p-8 rounded-3xl border border-slate-800">
              <div className="text-center mb-8">
                <span className="text-4xl mb-2 inline-block">🐝</span>
                <h2 className="text-2xl font-black text-white">Lobby: Waiting For Competitors</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Ask players to visit <strong className="text-amber-400">/join</strong> on their phone or laptop and enter code:
                </p>
                <div className="inline-block mt-4 px-6 py-2 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 font-mono text-3xl font-black tracking-widest glow-amber">
                  {roomCode}
                </div>
              </div>

              {/* Roster of Joined Players */}
              <div className="pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Players Joined ({players.length})</span>
                  </h3>
                  {players.length === 0 && (
                    <span className="text-xs text-amber-400/80 animate-pulse">Waiting for first player...</span>
                  )}
                </div>

                {players.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-500 text-sm">No players have entered the room yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {players.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5 animate-fadeIn"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-sm flex items-center justify-center">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-white truncate">{p.name}</p>
                          {isTeamMode && (
                            <p className="text-[10px] text-amber-400/90 truncate">{p.team_name || 'Solo'}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Teams breakdown if Team Mode */}
              {isTeamMode && (
                <div className="pt-6 mt-6 border-t border-slate-800">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Squads (Max 4 per squad)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {teams.map((t) => {
                      const members = players.filter((p) => p.team_id === t.id);
                      return (
                        <div key={t.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-white">{t.name}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                              {members.length} / 4
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {members.map((m) => (
                              <span key={m.id} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {m.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : activeQuestion ? (
            /* Live Question & Progress Display */
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Question {activeQuestion.questionIndex + 1} of {activeQuestion.totalQuestions}
                </span>

                <div className="flex items-center gap-4">
                  <div className="text-xs text-slate-400">
                    Submissions: <strong className="text-white">{answeredCount}</strong> / {players.length}
                  </div>

                  <Timer
                    durationSeconds={activeQuestion.timeLimit}
                    startTime={activeQuestion.startTime}
                    paused={status === 'paused'}
                  />
                </div>
              </div>

              {/* Question Title */}
              <h2 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
                {activeQuestion.questionText}
              </h2>

              {/* 4 Choices with live breakdown if ended */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { letter: 'A', text: activeQuestion.optionA },
                  { letter: 'B', text: activeQuestion.optionB },
                  { letter: 'C', text: activeQuestion.optionC },
                  { letter: 'D', text: activeQuestion.optionD }
                ].map((opt) => {
                  const isCorrect = activeQuestion.correctAnswer === opt.letter;
                  const countPicked = questionEndedData?.answerBreakdown?.[opt.letter] || 0;

                  return (
                    <div
                      key={opt.letter}
                      className={`p-4 rounded-2xl border transition-all ${
                        questionEndedData && isCorrect
                          ? 'border-emerald-500 bg-emerald-500/10 glow-amber'
                          : 'border-slate-800 bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-black px-2 py-0.5 rounded ${
                          isCorrect && questionEndedData ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {opt.letter}
                        </span>

                        {questionEndedData && (
                          <span className="text-xs font-bold text-slate-400">
                            {countPicked} picks
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-white">{opt.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Explanation Banner (when question ends) */}
              {questionEndedData && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 animate-fadeIn">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Answer Rationale</span>
                  </div>
                  <p className="text-sm text-slate-200">
                    {questionEndedData.explanation || 'Verified answer key according to study material.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center rounded-3xl border border-slate-800">
              <p className="text-slate-400">Quiz session in progress...</p>
            </div>
          )}
        </div>

        {/* Right Column: PRIMARY LIVE HOST LEADERBOARD (Section 10) */}
        <div className="lg:col-span-5">
          <div className="glass-card p-6 rounded-3xl border border-slate-800 sticky top-24">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-white text-lg tracking-tight">
                  LIVE LEADERBOARD
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Real-Time
              </span>
            </div>

            {/* Leaderboard Table / Rankings */}
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {(leaderboard.length > 0 ? leaderboard : players).map((entry, idx) => {
                const rank = entry.rank || idx + 1;
                const isPodium = rank <= 3;

                return (
                  <div
                    key={entry.id || idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      rank === 1
                        ? 'bg-amber-500/15 border-amber-500/40 glow-amber'
                        : rank === 2
                        ? 'bg-slate-800/80 border-slate-700'
                        : rank === 3
                        ? 'bg-amber-700/10 border-amber-700/30'
                        : 'bg-slate-900/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : rank === 3
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {rank}
                      </span>

                      <div>
                        <p className="font-extrabold text-sm text-white truncate max-w-[160px]">
                          {entry.name}
                        </p>
                        {isTeamMode && entry.members && (
                          <p className="text-[10px] text-slate-400">
                            {entry.members.map((m) => m.name).join(', ')}
                          </p>
                        )}
                        {!isTeamMode && entry.team_name && entry.team_name !== 'Solo' && (
                          <p className="text-[10px] text-amber-400/80">{entry.team_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-base text-amber-400">
                        {(entry.score || 0).toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-semibold uppercase">
                        Points
                      </span>
                    </div>
                  </div>
                );
              })}

              {players.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Leaderboard will update once players join and answers are submitted.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
