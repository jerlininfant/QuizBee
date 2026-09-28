import { store } from '../data/store.js';

export class RoomService {
  /**
   * Generates a unique 6-character room code like QZB482
   */
  static generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars 0/O, 1/I
    let code = 'QZB';
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    if (store.getRoomByCode(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  /**
   * Create a new room for a quiz
   */
  static createRoom({ quizId, hostId }) {
    const quiz = store.getQuizById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const roomCode = this.generateRoomCode();
    const room = store.createRoom({
      id: `room_${Date.now()}_${roomCode}`,
      quiz_id: quizId,
      host_id: hostId,
      room_code: roomCode,
      status: 'waiting',
      current_question_index: 0,
      mode: quiz.mode || 'solo'
    });

    return { room, quiz };
  }

  /**
   * Validates room eligibility for joining
   */
  static validateRoomForJoin(roomCode) {
    const room = store.getRoomByCode(roomCode);
    if (!room) {
      return { valid: false, error: 'Room code not found. Please verify the code.' };
    }
    if (room.status === 'finished') {
      return { valid: false, error: 'This quiz has already ended.' };
    }
    return { valid: true, room };
  }

  /**
   * Add a player to a room
   */
  static joinRoom({ roomCode, playerName, teamId, socketId, userId = null }) {
    const { valid, error, room } = this.validateRoomForJoin(roomCode);
    if (!valid) {
      throw new Error(error);
    }

    const trimmedName = (playerName || 'Player').trim();
    const existingPlayers = store.getPlayersByRoom(roomCode);

    // Check for duplicate name
    const nameTaken = existingPlayers.some(
      p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.connected
    );
    if (nameTaken) {
      throw new Error(`Name "${trimmedName}" is already taken in this room. Please choose another name.`);
    }

    // Team assignment verification if teamId is provided
    let assignedTeamId = null;
    let assignedTeamName = null;

    if (teamId) {
      const team = store.getTeamById(teamId);
      if (!team || team.room_code !== roomCode.toUpperCase()) {
        throw new Error('Invalid team selected for this room.');
      }
      const membersInTeam = existingPlayers.filter(p => p.team_id === teamId);
      if (membersInTeam.length >= 4) {
        throw new Error(`Team "${team.name}" is full (maximum 4 members reached).`);
      }
      assignedTeamId = team.id;
      assignedTeamName = team.name;
    }

    const player = store.addPlayer({
      room_code: roomCode.toUpperCase(),
      room_id: room.id,
      user_id: userId,
      socket_id: socketId,
      name: trimmedName,
      team_id: assignedTeamId,
      team_name: assignedTeamName,
      score: 0
    });

    return { player, room };
  }

  /**
   * Create or join a team inside a room
   */
  static createTeam({ roomCode, teamName, playerId }) {
    const code = roomCode.toUpperCase();
    const cleanName = teamName.trim();
    if (!cleanName) {
      throw new Error('Team name cannot be empty');
    }

    const existingTeam = store.findTeamByName(code, cleanName);
    if (existingTeam) {
      throw new Error(`A team named "${cleanName}" already exists in this room.`);
    }

    const team = store.createTeam({
      room_code: code,
      name: cleanName
    });

    if (playerId) {
      this.assignPlayerToTeam(playerId, team.id);
    }

    return team;
  }

  static assignPlayerToTeam(playerId, teamId) {
    const player = store.getPlayerById(playerId);
    if (!player) throw new Error('Player not found');

    const team = store.getTeamById(teamId);
    if (!team) throw new Error('Team not found');

    const membersInTeam = store.getPlayersByRoom(player.room_code).filter(p => p.team_id === teamId && p.id !== playerId);
    if (membersInTeam.length >= 4) {
      throw new Error(`Team "${team.name}" has reached the maximum of 4 players.`);
    }

    const updated = store.updatePlayer(playerId, {
      team_id: team.id,
      team_name: team.name
    });

    return updated;
  }
}
