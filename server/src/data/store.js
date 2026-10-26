import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SupabaseRepository } from '../db/supabaseRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE = path.resolve(__dirname, '.quizbee_local_store.json');

const DEFAULT_HOST_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_QUIZ_ID = '00000000-0000-4000-8000-000000000002';

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
    this.loadFromDisk();
  }

  initSeedData() {
    // Demo host user with standard UUID
    const passwordHash = bcrypt.hashSync('password123', 10);
    const hostUser = {
      id: DEFAULT_HOST_ID,
      name: 'Dr. Quizbee Host',
      email: 'host@quizbee.com',
      password: passwordHash,
      role: 'host',
      createdAt: new Date().toISOString()
    };
    this.users.set(DEFAULT_HOST_ID, hostUser);
    this.users.set('user_host_default', hostUser);

    // Sample Demo Quiz with standard UUID
    const demoQuiz = {
      id: DEFAULT_QUIZ_ID,
      host_id: DEFAULT_HOST_ID,
      title: 'Web & Computer Science Essentials',
      subject: 'Technology',
      difficulty: 'Medium',
      question_count: 5,
      time_per_question: 20,
      mode: 'solo',
      created_at: new Date().toISOString()
    };
    this.quizzes.set(DEFAULT_QUIZ_ID, demoQuiz);
    this.quizzes.set('quiz_demo_101', demoQuiz);

    const sampleQuestions = [
      {
        id: '00000000-0000-4000-8000-000000000011',
        quiz_id: DEFAULT_QUIZ_ID,
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
        id: '00000000-0000-4000-8000-000000000012',
        quiz_id: DEFAULT_QUIZ_ID,
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
        id: '00000000-0000-4000-8000-000000000013',
        quiz_id: DEFAULT_QUIZ_ID,
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
        id: '00000000-0000-4000-8000-000000000014',
        quiz_id: DEFAULT_QUIZ_ID,
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
        id: '00000000-0000-4000-8000-000000000015',
        quiz_id: DEFAULT_QUIZ_ID,
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

    sampleQuestions.forEach(q => {
      this.questions.set(q.id, q);
    });
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.users)) {
          data.users.forEach(u => {
            if (u && u.id) this.users.set(u.id, u);
          });
        }
        if (Array.isArray(data.quizzes)) {
          data.quizzes.forEach(q => {
            if (q && q.id) this.quizzes.set(q.id, q);
          });
        }
        if (Array.isArray(data.questions)) {
          data.questions.forEach(q => {
            if (q && q.id) this.questions.set(q.id, q);
          });
        }
        console.log(`[DataStore] Loaded ${this.users.size} users and ${this.quizzes.size} quizzes from disk cache.`);
      }
    } catch (err) {
      console.warn('[DataStore] Disk cache read notice:', err.message);
    }
  }

  saveToDisk() {
    try {
      const data = {
        users: Array.from(this.users.values()).filter(u => u.id !== 'user_host_default'),
        quizzes: Array.from(this.quizzes.values()).filter(q => q.id !== 'quiz_demo_101'),
        questions: Array.from(this.questions.values())
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[DataStore] Disk cache write notice:', err.message);
    }
  }

  // USER METHODS
  findUserByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email && user.email.toLowerCase() === clean) return user;
    }
    return null;
  }

  findUserById(id) {
    if (!id) return null;
    if (id === 'user_host_default') {
      return this.users.get(DEFAULT_HOST_ID) || this.users.get(id) || null;
    }
    return this.users.get(id) || null;
  }

  createUser(userData) {
    const id = userData.id || crypto.randomUUID();
    const cleanEmail = (userData.email || '').trim().toLowerCase();
    const user = {
      ...userData,
      id,
      email: cleanEmail,
      createdAt: userData.createdAt || new Date().toISOString()
    };
    this.users.set(id, user);
    this.saveToDisk();

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.createUser(user).catch(err => {
        console.warn('[Supabase Sync] Failed to sync user:', err.message);
      });
    }

    return user;
  }

  // QUIZ METHODS
  getQuizzesByHost(hostId) {
    const effectiveHostId = hostId === 'user_host_default' ? DEFAULT_HOST_ID : hostId;
    return Array.from(this.quizzes.values())
      .filter(q => q.id !== 'quiz_demo_101') // exclude alias
      .filter(q => q.host_id === hostId || q.host_id === effectiveHostId);
  }

  getQuizById(id) {
    if (!id) return null;
    if (id === 'quiz_demo_101') {
      return this.quizzes.get(DEFAULT_QUIZ_ID) || this.quizzes.get(id) || null;
    }
    return this.quizzes.get(id) || null;
  }

  createQuiz(quizData) {
    const id = quizData.id || crypto.randomUUID();
    const effectiveHostId = quizData.host_id === 'user_host_default' ? DEFAULT_HOST_ID : quizData.host_id;
    const quiz = {
      ...quizData,
      id,
      host_id: effectiveHostId,
      created_at: quizData.created_at || new Date().toISOString()
    };
    this.quizzes.set(id, quiz);
    this.saveToDisk();

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.createQuiz(quiz).catch(err => {
        console.warn('[Supabase Sync] Failed to sync quiz:', err.message);
      });
    }

    return quiz;
  }

  updateQuiz(id, updateData) {
    const quiz = this.getQuizById(id);
    if (!quiz) return null;
    const updated = { ...quiz, ...updateData };
    this.quizzes.set(quiz.id, updated);
    this.saveToDisk();

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.updateQuiz(quiz.id, updateData).catch(err => {
        console.warn('[Supabase Sync] Failed to sync quiz update:', err.message);
      });
    }

    return updated;
  }

  deleteQuiz(id) {
    const quiz = this.getQuizById(id);
    if (!quiz) return false;
    const targetId = quiz.id;

    for (const [qid, q] of this.questions.entries()) {
      if (q.quiz_id === targetId || q.quiz_id === id) this.questions.delete(qid);
    }
    this.quizzes.delete(targetId);
    this.quizzes.delete(id);
    this.saveToDisk();

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.deleteQuiz(targetId).catch(err => {
        console.warn('[Supabase Sync] Failed to delete quiz on Supabase:', err.message);
      });
    }
    return true;
  }

  // QUESTION METHODS
  getQuestionsByQuizId(quizId) {
    const targetId = quizId === 'quiz_demo_101' ? DEFAULT_QUIZ_ID : quizId;
    const matched = [];
    const seenIds = new Set();

    for (const q of this.questions.values()) {
      if ((q.quiz_id === targetId || q.quiz_id === quizId) && !seenIds.has(q.id)) {
        seenIds.add(q.id);
        matched.push(q);
      }
    }
    return matched.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  getQuestionById(id) {
    return this.questions.get(id) || null;
  }

  saveQuestions(quizId, questionList) {
    const targetQuizId = quizId === 'quiz_demo_101' ? DEFAULT_QUIZ_ID : quizId;

    // remove existing questions for this quiz
    for (const [qid, q] of this.questions.entries()) {
      if (q.quiz_id === targetQuizId || q.quiz_id === quizId) this.questions.delete(qid);
    }

    const saved = [];
    questionList.forEach((q, index) => {
      const isUuid = q.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.id);
      const qId = isUuid ? q.id : crypto.randomUUID();
      const item = {
        ...q,
        id: qId,
        quiz_id: targetQuizId,
        order_index: index
      };
      this.questions.set(qId, item);
      saved.push(item);
    });

    this.saveToDisk();

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.saveQuestions(targetQuizId, saved).catch(err => {
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
    this.saveToDisk();
    return updated;
  }

  deleteQuestion(id) {
    const res = this.questions.delete(id);
    this.saveToDisk();
    return res;
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
    const id = roomData.id || crypto.randomUUID();
    const effectiveQuizId = roomData.quiz_id === 'quiz_demo_101' ? DEFAULT_QUIZ_ID : roomData.quiz_id;

    const room = {
      ...roomData,
      id,
      quiz_id: effectiveQuizId,
      room_code: code,
      status: roomData.status || 'waiting', // waiting, live, paused, finished
      current_question_index: 0,
      question_start_time: null,
      created_at: new Date().toISOString(),
      paused_time_remaining: null
    };
    this.rooms.set(code, room);

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.createRoom(room).catch(err => {
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
    const id = playerData.id || crypto.randomUUID();
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
    const id = teamData.id || crypto.randomUUID();
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
    const id = answerData.id || crypto.randomUUID();
    const record = {
      ...answerData,
      id,
      submitted_at: new Date().toISOString()
    };
    this.answers.set(id, record);

    if (SupabaseRepository.isConfigured()) {
      SupabaseRepository.recordAnswer(record).catch(err => {
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
