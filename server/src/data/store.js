import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { SupabaseRepository } from '../db/supabaseRepository.js';

class DataStore {
  constructor() {
    this.users = new Map();
    this.quizzes = new Map();
    this.questions = new Map(); // question_id -> question
    this.rooms = new Map(); // room_code -> room
    this.players = new Map(); // player_id -> player
    this.teams = new Map(); // team_id -> team
    this.answers = new Map(); // answer_id -> answer

    this.initSeedData();
  }

  initSeedData() {
    // Demo host user
    const hostId = 'user_host_default';
    const passwordHash = bcrypt.hashSync('password123', 10);
    this.users.set(hostId, {
      id: hostId,
      name: 'Dr. Quizbee Host',
      email: 'host@quizbee.com',
      password: passwordHash,
      role: 'host',
      createdAt: new Date().toISOString()
    });

    // Sample Demo Quiz
    const quizId = 'quiz_demo_101';
    this.quizzes.set(quizId, {
      id: quizId,
      host_id: hostId,
      title: 'Web & Computer Science Essentials',
      subject: 'Technology',
      difficulty: 'Medium',
      question_count: 5,
      time_per_question: 20,
      mode: 'solo',
      created_at: new Date().toISOString()
    });

    const sampleQuestions = [
      {
        id: 'q_demo_1',
        quiz_id: quizId,
        question_text: 'What protocol does Socket.IO primarily establish over HTTP for persistent bidirectional communication?',
        option_a: 'WebSocket',
        option_b: 'FTP',
        option_c: 'SSH',
        option_d: 'GraphQL',
        correct_answer: 'A',
        explanation: 'Socket.IO upgrades HTTP connections to real-time WebSockets.',
        order_index: 0
      },
      {
        id: 'q_demo_2',
        quiz_id: quizId,
        question_text: 'In React, which hook is most appropriate for establishing a WebSocket connection on component mount?',
        option_a: 'useState',
        option_b: 'useEffect',
        option_c: 'useReducer',
        option_d: 'useContext',
        correct_answer: 'B',
        explanation: 'useEffect with an empty dependency array executes once on mount for lifecycle connections.',
        order_index: 1
      },
      {
        id: 'q_demo_3',
        quiz_id: quizId,
        question_text: 'What is the primary role of an authoritative backend in a competitive multiplayer quiz?',
        option_a: 'Render React components on the server',
        option_b: 'Prevent client cheating by validating answers and calculating scores server-side',
        option_c: 'Minify frontend CSS stylesheets',
        option_d: 'Store images in local storage',
        correct_answer: 'B',
        explanation: 'Authoritative backends never trust clients with scoring calculations or premature answer keys.',
        order_index: 2
      },
      {
        id: 'q_demo_4',
        quiz_id: quizId,
        question_text: 'What data structure offers O(1) average time complexity for key lookups in Node.js?',
        option_a: 'Linked List',
        option_b: 'Binary Search Tree',
        option_c: 'Hash Map (Map / Object)',
        option_d: 'Array',
        correct_answer: 'C',
        explanation: 'Hash maps provide constant-time O(1) key retrieval.',
        order_index: 3
      },
      {
        id: 'q_demo_5',
        quiz_id: quizId,
        question_text: 'Which HTTP status code signifies that a resource was successfully created?',
        option_a: '200 OK',
        option_b: '201 Created',
        option_c: '204 No Content',
        option_d: '400 Bad Request',
        correct_answer: 'B',
        explanation: 'HTTP 201 indicates a new resource has been created.',
        order_index: 4
      }
    ];

    sampleQuestions.forEach(q => this.questions.set(q.id, q));
  }

