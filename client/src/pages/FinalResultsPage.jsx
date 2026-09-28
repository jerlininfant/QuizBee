import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Medal,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  ArrowRight,
  RotateCcw,
  Layers,
  Sparkles
} from 'lucide-react';

export default function FinalResultsPage() {
  const { code } = useParams();
  const roomCode = code?.toUpperCase();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Launch celebratory confetti burst
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore in environments without canvas
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await api.getRoomResults(roomCode);
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        setError(err.message || 'Failed to load tournament results.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [roomCode]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Computing authoritative final scores & leaderboard...</p>
      </div>
    );
  }

  const results = data?.results;
  const isTeam = results?.mode === 'team';
  const leaderboard = results?.leaderboard || [];
  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Celebration Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
          🏆
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Quiz Completed!
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-2">
          Final tournament standings for <strong className="text-amber-400">{data?.quiz?.title || 'Quizbee Room'}</strong>
        </p>
      </div>

      {/* Podium Display (Top 3) */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto mb-14 items-end">
          {/* 2nd Place */}
          {topThree[1] ? (
            <div className="glass-card p-4 sm:p-6 rounded-3xl border border-slate-700 text-center flex flex-col items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-700 text-white font-black text-lg flex items-center justify-center mb-2 shadow-lg">
                2
              </div>
              <p className="font-extrabold text-white text-xs sm:text-base truncate max-w-full">
                {topThree[1].name}
              </p>
              <p className="text-amber-400 font-black text-sm sm:text-lg mt-1">
                {(topThree[1].score || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500 uppercase font-bold">2nd Place</span>
            </div>
          ) : <div />}

          {/* 1st Place */}
          {topThree[0] && (
            <div className="glass-card p-5 sm:p-8 rounded-3xl border-2 border-amber-500/60 bg-amber-500/10 glow-amber text-center flex flex-col items-center -translate-y-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black text-xl flex items-center justify-center mb-2 shadow-xl shadow-amber-500/30">
                👑
              </div>
              <p className="font-black text-white text-sm sm:text-xl truncate max-w-full">
                {topThree[0].name}
              </p>
              <p className="text-amber-400 font-black text-base sm:text-2xl mt-1">
                {(topThree[0].score || 0).toLocaleString()}
              </p>
              <span className="text-xs text-amber-400 uppercase font-black tracking-wider">Champion</span>
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] ? (
            <div className="glass-card p-4 sm:p-6 rounded-3xl border border-amber-800/40 text-center flex flex-col items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-800 text-white font-black text-lg flex items-center justify-center mb-2 shadow-lg">
                3
              </div>
              <p className="font-extrabold text-white text-xs sm:text-base truncate max-w-full">
                {topThree[2].name}
              </p>
              <p className="text-amber-400 font-black text-sm sm:text-lg mt-1">
                {(topThree[2].score || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500 uppercase font-bold">3rd Place</span>
            </div>
          ) : <div />}
        </div>
      )}

      {/* Comprehensive Statistics Table (Section 12) */}
      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Comprehensive Results & Analytics</span>
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            Total Questions: {results?.total_questions || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">{isTeam ? 'Team & Squad' : 'Player'}</th>
                <th className="px-6 py-4">Total Points</th>
                <th className="px-6 py-4">Correct</th>
                <th className="px-6 py-4">Wrong</th>
                <th className="px-6 py-4">Accuracy</th>
                <th className="px-6 py-4">Avg Speed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {leaderboard.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-black text-xs ${
                      item.rank === 1
                        ? 'bg-amber-400 text-slate-950'
                        : item.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : item.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-white text-base">{item.name}</p>
                    {isTeam && item.members && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.members.map((m) => m.name).join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-base text-amber-400">
                    {(item.score || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle className="w-4 h-4" />
                      {item.correct_count}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-red-400 font-bold">
                      <XCircle className="w-4 h-4" />
                      {item.wrong_count ?? Math.max(0, (results?.total_questions || 0) - item.correct_count)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.accuracy_percent}%</span>
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-1.5 rounded-full"
                          style={{ width: `${item.accuracy_percent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-semibold">
                    {item.avg_response_time_seconds}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Footnotes */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/host"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors border border-slate-700"
        >
          <Layers className="w-4 h-4" />
          <span>Host Console</span>
        </Link>

        <Link
          to="/join"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Another Quiz</span>
        </Link>
      </div>
    </div>
  );
}
