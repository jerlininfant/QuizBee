import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Play, User, Hash, AlertCircle, ArrowRight } from 'lucide-react';

export default function JoinQuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [roomCode, setRoomCode] = useState((searchParams.get('code') || '').toUpperCase());
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = playerName.trim();

    if (!cleanCode || !cleanName) {
      setError('Please provide both the 6-character room code and your player name.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.joinRoom(cleanCode, { playerName: cleanName });
      if (res.success && res.player) {
        // Save player session in sessionStorage
        sessionStorage.setItem(`quizbee_player_${cleanCode}`, JSON.stringify(res.player));
        navigate(`/player/room/${cleanCode}`);
      }
    } catch (err) {
      setError(err.message || 'Unable to join room. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto mb-3">
            🐝
          </div>
          <h1 className="text-3xl font-black text-white">Join A Quiz</h1>
          <p className="text-sm text-slate-400 mt-1">Enter your room code to enter the competitive arena</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Room Code (e.g. QZB482)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Hash className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                maxLength={8}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="QZB..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white font-mono font-bold text-lg tracking-widest placeholder-slate-600 transition-all uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Your Player Nickname
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="LightningAlex"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white font-bold text-base placeholder-slate-600 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5 fill-slate-950" />
                <span>ENTER ARENA</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
