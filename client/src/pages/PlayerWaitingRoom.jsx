import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket, emitWhenConnected } from '../services/socket';
import { api } from '../services/api';
import {
  Users,
  Shield,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export default function PlayerWaitingRoom() {
  const { code } = useParams();
  const roomCode = code?.toUpperCase();
  const navigate = useNavigate();

  const [player, setPlayer] = useState(null);
  const [room, setRoom] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Read player session from sessionStorage
    const savedPlayerStr = sessionStorage.getItem(`quizbee_player_${roomCode}`);
    if (!savedPlayerStr) {
      navigate(`/join?code=${roomCode}`);
      return;
    }
    const currentPlayerData = JSON.parse(savedPlayerStr);
    setPlayer(currentPlayerData);

    const socket = getSocket();
    emitWhenConnected('join_room', {
      roomCode,
      playerId: currentPlayerData.id,
      isHost: false
    });

    const fetchRoom = async () => {
      try {
        const res = await api.getRoom(roomCode);
        if (res.success) {
          setRoom(res.room);
          setQuiz(res.quiz);
          setPlayers(res.players || []);
          setTeams(res.teams || []);

          if (res.room.status === 'live') {
            navigate(`/player/quiz/${roomCode}`);
          }
        }
      } catch (err) {
        setError(err.message || 'Error loading room data');
      }
    };

    fetchRoom();

    socket.on('room_state_update', (data) => {
      if (data.room) {
        setRoom(data.room);
        if (data.room.status === 'live') {
          navigate(`/player/quiz/${roomCode}`);
        }
      }
      if (data.quiz) setQuiz(data.quiz);
      if (data.players) {
        setPlayers(data.players);
        // Refresh current player object in case team changed
        const me = data.players.find((p) => p.id === currentPlayerData.id);
        if (me) {
          setPlayer(me);
          sessionStorage.setItem(`quizbee_player_${roomCode}`, JSON.stringify(me));
        }
      }
      if (data.teams) setTeams(data.teams);
    });

    socket.on('quiz_started', () => {
      navigate(`/player/quiz/${roomCode}`);
    });

    socket.on('question_started', () => {
      navigate(`/player/quiz/${roomCode}`);
    });

    socket.on('error_message', (err) => {
      setError(err.message);
    });

    return () => {
      socket.off('room_state_update');
      socket.off('quiz_started');
      socket.off('question_started');
      socket.off('error_message');
    };
  }, [roomCode, navigate]);

  const handleCreateTeam = (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || !player) return;
    setError('');
    getSocket().emit('create_team', {
      roomCode,
      teamName: newTeamName.trim(),
      playerId: player.id
    });
    setNewTeamName('');
  };

  const handleJoinTeam = (teamId) => {
    if (!player) return;
    setError('');
    getSocket().emit('join_team', {
      roomCode,
      teamId,
      playerId: player.id
    });
  };

  const isTeamMode = (room?.mode || quiz?.mode) === 'team';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20 mb-3">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>Lobby: Waiting For Host To Launch</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white">{quiz?.title || 'Quizbee Competition'}</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Connected as <strong className="text-amber-400">{player?.name}</strong> • Room{' '}
          <strong className="text-white font-mono">{roomCode}</strong>
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>You are connected and ready to compete!</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Team Selection Section (Section 7) */}
      {isTeamMode && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 mb-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>Squad Assignment</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Join a squad or build your own (maximum 4 players per squad).
              </p>
            </div>
            {player?.team_name && (
              <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-xs">
                Your Squad: {player.team_name}
              </span>
            )}
          </div>

          {/* Create Squad Form */}
          <form onSubmit={handleCreateTeam} className="flex gap-2">
            <input
              type="text"
              maxLength={24}
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Enter new squad name..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Squad</span>
            </button>
          </form>

          {/* Existing Squads Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team) => {
              const members = players.filter((p) => p.team_id === team.id);
              const isMyTeam = player?.team_id === team.id;
              const isFull = members.length >= 4;

              return (
                <div
                  key={team.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isMyTeam
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-white text-sm">{team.name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isFull ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {members.length} / 4 {isFull ? '(Full)' : ''}
                    </span>
                  </div>

                  <div className="min-h-[40px] flex flex-wrap gap-1 mb-3">
                    {members.map((m) => (
                      <span
                        key={m.id}
                        className={`text-xs px-2.5 py-1 rounded-lg ${
                          m.id === player?.id
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 font-medium'
                        }`}
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>

                  {!isMyTeam && (
                    <button
                      type="button"
                      disabled={isFull}
                      onClick={() => handleJoinTeam(team.id)}
                      className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-semibold text-xs transition-colors"
                    >
                      {isFull ? 'Squad Full' : 'Join Squad'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Players in Lobby */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <span>All Competitors in Room ({players.length})</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {players.map((p) => (
            <div
              key={p.id}
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                p.id === player?.id
                  ? 'border-amber-400/60 bg-amber-500/10'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">
                  {p.name} {p.id === player?.id ? '(You)' : ''}
                </p>
                {isTeamMode && (
                  <p className="text-[10px] text-amber-400/80 truncate">
                    {p.team_name || 'No squad yet'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