  // USER METHODS
  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return user;
    }
    return null;
  }

  findUserById(id) {
    return this.users.get(id) || null;
  }

  createUser(userData) {
    const id = userData.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const user = {
      ...userData,
      id,
      createdAt: userData.createdAt || new Date().toISOString()
    };
    this.users.set(id, user);

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.createUser(userData).catch(err => {
        console.warn('[Supabase Sync] Failed to sync user:', err.message);
      });
    }

    return user;
  }

  // QUIZ METHODS
  getQuizzesByHost(hostId) {
    return Array.from(this.quizzes.values()).filter(q => q.host_id === hostId);
  }

  getQuizById(id) {
    return this.quizzes.get(id) || null;
  }

  createQuiz(quizData) {
    const id = quizData.id || `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const quiz = {
      ...quizData,
      id,
      created_at: quizData.created_at || new Date().toISOString()
    };
    this.quizzes.set(id, quiz);

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.createQuiz(quizData).catch(err => {
        console.warn('[Supabase Sync] Failed to sync quiz:', err.message);
      });
    }

    return quiz;
  }

  updateQuiz(id, updateData) {
    const quiz = this.quizzes.get(id);
    if (!quiz) return null;
    const updated = { ...quiz, ...updateData };
    this.quizzes.set(id, updated);
    return updated;
  }

  deleteQuiz(id) {
    // Delete questions associated
    for (const [qid, q] of this.questions.entries()) {
      if (q.quiz_id === id) this.questions.delete(qid);
    }
    return this.quizzes.delete(id);
  }

  // QUESTION METHODS
  getQuestionsByQuizId(quizId) {
    return Array.from(this.questions.values())
      .filter(q => q.quiz_id === quizId)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  getQuestionById(id) {
    return this.questions.get(id) || null;
  }

  saveQuestions(quizId, questionList) {
    // remove existing questions for this quiz
    for (const [qid, q] of this.questions.entries()) {
      if (q.quiz_id === quizId) this.questions.delete(qid);
    }
    const saved = [];
    questionList.forEach((q, index) => {
      const qId = q.id || `q_${quizId}_${index + 1}_${Date.now()}`;
      const item = {
        ...q,
        id: qId,
        quiz_id: quizId,
        order_index: index
      };
      this.questions.set(qId, item);
      saved.push(item);
    });
    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.saveQuestions(quizId, questionList).catch(err => {
        console.warn('[Supabase Sync] Failed to sync questions:', err.message);
      });
    }

    return saved;
  }

  updateQuestion(id, updateData) {
    const q = this.questions.get(id);
    if (!q) return null;
    const updated = { ...q, ...updateData };
    this.questions.set(id, updated);
    return updated;
  }

  deleteQuestion(id) {
    return this.questions.delete(id);
  }

  // ROOM METHODS
  getRoomByCode(roomCode) {
    if (!roomCode) return null;
    return this.rooms.get(roomCode.toUpperCase()) || null;
  }

  getRoomById(id) {
    for (const room of this.rooms.values()) {
      if (room.id === id) return room;
    }
    return null;
  }

  createRoom(roomData) {
    const code = roomData.room_code.toUpperCase();
    const room = {
      ...roomData,
      room_code: code,
      status: roomData.status || 'waiting', // waiting, live, paused, finished
      current_question_index: 0,
      question_start_time: null,
      created_at: new Date().toISOString(),
      paused_time_remaining: null
    };
    this.rooms.set(code, room);

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.createRoom(roomData).catch(err => {
        console.warn('[Supabase Sync] Failed to sync room:', err.message);
      });
    }

    return room;
  }

  updateRoom(code, updateData) {
    const upper = code.toUpperCase();
    const room = this.rooms.get(upper);
    if (!room) return null;
    const updated = { ...room, ...updateData };
    this.rooms.set(upper, updated);
    return updated;
  }

  // PLAYER METHODS
  getPlayersByRoom(roomCode) {
    const code = roomCode.toUpperCase();
    return Array.from(this.players.values()).filter(p => p.room_code === code);
  }

  getPlayerById(id) {
    return this.players.get(id) || null;
  }

  getPlayerBySocketId(socketId) {
    for (const player of this.players.values()) {
      if (player.socket_id === socketId) return player;
    }
    return null;
  }

  addPlayer(playerData) {
    const id = playerData.id || `p_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const player = {
      ...playerData,
      id,
      room_code: playerData.room_code.toUpperCase(),
      score: playerData.score || 0,
      streak: playerData.streak || 0,
      connected: true,
      joined_at: new Date().toISOString()
    };
    this.players.set(id, player);
    return player;
  }

  updatePlayer(id, updateData) {
    const player = this.players.get(id);
    if (!player) return null;
    const updated = { ...player, ...updateData };
    this.players.set(id, updated);
    return updated;
  }

  removePlayer(id) {
    return this.players.delete(id);
  }

  // TEAM METHODS
  getTeamsByRoom(roomCode) {
    const code = roomCode.toUpperCase();
    return Array.from(this.teams.values()).filter(t => t.room_code === code);
  }

  getTeamById(id) {
    return this.teams.get(id) || null;
  }

  findTeamByName(roomCode, teamName) {
    const code = roomCode.toUpperCase();
    return Array.from(this.teams.values()).find(
      t => t.room_code === code && t.name.toLowerCase() === teamName.trim().toLowerCase()
    );
  }

  createTeam(teamData) {
    const id = teamData.id || `team_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const team = {
      ...teamData,
      id,
      room_code: teamData.room_code.toUpperCase(),
      name: teamData.name.trim(),
      score: 0,
      created_at: new Date().toISOString()
    };
    this.teams.set(id, team);
    return team;
  }

  updateTeam(id, updateData) {
    const team = this.teams.get(id);
    if (!team) return null;
    const updated = { ...team, ...updateData };
    this.teams.set(id, updated);
    return updated;
  }

  // ANSWER METHODS
  recordAnswer(answerData) {
    const id = `ans_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const record = {
      ...answerData,
      id,
      submitted_at: new Date().toISOString()
    };
    this.answers.set(id, record);

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.recordAnswer(answerData).catch(err => {
        console.warn('[Supabase Sync] Failed to sync answer:', err.message);
      });
    }

    return record;
  }

  getAnswersByRoomAndQuestion(roomCode, questionId) {
    return Array.from(this.answers.values()).filter(
      a => a.room_code === roomCode.toUpperCase() && a.question_id === questionId
    );
  }

  getAnswersByRoom(roomCode) {
    return Array.from(this.answers.values()).filter(
      a => a.room_code === roomCode.toUpperCase()
    );
  }

  hasPlayerAnswered(roomCode, playerId, questionId) {
    for (const ans of this.answers.values()) {
      if (
        ans.room_code === roomCode.toUpperCase() &&
        ans.player_id === playerId &&
        ans.question_id === questionId
      ) {
        return true;
      }
    }
    return false;
  }
}

export const store = new DataStore();
